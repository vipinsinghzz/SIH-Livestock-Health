import Link from 'next/link';
import { Home, List, Map, Syringe, Settings } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50 text-gray-900">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight">Antigravity</h1>
            <p className="text-sm text-gray-500 mt-1">Veterinary Portal</p>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <Link href="/" className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
              <Home className="w-5 h-5 mr-3" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/case-queue" className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
              <List className="w-5 h-5 mr-3" />
              <span className="font-medium">Case Queue</span>
            </Link>
            <Link href="/animals" className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
              <span className="w-5 h-5 mr-3 flex items-center justify-center text-xl">🐄</span>
              <span className="font-medium">Animals & Farms</span>
            </Link>
            <Link href="/vaccinations" className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
              <Syringe className="w-5 h-5 mr-3" />
              <span className="font-medium">Vaccination Ops</span>
            </Link>
            <Link href="/risk-map" className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
              <Map className="w-5 h-5 mr-3" />
              <span className="font-medium">Risk Map</span>
            </Link>
          </nav>
          <div className="p-4 mt-auto border-t border-gray-100">
            <div className="flex items-center text-gray-600 px-2 py-2">
              <Settings className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">Dr. Smith (Vet)</span>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
