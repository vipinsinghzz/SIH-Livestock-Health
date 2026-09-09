import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';

export default function RiskMapPage() {
  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Risk Map</h1>
        <p className="text-gray-500 mt-1">Geospatial overview of disease clusters and health events.</p>
      </header>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start shadow-sm">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-red-800">Cluster Alert: Elevated Activity</h3>
          <p className="text-sm text-red-700 mt-1">
            Two clusters of high-risk symptoms detected in Region Alpha. <strong>Note: A cluster is an indicator for human review, not an automatically confirmed outbreak.</strong>
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden flex items-center justify-center">
        {/* Mock Map Container */}
        <div className="absolute inset-0 bg-blue-50/50">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {/* Mock Markers */}
          <div className="absolute top-1/3 left-1/4 group cursor-pointer">
            <div className="w-24 h-24 bg-red-500/20 rounded-full absolute -top-10 -left-10 animate-pulse"></div>
            <div className="bg-red-600 text-white p-2 rounded-full shadow-lg relative z-10">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="hidden group-hover:block absolute top-12 left-0 bg-white p-3 rounded-lg shadow-xl border border-gray-100 w-48 z-20">
              <p className="font-bold text-gray-900">Cluster Alpha</p>
              <p className="text-sm text-gray-500">12 Critical Cases</p>
              <button className="text-blue-600 text-sm font-medium mt-2 hover:underline">View Cases →</button>
            </div>
          </div>

          <div className="absolute top-1/2 right-1/3 group cursor-pointer">
            <div className="bg-yellow-500 text-white p-2 rounded-full shadow-lg relative z-10">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100">
          <h4 className="font-bold text-sm mb-2">Legend</h4>
          <div className="flex items-center text-sm text-gray-600 mb-1"><span className="w-3 h-3 bg-red-600 rounded-full mr-2"></span> Critical Cluster</div>
          <div className="flex items-center text-sm text-gray-600 mb-1"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> Elevated Risk</div>
          <div className="flex items-center text-sm text-gray-600"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> Normal Activity</div>
        </div>
      </div>
    </div>
  );
}
