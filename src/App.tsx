import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeInjector from './components/atoms/ThemeInjector/ThemeInjector';
import LandingPage from './components/pages/Landing/Landing.page';
import LoginPage from './components/pages/Authentication/Login.page';
import AdminLoginPage from './components/pages/Authentication/AdminLogin.page';
import SuperAdminLoginPage from './components/pages/Authentication/SuperAdminLogin.page';
import ElderLoginPage from './components/pages/Authentication/ElderLogin.page';
import CaretakerLoginPage from './components/pages/Authentication/CaretakerLogin.page';
import FamilyLoginPage from './components/pages/Authentication/FamilyLogin.page';
import RegisterPage from './components/pages/Authentication/Register.page';
import ForgotPasswordPage from './components/pages/Authentication/ForgotPassword.page';
import ResetPasswordPage from './components/pages/Authentication/ResetPassword.page';
import ProtectedRoute from './routes/ProtectedRoute';
import { UserTypeEnum } from './utils/enums';

const AdminRoutes = lazy(() => import('./routes/AdminRoutes'));
const CaretakerRoutes = lazy(() => import('./routes/CaretakerRoutes'));
const ElderRoutes = lazy(() => import('./routes/ElderRoutes'));
const FamilyRoutes = lazy(() => import('./routes/FamilyRoutes'));

function RouteLoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider>
      {/* Render-less - sets every useColors() shade as a CSS custom property on
          documentElement, the mechanism that actually drives the whole app's styling. */}
      <ThemeInjector />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/super-admin" element={<SuperAdminLoginPage />} />
          <Route path="/login/elder" element={<ElderLoginPage />} />
          <Route path="/login/caretaker" element={<CaretakerLoginPage />} />
          <Route path="/login/family" element={<FamilyLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Authenticated shells — one route group per role, each behind ProtectedRoute.
              /admin/* serves both ADMIN and SUPER_ADMIN (AdminRoutes itself varies the
              displayed roleLabel); react-router ranks the literal "/admin/login" segment
              above this wildcard regardless of declaration order, so the two don't conflict. */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedUserTypes={[UserTypeEnum.ADMIN, UserTypeEnum.SUPER_ADMIN]}>
                <AdminRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caretaker/*"
            element={
              <ProtectedRoute allowedUserTypes={[UserTypeEnum.CARETAKER]}>
                <CaretakerRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elder/*"
            element={
              <ProtectedRoute allowedUserTypes={[UserTypeEnum.ELDER]}>
                <ElderRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/family/*"
            element={
              <ProtectedRoute allowedUserTypes={[UserTypeEnum.FAMILY_MEMBER]}>
                <FamilyRoutes />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
