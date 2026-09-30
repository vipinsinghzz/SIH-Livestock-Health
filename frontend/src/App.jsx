import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import FarmerBottomNav from './components/FarmerBottomNav';

import AppLoadingScreen from './components/AppLoadingScreen';

// Global Error Boundary to prevent blank white screens
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Uncaught rendering exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-modal">
            <span className="text-4xl block">⚠️</span>
            <h2 className="text-xl font-black text-slate-900">
              पृष्ठ लोड करने में समस्या आई / Page Error
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              सॉफ़्टवेयर में अस्थायी समस्या के कारण यह पृष्ठ लोड नहीं हो सका। कृपया पुनः प्रयास करें।
            </p>
            {this.state.error && (
              <div className="text-left bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-mono break-all max-h-32 overflow-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer"
              >
                पुनः लोड करें (Reload)
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-sm rounded-xl transition"
              >
                होम पेज (Home)
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
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

  React.useEffect(() => {
    document.title = 'PashuCare — स्वस्थ पशु • समृद्ध किसान | AI Animal Health & Disease Surveillance';
  }, []);

  return (
    <div className="app-shell min-h-screen flex flex-col font-sans">
      <OfflineBanner />
      <Navbar />
      <main className="flex-grow">
        <AppErrorBoundary>
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
              <Route path="/report_sick" element={<Navigate to="/report-sick" replace />} />
              <Route path="/report%20sick" element={<Navigate to="/report-sick" replace />} />
              <Route path="/report sick" element={<Navigate to="/report-sick" replace />} />
              <Route path="/reportsick" element={<Navigate to="/report-sick" replace />} />
              <Route path="/disease-scan" element={<Navigate to="/report-sick" replace />} />
              <Route path="/disease_scan" element={<Navigate to="/report-sick" replace />} />
              <Route path="/disease scan" element={<Navigate to="/report-sick" replace />} />
              <Route path="/disease%20scan" element={<Navigate to="/report-sick" replace />} />
              <Route path="/scan" element={<Navigate to="/report-sick" replace />} />
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

            {/* Veterinarian Dedicated Unified Module Routes */}
            <Route
              path="/vet"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="command-center" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/command-center"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="command-center" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/cases"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="cases" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/outbreaks"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="outbreaks" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/surveillance"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="surveillance" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/zoonotic-diseases"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="zoonotic" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/diagnostic-lab"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="laboratory" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vet/containment-vaccination"
              element={
                <ProtectedRoute allowedRoles={['veterinarian', 'field_worker', 'admin']}>
                  <Dashboard activeModule="containment-vaccination" />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </AppErrorBoundary>
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
