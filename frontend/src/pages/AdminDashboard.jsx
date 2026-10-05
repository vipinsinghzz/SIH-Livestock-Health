import React, { useState, useEffect, useMemo } from 'react';
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || user?.preferredLanguage || 'en').split('-')[0].toLowerCase();
  const isMr = currentLang === 'mr';
  const isHi = currentLang === 'hi';
  const isEn = !isMr && !isHi;
  const tr = (en, mr, hi) => (isMr ? (mr || en) : isHi ? (hi || mr || en) : en);

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

      const [trendRes, repRes] = await Promise.allSettled([
        api.get(`/dashboard/trends${blockQuery}`),
        api.get(`/reports${reportsQuery}`)
      ]);

      if (trendRes.status === 'fulfilled' && Array.isArray(trendRes.value.data?.data)) {
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

  // Compute live real summary metrics strictly from loaded database reports
  const realSummary = useMemo(() => {
    if (!reports || reports.length === 0) {
      return {
        totalReports: 0,
        activeCases: 0,
        containedCases: 0,
        totalMortality: 0,
        triageMetrics: { criticalCount: 0, highCount: 0, outbreakCount: 0 },
        diseaseBreakdown: [],
        statusFunnel: {},
        blockDistribution: []
      };
    }

    const totalReports = reports.length;
    let totalMortality = 0;
    let criticalCount = 0;
    let highCount = 0;
    let outbreakCount = 0;
    let activeCases = 0;
    const funnel = {
      Reported: 0,
      Triaged: 0,
      'Field Verified': 0,
      Escalated: 0,
      Contained: 0,
      Closed: 0
    };
    const diseaseMap = {};
    const blockMap = {};

    reports.forEach((r) => {
      const deaths = Number(r.mortalityCount || 0);
      totalMortality += deaths;

      const risk = r.triageResult?.riskLevel || r.riskLevel || r.urgency;
      if (risk === 'Critical') criticalCount++;
      else if (risk === 'High') highCount++;
      if (r.triageResult?.outbreakFlag) outbreakCount++;

      const st = r.status || 'Reported';
      if (['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Investigating', 'Confirmed'].includes(st)) {
        activeCases++;
      }
      if (funnel[st] !== undefined) {
        funnel[st]++;
      } else {
        funnel[st] = 1;
      }

      // Disease breakdown
      const rawDisease = r.triageResult?.suspectedDiseases?.[0]?.name || r.suspectedDisease || r.disease || r.species || 'General';
      const cleanDisease = rawDisease.replace(/\s*\([^)]*\)/g, '').trim();
      const confScore = r.triageResult?.suspectedDiseases?.[0]?.confidenceScore || r.triageResult?.visualScore;
      const confPct = typeof confScore === 'number' && confScore > 0 ? Math.round(confScore * 100) : null;

      if (!diseaseMap[cleanDisease]) {
        diseaseMap[cleanDisease] = { name: cleanDisease, cases: 0, totalConf: 0, confCount: 0 };
      }
      diseaseMap[cleanDisease].cases += 1;
      if (confPct) {
        diseaseMap[cleanDisease].totalConf += confPct;
        diseaseMap[cleanDisease].confCount += 1;
      }

      // Block distribution
      const blk = r.block || r.location?.block || 'Other';
      if (!blockMap[blk]) {
        blockMap[blk] = { _id: blk, count: 0, deaths: 0 };
      }
      blockMap[blk].count += 1;
      blockMap[blk].deaths += deaths;
    });

    const diseaseBreakdown = Object.values(diseaseMap)
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 5)
      .map((d) => ({
        name: d.name,
        cases: d.cases,
        avgConfidencePct: d.confCount > 0 ? Math.round(d.totalConf / d.confCount) : null
      }));

    const blockDistribution = Object.values(blockMap).sort((a, b) => b.count - a.count);

    return {
      totalReports,
      activeCases,
      totalMortality,
      triageMetrics: { criticalCount, highCount, outbreakCount },
      diseaseBreakdown,
      statusFunnel: funnel,
      blockDistribution
    };
  }, [reports]);

  // Compute 30-Day epidemiological temporal curve from real data
  const computedTrends = useMemo(() => {
    if (Array.isArray(trends) && trends.some((t) => (t.cases || 0) > 0 || (t.criticalCases || 0) > 0 || (t.mortalities || 0) > 0)) {
      return trends;
    }

    if (!reports || reports.length === 0) {
      return [];
    }

    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      dateMap[dateKey] = {
        date: dateKey,
        displayDate: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
        cases: 0,
        criticalCases: 0,
        mortalities: 0
      };
    }

    let hasAnyData = false;
    reports.forEach((r) => {
      if (!r.createdAt) return;
      const dateKey = new Date(r.createdAt).toISOString().slice(0, 10);
      if (dateMap[dateKey]) {
        dateMap[dateKey].cases += 1;
        dateMap[dateKey].mortalities += Number(r.mortalityCount || 0);
        const risk = r.triageResult?.riskLevel || r.riskLevel || r.urgency;
        if (risk === 'Critical' || risk === 'High' || r.status === 'Escalated') {
          dateMap[dateKey].criticalCases += 1;
        }
        hasAnyData = true;
      }
    });

    return hasAnyData ? Object.values(dateMap) : [];
  }, [trends, reports]);

  // Format status funnel data for chart
  const funnelData = useMemo(() => {
    const raw = realSummary?.statusFunnel || {};
    return Object.keys(raw).map((key) => ({
      status: key,
      count: raw[key] || 0
    }));
  }, [realSummary]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Total Reports', 'एकूण अहवाल', 'कुल मामले')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {realSummary.totalReports}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Logged cases', 'नोंदणीकृत प्रकरणे', 'दर्ज रोग रिपोर्ट')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Active Cases', 'सक्रिय प्रकरणे', 'सक्रिय मामले')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
            {realSummary.activeCases}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Under investigation', 'तपासणी सुरू', 'निगरानी अधीन')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Mortalities', 'पशु मृत्यू', 'पशु मृत्यु')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
            {realSummary.totalMortality}
          </div>
          <span className="text-[10px] text-red-600 font-semibold">{tr('Reported deaths', 'नोंदवलेले मृत्यू', 'मृत्यु दर्ज')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('High / Critical', 'गंभीर / अति-जोखिम', 'गंभीर जोखिम')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">
            {(realSummary.triageMetrics?.criticalCount || 0) + (realSummary.triageMetrics?.highCount || 0)}
          </div>
          <span className="text-[10px] text-slate-500">{tr('Triage elevated', 'उच्च सतर्कता', 'उच्च सतर्कता')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {tr('Outbreaks', 'सक्रिय उद्रेक', 'सक्रिय प्रकोप')}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1 flex items-center gap-1">
            {realSummary.triageMetrics?.outbreakCount || 0}
            {(realSummary.triageMetrics?.outbreakCount || 0) > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <span className="text-[10px] text-red-700 font-bold">{tr('Cluster Active', 'क्लस्टर सक्रिय', 'क्लस्टर सक्रिय')}</span>
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
            {computedTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={computedTrends}>
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-stone-50/60 rounded-xl border border-dashed border-stone-200">
                <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {tr('No Epidemiological Curve Data in 30-Day Window', '३० दिवसांच्या कालावधीत महामारी कल उपलब्ध नाही', '30-दिवसीय अवधि में कोई महामारी रुझान डेटा दर्ज नहीं')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  {tr('No verified disease incidents recorded in this jurisdiction for the past 30 days.', 'मागील ३० दिवसांत या कार्यक्षेत्रात कोणतीही घटना नोंदवली गेलेली नाही.', 'पिछले 30 दिनों में इस अधिकार क्षेत्र में कोई घटना दर्ज नहीं की गई है।')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top Suspected Diseases */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {tr('Top Suspected Diseases (AI Triage)', 'प्रमुख संशयित आजार (AI ट्रायज)', 'शीर्ष संदिग्ध रोग (AI ट्रायज)')}
            </h3>
            <p className="text-xs text-slate-500">
              {tr('Disease candidate frequency from verified reports', 'सत्यापित अहवालांमधून संभाव्य आजार वारंवारता', 'सत्यापित रिपोर्ट से संभावित रोग आवृत्ति')}
            </p>
          </div>

          <div className="h-64 flex flex-col justify-between">
            {realSummary.diseaseBreakdown.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1">
                {realSummary.diseaseBreakdown.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate max-w-[170px]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-slate-600 font-mono text-[11px]">
                        {item.cases} {tr('cases', 'प्रकरणे', 'मामले')}
                        {typeof item.avgConfidencePct === 'number' && ` (${item.avgConfidencePct}%)`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: COLORS[idx % COLORS.length],
                          width: `${Math.min(100, (item.cases / (realSummary.totalReports || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
                <ShieldAlert className="w-6 h-6 text-slate-300 mb-1" />
                <span>{tr('No disease records logged', 'कोणतीही नोंद उपलब्ध नाही', 'कोई रोग रिकॉर्ड दर्ज नहीं')}</span>
              </div>
            )}
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
            {realSummary.totalReports > 0 ? (
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
                <Activity className="w-6 h-6 text-slate-300 mb-1" />
                <span>{tr('Funnel data unavailable', 'माहिती उपलब्ध नाही', 'डेटा उपलब्ध नहीं')}</span>
              </div>
            )}
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
            {realSummary.blockDistribution.length > 0 ? (
              realSummary.blockDistribution.map((b, idx) => (
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
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                {tr('No sub-district cases logged', 'कोणतीही तालुका नोंद उपलब्ध नाही', 'कोई ब्लॉक रिकॉर्ड दर्ज नहीं')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
