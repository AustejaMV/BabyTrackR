/**
 * Premium context – supports RevenueCat subscription (native + web),
 * ad-reward unlock, and localStorage testing flag.
 * isPremium is true when ANY source is active.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "cradl-premium";
const AD_REWARD_KEY = "cradl-ad-reward-expires";
const AD_REWARD_DURATION = 7 * 86_400_000; // 7 days in ms

export type PurchaseSource = "revenuecat" | "ad_reward" | "testing" | null;

function readTestingFlag(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return raw === "true" || JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function readAdRewardExpiry(): number | null {
  try {
    const raw = localStorage.getItem(AD_REWARD_KEY);
    if (raw == null) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

export function daysLeftOnAdReward(): number {
  const expires = readAdRewardExpiry();
  if (expires == null) return 0;
  const remaining = expires - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 86_400_000) : 0;
}

interface PremiumContextValue {
  isPremium: boolean;
  purchaseSource: PurchaseSource;
  adRewardExpiresAt: number | null;
  unlockViaAd: () => void;
  initRevenueCat: () => void;
  setPremiumForTesting: (value: boolean) => void;
  purchasePackage: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  /** Present the RevenueCat-hosted paywall (web only). Returns true if purchase succeeded. */
  presentWebPaywall: (containerEl: HTMLElement | null) => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [testingFlag, setTestingFlag] = useState(readTestingFlag);
  const [adRewardExpiresAt, setAdRewardExpiresAt] = useState<number | null>(
    readAdRewardExpiry,
  );
  const [revenueCatActive, setRevenueCatActive] = useState(false);
  const webPurchasesRef = useRef<any>(null);

  useEffect(() => {
    const expires = readAdRewardExpiry();
    if (expires != null && expires <= Date.now()) {
      localStorage.removeItem(AD_REWARD_KEY);
      setAdRewardExpiresAt(null);
    }
  }, []);

  const adRewardActive =
    adRewardExpiresAt != null && adRewardExpiresAt > Date.now();

  const isPremium = revenueCatActive || adRewardActive || testingFlag;

  const purchaseSource: PurchaseSource = revenueCatActive
    ? "revenuecat"
    : adRewardActive
      ? "ad_reward"
      : testingFlag
        ? "testing"
        : null;

  const unlockViaAd = useCallback(() => {
    const expires = Date.now() + AD_REWARD_DURATION;
    setAdRewardExpiresAt(expires);
    try {
      localStorage.setItem(AD_REWARD_KEY, String(expires));
    } catch {}
  }, []);

  const getWebPurchases = useCallback(async () => {
    if (webPurchasesRef.current) return webPurchasesRef.current;
    const webKey = import.meta.env.VITE_RC_WEB_KEY || "";
    if (!webKey) return null;
    try {
      const { Purchases } = await import("@revenuecat/purchases-js");
      const instance = Purchases.configure(webKey, "anonymous");
      webPurchasesRef.current = instance;
      return instance;
    } catch (err) {
      console.warn("RevenueCat web SDK init failed:", err);
      return null;
    }
  }, []);

  const initRevenueCat = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const apiKey = Capacitor.getPlatform() === "ios"
          ? (import.meta.env.VITE_RC_IOS_KEY || "")
          : (import.meta.env.VITE_RC_ANDROID_KEY || "");
        if (!apiKey) {
          console.warn("RevenueCat: no API key configured for", Capacitor.getPlatform());
          return;
        }
        await Purchases.configure({ apiKey });
        const { customerInfo } = await Purchases.getCustomerInfo();
        const entitled = !!customerInfo.entitlements.active["premium"];
        setRevenueCatActive(entitled);
        Purchases.addCustomerInfoUpdateListener(({ customerInfo: info }) => {
          setRevenueCatActive(!!info.entitlements.active["premium"]);
        });
      } catch (err) {
        console.warn("RevenueCat native init failed:", err);
      }
    } else {
      const web = await getWebPurchases();
      if (web) {
        try {
          const info = await web.getCustomerInfo();
          setRevenueCatActive(!!info.entitlements.active["premium"]);
        } catch (err) {
          console.warn("RevenueCat web getCustomerInfo failed:", err);
        }
      }
    }
  }, [getWebPurchases]);

  useEffect(() => {
    initRevenueCat();
  }, [initRevenueCat]);

  const setPremiumForTesting = useCallback((value: boolean) => {
    setTestingFlag(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }, []);

  const purchasePackage = useCallback(async (packageId: string): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const { offerings } = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages.find(
          (p: any) => p.identifier === packageId || p.product.identifier === packageId
        );
        if (!pkg) {
          console.warn("Package not found:", packageId);
          return false;
        }
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
        const entitled = !!customerInfo.entitlements.active["premium"];
        setRevenueCatActive(entitled);
        return entitled;
      } catch (err: any) {
        if (err?.userCancelled) return false;
        console.error("Purchase failed:", err);
        return false;
      }
    }
    const web = await getWebPurchases();
    if (!web) {
      console.warn("RevenueCat web SDK not configured (set VITE_RC_WEB_KEY)");
      return false;
    }
    try {
      const offerings = await web.getOfferings();
      const pkg = offerings.current?.packagesById[packageId]
        ?? offerings.current?.availablePackages.find(
          (p: any) => p.identifier === packageId
        );
      if (!pkg) {
        console.warn("Web package not found:", packageId);
        return false;
      }
      const result = await web.purchase({ rcPackage: pkg });
      const entitled = !!result.customerInfo.entitlements.active["premium"];
      setRevenueCatActive(entitled);
      return entitled;
    } catch (err: any) {
      if (err?.errorCode === "UserCancelledError") return false;
      console.error("Web purchase failed:", err);
      return false;
    }
  }, [getWebPurchases]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const { customerInfo } = await Purchases.restorePurchases();
        const entitled = !!customerInfo.entitlements.active["premium"];
        setRevenueCatActive(entitled);
        return entitled;
      } catch (err) {
        console.error("Restore failed:", err);
        return false;
      }
    }
    const web = await getWebPurchases();
    if (!web) return false;
    try {
      const info = await web.getCustomerInfo();
      const entitled = !!info.entitlements.active["premium"];
      setRevenueCatActive(entitled);
      return entitled;
    } catch (err) {
      console.error("Web restore failed:", err);
      return false;
    }
  }, [getWebPurchases]);

  const presentWebPaywall = useCallback(async (containerEl: HTMLElement | null): Promise<boolean> => {
    const web = await getWebPurchases();
    if (!web) {
      console.warn("RevenueCat web SDK not configured (set VITE_RC_WEB_KEY)");
      return false;
    }
    try {
      const result = await web.presentPaywall({
        htmlTarget: containerEl ?? undefined,
      });
      const entitled = !!result.customerInfo.entitlements.active["premium"];
      setRevenueCatActive(entitled);
      return entitled;
    } catch (err) {
      console.error("Web paywall failed:", err);
      return false;
    }
  }, [getWebPurchases]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      purchaseSource,
      adRewardExpiresAt,
      unlockViaAd,
      initRevenueCat,
      setPremiumForTesting,
      purchasePackage,
      restorePurchases,
      presentWebPaywall,
    }),
    [
      isPremium,
      purchaseSource,
      adRewardExpiresAt,
      unlockViaAd,
      initRevenueCat,
      setPremiumForTesting,
      purchasePackage,
      restorePurchases,
      presentWebPaywall,
    ],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    return {
      isPremium: false,
      purchaseSource: null,
      adRewardExpiresAt: null,
      unlockViaAd: () => {},
      initRevenueCat: () => {},
      setPremiumForTesting: () => {},
      purchasePackage: async () => false,
      restorePurchases: async () => false,
      presentWebPaywall: async () => false,
    };
  }
  return ctx;
}
