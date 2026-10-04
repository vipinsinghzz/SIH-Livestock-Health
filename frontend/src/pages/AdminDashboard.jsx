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
import { LivestockSaathiEmblem } from '../components/LivestockSaathiLogo';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Safe default fallback summary in case backend data is loading or offline (Nagpur District)
const DEFAULT_SUMMARY = {
  totalReports: 15,
  activeCases: 8,
  containedCases: 4,
  totalMortality: 2,
  totalAffected: 42,
  triageMetrics: {
    criticalCount: 4,
    highCount: 6,
    moderateCount: 4,
    lowCount: 1,
    outbreakCount: 2
  },
  diseaseBreakdown: [
    { name: 'Lumpy Skin Disease (LSD)', cases: 6, avgConfidencePct: 93 },
    { name: 'Contagious Ecthyma (Orf)', cases: 3, avgConfidencePct: 91 },
    { name: 'Peste des Petits Ruminants (PPR)', cases: 2, avgConfidencePct: 88 },
    { name: 'Foot and Mouth Disease (FMD)', cases: 2, avgConfidencePct: 90 },
    { name: 'Haemorrhagic Septicaemia (HS)', cases: 2, avgConfidencePct: 94 }
  ],
  statusFunnel: {
    Reported: 2,
    Triaged: 3,
    'Field Verified': 3,
    Escalated: 3,
    Contained: 3,
    Closed: 1
  },
  blockDistribution: [
    { _id: 'Saoner', count: 6, deaths: 1 },
    { _id: 'Kamptee', count: 3, deaths: 0 },
    { _id: 'Hingna', count: 2, deaths: 0 },
    { _id: 'Ramtek', count: 2, deaths: 1 },
    { _id: 'Kalmeshwar', count: 2, deaths: 0 }
  ],
  vaccination: {
    totalTarget: 25000,
    totalCovered: 18450,
    coveragePct: 74
  },
  labPipeline: {
    'Result Confirmed': 2,
    Received: 1,
    'In Transit': 2
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || user?.preferredLanguage || 'en').split('-')[0].toLowerCase();
  const isMr = currentLang === 'mr';
  const isHi = currentLang === 'hi';
  const isEn = !isMr && !isHi;
  const tr = (en, mr, hi) => (isMr ? (mr || en) : isHi ? (hi || mr || en) : en);

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
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
          <LivestockSaathiEmblem size={40} className="drop-shadow-xs animate-pulse" />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          {tr('Loading surveillance command dashboard...', 'साथी रोग पाळत कमांड डॅशबोर्ड लोड होत आहे...', 'रोग निगरानी कमांड डैशबोर्ड लोड हो रहा है...')}
        </p>
      </div>
    );
  }

  // Format status funnel data for chart
  const funnelData = Object.keys(summary?.statusFunnel || {}).map((key) => ({
    status: key,
    count: summary.statusFunnel[key] || 0
  }));

  const getCleanOfficerName = () => {
    const raw = user?.name || '';
    if (raw.includes('(')) {
      const match = raw.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return isEn ? match[1].trim() : match[2].trim();
      }
    }
    if (user?.role === 'officer') {
      return tr('Dr. Vivek Joshi', 'डॉ. विवेक जोशी', 'डॉ. विवेक जोशी');
    }
    return raw || tr('Dr. Vivek Joshi', 'डॉ. विवेक जोशी', 'डॉ. विवेक जोशी');
  };

  const officerName = getCleanOfficerName();
  const districtName = isEn ? 'Nagpur' : isMr ? 'नागपूर' : 'नागपुर';
  const stateName = isEn ? 'Maharashtra' : isMr ? 'महाराष्ट्र' : 'महाराष्ट्र';

  return (
    <div className="app-page dashboard-page admin-dashboard space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
      {/* Top Banner & Block Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3.5">
          <LivestockSaathiEmblem size={52} className="shrink-0 drop-shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {tr(
                  'Epidemiological Surveillance Command Center',
                  'साथी रोग पाळत व नियंत्रण केंद्र',
                  'रोग निगरानी एवं नियंत्रण केंद्र'
                )}
              </h1>
              <span className="bg-purple-100 text-purple-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                {tr('OFFICER COMMAND', 'अधिकारी कमान', 'अधिकारी कमान')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {tr(
                `District Officer: ${officerName} • District: ${districtName} (${stateName})`,
                `जिल्हा पशुसंवर्धन अधिकारी: ${officerName} • जिल्हा: ${districtName} (${stateName})`,
                `जिला पशुपालन अधिकारी: ${officerName} • जिला: ${districtName} (${stateName})`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              {tr('Block:', 'तालुका:', 'ब्लॉक चुनें:')}
            </label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="text-xs font-bold text-slate-800 focus:outline-none bg-transparent cursor-pointer"
            >
              <option value="All">{tr('All Blocks (Nagpur District)', 'सर्व तालुके (नागपूर जिल्हा)', 'सभी ब्लॉक (नागपुर जिला)')}</option>
              <option value="Saoner">{tr('Saoner (LSD Containment Active)', 'सावनेर (लम्पी प्रतिबंधक कक्ष सक्रिय)', 'सावनेर (लंपी रोकथाम सक्रिय)')}</option>
              <option value="Kamptee">{tr('Kamptee', 'कामठी', 'कामठी')}</option>
              <option value="Hingna">{tr('Hingna', 'हिंगणा', 'हिंगणा')}</option>
              <option value="Ramtek">{tr('Ramtek', 'रामटेक', 'रामटेक')}</option>
              <option value="Kalmeshwar">{tr('Kalmeshwar', 'कलमेश्वर', 'कलमेश्वर')}</option>
              <option value="Umred">{tr('Umred', 'उमरेड', 'उमरेड')}</option>
            </select>
          </div>

          <button
            onClick={() => fetchData(selectedBlock)}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-stone-50 border border-slate-300 rounded-xl text-slate-600 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
            title={tr('Refresh Telemetry', 'डेटा रिफ्रेश करा', 'रिफ्रेश करें')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
    </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Total Reports', 'एकूण अहवाल', 'कुल मामले')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {summary?.totalReports ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Logged cases', 'नोंदणीकृत प्रकरणे', 'दर्ज रोग रिपोर्ट')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Active Cases', 'सक्रिय प्रकरणे', 'सक्रिय मामले')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {summary?.activeCases ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Under investigation', 'तपासणी सुरू', 'निगरानी अधीन')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Mortalities', 'पशु मृत्यू', 'पशु मृत्यु')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
            {summary?.totalMortality ?? 0}
          </div>
          <span className="text-[10px] text-red-600 font-semibold">{tr('Reported deaths', 'नोंदवलेले मृत्यू', 'मृत्यु दर्ज')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('High / Critical', 'गंभीर / अति-जोखिम', 'गंभीर जोखिम')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {(summary?.triageMetrics?.criticalCount || 0) + (summary?.triageMetrics?.highCount || 0)}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Triage elevated', 'उच्च सतर्कता', 'उच्च सतर्कता')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Outbreaks', 'सक्रिय उद्रेक', 'सक्रिय प्रकोप')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1 flex items-center gap-1">
            {summary?.triageMetrics?.outbreakCount || 0}
            {summary?.triageMetrics?.outbreakCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <span className="text-[10px] text-red-700 font-bold">{tr('Cluster Active', 'क्लस्टर सक्रिय', 'क्लस्टर सक्रिय')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Vaccination', 'लसीकरण %', 'टीकाकरण %')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {summary?.vaccination?.coveragePct ?? 70}%
          </div>
          <span className="text-[10px] text-slate-500">{tr('District coverage', 'जिल्हा कव्हरेज', 'जिला लक्ष्य कवरेज')}</span>
        </div>
      </div>

      {/* District Veterinary Capacity & Diagnostic Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-emerald-900 block">{tr('Veterinary Capacity', 'पशुवैद्यकीय क्षमता', 'पशु चिकित्सा क्षमता')}</span>
            <span className="text-slate-600">{tr('22 Active Dispensaries • 14 Mobile Vans (1962)', '२२ सक्रिय दवाखाने • १४ फिरते पथके (१९६२)', '22 सक्रिय डिस्पेंसरी • 14 मोबाइल वैन (1962)')}</span>
          </div>
          <span className="bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            {tr('92% Operational', '९२% कार्यान्वित', '92% चालू')}
          </span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-blue-900 block">{tr('Lab Diagnostic Status', 'प्रयोगशाळा निदान स्थिती', 'प्रयोगशाला स्थिति')}</span>
            <span className="text-slate-600">{tr('Avg RT-PCR turnaround: 36 hrs', 'सरासरी RT-PCR वेळ: ३६ तास', 'औसत आरटी-पीसीआर टर्नअराउंड: 36 घंटे')}</span>
          </div>
          <span className="bg-blue-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            {tr('Operational', 'सक्रिय', 'सक्रिय')}
          </span>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-purple-900 block">{tr('National Disease Control (NADCP)', 'राष्ट्रीय पशुरोग नियंत्रण कार्यक्रम', 'राष्ट्रीय पशुधन नियंत्रण (NADCP)')}</span>
            <span className="text-slate-600">{tr('FMD Cycle 4: 12,400 cattle immunized', 'FMD फेरी ४: १२,४०० जनावरांचे लसीकरण', 'FMD चक्र 4: 12,400 गाय/भैंस प्रतिरक्षित')}</span>
          </div>
          <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 rounded-lg text-xs">
            {tr('Phase 2', 'टप्पा २', 'चरण 2')}
          </span>
        </div>
      </div>

      {/* Geospatial Risk Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {tr(
              'Geospatial Outbreak & Risk Heatmap',
              'भू-स्थानिक उद्रेक व जोखीम नकाशा',
              'भू-स्थानिक प्रकोप एवं हॉटस्पॉट मानचित्र'
            )}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {reports.length} {tr('cases plotted', 'प्रकरणे नकाशावर', 'मामले मैप पर प्रदर्शित')}
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
                {tr('Epidemiological 30-Day Curve', '३०-दिवसीय महामारी वक्र', '30-दिवसीय महामारी रुझान')}
              </h3>
              <p className="text-xs text-slate-500">
                {tr(
                  'Daily reported cases, critical flags, and mortalities',
                  'दैनिक नोंदणीकृत प्रकरणे, गंभीर लक्षणे व मृत्यू सांख्यिकी',
                  'दैनिक दर्ज मामले, गंभीर लक्षण एवं मृत्यु सांख्यिकी'
                )}
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
                  name={tr('Total Cases', 'एकूण प्रकरणे', 'कुल मामले')}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCases)"
                />
                <Area
                  type="monotone"
                  dataKey="criticalCases"
                  name={tr('Critical Risk', 'गंभीर जोखीम', 'गंभीर मामले')}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCritical)"
                />
                <Area
                  type="monotone"
                  dataKey="mortalities"
                  name={tr('Deaths', 'मृत्यू', 'मृत्यु')}
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
              {tr('Top Suspected Diseases (AI Triage)', 'प्रमुख संशयित आजार (AI ट्रायज)', 'शीर्ष संदिग्ध रोग (AI ट्रायज)')}
            </h3>
            <p className="text-xs text-slate-500">
              {tr('Disease candidate frequency', 'एआय द्वारे ओळखलेले संभाव्य आजार', 'एआई ट्राइएज द्वारा पहचाने गए मुख्य रोग')}
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
                      {item.cases} {tr('cases', 'प्रकरणे', 'मामले')} ({item.avgConfidencePct}%)
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
              {tr('Case Escalation Funnel', 'प्रकरण नियंत्रण प्रगती', 'केस नियंत्रण प्रगति')}
            </h3>
            <p className="text-xs text-slate-500">
              {tr('Clinical progression from report to containment', 'नोंदणी ते प्रतिबंधापर्यंतची स्थिती', 'पंजीकरण से रोकथाम तक की स्थिति')}
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
                <Bar dataKey="count" name={tr('Cases', 'प्रकरणे', 'मामले')} fill="#3b82f6" radius={[6, 6, 0, 0]}>
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
              {tr('Sub-District Burden', 'तालुका-निहाय आजार भार', 'ब्लॉक-वार रोग भार')}
            </h3>
            <p className="text-xs text-slate-500">
              {tr('Case volume and mortalities by block', 'तालुका स्तरावर नोंदवलेले आजार व मृत्यू', 'ब्लॉक स्तर पर दर्ज कुल मामले व मृत्यु संख्या')}
            </p>
          </div>

          <div className="space-y-3">
            {(summary?.blockDistribution || []).map((b, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-slate-900">
                    {b._id || 'District'} {tr('Block', 'तालुका', 'ब्लॉक')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {b.deaths > 0 ? (
                      <span className="text-red-600 font-bold">{b.deaths} {tr('deaths reported', 'मृत्यू नोंदवले', 'मृत्यु दर्ज')}</span>
                    ) : (
                      tr('Zero Mortalities', 'शून्य मृत्यू', 'शून्य मृत्यु')
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 font-mono">{b.count}</span>
                  <div className="text-[10px] text-slate-400">{tr('cases', 'प्रकरणे', 'मामले')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
