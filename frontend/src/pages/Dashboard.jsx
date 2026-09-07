import React from 'react';
import { useAuth } from '../context/AuthContext';
import FarmerDashboard from './FarmerDashboard';
import FieldWorkerDashboard from './FieldWorkerDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Role routing
  if (user?.role === 'farmer') {
    return <FarmerDashboard />;
  }

  if (user?.role === 'field_worker') {
    return <FieldWorkerDashboard />;
  }

  return <AdminDashboard />;
}
