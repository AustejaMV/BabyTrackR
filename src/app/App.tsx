import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { FeedTimerProvider } from './contexts/FeedTimerContext';
import { ThemeProvider } from '../store/themeStore';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedTimerProvider>
          <RouterProvider router={router} />
          <Toaster />
        </FeedTimerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}