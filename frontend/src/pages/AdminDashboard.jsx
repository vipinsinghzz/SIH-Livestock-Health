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
  Filter,
  RefreshCw,
  FileCheck,
  CheckCircle2
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Safe default fallback summary in case backend data is loading or offline
const DEFAULT_SUMMARY = {
  totalReports: 9,
  activeCases: 6,
  containedCases: 3,
  totalMortality: 19,
  totalAffected: 69,
  triageMetrics: {
    criticalCount: 3,
    highCount: 5,
    moderateCount: 1,
    lowCount: 0,
    outbreakCount: 5
  },
  diseaseBreakdown: [
    { name: 'Foot and Mouth Disease (FMD)', cases: 3, avgConfidencePct: 89 },
    { name: 'Anthrax', cases: 2, avgConfidencePct: 69 },
    { name: 'Peste des Petits Ruminants (PPR)', cases: 1, avgConfidencePct: 88 },
    { name: 'Lumpy Skin Disease (LSD)', cases: 1, avgConfidencePct: 91 },
    { name: 'Haemorrhagic Septicaemia (HS)', cases: 1, avgConfidencePct: 94 }
  ],
  statusFunnel: {
    Reported: 0,
    Triaged: 2,
    'Field Verified': 1,
    Escalated: 3,
    Contained: 2,
    Closed: 1
  },
  blockDistribution: [
    { _id: 'Baramati', count: 4, deaths: 0 },
    { _id: 'Shirur', count: 2, deaths: 1 },
    { _id: 'Haveli', count: 1, deaths: 1 },
    { _id: 'Indapur', count: 1, deaths: 15 },
    { _id: 'Khed', count: 1, deaths: 2 }
  ],
  vaccination: {
    totalTarget: 15000,
    totalCovered: 10550,
    coveragePct: 70
  },
  labPipeline: {
    'Result Confirmed': 1,
    Received: 1,
    'In Transit': 1
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [trends, setTrends] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (block = selectedBlock) => {
    try {
      setRefreshing(true);
      const isFiltered = block && block !== 'All';
      const blockQuery = isFiltered ? `?block=${encodeURIComponent(block)}` : '';
      const reportsQuery = isFiltered ? `?block=${encodeURIComponent(block)}&limit=100` : '?limit=100';

      const [sumRes, trendRes, repRes] = await Promise.allSettled([
        api.get(`/dashboard/summary${blockQuery}`),
        api.get(`/dashboard/trends${blockQuery}`),
        api.get(`/reports${reportsQuery}`)
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data?.data) {
        setSummary(sumRes.value.data.data);
      }

      if (trendRes.status === 'fulfilled' && trendRes.value.data?.data) {
        setTrends(trendRes.value.data.data);
      }

      if (repRes.status === 'fulfilled' && repRes.value.data?.reports) {
        setReports(repRes.value.data.reports);
      }
    } catch (err) {
      console.error('Error in admin dashboard fetchData:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedBlock);
  }, [selectedBlock]);

  if (loading && !summary) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">डैशबोर्ड लोड हो रहा है...</p>
      </div>
    );
  }

  // Format status funnel data for chart
  const funnelData = Object.keys(summary?.statusFunnel || {}).map((key) => ({
    status: key,
    count: summary.statusFunnel[key] || 0
  }));

  const officerName = user?.name || (isEnglish ? 'Dr. Suresh Kulkarni' : 'डॉ. सुरेश कुलकर्णी');
  const districtName = user?.district || 'Pune';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
      {/* Top Banner & Block Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {isEnglish
                ? 'Epidemiological Surveillance Command Center'
                : 'रोग निगरानी एवं नियंत्रण केंद्र (Epidemiological Surveillance)'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isEnglish
              ? `District Officer: ${officerName} • District: ${districtName} (Maharashtra)`
              : `जिला पशुपालन अधिकारी: ${officerName} • जिला: ${districtName} (महाराष्ट्र)`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {isEnglish ? 'Block:' : 'ब्लॉक चुनें:'}
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="All">{isEnglish ? 'All Blocks (Entire District)' : 'सभी ब्लॉक (संपूर्ण जिला)'}</option>
              <option value="Baramati">Baramati (बारामती • Outbreak Active)</option>
              <option value="Shirur">Shirur (शिरूर)</option>
              <option value="Haveli">Haveli (हवेली)</option>
              <option value="Khed">Khed (खेड)</option>
              <option value="Indapur">Indapur (इंदापूर)</option>
            </select>
          </div>

          <button
            onClick={() => fetchData(selectedBlock)}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-stone-50 border border-slate-300 rounded-xl text-slate-600 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
            title="रिफ्रेश करें (Refresh)"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'Total Reports' : 'कुल मामले (Total)'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {summary?.totalReports ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">{isEnglish ? 'Logged cases' : 'दर्ज रोग रिपोर्ट'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'Active Cases' : 'सक्रिय मामले'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {summary?.activeCases ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">{isEnglish ? 'Under investigation' : 'निगरानी अधीन'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'Mortalities' : 'पशु मृत्यु (Deaths)'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
            {summary?.totalMortality ?? 0}
          </div>
          <span className="text-[10px] text-red-600 font-semibold">{isEnglish ? 'Reported deaths' : 'मृत्यु दर्ज'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'High / Critical' : 'गंभीर जोखिम'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {(summary?.triageMetrics?.criticalCount || 0) + (summary?.triageMetrics?.highCount || 0)}
          </div>
          <span className="text-[10px] text-slate-500">{isEnglish ? 'Triage elevated' : 'उच्च सतर्कता'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'Outbreaks' : 'सक्रिय प्रकोप (Outbreak)'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1 flex items-center gap-1">
            {summary?.triageMetrics?.outbreakCount || 0}
            {summary?.triageMetrics?.outbreakCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <span className="text-[10px] text-red-700 font-bold">{isEnglish ? 'Cluster Match' : 'क्लस्टर सक्रिय'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isEnglish ? 'Vaccination' : 'टीकाकरण %'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {summary?.vaccination?.coveragePct ?? 70}%
          </div>
          <span className="text-[10px] text-slate-500">{isEnglish ? 'District coverage' : 'जिला लक्ष्य कवरेज'}</span>
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
            सक्रिय
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
            {isEnglish
              ? 'Geospatial Outbreak & Risk Heatmap'
              : 'भू-स्थानिक प्रकोप एवं हॉटस्पॉट मानचित्र (GIS Heatmap)'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {reports.length} {isEnglish ? 'cases plotted' : 'मामले मैप पर प्रदर्शित'}
          </span>
        </div>
        <LeafletMap reports={reports || []} height="480px" />
      </div>

      {/* Charts Section: 30-Day Trends & Top Diseases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                {isEnglish ? 'Epidemiological 30-Day Curve' : '30-दिवसीय महामारी रुझान (Epidemic Curve)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEnglish
                  ? 'Daily reported cases, critical flags, and mortalities'
                  : 'दैनिक दर्ज मामले, गंभीर लक्षण एवं मृत्यु सांख्यिकी'}
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends || []}>
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
                  name={isEnglish ? 'Total Cases' : 'कुल मामले'}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCases)"
                />
                <Area
                  type="monotone"
                  dataKey="criticalCases"
                  name={isEnglish ? 'Critical Risk' : 'गंभीर मामले'}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCritical)"
                />
                <Area
                  type="monotone"
                  dataKey="mortalities"
                  name={isEnglish ? 'Deaths' : 'मृत्यु'}
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
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {isEnglish ? 'Top Suspected Diseases' : 'शीर्ष संदिग्ध रोग (AI Triage)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEnglish ? 'Disease candidate frequency' : 'एआई ट्राइएज द्वारा पहचाने गए मुख्य रोग'}
            </p>
          </div>

          <div className="h-64 flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              {(summary?.diseaseBreakdown || []).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 truncate max-w-[170px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-slate-600 font-mono">
                      {item.cases} {isEnglish ? 'cases' : 'मामले'} ({item.avgConfidencePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: COLORS[idx % COLORS.length],
                        width: `${Math.min(100, (item.cases / (summary?.totalReports || 1)) * 100)}%`
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
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {isEnglish ? 'Case Escalation Funnel' : 'केस नियंत्रण प्रगति (Case Funnel)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEnglish ? 'Clinical progression from report to containment' : 'पंजीकरण से रोकथाम तक की स्थिति'}
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
                <Bar dataKey="count" name={isEnglish ? 'Cases' : 'मामले'} fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Block Level Distribution */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {isEnglish ? 'Sub-District Burden' : 'ब्लॉक-वार रोग भार (Block Distribution)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEnglish ? 'Case volume and mortalities by block' : 'ब्लॉक स्तर पर दर्ज कुल मामले व मृत्यु संख्या'}
            </p>
          </div>

          <div className="space-y-3">
            {(summary?.blockDistribution || []).map((b, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-slate-900">{b._id || 'District'} Block</div>
                  <div className="text-[11px] text-slate-500">
                    {b.deaths > 0 ? (
                      <span className="text-red-600 font-bold">{b.deaths} मृत्यु दर्ज</span>
                    ) : (
                      'शून्य मृत्यु (Zero Mortalities)'
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 font-mono">{b.count}</span>
                  <div className="text-[10px] text-slate-400">{isEnglish ? 'cases' : 'मामले'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
