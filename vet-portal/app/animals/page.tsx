import React from 'react';
import { Search, Filter } from 'lucide-react';

const MOCK_ANIMALS = [
  { id: '1', name: 'Bessie', tag_id: 'TAG-4012', species: 'Cow', owner: 'Farm A', status: 'Healthy' },
  { id: '2', name: 'Thunder', tag_id: 'TAG-1122', species: 'Horse', owner: 'Farm B', status: 'Under Observation' },
  { id: '3', name: 'Daisy', tag_id: 'TAG-9011', species: 'Goat', owner: 'Farm A', status: 'Critical Case' },
];

export default function AnimalsFarmsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Animals & Farms</h1>
          <p className="text-gray-500 mt-1">Registry across assigned regions.</p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search tag ID or name..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Filter className="w-5 h-5 mr-2" />
            Filter
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Animal</th>
              <th className="px-6 py-4">Tag ID</th>
              <th className="px-6 py-4">Species</th>
              <th className="px-6 py-4">Owner / Farm</th>
              <th className="px-6 py-4">Health Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_ANIMALS.map(animal => (
              <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{animal.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{animal.tag_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{animal.species}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{animal.owner}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    animal.status === 'Healthy' ? 'bg-green-100 text-green-800' :
                    animal.status === 'Critical Case' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {animal.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href="#" className="text-blue-600 hover:text-blue-900 mr-4">View Profile</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
