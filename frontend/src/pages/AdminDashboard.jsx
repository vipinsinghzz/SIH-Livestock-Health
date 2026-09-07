import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LeafletMap from '../components/LeafletMap';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  ShieldAlert,
  Activity,
  AlertOctagon,
  Users,
  Syringe,
  Layers,
  MapPin,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParam = selectedBlock !== 'All' ? `?block=${selectedBlock}` : '';
        const [sumRes, trendRes, repRes] = await Promise.all([
          api.get(`/dashboard/summary${queryParam}`),
          api.get(`/dashboard/trends${queryParam}`),
          api.get(`/reports${queryParam}&limit=100`)
        ]);
        setSummary(sumRes.data.data);
        setTrends(trendRes.data.data || []);
        setReports(repRes.data.reports || []);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedBlock]);

  if (loading || !summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  // Format status funnel data for chart
  const funnelData = Object.keys(summary.statusFunnel || {}).map((key) => ({
    status: key,
    count: summary.statusFunnel[key]
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Block Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Epidemiological Surveillance Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            District: Pune (Maharashtra) • Real-time AI Triage &amp; Cluster Surveillance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-600" /> Filter Block:
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="All">All Blocks (Entire District)</option>
            <option value="Baramati">Baramati (Outbreak Active)</option>
            <option value="Shirur">Shirur</option>
            <option value="Haveli">Haveli</option>
            <option value="Khed">Khed</option>
            <option value="Indapur">Indapur</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Reports
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {summary.totalReports}
          </div>
          <span className="text-[10px] text-slate-500">Logged cases</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Cases
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {summary.activeCases}
          </div>
          <span className="text-[10px] text-slate-500">Under containment</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mortalities
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
            {summary.totalMortality}
          </div>
          <span className="text-[10px] text-red-600 font-semibold">Animal deaths</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            High / Critical Risk
          </span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {(summary.triageMetrics?.criticalCount || 0) + (summary.triageMetrics?.highCount || 0)}
          </div>
          <span className="text-[10px] text-slate-500">Triage elevated</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Outbreaks
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1 flex items-center gap-1">
            {summary.triageMetrics?.outbreakCount || 0}
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          </div>
          <span className="text-[10px] text-red-700 font-bold">14-Day Cluster Match</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Vaccination %
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {summary.vaccination?.coveragePct || 78}%
          </div>
          <span className="text-[10px] text-slate-500">District target coverage</span>
        </div>
      </div>

      {/* District Veterinary Capacity & Diagnostic Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-emerald-900 block">पशु चिकित्सा क्षमता (Vet Capacity)</span>
            <span className="text-slate-600">22 सक्रिय डिस्पेंसरी • 14 मोबाइल वैन (1962)</span>
          </div>
          <span className="bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            92% चालू
          </span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-blue-900 block">प्रयोगशाला स्थिति (Lab Diagnostic)</span>
            <span className="text-slate-600">औसत आरटी-पीसीआर टर्नअराउंड: 36 घंटे</span>
          </div>
          <span className="bg-blue-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            सामान्य
          </span>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-purple-900 block">राष्ट्रीय पशुधन नियंत्रण (NADCP)</span>
            <span className="text-slate-600">FMD चक्र 4: 12,400 गाय/भैंस प्रतिरक्षित</span>
          </div>
          <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            चरण 2
          </span>
        </div>
      </div>

      {/* Geospatial Risk Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Geospatial Outbreak &amp; Risk Heatmap
          </h2>
          <span className="text-xs text-slate-500">Interactive GIS View with Containment Buffers</span>
        </div>
        <LeafletMap reports={reports} height="480px" />
      </div>

      {/* Charts Section: 30-Day Trends & Top Diseases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                {t('dashboard.temporal_trends')}
              </h3>
              <p className="text-xs text-slate-500">Daily reported cases, critical flags, and mortalities</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="cases"
                  name="Total Cases"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCases)"
                />
                <Area
                  type="monotone"
                  dataKey="criticalCases"
                  name="High/Critical"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCritical)"
                />
                <Area
                  type="monotone"
                  dataKey="mortalities"
                  name="Mortalities"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suspected Diseases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('dashboard.top_diseases')}
            </h3>
            <p className="text-xs text-slate-500">AI triage candidate frequency</p>
          </div>

          <div className="h-64 flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              {(summary.diseaseBreakdown || []).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[170px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-slate-600 font-mono">
                      {item.cases} cases ({item.avgConfidencePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: COLORS[idx % COLORS.length],
                        width: `${Math.min(100, (item.cases / (summary.totalReports || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row Charts: Case Funnel & Block Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Escalation Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('dashboard.case_funnel')}
            </h3>
            <p className="text-xs text-slate-500">
              Clinical progression from report to containment
            </p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="count" name="Cases" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Block Level Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('dashboard.block_distribution')}
            </h3>
            <p className="text-xs text-slate-500">Case burden and mortality by sub-district</p>
          </div>

          <div className="space-y-3">
            {(summary.blockDistribution || []).map((b, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-900">{b._id} Block</div>
                  <div className="text-[11px] text-slate-500">
                    {b.deaths > 0 ? (
                      <span className="text-red-600 font-bold">{b.deaths} deaths reported</span>
                    ) : (
                      'Zero mortalities'
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 font-mono">{b.count}</span>
                  <div className="text-[10px] text-slate-400">cases</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
