import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme';
import { me } from '@/features/auth/api';
import { setUnauthorizedHandler } from '@/shared/api/http';

import { RequireAuth } from './providers/RequireAuth';
import { useAuth } from './providers/useAuth';

// Route-level code splitting: visitors only download the part of the app they open.
const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const LoginOtpVerifyPage = lazy(() => import('@/features/auth/pages/LoginOtpVerifyPage').then((m) => ({ default: m.LoginOtpVerifyPage })));
const RegisterOtpVerifyPage = lazy(() => import('@/features/auth/pages/RegisterOtpVerifyPage').then((m) => ({ default: m.RegisterOtpVerifyPage })));
const AppShell = lazy(() => import('@/shell/AppShell').then((m) => ({ default: m.AppShell })));
const NotesBoard = lazy(() => import('@/features/notes/NotesBoard').then((m) => ({ default: m.NotesBoard })));
const LabelsPage = lazy(() => import('@/features/labels/pages/LabelsPage').then((m) => ({ default: m.LabelsPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));

/** Confirms the session cookie on load and signs the user out when the API says it is no longer valid. */
function SessionWatcher() {
  const { isAuthenticated, setAuth, clear } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    setUnauthorizedHandler(() => {
      clear();
      toast('Your session has expired. Please sign in again.', { id: 'session-expired' });
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [isAuthenticated, clear, navigate]);

  // Once per sign-in: refresh the profile, or hit the 401 handler above if the cookie is gone.
  useEffect(() => {
    if (isAuthenticated) me().then(setAuth, () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the signed-in state flips
  }, [isAuthenticated]);
  return null;
}

/** Old /app/notes/:id/edit links open the note in the new editor dialog. */
function LegacyEditRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/notes?note=${encodeURIComponent(id)}`} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/login/verify" element={<LoginOtpVerifyPage />} />
        <Route path="/auth/register/verify" element={<RegisterOtpVerifyPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/notes" element={<NotesBoard view="notes" />} />
            <Route path="/reminders" element={<NotesBoard view="reminders" />} />
            <Route path="/shared" element={<NotesBoard view="shared" />} />
            <Route path="/archive" element={<NotesBoard view="archive" />} />
            <Route path="/trash" element={<NotesBoard view="trash" />} />
            <Route path="/label/:name" element={<NotesBoard view="label" />} />
            <Route path="/search" element={<NotesBoard view="search" />} />
            <Route path="/labels" element={<LabelsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Links from the previous version of the app */}
        <Route path="/app" element={<Navigate to="/notes" replace />} />
        <Route path="/app/notes" element={<Navigate to="/notes" replace />} />
        <Route path="/app/notes/new" element={<Navigate to="/notes" replace />} />
        <Route path="/app/notes/:id/edit" element={<LegacyEditRedirect />} />
        <Route path="/app/shared" element={<Navigate to="/shared" replace />} />
        <Route path="/app/labels" element={<Navigate to="/labels" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <SessionWatcher />
            <AppRoutes />
          </BrowserRouter>
          <Toaster position="bottom-left" closeButton />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
