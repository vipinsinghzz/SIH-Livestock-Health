import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import FarmerBottomNav from './components/FarmerBottomNav';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportsList from './pages/ReportsList';
import ReportDetail from './pages/ReportDetail';
import DiseaseDetectionPage from './pages/DiseaseDetectionPage';
import KisanSaathiPage from './pages/KisanSaathiPage';
import VeterinaryHelpPage from './pages/VeterinaryHelpPage';
import EmergencySOSPage from './pages/EmergencySOSPage';
import GovernmentSchemesPage from './pages/GovernmentSchemesPage';
import AnimalsList from './pages/AnimalsList';
import AdvisoriesPage from './pages/AdvisoriesPage';
import VaccinationPage from './pages/VaccinationPage';
import IVRSimulator from './pages/IVRSimulator';

// Home Route: Landing Page if unauthenticated, Dashboard if logged in
function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
        <Routes>
          {/* Public & Dynamic Entry */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Accessible Farmer & Public Features */}
          <Route path="/kisan-saathi" element={<KisanSaathiPage />} />
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
