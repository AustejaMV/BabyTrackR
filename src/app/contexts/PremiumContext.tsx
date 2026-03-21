/**
 * Premium context – server is source of truth when logged in (GET /premium, verified via RevenueCat).
 * When not logged in: ad-reward and (dev-only) testing flag can still grant premium for UI; server-gated features require auth.
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
import { useAuth } from "./AuthContext";
import { fetchPremiumStatus, syncPremiumFromRevenueCat } from "../utils/premiumApi";

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
  /** True while server premium status is loading (logged-in users only). */
  premiumLoading: boolean;
  unlockViaAd: () => void;
  initRevenueCat: () => void;
  setPremiumForTesting: (value: boolean) => void;
  purchasePackage: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  /** Refetch premium from server (call after purchase/restore or when returning to app). */
  refreshPremiumFromServer: () => Promise<void>;
  /** Present the RevenueCat-hosted paywall (web only). Returns true if purchase succeeded. */
  presentWebPaywall: (containerEl: HTMLElement | null) => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [testingFlag, setTestingFlag] = useState(readTestingFlag);
  const [adRewardExpiresAt, setAdRewardExpiresAt] = useState<number | null>(
    readAdRewardExpiry,
  );
  /** Server-verified premium (when logged in). null = not loaded yet. */
  const [serverPremium, setServerPremium] = useState<boolean | null>(null);
  const webPurchasesRef = useRef<any>(null);

  const accessToken = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    webPurchasesRef.current = null;
  }, [userId]);

  useEffect(() => {
    const expires = readAdRewardExpiry();
    if (expires != null && expires <= Date.now()) {
      localStorage.removeItem(AD_REWARD_KEY);
      setAdRewardExpiresAt(null);
    }
  }, []);

  const adRewardActive =
    adRewardExpiresAt != null && adRewardExpiresAt > Date.now();

  const fetchServerPremium = useCallback(async () => {
    if (!accessToken) {
      setServerPremium(null);
      return;
    }
    const premium = await fetchPremiumStatus(accessToken);
    setServerPremium(premium);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setServerPremium(null);
      return;
    }
    fetchServerPremium();
  }, [accessToken, fetchServerPremium]);

  const refreshPremiumFromServer = useCallback(async () => {
    if (!accessToken) return;
    await fetchServerPremium();
  }, [accessToken, fetchServerPremium]);

  const premiumLoading = accessToken != null && serverPremium === null;

  const isPremium =
    accessToken != null
      ? (serverPremium === true)
      : (adRewardActive || (typeof import.meta.env.DEV !== "undefined" && import.meta.env.DEV && testingFlag));

  const purchaseSource: PurchaseSource =
    accessToken != null && serverPremium === true
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
      const appUserId = userId ?? "anonymous";
      const instance = Purchases.configure(webKey, appUserId);
      webPurchasesRef.current = instance;
      return instance;
    } catch (err) {
      console.warn("RevenueCat web SDK init failed:", err);
      return null;
    }
  }, [userId]);

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
        await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
        if (accessToken) {
          await syncPremiumFromRevenueCat(accessToken);
          setServerPremium(await fetchPremiumStatus(accessToken));
          Purchases.addCustomerInfoUpdateListener(async () => {
            const ok = await syncPremiumFromRevenueCat(accessToken);
            setServerPremium(ok);
          });
        }
      } catch (err) {
        console.warn("RevenueCat native init failed:", err);
      }
    } else {
      const web = await getWebPurchases();
      if (web && accessToken) {
        try {
          const ok = await syncPremiumFromRevenueCat(accessToken);
          setServerPremium(ok);
        } catch (err) {
          console.warn("RevenueCat web sync failed:", err);
        }
      }
    }
  }, [getWebPurchases, userId, accessToken]);

  useEffect(() => {
    if (accessToken) initRevenueCat();
  }, [accessToken, initRevenueCat]);

  const setPremiumForTesting = useCallback((value: boolean) => {
    setTestingFlag(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }, []);

  const syncAfterPurchase = useCallback(async () => {
    if (!accessToken) return false;
    const ok = await syncPremiumFromRevenueCat(accessToken);
    setServerPremium(ok);
    return ok;
  }, [accessToken]);

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
        await Purchases.purchasePackage({ aPackage: pkg });
        return syncAfterPurchase();
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
      await web.purchase({ rcPackage: pkg });
      return syncAfterPurchase();
    } catch (err: any) {
      if (err?.errorCode === "UserCancelledError") return false;
      console.error("Web purchase failed:", err);
      return false;
    }
  }, [getWebPurchases, syncAfterPurchase]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        await Purchases.restorePurchases();
        return syncAfterPurchase();
      } catch (err) {
        console.error("Restore failed:", err);
        return false;
      }
    }
    const web = await getWebPurchases();
    if (!web) return false;
    try {
      await web.restorePurchases();
      return syncAfterPurchase();
    } catch (err) {
      console.error("Web restore failed:", err);
      return false;
    }
  }, [getWebPurchases, syncAfterPurchase]);

  const presentWebPaywall = useCallback(async (containerEl: HTMLElement | null): Promise<boolean> => {
    const web = await getWebPurchases();
    if (!web) {
      console.warn("RevenueCat web SDK not configured (set VITE_RC_WEB_KEY)");
      return false;
    }
    try {
      await web.presentPaywall({
        htmlTarget: containerEl ?? undefined,
      });
      return syncAfterPurchase();
    } catch (err) {
      console.error("Web paywall failed:", err);
      return false;
    }
  }, [getWebPurchases, syncAfterPurchase]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      purchaseSource,
      adRewardExpiresAt,
      premiumLoading,
      unlockViaAd,
      initRevenueCat,
      setPremiumForTesting,
      purchasePackage,
      restorePurchases,
      refreshPremiumFromServer,
      presentWebPaywall,
    }),
    [
      isPremium,
      purchaseSource,
      adRewardExpiresAt,
      premiumLoading,
      unlockViaAd,
      initRevenueCat,
      setPremiumForTesting,
      purchasePackage,
      restorePurchases,
      refreshPremiumFromServer,
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
      premiumLoading: false,
      unlockViaAd: () => {},
      initRevenueCat: () => {},
      setPremiumForTesting: () => {},
      purchasePackage: async () => false,
      restorePurchases: async () => false,
      refreshPremiumFromServer: async () => {},
      presentWebPaywall: async () => false,
    };
  }
  return ctx;
}
