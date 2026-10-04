import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import vaccinationService from '../../services/vaccinationService';
import LeafletMap from '../LeafletMap';
import StatusBadge from '../StatusBadge';
import RiskBadge from '../RiskBadge';
import {
  Syringe,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  MapPin,
  Calendar,
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  ShieldAlert,
  BarChart3,
  Clock,
  Phone,
  FileCheck,
  Building2,
  Stethoscope,
  Radio,
  ExternalLink
} from 'lucide-react';
import { LivestockSaathiEmblem } from '../LivestockSaathiLogo';

const STANDARD_VACCINES = [
  { name: 'LSD', fullName: 'Lumpy Skin Disease (Neethling strain)', disease: 'Lumpy Skin Disease', species: 'Cattle & Buffalo' },
  { name: 'FMD', fullName: 'FMD Trivalent Inactivated Adjuvanted Vaccine', disease: 'Foot and Mouth Disease', species: 'Cattle & Buffalo' },
  { name: 'BQ', fullName: 'Clostridium Chauvoei Bacterin (Blackleg Vaccine)', disease: 'Black Quarter (BQ)', species: 'Cattle & Buffalo' },
  { name: 'HS', fullName: 'HS Alum-Precipitated Vaccine', disease: 'Haemorrhagic Septicaemia (HS)', species: 'Cattle & Buffalo' },
  { name: 'PPR', fullName: 'PPR Live Attenuated Vaccine (Sungri 96)', disease: 'Peste des Petits Ruminants (PPR)', species: 'Goat & Sheep' },
  { name: 'Brucella', fullName: 'Brucella Abortus S19 Vaccine', disease: 'Brucellosis', species: 'Cattle & Buffalo' },
  { name: 'Anthrax', fullName: 'Anthrax Spore Live Vaccine (Sterne Strain)', disease: 'Anthrax', species: 'All Livestock' }
];

const SUPPORTED_RADII = [1.0, 3.0, 5.0, 10.0];

