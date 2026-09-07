import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import LabReferralModal from '../components/LabReferralModal';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  ShieldAlert,
  Cpu,
  AlertTriangle,
  FlaskConical,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Share2
} from 'lucide-react';

const customPin = L.divIcon({
  html: `<div style="width: 28px; height: 28px; background: #ef4444; border: 3px solid white; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
  className: 'custom-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const ESCALATION_STEPS = ['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed'];

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data.report);
    } catch (err) {
      console.error('Error fetching report detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await api.patch(`/reports/${id}/status`, { status: newStatus });
      await fetchReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  const triage = report.triageResult;
  const isOfficerOrVet = ['field_worker', 'officer', 'admin'].includes(user?.role);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← सभी मामलों पर लौटें (Back to Case Registry)</span>
        </Link>
      </div>

      {/* Case Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {report.caseId}
              </span>
              <StatusBadge status={report.status} size="lg" />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              पंजीकरण समय: {new Date(report.createdAt).toLocaleString('hi-IN')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {triage && <RiskBadge riskLevel={triage.riskLevel} showAiTag={true} size="lg" />}

            {isOfficerOrVet && (
              <button
                onClick={() => setLabModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <FlaskConical className="w-4 h-4" />
                <span>प्रयोगशाला रेफरल (Lab Referral)</span>
              </button>
            )}
          </div>
        </div>

        {/* Case Escalation Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>केस जीवन-चक्र स्थिति (Case Lifecycle):</span>
            {isOfficerOrVet && <span className="text-emerald-700">स्थिति बदलने हेतु क्लिक करें</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {ESCALATION_STEPS.map((step) => {
              const isCurrent = report.status === step;
              const isPast = ESCALATION_STEPS.indexOf(report.status) >= ESCALATION_STEPS.indexOf(step);

              return (
                <button
                  key={step}
                  type="button"
                  disabled={!isOfficerOrVet || statusUpdating}
                  onClick={() => handleUpdateStatus(step)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold'
                      : 'bg-stone-50 text-slate-400 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {step === 'Reported' ? 'दर्ज (Reported)' : step === 'Triaged' ? 'जांचित (Triaged)' : step === 'Field Verified' ? 'सत्यापित (Verified)' : step === 'Escalated' ? 'अग्रेषित (Escalated)' : step === 'Contained' ? 'नियंत्रित (Contained)' : 'समाप्त (Closed)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outbreak Flag Banner */}
        {triage?.outbreakFlag && (
          <div className="p-4 rounded-2xl bg-red-600 text-white shadow-md flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                ⚠️ सक्रिय प्रकोप क्लस्टर चेतावनी (Outbreak Cluster Detected)
              </h3>
              <p className="text-xs text-red-100 mt-1">
                {triage.explanation}
              </p>
            </div>
          </div>
        )}

        {/* AI Triage Diagnosis Card */}
        {triage && (
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  पशु एआई ट्राइएज मूल्यांकन (AI Veterinary Assessment)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                मॉडल: {triage.modelVersion}
              </span>
            </div>

            {/* Suspected Diseases */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600">संभावित बीमारियां (Differential Diagnoses):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(triage.suspectedDiseases || []).map((dis, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-stone-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{dis.name}</span>
                      <span className="font-extrabold text-emerald-700 font-mono">
                        {Math.round(dis.confidenceScore * 100)}% संभावना
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${Math.round(dis.confidenceScore * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> अनुशंसित तात्कालिक कदम (Recommended Action)
              </div>
              <p className="text-amber-950 font-medium">{triage.recommendedAction}</p>
            </div>

            {/* Medical disclaimer */}
            <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
              ℹ️ प्रारंभिक AI आकलन केवल सहायता हेतु है — अंतिम पुष्टि अधिकृत पशु चिकित्सक द्वारा की जानी चाहिए।
            </p>
          </div>
        )}

        {/* Clinical Presentation & Location Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left: Clinical Presentation */}
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-stone-100 pb-2">
              नैदानिक लक्षण एवं पशु स्थिति (Clinical Presentation)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-slate-400 font-medium">पशु प्रजाति</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {report.species === 'Cattle' ? '🐄 गाय (Cattle)' : report.species === 'Buffalo' ? '🦬 भैंस (Buffalo)' : report.species === 'Goat' ? '🐐 बकरी (Goat)' : report.species}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-slate-400 font-medium">मृत्यु संख्या (Deaths)</span>
                <p className={`text-sm font-black mt-0.5 ${report.mortalityCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {report.mortalityCount} मृत पशु
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-slate-400 font-medium">प्रभावित पशु (Affected)</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{report.affectedCount} पशु</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-slate-400 font-medium">रिपोर्टकर्ता</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{report.reporterId?.name || 'स्थानीय किसान'}</p>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-2">दर्ज किए गए लक्षण:</span>
              <div className="flex flex-wrap gap-1.5">
                {(report.symptoms || []).map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {report.notes && (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="font-bold text-slate-700">फील्ड टिप्पणी / विशेष विवरण:</span>
                <p className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{report.notes}</p>
              </div>
            )}

            {/* Photos */}
            {report.photos && report.photos.length > 0 && (
              <div>
                <span className="font-bold text-slate-700 block mb-2">संलग्न तस्वीरें:</span>
                <div className="flex flex-wrap gap-2.5">
                  {report.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Case asset ${i}`}
                      className="w-24 h-24 rounded-2xl object-cover border border-stone-200 shadow-xs"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Location & Mini Map */}
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-stone-100 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700" />
              भौगोलिक एवं एपिडेमियोलॉजिकल स्थान
            </h3>
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">ग्राम (Village):</span>
                <span className="font-bold text-slate-900">{report.location.village}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ब्लॉक / तहसील:</span>
                <span className="font-bold text-slate-900">{report.location.block}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">जिला:</span>
                <span className="font-bold text-slate-900">{report.location.district}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-200 text-[11px] font-mono text-slate-500">
                <span>निर्देशांक:</span>
                <span>{report.location.lat}, {report.location.lng}</span>
              </div>
            </div>

            {/* Mini Map */}
            <div className="h-44 rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
              <MapContainer
                center={[report.location.lat, report.location.lng]}
                zoom={12}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[report.location.lat, report.location.lng]}
                  icon={customPin}
                />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Diagnostic Lab Referral Section */}
        <div className="pt-5 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-black text-slate-900">
                रोग निदान प्रयोगशाला नमूने एवं रेफरल श्रृंखला (Lab Samples)
              </h3>
            </div>
            {isOfficerOrVet && (
              <button
                onClick={() => setLabModalOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                + नया लैब रेफरल जोड़ें
              </button>
            )}
          </div>

          {(report.labReferrals || []).length === 0 ? (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center text-slate-400 text-xs">
              इस मामले के लिए अभी तक कोई प्रयोगशाला नमूना पंजीकृत नहीं है।
            </div>
          ) : (
            <div className="space-y-2">
              {report.labReferrals.map((ref) => (
                <div
                  key={ref._id}
                  className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{ref.sampleType}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {ref.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">{ref.referredLab}</div>
                    {ref.resultSummary?.confirmedDisease && (
                      <div className="text-emerald-800 font-bold text-xs pt-1">
                        ✓ पुष्टि परिणाम: {ref.resultSummary.confirmedDisease}
                      </div>
                    )}
                  </div>

                  {isOfficerOrVet && (
                    <button
                      onClick={() => setLabModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-slate-800 font-bold hover:bg-stone-50 shadow-xs"
                    >
                      स्थिति अपडेट करें
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lab Modal */}
      {labModalOpen && (
        <LabReferralModal
          reportId={report._id}
          existingReferral={report.labReferrals?.[0]}
          onClose={() => setLabModalOpen(false)}
          onUpdated={() => fetchReport()}
        />
      )}
    </div>
  );
}
