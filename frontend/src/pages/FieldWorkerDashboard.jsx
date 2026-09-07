import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import LabReferralModal from '../components/LabReferralModal';
import laboratoryService, { LAB_STATUS_STAGES } from '../services/laboratoryService';
import {
  Stethoscope,
  FlaskConical,
  ShieldAlert,
  MapPin,
  Clock,
  PlusCircle,
  Eye,
  AlertOctagon,
  Users,
  Activity,
  CheckCircle2,
  TrendingUp,
  Biohazard,
  Filter,
  Check
} from 'lucide-react';

export default function FieldWorkerDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [labSamples, setLabSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportForLab, setSelectedReportForLab] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'zoonotic' | 'laboratory'

  const loadData = async () => {
    try {
      setLoading(true);
      const repRes = await api.get('/reports?limit=15');
      setReports(repRes.data.reports || []);
      setLabSamples(laboratoryService.getSamples());
    } catch (err) {
      console.error('Error loading field vet data:', err);
      setLabSamples(laboratoryService.getSamples());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingVerification = reports.filter(
    (r) => r.status === 'Reported' || r.status === 'Triaged'
  );
  const activeOutbreaks = reports.filter((r) => r.triageResult?.outbreakFlag);
  const criticalCases = reports.filter((r) => r.triageResult?.riskLevel === 'Critical');

  // Realistic Zoonotic Surveillance records
  const ZOONOTIC_MONITORING = [
    {
      disease: 'Anthrax (एंथ्रेक्स)',
      location: 'Block Baramati, Pune',
      suspectedCases: 1,
      riskLevel: 'Critical',
      affectedSpecies: 'Bovine (Cattle)',
      humanExposureConcern: 'HIGH: Direct carcass contact or unboiled milk risk. Quarantined.',
      status: 'Containment Enforced'
    },
    {
      disease: 'Brucellosis (ब्रूसीलोसिस)',
      location: 'Block Haveli, Pune',
      suspectedCases: 2,
      riskLevel: 'High',
      affectedSpecies: 'Dairy Buffaloes',
      humanExposureConcern: 'MODERATE: Undulant fever risk in farm workers and milkers.',
      status: 'Serology Testing'
    },
    {
      disease: 'Rabies (रेबीज)',
      location: 'Block Khed, Pune',
      suspectedCases: 1,
      riskLevel: 'Critical',
      affectedSpecies: 'Canine / Stray Dog',
      humanExposureConcern: 'CRITICAL: Post-exposure prophylaxis (PEP) administered to 3 handlers.',
      status: 'Isolated'
    },
    {
      disease: 'Bovine Tuberculosis (टीबी)',
      location: 'Block Shirur, Pune',
      suspectedCases: 3,
      riskLevel: 'Moderate',
      affectedSpecies: 'Crossbred Cattle',
      humanExposureConcern: 'LOW TO MODERATE: Pasteurization mandated across cooperative dairies.',
      status: 'Tuberculin Skin Testing'
    }
  ];

  const handleUpdateLabStatus = (sampleId, newStatus) => {
    laboratoryService.updateSampleStatus(sampleId, newStatus);
    setLabSamples(laboratoryService.getSamples());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
      {/* Header with Professional Doctor Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                पशु चिकित्सा नियंत्रण केंद्र (Veterinary Command)
              </h1>
              <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                VET-PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {user?.name || 'Dr. Ananya Deshmukh'} • पशु चिकित्सालय: {user?.block || 'बारामती'} ({user?.district || 'पुणे'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/report-sick"
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>नया क्लिनिकल केस दर्ज करें</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">कुल सक्रिय केस</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{reports.length}</div>
          <span className="text-[10px] text-slate-400">ब्लॉक निगरानी</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">सत्यापन बाकी</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingVerification.length}</div>
          <span className="text-[10px] text-slate-400">ऑन-साइट विजिट देय</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">गंभीर केस (Critical)</span>
          <div className="text-2xl font-black text-red-600 mt-1">{criticalCases.length}</div>
          <span className="text-[10px] text-slate-400">आपातकालीन देखभाल</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">सक्रिय प्रकोप (5km)</span>
          <div className="text-2xl font-black text-purple-700 mt-1">{activeOutbreaks.length}</div>
          <span className="text-[10px] text-slate-400">बफर जोन लागू</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">लैब सैंपल्स</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{labSamples.length}</div>
          <span className="text-[10px] text-slate-400">डायग्नोस्टिक रेफरल</span>
        </div>
      </div>

      {/* Outbreak Alert Banner */}
      {activeOutbreaks.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 animate-pulse mt-1" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base uppercase tracking-wider">
                  ⚠️ उच्च प्राथमिकता: 5km प्रकोप बफर जोन सक्रिय (Baramati FMD Outbreak)
                </h3>
              </div>
              <p className="text-xs text-red-100 mt-0.5 max-w-2xl leading-relaxed">
                {activeOutbreaks[0].triageResult?.explanation || 'गत 14 दिनों में इस ब्लॉक में 3 से अधिक समान लक्षण दर्ज। रिंग टीकाकरण एवं पशु आवागमन प्रतिबंध अनिवार्य।'}
              </p>
            </div>
          </div>
          <Link
            to={`/reports/${activeOutbreaks[0]._id}`}
            className="px-4 py-2 rounded-xl bg-white text-red-700 font-extrabold text-xs hover:bg-red-50 transition shadow whitespace-nowrap"
          >
            एपीसेंटर केस की समीक्षा करें →
          </Link>
        </div>
      )}

      {/* Portal Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-4 text-xs font-extrabold">
        <button
          onClick={() => setActiveTab('cases')}
          className={`pb-3 px-2 border-b-2 transition ${
            activeTab === 'cases'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          📋 सक्रिय केस निगरानी कतार ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('zoonotic')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'zoonotic'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Biohazard className="w-4 h-4" />
          <span>ज़ूनोटिक रोग जोखिम निगरानी (Zoonotic Risk)</span>
        </button>

        <button
          onClick={() => setActiveTab('laboratory')}
          className={`pb-3 px-2 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'laboratory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>डायग्नोस्टिक लैब वर्कफ़्लो ({labSamples.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SURVEILLANCE QUEUE */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                सक्रिय केस सर्विलांस कतार (Active Surveillance Queue)
              </h2>
              <p className="text-xs text-slate-500">
                AI संदेहास्पद रोग, फील्ड सत्यापन, सैंपल संग्रहण एवं केस समाधान की स्थिति
              </p>
            </div>
            <Link to="/reports" className="text-xs font-bold text-blue-700 hover:underline">
              सभी केस देखें →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold">
                <tr>
                  <th className="px-6 py-3">केस ID</th>
                  <th className="px-4 py-3">प्रजाति</th>
                  <th className="px-4 py-3">गांव व ब्लॉक</th>
                  <th className="px-4 py-3">AI संदेहास्पद रोग</th>
                  <th className="px-4 py-3">जोखिम स्तर</th>
                  <th className="px-4 py-3">वर्तमान स्थिति</th>
                  <th className="px-6 py-3 text-right">कार्य (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                {reports.map((r) => {
                  const topDisease = r.triageResult?.suspectedDiseases?.[0];
                  return (
                    <tr key={r._id} className="hover:bg-stone-50/80 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {r.caseId}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-800 font-bold">
                          {r.species}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {r.location.village}, {r.location.block}
                      </td>
                      <td className="px-4 py-3.5">
                        {topDisease ? (
                          <div>
                            <div className="font-bold text-slate-900">{topDisease.name}</div>
                            <span className="text-[10px] text-emerald-700 font-bold">
                              {Math.round(topDisease.confidenceScore * 100)}% मैच
                            </span>
                          </div>
                        ) : (
                          'क्लिनिकल Triage'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.triageResult && <RiskBadge riskLevel={r.triageResult.riskLevel} size="sm" />}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedReportForLab(r._id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] inline-flex items-center gap-1 border border-indigo-200 transition"
                        >
                          <FlaskConical className="w-3 h-3" /> लैब रेफरल
                        </button>
                        <Link
                          to={`/reports/${r._id}`}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> विवरण
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ZOONOTIC RISK SURVEILLANCE PANEL */}
      {activeTab === 'zoonotic' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-5 text-xs text-red-900 leading-relaxed flex items-start gap-3">
            <Biohazard className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-sm block text-red-950 mb-0.5">
                ज़ूनोटिक रोग निगरानी (One Health Surveillance Protocol):
              </strong>
              पशुओं से मनुष्यों में फैलने वाली संक्रामक बीमारियों (एंथ्रेक्स, ब्रूसीलोसिस, रेबीज, टीबी) की रोकथाम हेतु क्लिनिकल निगरानी एवं मानव स्वास्थ्य विभागों के साथ त्वरित समन्वय।
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ZOONOTIC_MONITORING.map((z, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900">{z.disease}</h3>
                    <p className="text-xs text-slate-500 font-mono">📍 {z.location}</p>
                  </div>
                  <RiskBadge riskLevel={z.riskLevel} size="sm" />
                </div>

                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">प्रभावित प्रजाति:</span>
                    <span className="font-bold text-slate-800">{z.affectedSpecies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">संदेहास्पद मामले:</span>
                    <span className="font-bold text-red-600">{z.suspectedCases} पशु</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">प्रशासनिक स्थिति:</span>
                    <span className="font-bold text-emerald-700">{z.status}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                  <span className="font-bold text-amber-900 block mb-0.5">मानव जोखिम मूल्यांकन:</span>
                  <p>{z.humanExposureConcern}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTIC LABORATORY WORKFLOW */}
      {activeTab === 'laboratory' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                डायग्नोस्टिक सैंपल रेफरल ट्रैकर (Laboratory Workflow)
              </h2>
              <p className="text-xs text-slate-500">
                सैंपल संग्रह, शीत श्रृंखला (Cold Chain) परिवहन, आरटी-पीसीआर एवं सीरोलॉजिकल टेस्ट परिणाम
              </p>
            </div>
            <button
              onClick={() => setSelectedReportForLab('SAMPLE-NEW')}
              className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>नया सैंपल दर्ज करें</span>
            </button>
          </div>

          <div className="space-y-4">
            {labSamples.map((sample) => (
              <div
                key={sample.id}
                className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xs">
                      {sample.id.slice(-3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{sample.id}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-stone-200">
                          {sample.animalName} ({sample.animalTag})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {sample.suspectedDisease} • सैंपल: {sample.sampleType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-900 bg-indigo-100 px-3 py-1 rounded-full">
                      स्थिति: {sample.status}
                    </span>
                    <select
                      value={sample.status}
                      onChange={(e) => handleUpdateLabStatus(sample.id, e.target.value)}
                      className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
                    >
                      {LAB_STATUS_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status progression dots */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {LAB_STATUS_STAGES.map((st, i) => {
                    const currIndex = LAB_STATUS_STAGES.indexOf(sample.status);
                    const isPassed = i <= currIndex;
                    return (
                      <div
                        key={st}
                        className={`h-2 rounded-full transition ${
                          isPassed ? 'bg-indigo-600' : 'bg-stone-200'
                        }`}
                        title={st}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">अनुरोधित परीक्षण:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{sample.testRequested}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">प्रयोगशाला: {sample.referralLab}</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">डायग्नोस्टिक निष्कर्ष:</span>
                    <p className="font-semibold text-emerald-800 mt-0.5">{sample.finalResult || sample.interimResult}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">संग्रहकर्ता: {sample.collectorName} ({sample.collectionDate})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lab Referral Modal */}
      {selectedReportForLab && (
        <LabReferralModal
          reportId={selectedReportForLab}
          onClose={() => setSelectedReportForLab(null)}
          onUpdated={() => loadData()}
        />
      )}
    </div>
  );
}