export default function OfficerVaccinationDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  const officerDistrict = user?.district || 'Nagpur';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview, campaigns, create, ring, map, coverage, teams

  // Data states
  const [kpis, setKpis] = useState(null);
  const [drives, setDrives] = useState([]);
  const [staff, setStaff] = useState([]);
  const [outbreaks, setOutbreaks] = useState([]);
  const [coverageData, setCoverageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');

  // Modals
  const [selectedDriveForDetail, setSelectedDriveForDetail] = useState(null);
  const [assignModalDrive, setAssignModalDrive] = useState(null);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');
  const [assignRoleInput, setAssignRoleInput] = useState('Lead Response Staff');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Dose Record Modal
  const [recordDoseDrive, setRecordDoseDrive] = useState(null);
  const [doseCountInput, setDoseCountInput] = useState('10');
  const [doseBatchInput, setDoseBatchInput] = useState('BATCH-2026-GOVT');
  const [doseAdminByInput, setDoseAdminByInput] = useState(user?.name || 'Veterinary Officer');
  const [submittingDose, setSubmittingDose] = useState(false);

  // Create Campaign Form
  const [campaignForm, setCampaignForm] = useState({
    vaccine: 'FMD',
    vaccineFullName: 'FMD Trivalent Inactivated Adjuvanted Vaccine',
    disease: 'Foot and Mouth Disease',
    targetSpecies: 'Cattle & Buffalo',
    district: officerDistrict,
    block: '',
    village: '',
    venue: '',
    capacity: '500',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'Normal',
    notes: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Ring Campaign Form
  const [selectedOutbreakCase, setSelectedOutbreakCase] = useState(null);
  const [ringRadiusKm, setRingRadiusKm] = useState(5.0);
  const [ringCapacity, setRingCapacity] = useState('300');
  const [ringVenue, setRingVenue] = useState('');
  const [ringAssignedStaffId, setRingAssignedStaffId] = useState('');
  const [submittingRing, setSubmittingRing] = useState(false);

  // Load all initial data from Supabase
  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      setErrorMessage('');

      const [kpiRes, drivesRes, staffRes, outbreakRes, covRes] = await Promise.allSettled([
        vaccinationService.getOfficerKpis({ district: officerDistrict }),
        vaccinationService.getVaccinationDrives({ district: officerDistrict, limit: 300 }),
        vaccinationService.getAvailableStaff({ district: officerDistrict }),
        vaccinationService.getActiveOutbreaks({ district: officerDistrict }),
        vaccinationService.getCoverageAnalytics({ district: officerDistrict })
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setKpis(kpiRes.value);
      }
      if (drivesRes.status === 'fulfilled' && Array.isArray(drivesRes.value)) {
        setDrives(drivesRes.value);
      }
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaff(staffRes.value);
      }
      if (outbreakRes.status === 'fulfilled' && Array.isArray(outbreakRes.value)) {
        setOutbreaks(outbreakRes.value);
      }
      if (covRes.status === 'fulfilled' && covRes.value) {
        setCoverageData(covRes.value);
      }
    } catch (err) {
      console.error('[OfficerVaccinationDashboard] Load error:', err);
      setErrorMessage('डेटा लोड करने में असमर्थ। कृपया पुनः प्रयास करें (Failed to load real-time campaign telemetry).');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officerDistrict]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // Distinct blocks for filter
  const availableBlocks = useMemo(() => {
    const s = new Set();
    drives.forEach(d => {
      if (d.block) s.add(d.block);
    });
    return Array.from(s).sort();
  }, [drives]);

  // Filtered drives
  const filteredDrives = useMemo(() => {
    return drives.filter(d => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const st = String(d.status || '').toUpperCase();
        if (statusFilter === 'ACTIVE' && !(st === 'ACTIVE' || st === 'ONGOING')) return false;
        if (statusFilter === 'UPCOMING' && !(st === 'UPCOMING' || st === 'SCHEDULED')) return false;
        if (statusFilter === 'COMPLETED' && st !== 'COMPLETED') return false;
      }
      // Block filter
      if (blockFilter !== 'ALL' && d.block !== blockFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (d.vaccine || '').toLowerCase().includes(q) ||
          (d.vaccineFullName || '').toLowerCase().includes(q) ||
          (d.campId || '').toLowerCase().includes(q) ||
          (d.village || '').toLowerCase().includes(q) ||
          (d.block || '').toLowerCase().includes(q) ||
          (d.venue || '').toLowerCase().includes(q) ||
          (d.assignedOfficer || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [drives, statusFilter, blockFilter, searchQuery]);

  // Handle Standard Campaign Creation
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.vaccine || !campaignForm.village || !campaignForm.block) {
      alert('कृपया टीका, गाँव एवं तालुका (Block) अवश्य भरें।');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await vaccinationService.createCampaign({
        ...campaignForm,
        capacity: parseInt(campaignForm.capacity, 10) || 500,
        district: officerDistrict,
        state: 'Maharashtra',
        venue: campaignForm.venue || `Primary Veterinary Dispensary, ${campaignForm.village}`
      });

      if (res?.success) {
        showToast(`अभियान ${res.drive?.campId || ''} सफलतापूर्वक निर्धारित किया गया (Campaign scheduled).`);
        setCampaignForm({
          vaccine: 'FMD',
          vaccineFullName: 'FMD Trivalent Inactivated Adjuvanted Vaccine',
          disease: 'Foot and Mouth Disease',
          targetSpecies: 'Cattle & Buffalo',
          district: officerDistrict,
          block: '',
          village: '',
          venue: '',
          capacity: '500',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          priority: 'Normal',
          notes: ''
        });
        await loadDashboardData();
        setActiveTab('campaigns');
      } else {
        alert(res?.message || 'अभियान बनाने में विफलता।');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'त्रुटि: अभियान रिकॉर्ड नहीं हो सका।');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Ring Campaign Creation
  const handleCreateRingCampaign = async (e) => {
    e.preventDefault();
    if (!selectedOutbreakCase) {
      alert('कृपया रिंग टीकाकरण के लिए सक्रिय प्रकोप मामला (Outbreak Case) चुनें।');
      return;
    }

    try {
      setSubmittingRing(true);
      const selectedStaffObj = staff.find(s => s.id === ringAssignedStaffId);

      const res = await vaccinationService.createRingCampaign({
        caseId: selectedOutbreakCase.id,
        radiusKm: parseFloat(ringRadiusKm),
        capacity: parseInt(ringCapacity, 10) || 300,
        venue: ringVenue || `Emergency Ring Outpost - ${selectedOutbreakCase.village || selectedOutbreakCase.block}`,
        assignedOfficerId: ringAssignedStaffId || undefined,
        assignedOfficer: selectedStaffObj?.name || undefined,
        notes: `Emergency Ring Vaccination around Outbreak Case ${selectedOutbreakCase.caseId} (${selectedOutbreakCase.disease}). Buffer: ${ringRadiusKm}km.`
      });

      if (res?.success) {
        showToast(`आपातकालीन रिंग टीकाकरण अभियान ${res.drive?.campId || ''} निर्धारित!`);
        setSelectedOutbreakCase(null);
        await loadDashboardData();
        setActiveTab('campaigns');
      } else {
        alert(res?.message || 'रिंग अभियान निर्धारण में समस्या।');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'रिंग अभियान स्थापित नहीं हो सका।');
    } finally {
      setSubmittingRing(false);
    }
  };

  // Handle Team Assignment
  const handleAssignTeam = async () => {
    if (!assignModalDrive || !selectedStaffToAssign) {
      alert('कृपया दल के सदस्य का चयन करें।');
      return;
    }

    try {
      setSubmittingAssign(true);
      const selectedStaffObj = staff.find(s => s.id === selectedStaffToAssign);

      const res = await vaccinationService.assignTeam(assignModalDrive.id || assignModalDrive._id, {
        staffId: selectedStaffToAssign,
        staffName: selectedStaffObj?.name,
        role: assignRoleInput
      });

      if (res?.success) {
        showToast(`दल सदस्य ${selectedStaffObj?.name || ''} अभियान में नियुक्त किया गया।`);
        setAssignModalDrive(null);
        setSelectedStaffToAssign('');
        await loadDashboardData();
      } else {
        alert(res?.message || 'नियुक्ति में विफलता।');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'दल नियुक्त नहीं हो सका।');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle Dose Recording
  const handleRecordDose = async () => {
    if (!recordDoseDrive || !doseCountInput) {
      alert('कृपया टीकों की संख्या दर्ज करें।');
      return;
    }

    const count = parseInt(doseCountInput, 10);
    if (isNaN(count) || count < 1) {
      alert('संख्या 1 या अधिक होनी चाहिए।');
      return;
    }

    try {
      setSubmittingDose(true);
      const res = await vaccinationService.recordVaccinationDose(recordDoseDrive.id || recordDoseDrive._id, {
        dosesAdministered: count,
        batchNumber: doseBatchInput,
        administeredBy: doseAdminByInput,
        notes: `Recorded by District Officer ${user?.name || ''}`
      });

      if (res?.success) {
        showToast(`${count} खुराक (Doses) सफलतापूर्वक दर्ज की गईं। नया कवरेज: ${res.coveragePercentage}%`);
        setRecordDoseDrive(null);
        await loadDashboardData();
      } else {
        alert(res?.message || 'डोज़ दर्ज करने में विफलता।');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'रिकॉर्ड नहीं हो सका।');
    } finally {
      setSubmittingDose(false);
    }
  };

  // Handle Status Update (e.g. Activate or Close)
  const handleStatusTransition = async (driveId, newStatus) => {
    const confirmMsg =
      newStatus === 'Completed'
        ? 'क्या आप सुनिश्चित हैं कि यह अभियान पूर्ण व बंद (Closed) किया जाए?'
        : `क्या आप अभियान की स्थिति "${newStatus}" करना चाहते हैं?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      let res;
      if (newStatus === 'Completed') {
        res = await vaccinationService.closeCampaign(driveId, 'Closed from Officer Dashboard');
      } else {
        res = await vaccinationService.updateCampaignStatus(driveId, newStatus, 'Status updated by Officer');
      }

      if (res?.success) {
        showToast(`अभियान स्थिति "${newStatus}" में परिवर्तित।`);
        if (selectedDriveForDetail && (selectedDriveForDetail.id === driveId || selectedDriveForDetail._id === driveId)) {
          setSelectedDriveForDetail({ ...selectedDriveForDetail, status: newStatus });
        }
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'स्थिति अपडेट नहीं हो सकी।');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* Top Header / Public Health Command Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-[74px] sm:top-[78px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Syringe className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    NADCP • जिला कमान केंद्र
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    District: <strong className="text-white">{officerDistrict}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Supabase
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                  पशु रोग टीकाकरण एवं अभियान प्रबंधन (Officer Vaccination Command)
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={loadDashboardData}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
                title="Refresh Live Telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{refreshing ? 'रिफ्रेशिंग...' : 'ताज़ा करें (Sync)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>नया अभियान (New Campaign)</span>
              </button>
            </div>
          </div>

          {/* Local Tab Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 mt-4 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-3">
            {[
              { id: 'overview', label: 'अवलोकन (Overview)', icon: Activity },
              { id: 'campaigns', label: `अभियान (Campaigns • ${drives.length})`, icon: Syringe },
              { id: 'create', label: 'नया अभियान (Plan)', icon: PlusCircle },
              { id: 'ring', label: `रिंग टीकाकरण (Ring Buffer • ${outbreaks.length})`, icon: Radio },
              { id: 'map', label: 'निगरानी नक्शा (GIS Map)', icon: Compass },
              { id: 'coverage', label: 'कवरेज विश्लेषण (Coverage)', icon: BarChart3 },
              { id: 'teams', label: `कार्यकारी दल (Teams • ${staff.length})`, icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast Notification */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm font-bold shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button type="button" onClick={() => setSuccessToast('')} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between text-sm font-bold shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP KPI CARDS (Real Supabase Data Only) */}
        <section aria-label="Operational KPI Cards">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. Active Drives */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Drives</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.activeDrives : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">सक्रिय अभियान क्षेत्र में</p>
            </div>

            {/* 2. Upcoming Drives */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Upcoming Drives</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.upcomingDrives : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-blue-700 font-medium mt-1">आगामी निर्धारित शिविर</p>
            </div>

            {/* 3. Target Animals */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Target Animals</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.targetAnimals.toLocaleString() : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">कुल लक्षित पशु संख्या</p>
            </div>

            {/* 4. Vaccinated */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Vaccinated</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {kpis ? kpis.vaccinatedAnimals.toLocaleString() : 'Data unavailable'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-bold text-emerald-700">
                  {kpis ? `${kpis.coveragePct}% कवरेज` : ''}
                </span>
              </div>
            </div>

            {/* 5. Pending Vaccinations */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">
                {kpis ? kpis.pendingVaccinations.toLocaleString() : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-amber-800 font-medium mt-1">शेष प्रतिरक्षण लक्ष्य</p>
            </div>

            {/* 6. High-Risk Areas */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">High-Risk Areas</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-600">
                {kpis ? (kpis.highRiskAreas ? kpis.highRiskAreas.length : 0) : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-red-700 font-medium mt-1">प्रकोप व कम कवरेज क्षेत्र</p>
            </div>
          </div>
        </section>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Action Operational Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-700/60 flex flex-col justify-between">
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    District Routine Plan
                  </span>
                  <h3 className="text-lg font-black mt-2">सामूहिक टीकाकरण अभियान (Mass Campaign)</h3>
                  <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                    ब्लॉक एवं ग्राम स्तर पर पूर्व-मानसून अथवा नियमित सुरक्षात्मक टीकाकरण अभियान की योजना बनाएं।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>अभियान तैयार करें (Plan Drive)</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-red-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm border border-red-800/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                      Emergency Outbreak Buffer
                    </span>
                    <span className="text-xs font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded">
                      {outbreaks.length} Active Cases
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-2">रिंग टीकाकरण टास्कफोर्स (Ring Vaccination)</h3>
                  <p className="text-xs text-red-100/80 mt-1 leading-relaxed">
                    सत्यापित रोग प्रकोप के केंद्र से 1–10 किमी परिधि में तत्काल रिंग टीकाकरण अभियान आरंभ करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ring')}
                  className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Radio className="w-4 h-4" />
                  <span>प्रकोप रिंग अभियान (Trigger Ring)</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Field Deployment
                    </span>
                    <span className="text-xs font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded">
                      {staff.length} Staff Available
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-2">दल तैनाती व आवंटन (Team Assignment)</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    पशुचिकित्सा अधिकारियों व क्षेत्रीय कार्यकर्ताओं की उपलब्धता सत्यापित कर अभियानों में नियुक्त करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>दल नियुक्त करें (Deploy Staff)</span>
                </button>
              </div>
            </div>

            {/* High-Risk Outbreak & Low-Coverage Priority Action Section */}
            {kpis?.highRiskAreas && kpis.highRiskAreas.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      प्राथमिकता एवं उच्च-जोखिम अलर्ट (Priority & High-Risk Areas • {kpis.highRiskAreas.length})
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  वास्तविक रोग प्रकोप एवं 50% से कम टीकाकरण कवरेज वाले क्षेत्रों की पहचान। तत्काल हस्तक्षेप आवश्यक है।
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {kpis.highRiskAreas.slice(0, 6).map((area, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-extrabold text-slate-900">{area.block} • {area.village}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            {area.riskType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">{area.reason}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-red-200/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-red-800">{area.priority}</span>
                        {area.caseId ? (
                          <button
                            type="button"
                            onClick={() => {
                              const matchCase = outbreaks.find(o => o.id === area.caseId || o.caseId === area.caseId);
                              if (matchCase) setSelectedOutbreakCase(matchCase);
                              setActiveTab('ring');
                            }}
                            className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>रिंग योजना</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('teams')}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>दल भेजें</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active & Scheduled Campaigns Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    सक्रिय एवं आगामी अभियान (Active & Scheduled Campaigns)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">जिला नागपुर के सभी अधिकृत टीकाकरण केंद्र एवं शिविर</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>सभी देखें ({drives.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">अभियान ID / नाम</th>
                      <th className="py-3 px-4">रोग व टीका</th>
                      <th className="py-3 px-4">स्थान (Block • Village)</th>
                      <th className="py-3 px-4">लक्षित / पूर्ण</th>
                      <th className="py-3 px-4">कवरेज</th>
                      <th className="py-3 px-4">नियुक्त अधिकारी</th>
                      <th className="py-3 px-4">स्थिति</th>
                      <th className="py-3 px-4 text-right">कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {drives.slice(0, 5).map(d => {
                      const target = d.targetCount || d.capacity || 1;
                      const covered = d.coveredCount || 0;
                      const pct = target > 0 ? Math.min(100, Math.round((covered / target) * 100)) : 0;

                      return (
                        <tr key={d.id || d._id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {d.campId || d.id?.slice(0, 8)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{d.vaccine}</span>
                            <span className="block text-[11px] text-slate-500 truncate max-w-[180px]">
                              {d.vaccineFullName || d.targetSpecies}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <strong>{d.block}</strong>
                            <span className="block text-[11px] text-slate-500">{d.village || d.venue}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{covered.toLocaleString()}</span> / {target.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-24">
                              <div className="flex justify-between text-[10px] font-bold mb-1">
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {d.assignedOfficer || 'Not Assigned'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                d.status === 'Completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : d.status === 'Ongoing' || d.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDriveForDetail(d)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                            >
                              विवरण (View)
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMPAIGNS LISTING */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="टीका, ब्लॉक, गाँव अथवा अभियान ID खोजें..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-emerald-600 focus:bg-white bg-stone-50"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
                >
                  <option value="ALL">सभी स्थितियाँ (All Status)</option>
                  <option value="UPCOMING">Upcoming / Scheduled</option>
                  <option value="ACTIVE">Ongoing / Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <select
                  value={blockFilter}
                  onChange={e => setBlockFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
                >
                  <option value="ALL">सभी ब्लॉक (All Blocks)</option>
                  {availableBlocks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campaign Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrives.map(d => {
                const target = d.targetCount || d.capacity || 1;
                const covered = d.coveredCount || 0;
                const pending = Math.max(0, target - covered);
                const pct = target > 0 ? Math.min(100, Math.round((covered / target) * 100)) : 0;
                const isRing = (d.campId && d.campId.includes('RING')) || (d.notes && d.notes.includes('Ring'));

                return (
                  <div
                    key={d.id || d._id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge bar */}
                      <div className="flex items-center justify-between text-xs gap-2 mb-2">
                        <span className="font-mono font-bold text-slate-500 text-[11px] truncate">
                          {d.campId || d.id?.slice(0, 10)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isRing && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                              RING BUFFER
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              d.status === 'Completed'
                                ? 'bg-blue-100 text-blue-800'
                                : d.status === 'Ongoing' || d.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-black text-slate-900 leading-snug">{d.vaccine}</h4>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{d.vaccineFullName || d.targetSpecies}</p>

                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate"><strong>{d.block}</strong> • {d.village || d.venue}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{d.campDate ? new Date(d.campDate).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">अधिकारी: {d.assignedOfficer || 'Not Assigned'}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">प्रगति (Coverage)</span>
                          <span className="font-extrabold text-slate-900">{pct}% ({covered}/{target})</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                          <span>लक्षित: {target}</span>
                          <span className="text-amber-700 font-bold">शेष: {pending}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDriveForDetail(d)}
                        className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-bold transition cursor-pointer flex-1"
                      >
                        विवरण
                      </button>

                      {d.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => setRecordDoseDrive(d)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                        >
                          + डोज़ दर्ज
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setAssignModalDrive(d)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer"
                        title="Assign Team"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CREATE CAMPAIGN */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-stone-200 pb-4 mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Official Programme Planning
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                नया सामूहिक टीकाकरण अभियान तैयार करें (Schedule Campaign)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                यह रिकॉर्ड सीधे सुपाबेस (Supabase) डेटाबेस में आधिकारिक अभियान के रूप में सुरक्षित होगा।
              </p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Vaccine Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    टीका प्रकार (Vaccine Standard) *
                  </label>
                  <select
                    value={campaignForm.vaccine}
                    onChange={e => {
                      const v = STANDARD_VACCINES.find(s => s.name === e.target.value);
                      if (v) {
                        setCampaignForm({
                          ...campaignForm,
                          vaccine: v.name,
                          vaccineFullName: v.fullName,
                          disease: v.disease,
                          targetSpecies: v.species
                        });
                      } else {
                        setCampaignForm({ ...campaignForm, vaccine: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                  >
                    {STANDARD_VACCINES.map(v => (
                      <option key={v.name} value={v.name}>{v.name} — {v.disease}</option>
                    ))}
                  </select>
                </div>

                {/* Vaccine Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    टीका पूरा नाम (Official Full Name) *
                  </label>
                  <input
                    type="text"
                    value={campaignForm.vaccineFullName}
                    onChange={e => setCampaignForm({ ...campaignForm, vaccineFullName: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Disease */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    रोग (Target Disease) *
                  </label>
                  <input
                    type="text"
                    value={campaignForm.disease}
                    onChange={e => setCampaignForm({ ...campaignForm, disease: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Target Animal Species */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    लक्षित पशु प्रजाति (Target Species) *
                  </label>
                  <select
                    value={campaignForm.targetSpecies}
                    onChange={e => setCampaignForm({ ...campaignForm, targetSpecies: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="Cattle & Buffalo">गाय एवं भैंस (Cattle & Buffalo)</option>
                    <option value="Goat & Sheep">बकरी एवं भेड़ (Goat & Sheep)</option>
                    <option value="All Livestock">समस्त पशुधन (All Livestock)</option>
                  </select>
                </div>

                {/* District (Locked to Officer jurisdiction) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    जिला (District)
                  </label>
                  <input
                    type="text"
                    value={officerDistrict}
                    disabled
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-100 text-slate-600 font-bold"
                  />
                </div>

                {/* Block */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    तालुका / ब्लॉक (Block) *
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. Saoner, Kamptee, Hingna"
                    value={campaignForm.block}
                    onChange={e => setCampaignForm({ ...campaignForm, block: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Village */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    गाँव / क्षेत्र (Village / Target Area) *
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. Kelod, Yerkheda"
                    value={campaignForm.village}
                    onChange={e => setCampaignForm({ ...campaignForm, village: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Venue */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    शिविर स्थल (Venue / Dispensary)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. Primary Veterinary Dispensary"
                    value={campaignForm.venue}
                    onChange={e => setCampaignForm({ ...campaignForm, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Target Population */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    लक्षित पशु संख्या (Target Population) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={campaignForm.capacity}
                    onChange={e => setCampaignForm({ ...campaignForm, capacity: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800 font-bold"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    प्राथमिकता (Priority Level)
                  </label>
                  <select
                    value={campaignForm.priority}
                    onChange={e => setCampaignForm({ ...campaignForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="Normal">Normal (नियमित)</option>
                    <option value="High">High (उच्च जोखिम)</option>
                    <option value="Urgent">Urgent Outbreak (आपातकालीन)</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    आरंभ तिथि (Start Date) *
                  </label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    समाप्ति तिथि (End Date)
                  </label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  अभियान निर्देश व टिप्पणियां (Operational Directives / Notes)
                </label>
                <textarea
                  rows="3"
                  placeholder="शीत-श्रृंखला (Cold Chain) निर्देश, सिरिंज एवं लॉजिस्टिक्स विवरण..."
                  value={campaignForm.notes}
                  onChange={e => setCampaignForm({ ...campaignForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>सुरक्षित हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>अभियान सुरक्षित करें (Schedule Campaign)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: RING VACCINATION (Outbreak Driven) */}
        {activeTab === 'ring' && (
          <div className="space-y-6">
            <div className="bg-red-950 text-white rounded-2xl p-5 border border-red-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-300">
                    Epidemic Containment Buffer Protocol
                  </span>
                </div>
                <h2 className="text-xl font-black mt-1">रोग प्रकोप आधारित रिंग टीकाकरण (Ring Vaccination)</h2>
                <p className="text-xs text-red-200/90 mt-1 max-w-2xl leading-relaxed">
                  सत्यापित प्रकोप केंद्र के चारों ओर प्रतिरक्षण बफर स्थापित कर संक्रामक रोगों (LSD, FMD, PPR) के फैलाव को पूर्णतः रोकें।
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-white">{outbreaks.length}</span>
                <span className="block text-[11px] text-red-300">सक्रिय प्रकोप (Active Outbreaks)</span>
              </div>
            </div>

            {/* Step 1: Select Active Outbreak Case */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>सक्रिय प्रकोप मामला चुनें (Select Confirmed Outbreak Case)</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                नीचे सुपाबेस में दर्ज सक्रिय रोग प्रकोप मामलों की सूची है। रिंग अभियान हेतु मामले का चयन करें:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outbreaks.map(c => {
                  const isSelected = selectedOutbreakCase?.id === c.id;
                  const hasDrive = Boolean(c.ringVaccinationDriveId);

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedOutbreakCase(c)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/70 shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold text-slate-700">{c.caseId}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {c.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900">{c.disease}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                          <strong>{c.block}</strong> • {c.village}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">{c.species} ({c.affectedCount} affected)</span>
                        {hasDrive ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            रिंग ड्राइव सक्रिय
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-700">
                            रिंग लंबित (Pending)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Configure Ring Perimeter & Assign Team */}
            {selectedOutbreakCase && (
              <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm animate-in fade-in duration-200">
                <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>रिंग परिधि व दल विन्यास (Configure Ring Radius & Veterinary Team)</span>
                </h3>
                <p className="text-xs text-slate-600 mb-5">
                  मामला: <strong>{selectedOutbreakCase.caseId} ({selectedOutbreakCase.disease})</strong> • स्थान: <strong>{selectedOutbreakCase.village}, {selectedOutbreakCase.block}</strong>
                </p>

                <form onSubmit={handleCreateRingCampaign} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Ring Radius Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        सुरक्षा परिधि दायरा (Supported Radius) *
                      </label>
                      <select
                        value={ringRadiusKm}
                        onChange={e => setRingRadiusKm(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                      >
                        {SUPPORTED_RADII.map(r => (
                          <option key={r} value={r}>{r} किलोमीटर परिधि (Radius)</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">डेटाबेस समर्थित सीमा: 0.5 – 50.0 km</p>
                    </div>

                    {/* Ring Target Population */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        अनुमानित परिधि लक्ष्य (Ring Target Count) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ringCapacity}
                        onChange={e => setRingCapacity(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-slate-800"
                      />
                    </div>

                    {/* Assign Response Vet */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        प्रभारी पशुचिकित्सक (Assign Vet)
                      </label>
                      <select
                        value={ringAssignedStaffId}
                        onChange={e => setRingAssignedStaffId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                      >
                        <option value="">-- उपलब्ध पशुचिकित्सक चुनें --</option>
                        {staff.filter(s => s.role === 'veterinarian' && s.isAvailable).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.block || s.district})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      आउटपोस्ट / केंद्र स्थल (Outpost Venue)
                    </label>
                    <input
                      type="text"
                      placeholder={`Emergency Ring Outpost - ${selectedOutbreakCase.village}`}
                      value={ringVenue}
                      onChange={e => setRingVenue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                    />
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOutbreakCase(null)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRing}
                      className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submittingRing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>रिंग अभियान सुरक्षित हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          <span>रिंग टीकाकरण अभियान स्थापित करें (Schedule Ring Drive)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MONITORING & MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  सक्रिय प्रकोप एवं टीकाकरण जीआईएस नक्शा (GIS Telemetry Map)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  सुपाबेस में दर्ज वास्तविक जीपीएस निर्देशांकों (GPS Coordinates) पर आधारित दृश्यता
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                {outbreaks.length} Outbreak Epicenters Mapped
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <LeafletMap
                height="580px"
                district={officerDistrict}
                cases={outbreaks}
                enableRealtime={true}
              />
            </div>
          </div>
        )}

        {/* TAB 6: COVERAGE & PRIORITY */}
        {activeTab === 'coverage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    तालुका एवं ग्राम स्तरीय कवरेज विश्लेषण (Block & Village Coverage)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    वास्तविक टीकाकरण रिकॉर्ड्स से संगणित प्रामाणिक प्रगति
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700">
                    {coverageData?.overall?.coveragePct || kpis?.coveragePct || 0}%
                  </span>
                  <span className="block text-[11px] text-slate-500">समग्र जिला कवरेज (Overall District)</span>
                </div>
              </div>

              {/* Block level breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  ब्लॉक स्तरीय विश्लेषण (Block Breakdown)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(coverageData?.blockCoverage || []).map((b, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-slate-900">{b.block}</span>
                        <span className={b.coveragePct >= 70 ? 'text-emerald-700' : b.coveragePct >= 40 ? 'text-amber-700' : 'text-red-700'}>
                          {b.coveragePct}% ({b.covered}/{b.target})
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.coveragePct >= 70 ? 'bg-emerald-500' : b.coveragePct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${b.coveragePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Priority / Low-Coverage Warnings */}
              {coverageData?.priorityAreas && coverageData.priorityAreas.length > 0 && (
                <div className="mt-6 pt-5 border-t border-stone-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>कम कवरेज वाले क्षेत्र — त्वरित कार्रवाई आवश्यक (Low-Coverage Action Directives)</span>
                  </h4>
                  <div className="space-y-2">
                    {coverageData.priorityAreas.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <strong className="text-slate-900">{p.village} ({p.block})</strong>:
                          <span className="text-red-800 ml-1.5 font-medium">{p.recommendation}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCampaignForm({
                              ...campaignForm,
                              block: p.block,
                              village: p.village,
                              priority: 'High'
                            });
                            setActiveTab('create');
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                          अभियान बनाएं
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: TEAMS & STAFF ROSTER */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  पशुचिकित्सक एवं क्षेत्रीय कार्यकर्ता रोस्टर (Staff Directory)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  सुपाबेस में पंजीकृत अधिकृत कर्मी एवं उनकी उपलब्धता स्थिति (Real-time Availability)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                {staff.length} Verified Staff in {officerDistrict}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        s.role === 'veterinarian' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.roleLabel}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {s.availability}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-900">{s.name}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{s.specialization}</p>

                    <div className="mt-3 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{s.district} {s.block ? `• ${s.block}` : ''} {s.village ? `(${s.village})` : ''}</span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {s.isAvailable ? 'तैनाती हेतु उपलब्ध' : 'अनुपलब्ध (On Leave / Busy)'}
                    </span>
                    <button
                      type="button"
                      disabled={!s.isAvailable}
                      onClick={() => {
                        setSelectedStaffToAssign(s.id);
                        if (drives.length > 0) setAssignModalDrive(drives[0]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      अभियान सौंपें (Assign)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CAMPAIGN DETAILS MODAL */}
      {selectedDriveForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-modal p-6 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {selectedDriveForDetail.campId || selectedDriveForDetail.id}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{selectedDriveForDetail.vaccine}</h3>
                <p className="text-xs text-slate-600">{selectedDriveForDetail.vaccineFullName || selectedDriveForDetail.targetSpecies}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriveForDetail(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">स्थिति (Status)</span>
                <strong className="text-slate-900 font-black">{selectedDriveForDetail.status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">लक्षित (Target)</span>
                <strong className="text-slate-900 font-black">
                  {(selectedDriveForDetail.targetCount || selectedDriveForDetail.capacity || 0).toLocaleString()}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">पूर्ण (Covered)</span>
                <strong className="text-emerald-700 font-black">
                  {(selectedDriveForDetail.coveredCount || 0).toLocaleString()}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">कवरेज (Coverage)</span>
                <strong className="text-slate-900 font-black">
                  {selectedDriveForDetail.coveragePercentage || 0}%
                </strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>स्थान: <strong>{selectedDriveForDetail.block}</strong> • {selectedDriveForDetail.village || selectedDriveForDetail.venue} ({selectedDriveForDetail.district})</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>आरंभ तिथि: {selectedDriveForDetail.campDate || selectedDriveForDetail.startDate || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                <span>नियुक्त अधिकारी: <strong>{selectedDriveForDetail.assignedOfficer || 'Not Assigned'}</strong></span>
              </div>
            </div>

            {selectedDriveForDetail.notes && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">निर्देश व ऑडिट इतिहास (Directives & History):</span>
                <p className="text-slate-600 whitespace-pre-wrap">{selectedDriveForDetail.notes}</p>
              </div>
            )}

            {/* Lifecycle Status Action Bar */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedDriveForDetail.status === 'Scheduled' || selectedDriveForDetail.status === 'Upcoming' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(selectedDriveForDetail.id || selectedDriveForDetail._id, 'Active')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    अभियान आरंभ करें (Start Campaign)
                  </button>
                ) : null}

                {selectedDriveForDetail.status !== 'Completed' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(selectedDriveForDetail.id || selectedDriveForDetail._id, 'Completed')}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    अभियान पूर्ण व बंद करें (Close Campaign)
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriveForDetail(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM ASSIGNMENT MODAL */}
      {assignModalDrive && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-modal p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-black text-slate-900">
                अभियान में दल नियुक्त करें (Assign Team)
              </h3>
              <button type="button" onClick={() => setAssignModalDrive(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              अभियान: <strong>{assignModalDrive.vaccine}</strong> ({assignModalDrive.campId || assignModalDrive.village})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                अभियान चुनें (Select Campaign)
              </label>
              <select
                value={assignModalDrive.id || assignModalDrive._id}
                onChange={e => {
                  const m = drives.find(d => (d.id || d._id) === e.target.value);
                  if (m) setAssignModalDrive(m);
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
              >
                {drives.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id}>
                    {d.vaccine} — {d.block} ({d.campId || 'CAMP'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                कर्मी का चयन करें (Select Available Staff) *
              </label>
              <select
                value={selectedStaffToAssign}
                onChange={e => setSelectedStaffToAssign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
              >
                <option value="">-- उपलब्ध कर्मी चुनें --</option>
                {staff.filter(s => s.isAvailable).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roleLabel} • {s.block || s.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                भूमिका (Designated Role in Campaign)
              </label>
              <input
                type="text"
                value={assignRoleInput}
                onChange={e => setAssignRoleInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalDrive(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-slate-700 text-xs font-bold hover:bg-stone-200 transition"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleAssignTeam}
                disabled={submittingAssign || !selectedStaffToAssign}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black transition disabled:opacity-50 cursor-pointer"
              >
                {submittingAssign ? 'नियुक्त हो रहा है...' : 'नियुक्त करें (Confirm Assignment)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD DOSE MODAL */}
      {recordDoseDrive && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-modal p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-black text-slate-900">
                टीकाकरण डोज़ दर्ज करें (Record Administered Doses)
              </h3>
              <button type="button" onClick={() => setRecordDoseDrive(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              अभियान: <strong>{recordDoseDrive.vaccine}</strong> • ब्लॉक: <strong>{recordDoseDrive.block}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                दी गई खुराक संख्या (Doses Administered) *
              </label>
              <input
                type="number"
                min="1"
                value={doseCountInput}
                onChange={e => setDoseCountInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                टीका बैच संख्या (Vaccine Batch Number)
              </label>
              <input
                type="text"
                value={doseBatchInput}
                onChange={e => setDoseBatchInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                टीकाकर्ता का नाम (Administering Staff)
              </label>
              <input
                type="text"
                value={doseAdminByInput}
                onChange={e => setDoseAdminByInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecordDoseDrive(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-slate-700 text-xs font-bold hover:bg-stone-200 transition"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleRecordDose}
                disabled={submittingDose}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition disabled:opacity-50 cursor-pointer"
              >
                {submittingDose ? 'रिकॉर्ड हो रहा है...' : 'सुरक्षित करें (Save Doses)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
