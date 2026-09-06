import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

const MOCK_CASES = [
  { id: 'C-001', animal: 'Daisy (Goat)', priority: 'CRITICAL', status: 'OPEN', risk: 'HIGH', time: '10 mins ago' },
  { id: 'C-002', animal: 'Thunder (Horse)', priority: 'MEDIUM', status: 'REVIEWED', risk: 'MEDIUM', time: '2 hours ago' },
  { id: 'C-003', animal: 'Bessie (Cow)', priority: 'LOW', status: 'CLOSED', risk: 'LOW', time: '1 day ago' },
];

export default function CaseQueuePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Case Queue</h1>
        <p className="text-gray-500 mt-1">Review AI predictions and update case statuses.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {MOCK_CASES.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{c.animal}</h3>
                  <p className="text-sm text-gray-500">Case ID: {c.id} • Raised {c.time}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    c.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    c.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {c.priority} PRIORITY
                  </span>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-700 mr-2">Status:</span>
                <span className="text-gray-600 flex items-center">
                  {c.status === 'OPEN' && <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />}
                  {c.status === 'REVIEWED' && <Clock className="w-4 h-4 mr-1 text-blue-500" />}
                  {c.status === 'CLOSED' && <CheckCircle className="w-4 h-4 mr-1 text-green-500" />}
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 h-fit sticky top-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Case Detail</h2>
          <div className="p-4 bg-red-50 rounded-xl mb-6">
            <h4 className="font-bold text-red-800 mb-2">AI Prediction: HIGH RISK</h4>
            <p className="text-sm text-red-700">Possible condition: Foot and Mouth Disease (92%)</p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2">
              <li>Lesions detected on the hooves.</li>
              <li>High temperature and drooling reported.</li>
            </ul>
            <p className="text-xs text-red-500 mt-2 text-right">Model: v1.2.4</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500">
                <option>OPEN</option>
                <option>REVIEWED</option>
                <option>CLOSED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vet Notes</label>
              <textarea className="w-full border border-gray-300 rounded-lg p-2 h-24 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter clinical notes..."></textarea>
            </div>
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
            <button className="w-full border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors mt-2">
              Refer to Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
