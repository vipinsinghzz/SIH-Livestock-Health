import React from 'react';
import { Users, Activity, Syringe, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of veterinary operations and alerts.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Animals Covered</p>
            <p className="text-2xl font-bold text-gray-900">1,248</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-4">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Open Cases (High Priority)</p>
            <p className="text-2xl font-bold text-gray-900">12</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-4">
            <Syringe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Vaccinations Due</p>
            <p className="text-2xl font-bold text-gray-900">45</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-200 flex items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">Active Clusters</p>
            <p className="text-2xl font-bold text-red-700">2 flagged</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[400px] flex items-center justify-center text-gray-400">
        Chart Placeholder: Trend of Risk Levels Over Time
      </div>
    </div>
  );
}
