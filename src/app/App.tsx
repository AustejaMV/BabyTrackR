import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { FeedTimerProvider } from './contexts/FeedTimerContext';
import { BabyProvider, useBaby } from './contexts/BabyContext';
import { RoleProvider } from './contexts/RoleContext';
import { ThemeProvider } from '../store/themeStore';
import { Toaster } from './components/ui/sonner';
import { OnboardingNavigator } from './components/OnboardingNavigator';
import { isOnboardingComplete, isOnboardingInProgress, markOnboardingComplete } from './utils/onboardingStorage';
import { getBabies } from './data/babiesStorage';
import { LanguageProvider } from './contexts/LanguageContext';

function hasPreExistingData(): boolean {
  try {
    for (const key of ["feedingHistory", "sleepHistory"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return true;
      }
    }
  } catch {}
  return false;
}

function PostOnboardingLoginRedirect() {
  useEffect(() => {
    try {
      if (localStorage.getItem("cradl-post-onboarding-login") === "true") {
        localStorage.removeItem("cradl-post-onboarding-login");
        window.location.href = "/login";
      }
    } catch {}
  }, []);
  return null;
}

function BabyGate() {
  const { babies, refresh } = useBaby();
  const [firstLaunchDone, setFirstLaunchDone] = useState(false);

  useEffect(() => {
    if (isOnboardingInProgress()) return;

    const list = getBabies();
    const hasBabyWithDOB = list.some((b) => b.birthDate > 0);

    if (hasBabyWithDOB) {
      markOnboardingComplete();
      setFirstLaunchDone(true);
      return;
    }

    if (!isOnboardingComplete() && hasPreExistingData()) {
      markOnboardingComplete();
      setFirstLaunchDone(true);
    }
  }, [babies.length]);

  const onboardingDone = firstLaunchDone || isOnboardingComplete();

  if (!onboardingDone || isOnboardingInProgress()) {
    return (
      <OnboardingNavigator
        onComplete={() => {
          markOnboardingComplete();
          setFirstLaunchDone(true);
          refresh();
        }}
      />
    );
  }

  return (
    <RoleProvider>
      <RouterProvider router={router} />
      <PostOnboardingLoginRedirect />
    </RoleProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <FeedTimerProvider>
            <BabyProvider>
              <BabyGate />
              <Toaster />
            </BabyProvider>
          </FeedTimerProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}