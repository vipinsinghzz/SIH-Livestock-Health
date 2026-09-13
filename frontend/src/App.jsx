import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import FarmerBottomNav from './components/FarmerBottomNav';

import AppLoadingScreen from './components/AppLoadingScreen';

// Route-Level Code Splitting: Lazy-load page components to minimize initial bundle size
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ReportsList = React.lazy(() => import('./pages/ReportsList'));
const ReportDetail = React.lazy(() => import('./pages/ReportDetail'));
const DiseaseDetectionPage = React.lazy(() => import('./pages/DiseaseDetectionPage'));
const KisanSaathiPage = React.lazy(() => import('./pages/KisanSaathiPage'));
const VeterinaryHelpPage = React.lazy(() => import('./pages/VeterinaryHelpPage'));
const EmergencySOSPage = React.lazy(() => import('./pages/EmergencySOSPage'));
const GovernmentSchemesPage = React.lazy(() => import('./pages/GovernmentSchemesPage'));
const AnimalsList = React.lazy(() => import('./pages/AnimalsList'));
const AdvisoriesPage = React.lazy(() => import('./pages/AdvisoriesPage'));
const VaccinationPage = React.lazy(() => import('./pages/VaccinationPage'));
const IVRSimulator = React.lazy(() => import('./pages/IVRSimulator'));
const SelectLanguagePage = React.lazy(() => import('./pages/SelectLanguagePage'));

// Home Route: Landing Page if unauthenticated, Dashboard if logged in
function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

// Protected Route Guard with optional role-based authorization
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;
    const hasRole = allowedRoles.includes(userRole) ||
      (userRole === 'veterinarian' && allowedRoles.includes('field_worker')) ||
      (userRole === 'field_worker' && allowedRoles.includes('veterinarian')) ||
      (userRole === 'admin');

    if (!hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();
  const isFarmer = !user || user.role === 'farmer';

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col font-sans">
      <OfflineBanner />
      <Navbar />
      <main className="flex-grow">
        <React.Suspense fallback={<AppLoadingScreen message="लोड हो रहा है... Loading page..." />}>
          <Routes>
            {/* Public & Dynamic Entry */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/select-language" element={<SelectLanguagePage />} />
            <Route path="/language" element={<SelectLanguagePage />} />

            {/* Accessible Farmer & Public Features */}
            <Route path="/kisan-saathi" element={<KisanSaathiPage />} />
            <Route path="/kisan%20saathi" element={<Navigate to="/kisan-saathi" replace />} />
            <Route path="/kisan saathi" element={<Navigate to="/kisan-saathi" replace />} />
            <Route path="/kisansaathi" element={<Navigate to="/kisan-saathi" replace />} />
            <Route path="/kisan_saathi" element={<Navigate to="/kisan-saathi" replace />} />
            <Route path="/report-sick" element={<DiseaseDetectionPage />} />
            <Route path="/veterinary-help" element={<VeterinaryHelpPage />} />
            <Route path="/emergency-sos" element={<EmergencySOSPage />} />
            <Route path="/government-schemes" element={<GovernmentSchemesPage />} />

            {/* Authenticated Portals */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/animals"
              element={
                <ProtectedRoute>
                  <AnimalsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/outbreak-alerts"
              element={
                <ProtectedRoute>
                  <ReportsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/:id"
              element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advisories"
              element={
                <ProtectedRoute>
                  <AdvisoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vaccination"
              element={
                <ProtectedRoute>
                  <VaccinationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ivr-simulator"
              element={
                <ProtectedRoute>
                  <IVRSimulator />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </main>

      {/* Mobile Bottom Navigation Bar for Farmer Experience */}
      {user && isFarmer && <FarmerBottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <OfflineProvider>
          <AppContent />
        </OfflineProvider>
      </AuthProvider>
    </Router>
  );
}
