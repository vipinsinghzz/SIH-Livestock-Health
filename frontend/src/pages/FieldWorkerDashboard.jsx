import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import LabReferralModal from '../components/LabReferralModal';
import laboratoryService, { LAB_STATUS_STAGES } from '../services/laboratoryService';
import LeafletMap from '../components/LeafletMap';
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
  Check,
  Radio,
  PhoneCall,
  AlertTriangle,
  FileEdit,
  Send,
  BellRing,
  Navigation,
  X,
  Loader2,
  Syringe,
  Layers,
  Sparkles,
  RefreshCw,
  Compass,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import caseService from '../services/caseService';
import ReportsList from './ReportsList';
import { LivestockSaathiEmblem } from '../components/LivestockSaathiLogo';

export default function FieldWorkerDashboard({ initialModule }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');

  // Dynamic user jurisdiction from authenticated profile (NEVER hardcoded)
  const userDistrict = user?.district || 'Pune';
  const userBlock = user?.block || 'Baramati';

  // Active view: 'command-center' | 'cases' | 'outbreaks' | 'surveillance' | 'zoonotic' | 'laboratory' | 'containment-vaccination'
  const getActiveView = () => {
    if (initialModule) {
      if (initialModule === 'referrals') return 'cases';
      return initialModule;
    }
    const path = location.pathname;
    if (path.includes('/vet/cases')) return 'cases';
    if (path.includes('/vet/outbreaks')) return 'outbreaks';
    if (path.includes('/vet/surveillance')) return 'surveillance';
    if (path.includes('/vet/zoonotic-diseases') || path.includes('/vet/zoonotic')) return 'zoonotic';
    if (path.includes('/vet/diagnostic-lab') || path.includes('/vet/laboratory')) return 'laboratory';
    if (path.includes('/vet/containment-vaccination') || path.includes('/vet/containment')) return 'containment-vaccination';
    return 'command-center';
  };

  const activeView = getActiveView();

  const setActiveTab = (tab) => {
    const routeMap = {
      'referrals': '/vet/cases',
      'cases': '/vet/surveillance',
      'outbreaks': '/vet/outbreaks',
      'zoonotic': '/vet/zoonotic-diseases',
      'laboratory': '/vet/diagnostic-lab',
      'containment-vaccination': '/vet/containment-vaccination',
      'command-center': '/vet/command-center'
    };
    navigate(routeMap[tab] || '/vet/command-center');
  };

  // Reports & Lab data
  const [reports, setReports] = useState([]);
  const [labSamples, setLabSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportForLab, setSelectedReportForLab] = useState(null);

  // PS-128 Referral Cases & Dynamic Outbreak Map State
  const [referralCases, setReferralCases] = useState([]);
  const [spatialClusters, setSpatialClusters] = useState([]);
  const [containmentZones, setContainmentZones] = useState([]);
  const [advisoryData, setAdvisoryData] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);

  // Canonical 5-stage case queue filter
  // 'all' | 'New' | 'Investigating' | 'Confirmed' | 'Containment' | 'Resolved' | 'my_cases'
  const [referralFilter, setReferralFilter] = useState('all');

  // Atomic claim feedback state
  const [claimingCaseId, setClaimingCaseId] = useState('');
  const [claimFeedback, setClaimFeedback] = useState(null);

  // Modals state
  const [selectedCaseForDetails, setSelectedCaseForDetails] = useState(null);
  const [selectedCaseForAction, setSelectedCaseForAction] = useState(null);
  const [showLogFieldCaseModal, setShowLogFieldCaseModal] = useState(false);
  const [showContainmentModal, setShowContainmentModal] = useState(false);
  const [showRingVaccinationModal, setShowRingVaccinationModal] = useState(false);
  const [targetCaseForZoneOrRing, setTargetCaseForZoneOrRing] = useState(null);

  // Form states for Action Modal (5-stage advancement)
  const [actionTargetStatus, setActionTargetStatus] = useState('Investigating');
  const [clinicalDiagnosisInput, setClinicalDiagnosisInput] = useState('');
  const [affectedCountInput, setAffectedCountInput] = useState(1);
  const [investigationNotesInput, setInvestigationNotesInput] = useState('');
  const [treatmentNotesInput, setTreatmentNotesInput] = useState('');
  const [prescriptionInput, setPrescriptionInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Form state for Log Field Case Modal
  const [fieldCaseForm, setFieldCaseForm] = useState({
    species: 'Cattle',
    animalName: '',
    disease: 'Lumpy Skin Disease',
    affectedCount: 1,
    risk: 'High',
    farmerName: '',
    farmerPhone: '',
    village: user?.village || '',
    block: userBlock,
    district: userDistrict,
    initialStatus: 'Investigating',
    clinicalDiagnosis: '',
    notes: '',
    temperature: 39.5,
    duration: 3
  });
  const [isLoggingFieldCase, setIsLoggingFieldCase] = useState(false);

  // Form state for Create Containment Zone Modal
  const [zoneForm, setZoneForm] = useState({
    disease: 'Lumpy Skin Disease',
    radiusKm: 5.0,
    village: '',
    block: userBlock,
    district: userDistrict,
    notes: '',
    enforcedRules: [
      'Strict quarantine of affected livestock within perimeter',
      'Ban on animal movement, livestock trade, and cattle markets',
      'Daily disinfectant spraying of barns and watering troughs',
      'Immediate ring vaccination within containment buffer'
    ]
  });
  const [isCreatingZone, setIsCreatingZone] = useState(false);

  // Form state for Schedule Ring Vaccination Modal
  const [ringForm, setRingForm] = useState({
    venue: `Emergency Ring Vaccination Post - ${userBlock}`,
    campDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    capacity: 250,
    notes: ''
  });
  const [isSchedulingRing, setIsSchedulingRing] = useState(false);

  // SSE & real-time alerts
  const [sseConnected, setSseConnected] = useState(false);
  const [newCaseAlertBanner, setNewCaseAlertBanner] = useState(null);

  // Fetch dynamic PS128 district data
  const loadReferralCasesAndOutbreaks = async () => {
    try {
      setReferralLoading(true);
      const [casesRes, clustersRes, zonesRes, advRes] = await Promise.all([
        caseService.getCases({ district: userDistrict }),
        caseService.getSpatialClusters({ district: userDistrict }),
        caseService.getContainmentZones({ district: userDistrict }),
        caseService.getAdvisories({ district: userDistrict })
      ]);

      setReferralCases(casesRes.cases || []);
      setSpatialClusters(clustersRes.clusters || []);
      setContainmentZones(zonesRes.zones || []);
      setAdvisoryData(advRes || null);
    } catch (err) {
      console.warn('Failed to load referral/outbreak data:', err);
    } finally {
      setReferralLoading(false);
    }
  };

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
    loadReferralCasesAndOutbreaks();

    // Subscribe to SSE Real-Time Event Stream
    const unsub = caseService.subscribeToCaseStream(
      (evt) => {
        if (evt.type === 'connected') setSseConnected(true);
        if (evt.type === 'NEW_CASE_ALERT' && evt.case) {
          setNewCaseAlertBanner(evt.case);
          setReferralCases((prev) => [evt.case, ...prev.filter((c) => c._id !== evt.case._id)]);
          // Reload clusters and advisories
          caseService.getSpatialClusters({ district: userDistrict }).then((res) => {
            if (res.clusters) setSpatialClusters(res.clusters);
          });
        }
        if ((evt.type === 'CASE_CLAIMED' || evt.type === 'CASE_STATUS_UPDATE') && evt.case) {
          setReferralCases((prev) =>
            prev.map((c) => (c._id === evt.case._id ? evt.case : c))
          );
        }
        if (evt.type === 'CONTAINMENT_ZONE_CREATED' && evt.zone) {
          setContainmentZones((prev) => [evt.zone, ...prev]);
        }
        if (evt.type === 'RING_VACCINATION_SCHEDULED') {
          loadReferralCasesAndOutbreaks();
        }
      },
      () => setSseConnected(false)
    );

    // Fallback polling every 8s
    const pollTimer = setInterval(loadReferralCasesAndOutbreaks, 8000);

    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, [userDistrict]);

  // Atomic Case Claim
  const handleClaimCase = async (caseId) => {
    setClaimingCaseId(caseId);
    setClaimFeedback(null);
    try {
      const res = await caseService.claimCase(caseId);
      if (res.success && res.case) {
        setReferralCases((prev) =>
          prev.map((c) => ((c.id === caseId || c.caseId === caseId || c._id === caseId) ? res.case : c))
        );
        setClaimFeedback({
          type: 'success',
          message: `✓ Case ${res.case.caseId} successfully claimed and assigned to Dr. ${user?.name}!`
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to claim case.';
      const alreadyClaimed = err.response?.data?.alreadyClaimed;
      if (alreadyClaimed && err.response?.data?.status) {
        setReferralCases((prev) =>
          prev.map((c) =>
            (c.id === caseId || c.caseId === caseId || c._id === caseId)
              ? { ...c, status: err.response.data.status, assignedVetId: err.response.data.assignedVet, assignedVet: err.response.data.assignedVet }
              : c
          )
        );
      }
      setClaimFeedback({
        type: 'error',
        message: errMsg
      });
    } finally {
      setClaimingCaseId('');
    }
  };

  // Open Action Modal to update 5-stage status
  const handleOpenActionModal = (caseDoc, defaultStatus = null) => {
    setSelectedCaseForAction(caseDoc);
    const nextStatus =
      defaultStatus ||
      (caseDoc.status === 'New' || caseDoc.status === 'OPEN'
        ? 'Investigating'
        : caseDoc.status === 'Investigating' || caseDoc.status === 'ACCEPTED'
        ? 'Confirmed'
        : caseDoc.status === 'Confirmed'
        ? 'Containment'
        : 'Resolved');

    setActionTargetStatus(nextStatus);
    setClinicalDiagnosisInput(caseDoc.clinicalDiagnosis || caseDoc.disease || '');
    setAffectedCountInput(caseDoc.affectedCount || 1);
    setInvestigationNotesInput(caseDoc.investigationNotes || '');
    setTreatmentNotesInput(caseDoc.treatmentNotes || '');
    setPrescriptionInput(caseDoc.prescription || '');
  };

  // Save 5-Stage Status Update
  const handleSaveCaseStatus = async () => {
    if (!selectedCaseForAction) return;
    setIsUpdatingStatus(true);
    const targetCaseId = selectedCaseForAction.id || selectedCaseForAction.caseId || selectedCaseForAction._id;
    try {
      const res = await caseService.updateCaseStatus(targetCaseId, {
        status: actionTargetStatus,
        clinicalDiagnosis: clinicalDiagnosisInput,
        affectedCount: affectedCountInput,
        investigationNotes: investigationNotesInput,
        treatmentNotes: treatmentNotesInput,
        prescription: prescriptionInput
      });
      if (res.success && res.case) {
        setReferralCases((prev) =>
          prev.map((c) => ((c.id === targetCaseId || c.caseId === targetCaseId || c._id === targetCaseId) ? res.case : c))
        );
        if (selectedCaseForDetails && (selectedCaseForDetails.id === targetCaseId || selectedCaseForDetails.caseId === targetCaseId || selectedCaseForDetails._id === targetCaseId)) {
          setSelectedCaseForDetails(res.case);
        }
        setSelectedCaseForAction(null);
        setClaimFeedback({
          type: 'success',
          message: `✓ Case ${res.case.caseId} progressed to ${actionTargetStatus}.`
        });
        loadReferralCasesAndOutbreaks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update case status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Direct Field Case Log
  const handleCreateFieldCase = async (e) => {
    e.preventDefault();
    setIsLoggingFieldCase(true);
    try {
      const payload = {
        ...fieldCaseForm,
        district: userDistrict,
        coordinates: {
          lat: user?.location?.lat || 18.5204,
          lng: user?.location?.lng || 73.8567
        }
      };
      const res = await caseService.createFieldCase(payload);
      if (res.success && res.case) {
        setReferralCases((prev) => [res.case, ...prev]);
        setShowLogFieldCaseModal(false);
        setClaimFeedback({
          type: 'success',
          message: `✓ Field Case ${res.case.caseId} registered successfully in ${userDistrict}.`
        });
        loadReferralCasesAndOutbreaks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register field case.');
    } finally {
      setIsLoggingFieldCase(false);
    }
  };

  // Open Containment Modal for specific case
  const handleTriggerContainmentForCase = (c) => {
    setTargetCaseForZoneOrRing(c);
    setZoneForm((prev) => ({
      ...prev,
      disease: c.disease,
      district: c.districtId || userDistrict,
      block: c.farmerLocation?.block || userBlock,
      village: c.farmerLocation?.village || '',
      radiusKm: 5.0
    }));
    setShowContainmentModal(true);
  };

  // Create Containment Zone
  const handleSaveContainmentZone = async (e) => {
    e.preventDefault();
    setIsCreatingZone(true);
    try {
      const payload = {
        caseId: targetCaseForZoneOrRing?.id || targetCaseForZoneOrRing?.caseId || targetCaseForZoneOrRing?._id || null,
        disease: zoneForm.disease,
        district: zoneForm.district,
        block: zoneForm.block,
        village: zoneForm.village,
        radiusKm: zoneForm.radiusKm,
        center: targetCaseForZoneOrRing?.coordinates || {
          lat: user?.location?.lat || 18.5204,
          lng: user?.location?.lng || 73.8567
        },
        enforcedRules: zoneForm.enforcedRules,
        notes: zoneForm.notes
      };
      const res = await caseService.createContainmentZone(payload);
      if (res.success) {
        setShowContainmentModal(false);
        setTargetCaseForZoneOrRing(null);
        setClaimFeedback({
          type: 'success',
          message: `✓ Containment Zone ${res.zone.zoneId} declared (${res.zone.radiusKm} km buffer)!`
        });
        loadReferralCasesAndOutbreaks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create containment zone.');
    } finally {
      setIsCreatingZone(false);
    }
  };

  // Open Ring Vaccination Modal
  const handleTriggerRingVaccination = (c) => {
    setTargetCaseForZoneOrRing(c);
    setRingForm((prev) => ({
      ...prev,
      venue: `Emergency Ring Vaccination Unit - ${c.farmerLocation?.village || c.districtId}`,
      capacity: 250
    }));
    setShowRingVaccinationModal(true);
  };

  // Schedule Ring Vaccination
  const handleSaveRingVaccination = async (e) => {
    e.preventDefault();
    if (!targetCaseForZoneOrRing) return;
    setIsSchedulingRing(true);
    const targetCaseId = targetCaseForZoneOrRing.id || targetCaseForZoneOrRing.caseId || targetCaseForZoneOrRing._id;
    try {
      const res = await caseService.scheduleRingVaccination(targetCaseId, ringForm);
      if (res.success) {
        setShowRingVaccinationModal(false);
        setTargetCaseForZoneOrRing(null);
        setClaimFeedback({
          type: 'success',
          message: `✓ Ring Vaccination Camp ${res.drive.campId} scheduled for ${res.drive.vaccine}!`
        });
        loadReferralCasesAndOutbreaks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule ring vaccination.');
    } finally {
      setIsSchedulingRing(false);
    }
  };

  // Filtered Referral Cases
  const filteredCases = referralCases.filter((c) => {
    if (referralFilter === 'all') return true;
    if (referralFilter === 'New') return c.status === 'New' || c.status === 'OPEN';
    if (referralFilter === 'Investigating') return c.status === 'Investigating' || c.status === 'ACCEPTED';
    if (referralFilter === 'Confirmed') return c.status === 'Confirmed';
    if (referralFilter === 'Containment') return c.status === 'Containment' || c.status === 'IN_TREATMENT';
    if (referralFilter === 'Resolved') return c.status === 'Resolved' || c.status === 'RESOLVED';
    if (referralFilter === 'my_cases') {
      const uid = user?._id?.toString();
      const assignedId = (c.assignedVetId?._id || c.assignedVetId)?.toString();
      return uid && assignedId === uid;
    }
    return true;
  });

  const pendingVerification = reports.filter(
    (r) => r.status === 'Reported' || r.status === 'Triaged'
  );
  const activeOutbreaksCount = spatialClusters.filter((cl) => cl.isOutbreak).length;

  return (
    <div className="app-page dashboard-page field-dashboard space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
      {/* Header with Professional Doctor Title & District Jurisdiction */}
      {/* Header with Professional Doctor Title & District Jurisdiction */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-4">
          <LivestockSaathiEmblem size={54} className="shrink-0 drop-shadow-xs" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {t('vet_portal.command_title')}
              </h1>
              <span className="bg-emerald-100 text-emerald-950 text-xs font-black px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                PS128-OFFICIAL
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 flex items-center gap-2 flex-wrap font-medium mt-0.5">
              <span>{user?.name || 'Dr. Ananya Deshmukh'}</span> •{' '}
              <span className="font-bold text-slate-800">{isEnglish ? 'District: ' : isMarathi ? 'जिल्हा: ' : 'जिला: '}{userDistrict}</span> •{' '}
              <span>{isEnglish ? 'Block: ' : isMarathi ? 'तालुका: ' : 'ब्लॉक: '}{userBlock}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLogFieldCaseModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('vet_portal.log_clinical_case')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetCaseForZoneOrRing(null);
              setShowContainmentModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t('vet_portal.declare_containment')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide">
            {t('vet_portal.stat_referral_cases')}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{referralCases.length}</div>
          <span className="text-xs text-slate-500 font-medium">{t('vet_portal.stat_referral_sub')}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
            {t('vet_portal.stat_pending_claim')}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-1">
            {referralCases.filter((c) => c.status === 'New' || c.status === 'OPEN').length}
          </div>
          <span className="text-xs text-slate-500 font-medium">{t('vet_portal.stat_pending_sub')}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wide">
            {t('vet_portal.stat_active_clusters')}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-blue-700 mt-1">{spatialClusters.length}</div>
          <span className="text-xs text-slate-500 font-medium">
            {t('vet_portal.stat_clusters_sub', { count: activeOutbreaksCount })}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-red-800 uppercase tracking-wide">
            {t('vet_portal.stat_containment_zones')}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-red-600 mt-1">
            {containmentZones.filter((z) => z.status === 'ACTIVE').length}
          </div>
          <span className="text-xs text-slate-500 font-medium">{t('vet_portal.stat_containment_sub')}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide">
            {t('vet_portal.stat_resolved_cases')}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
            {referralCases.filter((c) => c.status === 'Resolved' || c.status === 'RESOLVED').length}
          </div>
          <span className="text-xs text-slate-500 font-medium">{t('vet_portal.stat_resolved_sub')}</span>
        </div>
      </div>

      {/* Real-time feedback alerts */}
      {claimFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold ${
            claimFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span>{claimFeedback.message}</span>
          <button
            type="button"
            onClick={() => setClaimFeedback(null)}
            className="p-1.5 rounded-md hover:bg-black/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Case Incoming Alert Banner */}
      {newCaseAlertBanner && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-700 text-white flex items-center justify-between gap-4 shadow-sm border border-red-800">
          <div className="flex items-center gap-3">
            <BellRing className="w-6 h-6" />
            <div>
              <div className="font-black text-base">
                {t('vet_portal.incoming_alert_title', { risk: newCaseAlertBanner.risk, disease: newCaseAlertBanner.disease })}
              </div>
              <div className="text-sm text-red-100 mt-0.5">
                {t('vet_portal.incoming_alert_desc', { farmer: newCaseAlertBanner.farmerContact?.name || (isEnglish ? 'Farmer' : isMarathi ? 'शेतकरी' : 'किसान'), species: newCaseAlertBanner.species, confidence: newCaseAlertBanner.confidence })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleClaimCase(newCaseAlertBanner._id)}
              className="px-4 py-2.5 bg-white text-red-700 font-black text-xs sm:text-sm rounded-xl hover:bg-red-50 transition shadow-sm cursor-pointer"
            >
              {t('vet_portal.claim_case_btn')}
            </button>
            <button
              type="button"
              onClick={() => setNewCaseAlertBanner(null)}
              className="p-1.5 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 1: VETERINARY COMMAND CENTER OVERVIEW                              */}
      {/* ========================================================================= */}
      {activeView === 'command-center' && (
        <div className="space-y-8">
          {/* Quick Module Navigation Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-700" />
                  <span>{isEnglish ? 'Veterinary Operational Modules' : isMarathi ? 'पशुवैद्यकीय कार्यप्रणाली मॉड्यूल्स' : 'पशु चिकित्सा संचालन मॉड्यूल'}</span>
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  {isEnglish ? 'Select a specialized module to access clinical records, surveillance maps, and lab diagnostics' : isMarathi ? 'वैद्यकीय नोंदी, सर्वेक्षण नकाशे आणि प्रयोगशाळा निदानासाठी मॉड्यूल निवडा' : 'नैदानिक रिकॉर्ड, निगरानी मानचित्र और प्रयोगशाला निदान के लिए मॉड्यूल चुनें'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Cases */}
              <Link
                to="/vet/cases"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Radio className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {referralCases.length} {isEnglish ? 'Cases' : isMarathi ? 'केसेस' : 'मामले'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-emerald-700 transition">
                    {isEnglish ? 'Referral Cases Queue' : isMarathi ? 'रेफरल प्रकरणे रांग' : 'रेफरल मामले कतार'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? 'PS-128 5-stage clinical referral workflow, doctor claims, and treatment updates' : isMarathi ? 'PS-128 5-टप्पे क्लिनिकल रेफरल वर्कफ्लो व उपचार अपडेट्स' : 'PS-128 5-चरणीय रेफरल वर्कफ़्लो और उपचार अपडेट'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                  <span>{referralCases.filter(c => c.status === 'New' || c.status === 'OPEN').length} {isEnglish ? 'Pending Claim' : isMarathi ? 'प्रलंबित' : 'लंबित दावें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Card 2: Outbreaks */}
              <Link
                to="/vet/outbreaks"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-orange-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                      {spatialClusters.length} {isEnglish ? 'Clusters' : isMarathi ? 'क्लस्टर्स' : 'क्लस्टर'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-orange-700 transition">
                    {isEnglish ? 'Outbreaks & Containment Map' : isMarathi ? 'प्रकोप व नियंत्रण नकाशा' : 'प्रकोप और रोकथाम मानचित्र'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? 'Geospatial disease clusters, containment perimeters, and active buffer zones' : isMarathi ? 'जिओस्पेशिअल क्लस्टर्स आणि नियंत्रण क्षेत्र' : 'भूस्थानिक क्लस्टर और रोकथाम परिधि'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-orange-700 group-hover:translate-x-1 transition-transform">
                  <span>{containmentZones.filter(z => z.status === 'ACTIVE').length} {isEnglish ? 'Active Zones' : isMarathi ? 'सक्रिय झोन' : 'सक्रिय क्षेत्र'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Card 3: Active Surveillance */}
              <Link
                to="/vet/surveillance"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-blue-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                      {reports.length} {isEnglish ? 'Reports' : isMarathi ? 'अहवाल' : 'रिपोर्ट्स'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-blue-700 transition">
                    {isEnglish ? 'Active Case Surveillance' : isMarathi ? 'सक्रिय प्रकरणे पाळत नोंदवही' : 'सक्रिय मामला निगरानी'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? 'District syndromic surveillance database, farmer field logs, and triage audits' : isMarathi ? 'जिल्हा सिंड्रोमिक पाळत डेटाबेस व क्षेत्रीय नोंदी' : 'जिला सिंड्रोमिक निगरानी डेटाबेस और फील्ड रिकॉर्ड'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
                  <span>{isEnglish ? 'View Surveillance Log' : isMarathi ? 'पाळत नोंद पहा' : 'निगरानी लॉग देखें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Card 4: Zoonotic Diseases */}
              <Link
                to="/vet/zoonotic-diseases"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-red-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
                      <Biohazard className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300">
                      One-Health
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-red-700 transition">
                    {isEnglish ? 'Zoonotic Diseases Protocol' : isMarathi ? 'झुनोटिक आजार नियंत्रण प्रोटोकॉल' : 'जूनोटिक रोग नियंत्रण प्रोटोकॉल'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? 'Rabies, Anthrax, Brucellosis, and Avian Flu cross-species transmission alerts' : isMarathi ? 'रेबीज, अँथ्रॅक्स, ब्रुसेलोसिस मानवी संसर्ग प्रतिबंध' : 'रेबीज, एंथ्रेक्स, ब्रुसेलोसिस संचरण रोकथाम'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-red-700 group-hover:translate-x-1 transition-transform">
                  <span>{isEnglish ? 'Review Safety Directives' : isMarathi ? 'सुरक्षा निर्देश पहा' : 'सुरक्षा निर्देश देखें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Card 5: Diagnostic Lab */}
              <Link
                to="/vet/diagnostic-lab"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-indigo-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300">
                      {labSamples.length} {isEnglish ? 'Samples' : isMarathi ? 'नमुने' : 'नमूने'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-indigo-700 transition">
                    {isEnglish ? 'Diagnostic Lab Workflow' : isMarathi ? 'निदान प्रयोगशाळा ट्रॅकर' : 'निदान प्रयोगशाला ट्रैकर'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? 'Sample dispatch, 4-stage processing pipeline, and lab confirmation reports' : isMarathi ? 'नमुने पाठवणे आणि ४-टप्पे प्रयोगशाळा तपासणी अहवाल' : 'नमूना प्रेषण और 4-चरणीय परीक्षण परिणाम'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:translate-x-1 transition-transform">
                  <span>{isEnglish ? 'Track Laboratory Pipeline' : isMarathi ? 'प्रयोगशाळा ट्रॅकर उघडा' : 'प्रयोगशाला ट्रैकर खोलें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Card 6: Containment & Ring Vaccination */}
              <Link
                to="/vet/containment-vaccination"
                className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-teal-500 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Syringe className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                      {containmentZones.length} {isEnglish ? 'Zones' : isMarathi ? 'झोन' : 'क्षेत्र'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-3 group-hover:text-teal-700 transition">
                    {isEnglish ? 'Containment & Vaccination' : isMarathi ? 'नियंत्रण व लसीकरण मोहीम' : 'रोकथाम और टीकाकरण अभियान'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {isEnglish ? '1km Ring vaccination campaigns, 3km surveillance buffers, and containment zones' : isMarathi ? '१ किमी रिंग लसीकरण, ३ किमी पाळत बफर व नियंत्रण झोन' : '1 किमी रिंग टीकाकरण, 3 किमी बफर और नियंत्रण क्षेत्र'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:translate-x-1 transition-transform">
                  <span>{isEnglish ? 'Manage Ring Drives' : isMarathi ? 'लसीकरण मोहीम पहा' : 'टीकाकरण अभियान देखें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>

          {/* Priority Pending Referral Cases Preview */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-700" />
                  <span>{isEnglish ? 'Priority Cases Stream' : isMarathi ? 'प्राधान्य प्रकरणे प्रवाह' : 'प्राथमिकता मामले प्रवाह'}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {isEnglish ? 'Latest farmer referrals awaiting review or clinical advancement in your jurisdiction' : isMarathi ? 'आपल्या कार्यक्षेत्रातील नवीन शेतकरी रेफरल्स' : 'आपके क्षेत्राधिकार में नवीनतम किसान रेफरल'}
                </p>
              </div>
              <Link
                to="/vet/cases"
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline"
              >
                <span>{isEnglish ? 'View All Cases' : isMarathi ? 'सर्व प्रकरणे पहा' : 'सभी मामले देखें'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {referralCases.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium text-sm">
                {isEnglish ? 'No referral cases logged yet in this jurisdiction.' : isMarathi ? 'या कार्यक्षेत्रात अद्याप कोणतेही रेफरल प्रकरणे नाहीत.' : 'इस क्षेत्राधिकार में अभी तक कोई रेफरल मामला नहीं है।'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {referralCases.slice(0, 4).map((c) => {
                  const isClaimedByMe = c.assignedVet?.id === user?._id || c.assignedVet?.name === user?.name;
                  const isUnclaimed = !c.assignedVet || c.status === 'New' || c.status === 'OPEN';

                  return (
                    <div
                      key={c._id}
                      className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200 hover:border-stone-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-900">{c.caseId}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/80 text-slate-800 uppercase">
                              {c.species || 'Cattle'}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900 mt-1">{c.disease}</div>
                          <div className="text-xs text-slate-500 font-medium">
                            {c.farmerContact?.village || c.location?.village || userDistrict}, {c.farmerContact?.district || userDistrict}
                          </div>
                        </div>
                        <StatusBadge status={c.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                        <span className="font-bold text-slate-700">
                          👤 {c.farmerContact?.name || (isEnglish ? 'Farmer' : isMarathi ? 'शेतकरी' : 'किसान')}
                        </span>
                        {isUnclaimed ? (
                          <button
                            type="button"
                            onClick={() => handleClaimCase(c._id)}
                            disabled={claimingCaseId === c._id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            {claimingCaseId === c._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            <span>{t('vet_portal.claim_btn')}</span>
                          </button>
                        ) : (
                          <Link
                            to="/vet/cases"
                            className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-slate-800 font-bold text-xs transition"
                          >
                            {isEnglish ? 'Open Workflow ➔' : isMarathi ? 'वर्कफ्लो उघडा ➔' : 'वर्कफ़्लो खोलें ➔'}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: PS-128 5-STAGE CANONICAL CASE QUEUE                             */}
      {/* ========================================================================= */}
      {activeView === 'cases' && (
        <div className="space-y-4">
          {/* Header & Stage Filter Strip */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {t('vet_portal.queue_title')}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                    Live Stream
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 font-medium">
                  New ➔ Investigating ➔ Confirmed ➔ Containment ➔ Resolved
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>{userDistrict} District</span>
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    sseConnected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sseConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>{sseConnected ? 'Real-Time Connected' : 'Auto-Polling Active'}</span>
                </span>
                <button
                  type="button"
                  onClick={loadReferralCasesAndOutbreaks}
                  disabled={referralLoading}
                  className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-600 transition"
                  title={isEnglish ? 'Refresh' : isMarathi ? 'ताजे करा' : 'ताज़ा करें'}
                >
                  <RefreshCw className={`w-4 h-4 ${referralLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 5-Stage Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              {[
                { key: 'all', label: t('vet_portal.filter_all', { count: referralCases.length }) },
                {
                  key: 'New',
                  label: t('vet_portal.filter_new', { count: referralCases.filter((c) => c.status === 'New' || c.status === 'OPEN').length })
                },
                {
                  key: 'Investigating',
                  label: t('vet_portal.filter_investigating', { count: referralCases.filter((c) => c.status === 'Investigating' || c.status === 'ACCEPTED').length })
                },
                {
                  key: 'Confirmed',
                  label: t('vet_portal.filter_confirmed', { count: referralCases.filter((c) => c.status === 'Confirmed').length })
                },
                {
                  key: 'Containment',
                  label: `4. Containment (${referralCases.filter((c) => c.status === 'Containment' || c.status === 'IN_TREATMENT').length})`
                },
                {
                  key: 'Resolved',
                  label: t('vet_portal.filter_resolved', { count: referralCases.filter((c) => c.status === 'Resolved' || c.status === 'RESOLVED').length })
                },
        {
          key: 'my_cases',
          label: t('vet_portal.filter_my_cases', { count: referralCases.filter((c) => {
            const uid = (user?.id || user?._id)?.toString();
            const aid = (c.assignedVet?.id || c.assignedVetId?.id || c.assignedVetId?._id || c.assignedVetId)?.toString();
            return uid && aid === uid;
          }).length })
        }
      ].map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => setReferralFilter(f.key)}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            referralFilter === f.key
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  </div>

  {/* Cases List */}
  {filteredCases.length === 0 ? (
    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-300 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-slate-400 mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">
        {t('vet_portal.empty_queue_title')}
      </h3>
      <p className="text-sm text-slate-600 font-medium">
        {t('vet_portal.empty_queue_sub')}
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4">
      {filteredCases.map((c) => {
        const uid = (user?.id || user?._id)?.toString();
        const aid = (c.assignedVet?.id || c.assignedVetId?.id || c.assignedVetId?._id || c.assignedVetId)?.toString();
        const isMyCase = Boolean(uid && aid === uid);
        const isUnassigned = c.status === 'New' || c.status === 'OPEN';

        return (
          <div
            key={c.id || c.caseId || c._id}
            className={`bg-white rounded-2xl p-5 border transition-all shadow-xs hover:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              c.risk === 'Critical'
                ? 'border-red-300 ring-1 ring-red-200'
                : isUnassigned
                ? 'border-amber-300'
                : 'border-stone-200'
            }`}
          >
            {/* Left: Thumbnail & Snapshot */}
            <div className="flex items-start gap-4 flex-1">
              {c.image || c.imageUrl ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-900 shrink-0 relative border border-stone-200">
                  <img
                    src={c.image || c.imageUrl}
                    alt={c.disease}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] px-1 py-0.5 rounded font-mono">
                    AI
                  </span>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200 text-slate-400">
                  <Stethoscope className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-stone-100 px-2 py-0.5 rounded-md">
                    {c.caseId}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      c.risk === 'Critical'
                        ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                        : c.risk === 'High'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {c.risk} Risk
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900">
                  {c.disease}{' '}
                  <span className="text-sm font-normal text-emerald-700 font-mono">
                    ({c.confidence}% Confidence)
                  </span>
                </h3>

                <p className="text-sm text-slate-600 font-medium">
                  <strong>{t('vet_portal.species_label')}:</strong> {c.species} {c.animalName ? `(${c.animalName})` : ''} •{' '}
                  <strong>{t('vet_portal.affected_animals_label')}:</strong> {c.affectedCount || 1} •{' '}
                  <strong>{t('vet_portal.location_label')}:</strong> {c.farmerLocation?.village || (isEnglish ? 'Village' : isMarathi ? 'गाव' : 'गांव')},{' '}
                  {c.farmerLocation?.block || userBlock}, {c.districtId}
                </p>

                {/* Symptoms */}
                {c.symptoms && c.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {c.symptoms.slice(0, 4).map((sym, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-stone-100 text-slate-700 px-2 py-0.5 rounded-md border border-stone-200"
                      >
                        • {sym}
                      </span>
                    ))}
                  </div>
                )}

                {/* Farmer contact & map */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-sm font-medium">
                  <span className="font-bold text-slate-800">
                    👤 {c.farmerContact?.name || c.farmer?.name || (isEnglish ? 'Farmer' : isMarathi ? 'शेतकरी' : 'किसान')}
                  </span>
                  {(c.farmerContact?.phone || c.farmer?.phone) && (
                    <a
                      href={`tel:${c.farmerContact?.phone || c.farmer?.phone}`}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{c.farmerContact?.phone || c.farmer?.phone}</span>
                    </a>
                  )}
                  {(c.latitude && c.longitude) ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t('vet_portal.show_map')}</span>
                    </a>
                  ) : c.coordinates?.lat && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${c.coordinates.lat},${c.coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t('vet_portal.show_map')}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Stage Badge & Action Buttons */}
            <div className="flex flex-col sm:items-end gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
              {/* Current Stage Badge */}
              <span
                className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  c.status === 'New' || c.status === 'OPEN'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    : c.status === 'Investigating' || c.status === 'ACCEPTED'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : c.status === 'Confirmed'
                    ? 'bg-red-100 text-red-900 border border-red-300'
                    : c.status === 'Containment' || c.status === 'IN_TREATMENT'
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {c.status}
              </span>

              {/* Action buttons based on stage */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCaseForDetails(c)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isEnglish ? 'Details' : isMarathi ? 'तपशील' : 'विवरण'}</span>
                </button>

                {isUnassigned ? (
                  <button
                    type="button"
                    onClick={() => handleClaimCase(c.id || c.caseId || c._id)}
                    disabled={claimingCaseId === (c.id || c.caseId || c._id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {claimingCaseId === (c.id || c.caseId || c._id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('vet_portal.claiming_spinner')}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t('vet_portal.claim_case_action')}</span>
                      </>
                    )}
                  </button>
                ) : isMyCase ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>{t('vet_portal.advance_status_action')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedReportForLab(c.id || c.caseId || c._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      title="Send Diagnostic Sample to Laboratory"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Lab</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerContainmentForCase(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      title={t('vet_portal.declare_containment')}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Zone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerRingVaccination(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      title={t('vet_portal.ring_vaccine_action')}
                    >
                      <Syringe className="w-3.5 h-3.5" />
                      <span>Ring</span>
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-slate-500 font-semibold bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 text-center">
                    {t('vet_portal.assigned_to')}: {c.assignedVet?.name || c.assignedVetId?.name || t('vet_portal.other_doctor')}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: DISTRICT OUTBREAK MAP & CONTAINMENT SURVEILLANCE                */}
      {/* ========================================================================= */}
      {activeView === 'outbreaks' && (
        <div className="space-y-6">
          {/* Live District Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>{t('vet_portal.map_section_title', { district: userDistrict })}</span>
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  {t('vet_portal.map_section_sub')}
                </p>
              </div>
              <button
                type="button"
                onClick={loadReferralCasesAndOutbreaks}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-stone-100 px-3 py-1.5 rounded-xl border flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('vet_portal.refresh_map')}</span>
              </button>
            </div>

            <LeafletMap
              cases={referralCases}
              clusters={spatialClusters}
              containmentZones={containmentZones}
              reports={reports}
              height="550px"
              userLocation={[user?.location?.lat || 18.5204, user?.location?.lng || 73.8567]}
              onSelectCase={(c) => setSelectedCaseForAction(c)}
              onSelectZone={(z) => {
                alert(`Containment Zone ${z.zoneId}\nDisease: ${z.disease}\nStatus: ${z.status}`);
              }}
              radiusKm={20}
              lang={i18n.language}
            />
          </div>

          {/* Spatial Clusters Summary */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-600" />
                  <span>{t('vet_portal.cluster_analysis_title')}</span>
                </h3>
                <p className="text-sm text-slate-600 font-medium">
                  {t('vet_portal.cluster_analysis_sub')}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                {t('vet_portal.clusters_active_badge', { count: spatialClusters.length })}
              </span>
            </div>

            {spatialClusters.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                {t('vet_portal.no_clusters_alert', { district: userDistrict })}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spatialClusters.map((cluster) => {
                  const risk = cluster.risk || cluster.riskTier || 'High';
                  const clusterKey = cluster.clusterId || cluster.id || String(cluster.centroidLat) + String(cluster.centroidLng);
                  return (
                    <div
                      key={clusterKey}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        cluster.isOutbreak
                          ? 'bg-red-50/60 border-red-300'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {cluster.clusterId || 'CLUSTER'}
                          </span>
                          <h4 className="font-black text-lg text-slate-900">
                            {cluster.disease}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            risk === 'Critical'
                              ? 'bg-red-600 text-white'
                              : risk === 'High'
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {risk}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('vet_portal.cluster_case_count')}:</span>
                          <span className="font-bold">{cluster.caseCount || 0} {isEnglish ? 'cases' : isMarathi ? 'केसेस' : 'मामले'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('vet_portal.cluster_affected_count')}:</span>
                          <span className="font-bold text-red-600">{cluster.totalAffected ?? cluster.caseCount ?? 0} {isEnglish ? 'animals' : isMarathi ? 'जनावरे' : 'पशु'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{t('vet_portal.cluster_radius')}:</span>
                          <span className="font-bold">{cluster.radiusKm || 5} km</span>
                        </div>
                      </div>

                      {cluster.isOutbreak && (
                        <div className="text-[11px] font-bold text-red-700 bg-red-100 p-2 rounded-xl flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{t('vet_portal.outbreak_buffer_alert')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic AI Preventive Advisory Card */}
          {advisoryData && (
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-black text-base text-white">
                      {t('vet_portal.ai_advisory_title')}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      {t('vet_portal.ai_advisory_sub', { district: userDistrict })}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-emerald-800 text-emerald-100 px-2 py-1 rounded-md">
                  {advisoryData.generatedAt ? new Date(advisoryData.generatedAt).toLocaleDateString() : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advisoryData.recommendations?.map((rec, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-white/10 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-emerald-300">{rec.disease}</span>
                      <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        {rec.priority}
                      </span>
                    </div>
                    <div className="text-emerald-100 font-semibold">{rec.protocol}</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-200 text-[11px] pt-1">
                      {rec.actions?.map((act, aIdx) => (
                        <li key={aIdx}>{act}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regional Syndromic Alert Reports Register */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-700" />
                  <span>{t('vet_portal.regional_reports_title')}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isEnglish
                    ? `Live syndromic alert logs and community health notifications in ${userDistrict}`
                    : isMarathi
                    ? `${userDistrict} मधील थेट सिंड्रोमिक अलर्ट आणि समुदाय आरोग्य अहवाल`
                    : `${userDistrict} में लाइव सिंड्रोमिक अलर्ट और सामुदायिक स्वास्थ्य रिपोर्ट`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                  {reports.length} {isEnglish ? 'Reports' : isMarathi ? 'अहवाल' : 'रिपोर्ट्स'}
                </span>
                <Link
                  to="/reports"
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                >
                  <span>{t('vet_portal.view_all_cases')}</span>
                </Link>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                {isEnglish
                  ? 'No syndromic alert reports currently recorded for this district.'
                  : isMarathi
                  ? 'या जिल्ह्यासाठी सध्या कोणतेही सिंड्रोमिक अलर्ट अहवाल नोंदवलेले नाहीत.'
                  : 'इस जिले के लिए वर्तमान में कोई सिंड्रोमिक अलर्ट रिपोर्ट दर्ज नहीं है।'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">{t('vet_portal.th_case_id')}</th>
                      <th className="px-3 py-2.5">{t('vet_portal.th_species')}</th>
                      <th className="px-3 py-2.5">{t('vet_portal.th_location')}</th>
                      <th className="px-3 py-2.5">{t('vet_portal.th_suspected_disease')}</th>
                      <th className="px-3 py-2.5">{t('vet_portal.th_risk')}</th>
                      <th className="px-3 py-2.5">{t('vet_portal.th_status')}</th>
                      <th className="px-4 py-2.5 text-right">{t('vet_portal.th_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                    {reports.slice(0, 8).map((rep) => {
                      const topDisease = rep.triageResult?.suspectedDiseases?.[0];
                      const repId = rep._id || rep.id;
                      const repRisk = rep.triageResult?.riskLevel || rep.risk || 'Low';
                      return (
                        <tr key={repId} className="hover:bg-stone-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {rep.caseId || (repId ? String(repId).substring(0, 8) : 'CASE')}
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-800 font-bold">
                              {rep.animalId?.species || rep.species || 'Cattle'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {rep.location?.village || rep.village || ''}
                            {rep.location?.block ? `, ${rep.location.block}` : rep.block ? `, ${rep.block}` : ''}
                          </td>
                          <td className="px-3 py-3">
                            {topDisease ? (
                              <div>
                                <div className="font-bold text-slate-900">{topDisease.name}</div>
                                {topDisease.confidenceScore && (
                                  <span className="text-[10px] text-emerald-700 font-bold">
                                    {t('vet_portal.match_score', { score: Math.round(topDisease.confidenceScore * 100) })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">
                                {rep.disease || t('vet_portal.clinical_triage')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <RiskBadge riskLevel={repRisk} size="sm" />
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={rep.status || 'SUBMITTED'} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/reports/${repId}`}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1 transition"
                            >
                              <Eye className="w-3 h-3" /> {t('vet_portal.details_btn')}
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
      )}

      {/* ========================================================================= */}
      {/* MODULE 4: ACTIVE SURVEILLANCE QUEUE                                       */}
      {/* ========================================================================= */}
      {activeView === 'surveillance' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {t('vet_portal.active_surveillance_title')}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                {t('vet_portal.active_surveillance_sub')}
              </p>
            </div>
            <Link to="/reports" className="text-sm font-bold text-blue-700 hover:underline">
              {t('vet_portal.view_all_cases')}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold">
                <tr>
                  <th className="px-6 py-3">{t('vet_portal.th_case_id')}</th>
                  <th className="px-4 py-3">{t('vet_portal.th_species')}</th>
                  <th className="px-4 py-3">{t('vet_portal.th_location')}</th>
                  <th className="px-4 py-3">{t('vet_portal.th_suspected_disease')}</th>
                  <th className="px-4 py-3">{t('vet_portal.th_risk')}</th>
                  <th className="px-4 py-3">{t('vet_portal.th_status')}</th>
                  <th className="px-6 py-3 text-right">{t('vet_portal.th_actions')}</th>
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
                        {r.location?.village || r.village || ''}
                        {r.location?.block ? `, ${r.location.block}` : r.block ? `, ${r.block}` : ''}
                      </td>
                      <td className="px-4 py-3.5">
                        {topDisease ? (
                          <div>
                            <div className="font-bold text-slate-900">{topDisease.name}</div>
                            <span className="text-[10px] text-emerald-700 font-bold">
                              {t('vet_portal.match_score', { score: Math.round(topDisease.confidenceScore * 100) })}
                            </span>
                          </div>
                        ) : (
                          t('vet_portal.clinical_triage')
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
                          type="button"
                          onClick={() => setSelectedReportForLab(r._id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] inline-flex items-center gap-1 border border-indigo-200 transition cursor-pointer"
                        >
                          <FlaskConical className="w-3 h-3" /> {t('vet_portal.lab_referral_btn')}
                        </button>
                        <Link
                          to={`/reports/${r._id}`}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-[11px] inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> {t('vet_portal.details_btn')}
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

      {/* ========================================================================= */}
      {/* MODULE 5: ZOONOTIC RISK SURVEILLANCE PANEL                               */}
      {/* ========================================================================= */}
      {activeView === 'zoonotic' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-5 text-xs text-red-900 leading-relaxed flex items-start gap-3">
            <Biohazard className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-sm block text-red-950 mb-0.5">
                {t('vet_portal.zoonotic_title')}
              </strong>
              {t('vet_portal.zoonotic_desc')}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 6: DIAGNOSTIC LABORATORY WORKFLOW                                 */}
      {/* ========================================================================= */}
      {activeView === 'laboratory' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {t('vet_portal.lab_tracker_title')}
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                {t('vet_portal.lab_tracker_sub')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 7: CONTAINMENT & RING VACCINATION OPERATIONS CENTER               */}
      {/* ========================================================================= */}
      {activeView === 'containment-vaccination' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Syringe className="w-6 h-6 text-teal-700" />
                  <span>{isEnglish ? 'Containment & Ring Vaccination Operations' : isMarathi ? 'नियंत्रण क्षेत्र व रिंग लसीकरण कार्यप्रणाली' : 'रोकथाम क्षेत्र और रिंग टीकाकरण संचालन'}</span>
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  {isEnglish ? 'Enforce geospatial containment barriers and coordinate rapid ring vaccination drives to halt disease spread' : isMarathi ? 'रोग प्रसार रोखण्यासाठी भौगोलिक नियंत्रण क्षेत्र व तातडीची रिंग लसीकरण मोहीम राबवा' : 'रोग प्रसार रोकने के लिए भूस्थानिक रोकथाम सीमाएं और त्वरित रिंग टीकाकरण अभियान संचालित करें'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetCaseForZoneOrRing(null);
                    setShowContainmentModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t('vet_portal.declare_containment')}</span>
                </button>
                <Link
                  to="/vaccination"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-xs"
                >
                  <Syringe className="w-4 h-4" />
                  <span>{isEnglish ? 'Open Vaccination Portal' : isMarathi ? 'लसीकरण पोर्टल उघडा' : 'टीकाकरण पोर्टल खोलें'}</span>
                </Link>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {isEnglish ? 'Active Containment Zones' : isMarathi ? 'सक्रिय नियंत्रण क्षेत्रे' : 'सक्रिय रोकथाम क्षेत्र'}
                </span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {containmentZones.filter(z => z.status === 'ACTIVE').length}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {containmentZones.length} {isEnglish ? 'Total historical zones' : isMarathi ? 'एकूण नोंदणीकृत झोन' : 'कुल पंजीकृत क्षेत्र'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                  {isEnglish ? 'Ring Vaccination Standard' : isMarathi ? 'रिंग लसीकरण प्रमाणक' : 'रिंग टीकाकरण मानक'}
                </span>
                <div className="text-2xl font-black text-teal-700 mt-1">
                  1 km Core Ring
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {isEnglish ? '3 km Surveillance Buffer • 100% Target' : isMarathi ? '३ किमी पाळत बफर • १००% उद्दिष्ट' : '3 किमी निगरानी बफर • 100% लक्ष्य'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                  {isEnglish ? 'Priority Targeted Pathogens' : isMarathi ? 'प्राधान्य रोग' : 'प्राथमिकता रोग'}
                </span>
                <div className="text-2xl font-black text-orange-700 mt-1">
                  FMD • Lumpy • Anthrax
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {isEnglish ? 'Cold chain & mobile teams dispatched' : isMarathi ? 'कोल्ड चेन व फिरती पथके सज्ज' : 'कोल्ड चेन और मोबाइल टीमें तैयार'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Containment Zones Table */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>{isEnglish ? 'Registered Containment Perimeters' : isMarathi ? 'नोंदणीकृत नियंत्रण क्षेत्र सीमा' : 'पंजीकृत रोकथाम क्षेत्र सीमा'}</span>
            </h3>

            {containmentZones.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium text-sm">
                {isEnglish ? 'No active containment zones currently declared in this district.' : isMarathi ? 'या जिल्ह्यात सध्या कोणतेही सक्रिय नियंत्रण क्षेत्र नाही.' : 'इस जिले में वर्तमान में कोई सक्रिय रोकथाम क्षेत्र घोषित नहीं है।'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold text-xs">
                    <tr>
                      <th className="px-4 py-3">{isEnglish ? 'Zone ID / Disease' : 'क्षेत्र / रोग'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Location' : 'स्थान'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Radius' : 'त्रिज्या'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Status' : 'स्थिति'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Declared Date' : 'दिनांक'}</th>
                      <th className="px-4 py-3 text-right">{isEnglish ? 'Actions' : 'कार्रवाई'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                    {containmentZones.map((z, idx) => (
                      <tr key={z.id || z._id || idx} className="hover:bg-stone-50/80 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div>{z.disease || 'High Risk Outbreak'}</div>
                          <span className="text-[10px] font-mono text-slate-400">ID: {z.id || z._id || `CZ-${idx + 1}`}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {z.village || userBlock}, {z.district || userDistrict}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {z.radiusKm || z.radius || 1} km
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                            z.status === 'ACTIVE'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-stone-100 text-slate-600'
                          }`}>
                            {z.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {z.createdAt ? new Date(z.createdAt).toLocaleDateString() : 'Active'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetCaseForZoneOrRing(z);
                              setShowRingVaccinationModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Syringe className="w-3.5 h-3.5" />
                            <span>{isEnglish ? 'Launch Ring Drive' : isMarathi ? 'रिंग मोहीम सुरू करा' : 'रिंग अभियान शुरू करें'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: 5-STAGE CASE ADVANCEMENT & CLINICAL ACTION MODAL                 */}
      {/* ========================================================================= */}
      {selectedCaseForAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('vet_portal.modal_clinical_workflow')}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {selectedCaseForAction.caseId} ({selectedCaseForAction.disease})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForAction(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('vet_portal.modal_target_stage')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Investigating', label: 'Investigating' },
                    { id: 'Confirmed', label: 'Confirmed' },
                    { id: 'Containment', label: 'Containment' },
                    { id: 'Resolved', label: 'Resolved' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActionTargetStatus(st.id)}
                      className={`p-2 rounded-xl border font-bold text-center transition cursor-pointer text-[11px] ${
                        actionTargetStatus === st.id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-stone-50 text-slate-700 border-stone-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('vet_portal.modal_clinical_diagnosis')}
                </label>
                <input
                  type="text"
                  value={clinicalDiagnosisInput}
                  onChange={(e) => setClinicalDiagnosisInput(e.target.value)}
                  placeholder={t('vet_portal.modal_clinical_diag_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('vet_portal.modal_affected_count')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={affectedCountInput}
                  onChange={(e) => setAffectedCountInput(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('vet_portal.modal_treatment_notes')}
                </label>
                <textarea
                  rows={2}
                  value={treatmentNotesInput}
                  onChange={(e) => setTreatmentNotesInput(e.target.value)}
                  placeholder={t('vet_portal.modal_treatment_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {t('vet_portal.modal_prescription')}
                </label>
                <textarea
                  rows={2}
                  value={prescriptionInput}
                  onChange={(e) => setPrescriptionInput(e.target.value)}
                  placeholder={t('vet_portal.modal_prescription_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedCaseForAction(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('vet_portal.btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveCaseStatus}
                disabled={isUpdatingStatus}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('vet_portal.btn_saving')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('vet_portal.btn_update_and_notify')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT FIELD CASE REGISTRATION                                  */}
      {/* ========================================================================= */}
      {showLogFieldCaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {t('vet_portal.modal_log_case_title')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('vet_portal.modal_log_case_sub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogFieldCaseModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFieldCase} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_species')}</label>
                  <select
                    value={fieldCaseForm.species}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, species: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="Cattle">{t('vet_portal.species_cattle')}</option>
                    <option value="Buffalo">{t('vet_portal.species_buffalo')}</option>
                    <option value="Goat">{t('vet_portal.species_goat')}</option>
                    <option value="Sheep">{t('vet_portal.species_sheep')}</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.modal_affected_count')}</label>
                  <input
                    type="number"
                    min="1"
                    value={fieldCaseForm.affectedCount}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, affectedCount: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_disease')}</label>
                <input
                  type="text"
                  required
                  value={fieldCaseForm.disease}
                  onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, disease: e.target.value })}
                  placeholder={t('vet_portal.form_disease_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_risk')}</label>
                  <select
                    value={fieldCaseForm.risk}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, risk: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                  >
                    <option value="Critical">🔴 Critical</option>
                    <option value="High">🔴 High</option>
                    <option value="Moderate">🟠 Moderate</option>
                    <option value="Low">🟡 Low</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_initial_status')}</label>
                  <select
                    value={fieldCaseForm.initialStatus}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, initialStatus: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                  >
                    <option value="Investigating">{isEnglish ? 'Investigating (Assigned to me)' : isMarathi ? 'तपासणी सुरू (माझ्याकडे)' : 'Investigating (मेरे जिम्मे)'}</option>
                    <option value="Confirmed">{isEnglish ? 'Confirmed (Verified Diagnosis)' : isMarathi ? 'पुष्टी झालेले (निश्चित निदान)' : 'Confirmed (निदान पक्का)'}</option>
                    <option value="New">{isEnglish ? 'New (District Alert)' : isMarathi ? 'नवीन (जिल्हा अलर्ट)' : 'New (जिला अलर्ट)'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_village')}</label>
                  <input
                    type="text"
                    value={fieldCaseForm.village}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, village: e.target.value })}
                    placeholder={t('vet_portal.form_village_ph')}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_block')}</label>
                  <input
                    type="text"
                    value={fieldCaseForm.block}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, block: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_farmer_name')}</label>
                  <input
                    type="text"
                    value={fieldCaseForm.farmerName}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, farmerName: e.target.value })}
                    placeholder={t('vet_portal.form_farmer_name_ph')}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_farmer_phone')}</label>
                  <input
                    type="tel"
                    value={fieldCaseForm.farmerPhone}
                    onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, farmerPhone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_clinical_notes')}</label>
                <textarea
                  rows={2}
                  value={fieldCaseForm.clinicalDiagnosis}
                  onChange={(e) => setFieldCaseForm({ ...fieldCaseForm, clinicalDiagnosis: e.target.value })}
                  placeholder={t('vet_portal.form_clinical_notes_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowLogFieldCaseModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  {t('vet_portal.btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLoggingFieldCase}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isLoggingFieldCase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{t('vet_portal.btn_submit_case')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE CONTAINMENT ZONE                                         */}
      {/* ========================================================================= */}
      {showContainmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>{t('vet_portal.modal_containment_title')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t('vet_portal.modal_containment_sub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContainmentModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContainmentZone} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_disease_name')}</label>
                <input
                  type="text"
                  required
                  value={zoneForm.disease}
                  onChange={(e) => setZoneForm({ ...zoneForm, disease: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_radius')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="25"
                    value={zoneForm.radiusKm}
                    onChange={(e) => setZoneForm({ ...zoneForm, radiusKm: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-red-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_block_loc')}</label>
                  <input
                    type="text"
                    value={zoneForm.block}
                    onChange={(e) => setZoneForm({ ...zoneForm, block: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_rules')}</label>
                <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border">
                  {zoneForm.enforcedRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span className="text-[11px] text-slate-800">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_admin_notes')}</label>
                <textarea
                  rows={2}
                  value={zoneForm.notes}
                  onChange={(e) => setZoneForm({ ...zoneForm, notes: e.target.value })}
                  placeholder={t('vet_portal.form_admin_notes_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowContainmentModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  {t('vet_portal.btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingZone}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isCreatingZone ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{t('vet_portal.btn_enforce_zone')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SCHEDULE RING VACCINATION                                       */}
      {/* ========================================================================= */}
      {showRingVaccinationModal && targetCaseForZoneOrRing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-purple-700" />
                  <span>{t('vet_portal.modal_ring_title')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t('vet_portal.modal_ring_sub', { caseId: targetCaseForZoneOrRing.caseId, disease: targetCaseForZoneOrRing.disease })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRingVaccinationModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRingVaccination} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_venue')}</label>
                <input
                  type="text"
                  required
                  value={ringForm.venue}
                  onChange={(e) => setRingForm({ ...ringForm, venue: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_camp_date')}</label>
                  <input
                    type="date"
                    required
                    value={ringForm.campDate}
                    onChange={(e) => setRingForm({ ...ringForm, campDate: e.target.value })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_capacity')}</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={ringForm.capacity}
                    onChange={(e) => setRingForm({ ...ringForm, capacity: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t('vet_portal.form_cold_chain_notes')}</label>
                <textarea
                  rows={2}
                  value={ringForm.notes}
                  onChange={(e) => setRingForm({ ...ringForm, notes: e.target.value })}
                  placeholder={t('vet_portal.form_cold_chain_ph')}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowRingVaccinationModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  {t('vet_portal.btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSchedulingRing}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isSchedulingRing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Syringe className="w-4 h-4" />}
                  <span>{t('vet_portal.btn_schedule_ring')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab Referral Modal */}
      {selectedReportForLab && (
        <LabReferralModal
          reportId={selectedReportForLab}
          onClose={() => setSelectedReportForLab(null)}
          onUpdated={() => {
            loadData();
            loadReferralCasesAndOutbreaks();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: COMPLETE CASE CLINICAL DETAILS & TIMELINE AUDIT                  */}
      {/* ========================================================================= */}
      {selectedCaseForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-stone-100 text-slate-800 px-2 py-0.5 rounded">
                    {selectedCaseForDetails.caseId}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedCaseForDetails.risk === 'Critical'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : selectedCaseForDetails.risk === 'High'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedCaseForDetails.risk} Risk
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedCaseForDetails.status === 'New' || selectedCaseForDetails.status === 'OPEN'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : selectedCaseForDetails.status === 'Investigating' || selectedCaseForDetails.status === 'ACCEPTED'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : selectedCaseForDetails.status === 'Confirmed'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : selectedCaseForDetails.status === 'Containment' || selectedCaseForDetails.status === 'IN_TREATMENT'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {selectedCaseForDetails.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedCaseForDetails.disease}{' '}
                  <span className="text-sm font-normal text-emerald-700 font-mono">
                    ({selectedCaseForDetails.confidence}% Confidence)
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForDetails(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Animal & Farmer 2-column info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  🐄 {t('vet_portal.species_label')} &amp; Tag
                </span>
                <div className="font-black text-slate-900 text-sm">
                  {selectedCaseForDetails.species} {selectedCaseForDetails.animalName ? `(${selectedCaseForDetails.animalName})` : ''}
                </div>
                <div className="text-slate-600">
                  Tag ID: <strong className="font-mono text-slate-800">{selectedCaseForDetails.animal?.tagId || selectedCaseForDetails.animalId || 'N/A'}</strong>
                </div>
                <div className="text-slate-600">
                  Affected Animals: <strong className="text-slate-900">{selectedCaseForDetails.affectedCount || 1}</strong>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  👤 Farmer &amp; Jurisdiction
                </span>
                <div className="font-black text-slate-900 text-sm">
                  {selectedCaseForDetails.farmerContact?.name || selectedCaseForDetails.farmer?.name || 'Farmer'}
                </div>
                <div className="text-slate-600">
                  Location: {selectedCaseForDetails.farmerLocation?.village || selectedCaseForDetails.farmer?.village || 'Village'}, {selectedCaseForDetails.districtId || 'Nagpur'}
                </div>
                {(selectedCaseForDetails.farmerContact?.phone || selectedCaseForDetails.farmer?.phone) && (
                  <div className="pt-0.5">
                    <a
                      href={`tel:${selectedCaseForDetails.farmerContact?.phone || selectedCaseForDetails.farmer?.phone}`}
                      className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{selectedCaseForDetails.farmerContact?.phone || selectedCaseForDetails.farmer?.phone}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Symptoms & Screening Findings */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">Reported Symptoms &amp; Screening Observations</span>
              {selectedCaseForDetails.symptoms && selectedCaseForDetails.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCaseForDetails.symptoms.map((s, idx) => (
                    <span key={idx} className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                      • {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No symptoms list provided.</p>
              )}
            </div>

            {/* Clinical Notes, Diagnosis & Prescriptions */}
            <div className="space-y-2 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">
                  🩺 Attending Veterinarian Clinical Record
                </span>
                <span className="font-bold text-slate-700">
                  {selectedCaseForDetails.assignedVet?.name ? `Dr. ${selectedCaseForDetails.assignedVet.name}` : (selectedCaseForDetails.assignedVetId?.name ? `Dr. ${selectedCaseForDetails.assignedVetId.name}` : 'Unassigned')}
                </span>
              </div>
              {selectedCaseForDetails.clinicalDiagnosis && (
                <div>
                  <strong className="text-slate-800">Confirmed Diagnosis:</strong>{' '}
                  <span className="text-blue-900 font-bold">{selectedCaseForDetails.clinicalDiagnosis}</span>
                </div>
              )}
              {selectedCaseForDetails.investigationNotes && (
                <div>
                  <strong className="text-slate-800">Clinical Investigation:</strong>{' '}
                  <span className="text-slate-700">{selectedCaseForDetails.investigationNotes}</span>
                </div>
              )}
              {selectedCaseForDetails.prescription && (
                <div className="p-2 bg-white rounded-xl border border-blue-200">
                  <strong className="text-blue-950 block mb-0.5">Rx Prescribed Medications:</strong>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-pre-wrap">{selectedCaseForDetails.prescription}</span>
                </div>
              )}
              {selectedCaseForDetails.treatmentNotes && (
                <div>
                  <strong className="text-slate-800">Treatment Plan / Bio-Interventions:</strong>{' '}
                  <span className="text-slate-700">{selectedCaseForDetails.treatmentNotes}</span>
                </div>
              )}
              {!selectedCaseForDetails.clinicalDiagnosis && !selectedCaseForDetails.prescription && (
                <p className="text-slate-500 italic">No clinical diagnosis or prescription recorded yet. Use &quot;Advance Status&quot; to log clinical examination findings.</p>
              )}
            </div>

            {/* Case Timeline Audit Trail */}
            <div className="space-y-2 text-xs border-t pt-3">
              <span className="font-bold text-slate-800 block text-xs">
                📜 Case Timeline &amp; Status Transitions ({selectedCaseForDetails.timeline?.length || 0})
              </span>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {selectedCaseForDetails.timeline && selectedCaseForDetails.timeline.length > 0 ? (
                  selectedCaseForDetails.timeline.map((entry, idx) => (
                    <div key={idx} className="p-2 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">
                            {entry.status} • {entry.updaterName || 'Official'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(entry.createdAt || entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed">{entry.notes}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">No timeline entries found.</p>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedCaseForDetails(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCaseForDetails;
                    handleOpenActionModal(c);
                  }}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Advance Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCaseForDetails;
                    setSelectedReportForLab(c.id || c.caseId || c._id);
                  }}
                  className="px-3 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Order Lab Sample</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCaseForDetails;
                    handleTriggerContainmentForCase(c);
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Containment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
