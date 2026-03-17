import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { FeedTimerProvider } from './contexts/FeedTimerContext';
import { BabyProvider, useBaby } from './contexts/BabyContext';
import { RoleProvider } from './contexts/RoleContext';
import { ThemeProvider } from '../store/themeStore';
import { Toaster } from './components/ui/sonner';
import { OnboardingFlow } from './components/OnboardingFlow';
import { OnboardingNavigator } from './components/OnboardingNavigator';
import { isOnboardingComplete, markOnboardingComplete } from './utils/onboardingStorage';
import { getBabies } from './data/babiesStorage';
import { LanguageProvider } from './contexts/LanguageContext';

function BabyGate() {
  const { babies, addBaby, setActiveBabyId, refresh } = useBaby();
  const [firstLaunchDone, setFirstLaunchDone] = useState(false);

  useEffect(() => {
    const list = getBabies();
    if (list.length > 0 && list[0]?.birthDate) {
      markOnboardingComplete();
      setFirstLaunchDone(true);
    }
  }, [babies.length]);

  const showFirstLaunchOnboarding =
    !firstLaunchDone && !isOnboardingComplete() && babies.length === 0;

  if (showFirstLaunchOnboarding) {
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

  if (babies.length === 0) {
    return (
      <OnboardingFlow
        onComplete={(data) => {
          const b = addBaby(data);
          setActiveBabyId(b.id);
        }}
      />
    );
  }

  return (
    <RoleProvider>
      <RouterProvider router={router} />
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