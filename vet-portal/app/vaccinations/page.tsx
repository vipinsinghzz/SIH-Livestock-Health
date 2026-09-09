import React from 'react';
import { Syringe, Search, Calendar } from 'lucide-react';

const MOCK_VACCINATIONS = [
  { id: '1', animal: 'Bessie (Cow)', tag_id: 'TAG-4012', vaccine: 'FMD', due_date: '2026-09-10', status: 'OVERDUE' },
  { id: '2', animal: 'Thunder (Horse)', tag_id: 'TAG-1122', vaccine: 'Rabies', due_date: '2026-09-15', status: 'UPCOMING' },
];

export default function VaccinationOpsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vaccination Ops</h1>
          <p className="text-gray-500 mt-1">Manage herd immunity and track upcoming vaccination schedules.</p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search animals or vaccines..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
            <Syringe className="w-5 h-5 mr-2" />
            Log Bulk Vaccination
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Animal</th>
              <th className="px-6 py-4">Tag ID</th>
              <th className="px-6 py-4">Vaccine Required</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_VACCINATIONS.map(v => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{v.animal}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{v.tag_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{v.vaccine}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {v.due_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    v.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 font-bold border border-blue-600 px-3 py-1 rounded hover:bg-blue-50">Log Dose</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
