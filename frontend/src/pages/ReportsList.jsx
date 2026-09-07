import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import {
  Search,
  Filter,
  PlusCircle,
  ShieldAlert,
  Eye,
  FileText,
  Calendar,
  MapPin
} from 'lucide-react';

export default function ReportsList() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [outbreakOnly, setOutbreakOnly] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [selectedBlock, selectedRisk, selectedStatus, outbreakOnly]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBlock) params.append('block', selectedBlock);
      if (selectedRisk) params.append('riskLevel', selectedRisk);
      if (selectedStatus) params.append('status', selectedStatus);
      if (outbreakOnly) params.append('outbreakOnly', 'true');

      const res = await api.get(`/reports?${params.toString()}`);
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Error fetching reports list:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.caseId?.toLowerCase().includes(term) ||
      r.species?.toLowerCase().includes(term) ||
      r.location?.village?.toLowerCase().includes(term) ||
      (r.symptoms || []).some((s) => s.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            रोग निगरानी एवं केस रिपोर्ट • Epidemiological Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            पशु रोग मामले (Disease Cases &amp; Triage)
          </h1>
          <p className="text-xs text-slate-500">
            ब्लॉक, ग्राम एवं जोखिम स्तर के अनुसार दर्ज रोग मामले एवं एआई ट्राइएज परिणाम
          </p>
        </div>

        <Link
          to="/report-sick"
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ नया केस दर्ज करें (New Report)</span>
        </Link>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="केस आईडी, लक्षण या गांव खोजें..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Block Filter */}
          <div>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            >
              <option value="">सभी ब्लॉक (All Blocks)</option>
              <option value="Baramati">Baramati</option>
              <option value="Shirur">Shirur</option>
              <option value="Haveli">Haveli</option>
              <option value="Khed">Khed</option>
              <option value="Indapur">Indapur</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            >
              <option value="">सभी जोखिम स्तर (All Risk)</option>
              <option value="Critical">🔴 Critical (गंभीर)</option>
              <option value="High">🟠 High (उच्च)</option>
              <option value="Moderate">🟡 Moderate (मध्यम)</option>
              <option value="Low">🟢 Low (सामान्य)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            >
              <option value="">सभी स्थितियां (All Status)</option>
              <option value="Reported">Reported (दर्ज)</option>
              <option value="Triaged">Triaged (जांचित)</option>
              <option value="Field Verified">Field Verified (सत्यापित)</option>
              <option value="Escalated">Escalated (अग्रेषित)</option>
              <option value="Contained">Contained (नियंत्रित)</option>
              <option value="Closed">Closed (समाप्त)</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOutbreakOnly(!outbreakOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              outbreakOnly
                ? 'bg-red-50 border-red-300 text-red-700 font-black'
                : 'bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>केवल प्रकोप क्लस्टर (Outbreaks Only)</span>
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-xs font-medium">कोई मेल खाता रोग मामला नहीं मिला।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold">
                <tr>
                  <th className="px-6 py-3.5">केस आईडी</th>
                  <th className="px-4 py-3.5">पशु प्रजाति</th>
                  <th className="px-4 py-3.5">लक्षण (Symptoms)</th>
                  <th className="px-4 py-3.5">स्थान (Location)</th>
                  <th className="px-4 py-3.5">एआई निदान (AI Triage)</th>
                  <th className="px-4 py-3.5">जोखिम (Risk)</th>
                  <th className="px-4 py-3.5">स्थिति (Status)</th>
                  <th className="px-6 py-3.5 text-right">विवरण (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                {filteredReports.map((report) => {
                  const topDisease = report.triageResult?.suspectedDiseases?.[0];
                  const isOutbreak = report.triageResult?.outbreakFlag;

                  return (
                    <tr key={report._id} className="hover:bg-stone-50/70 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {report.caseId}
                        {isOutbreak && (
                          <span className="block text-[10px] text-red-600 font-black tracking-wider uppercase mt-0.5">
                            ⚠️ क्लस्टर प्रकोप
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-slate-800 font-bold">
                          {report.species === 'Cattle' ? '🐄 गाय' : report.species === 'Buffalo' ? '🦬 भैंस' : report.species === 'Goat' ? '🐐 बकरी' : report.species}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate" title={report.symptoms?.join(', ')}>
                        {report.symptoms?.join(', ')}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="font-semibold text-slate-800">{report.location?.village}</span>, {report.location?.block}
                      </td>
                      <td className="px-4 py-3.5">
                        {topDisease ? (
                          <div>
                            <div className="font-bold text-slate-900">{topDisease.name}</div>
                            <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                              {Math.round(topDisease.confidenceScore * 100)}% संभावना
                            </span>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {report.triageResult && (
                          <RiskBadge riskLevel={report.triageResult.riskLevel} size="sm" />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={report.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/reports/${report._id}`}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-800 font-bold inline-flex items-center gap-1.5 transition border border-stone-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-700" /> विवरण देखें
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
