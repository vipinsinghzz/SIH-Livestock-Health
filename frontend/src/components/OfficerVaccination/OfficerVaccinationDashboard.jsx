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
  const currentLang = (i18n.language || user?.preferredLanguage || 'en').split('-')[0].toLowerCase();
  const isMr = currentLang === 'mr';
  const isHi = currentLang === 'hi';
  const isEn = !isMr && !isHi;
  const tr = (en, mr, hi) => (isMr ? (mr || en) : isHi ? (hi || mr || en) : en);

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
      setErrorMessage(tr('Failed to load real-time campaign telemetry. Please retry.', 'रिअल-टाइम मोहीम डेटा लोड करण्यात अडचण. कृपया पुन्हा प्रयत्न करा.', 'डेटा लोड करने में असमर्थ। कृपया पुनः प्रयास करें।'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officerDistrict, tr]);

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
      alert(tr('Please enter vaccine, village, and block.', 'कृपया लस, गाव आणि तालुका भरा.', 'कृपया टीका, गाँव एवं तालुका (Block) अवश्य भरें।'));
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
        showToast(tr(
          `Campaign ${res.drive?.campId || ''} scheduled successfully.`,
          `मोहीम ${res.drive?.campId || ''} यशस्वीरित्या निश्चित केली.`,
          `अभियान ${res.drive?.campId || ''} सफलतापूर्वक निर्धारित किया गया।`
        ));
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
        alert(res?.message || tr('Failed to create campaign.', 'मोहीम तयार करण्यात अडचण.', 'अभियान बनाने में विफलता।'));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || tr('Could not schedule campaign.', 'मोहीम जतन होऊ शकली नाही.', 'त्रुटि: अभियान रिकॉर्ड नहीं हो सका।'));
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Ring Campaign Creation
  const handleCreateRingCampaign = async (e) => {
    e.preventDefault();
    if (!selectedOutbreakCase) {
      alert(tr('Please select an active outbreak case for ring vaccination.', 'कृपया रिंग लसीकरणासाठी सक्रिय उद्रेक प्रकरण निवडा.', 'कृपया रिंग टीकाकरण के लिए सक्रिय प्रकोप मामला (Outbreak Case) चुनें।'));
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
        showToast(tr(
          `Emergency ring campaign ${res.drive?.campId || ''} deployed!`,
          `तातडीची रिंग लसीकरण मोहीम ${res.drive?.campId || ''} सुरू केली!`,
          `आपातकालीन रिंग टीकाकरण अभियान ${res.drive?.campId || ''} निर्धारित!`
        ));
        setSelectedOutbreakCase(null);
        await loadDashboardData();
        setActiveTab('campaigns');
      } else {
        alert(res?.message || tr('Failed to schedule ring campaign.', 'रिंग मोहीम निश्चित करण्यात अडचण.', 'रिंग अभियान निर्धारण में समस्या।'));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || tr('Could not establish ring campaign.', 'रिंग मोहीम सुरू होऊ शकली नाही.', 'रिंग अभियान स्थापित नहीं हो सका।'));
    } finally {
      setSubmittingRing(false);
    }
  };

  // Handle Team Assignment
  const handleAssignTeam = async () => {
    if (!assignModalDrive || !selectedStaffToAssign) {
      alert(tr('Please select a staff member.', 'कृपया कर्मचाऱ्याची निवड करा.', 'कृपया दल के सदस्य का चयन करें।'));
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
        showToast(tr(
          `Staff member ${selectedStaffObj?.name || ''} assigned to campaign.`,
          `कर्मचारी ${selectedStaffObj?.name || ''} मोहिमेत नियुक्त केले.`,
          `दल सदस्य ${selectedStaffObj?.name || ''} अभियान में नियुक्त किया गया।`
        ));
        setAssignModalDrive(null);
        setSelectedStaffToAssign('');
        await loadDashboardData();
      } else {
        alert(res?.message || tr('Failed to assign staff.', 'नियुक्ती अयशस्वी.', 'नियुक्ति में विफलता।'));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || tr('Could not assign staff.', 'कर्मचारी नियुक्त करता आले नाहीत.', 'दल नियुक्त नहीं हो सका।'));
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle Dose Recording
  const handleRecordDose = async () => {
    if (!recordDoseDrive || !doseCountInput) {
      alert(tr('Please enter dose count.', 'कृपया डोस संख्या प्रविष्ट करा.', 'कृपया टीकों की संख्या दर्ज करें।'));
      return;
    }

    const count = parseInt(doseCountInput, 10);
    if (isNaN(count) || count < 1) {
      alert(tr('Dose count must be 1 or higher.', 'संख्या १ किंवा अधिक असावी.', 'संख्या 1 या अधिक होनी चाहिए।'));
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
        showToast(tr(
          `${count} doses recorded successfully. New coverage: ${res.coveragePercentage}%`,
          `${count} डोस यशस्वीरित्या नोंदवले. नवीन कव्हरेज: ${res.coveragePercentage}%`,
          `${count} खुराक सफलतापूर्वक दर्ज की गईं। नया कवरेज: ${res.coveragePercentage}%`
        ));
        setRecordDoseDrive(null);
        await loadDashboardData();
      } else {
        alert(res?.message || tr('Failed to record doses.', 'डोस नोंदवण्यात अडचण.', 'डोज़ दर्ज करने में विफलता।'));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || tr('Could not save doses.', 'नोंद सुरक्षित होऊ शकली नाही.', 'रिकॉर्ड नहीं हो सका।'));
    } finally {
      setSubmittingDose(false);
    }
  };

  // Handle Status Update (e.g. Activate or Close)
  const handleStatusTransition = async (driveId, newStatus) => {
    const confirmMsg =
      newStatus === 'Completed'
        ? tr('Are you sure you want to close and complete this campaign?', 'आपण खात्री बाळगता की ही मोहीम पूर्ण व बंद करावी?', 'क्या आप सुनिश्चित हैं कि यह अभियान पूर्ण व बंद (Closed) किया जाए?')
        : tr(`Update campaign status to "${newStatus}"?`, `मोहीम स्थिती "${newStatus}" मध्ये बदलायची आहे का?`, `क्या आप अभियान की स्थिति "${newStatus}" करना चाहते हैं?`);

    if (!window.confirm(confirmMsg)) return;

    try {
      let res;
      if (newStatus === 'Completed') {
        res = await vaccinationService.closeCampaign(driveId, 'Closed from Officer Dashboard');
      } else {
        res = await vaccinationService.updateCampaignStatus(driveId, newStatus, 'Status updated by Officer');
      }

      if (res?.success) {
        showToast(tr(
          `Campaign status updated to "${newStatus}".`,
          `मोहीम स्थिती "${newStatus}" मध्ये बदलली.`,
          `अभियान स्थिति "${newStatus}" में परिवर्तित।`
        ));
        if (selectedDriveForDetail && (selectedDriveForDetail.id === driveId || selectedDriveForDetail._id === driveId)) {
          setSelectedDriveForDetail({ ...selectedDriveForDetail, status: newStatus });
        }
        await loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || tr('Failed to update status.', 'स्थिती अद्ययावत करण्यात अपयश.', 'स्थिति अपडेट नहीं हो सकी।'));
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
                    NADCP • {tr('District Command Center', 'जिल्हा नियंत्रण कक्ष', 'जिला कमान केंद्र')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {tr('District:', 'जिल्हा:', 'जिला:')} <strong className="text-white">{officerDistrict}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Supabase
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5" style={{ color: '#ffffff' }}>
                  {tr(
                    'Livestock Disease Vaccination & Campaign Command',
                    'पशु रोग लस व मोहीम व्यवस्थापन - अधिकारी कमान',
                    'पशु रोग टीकाकरण एवं अभियान प्रबंधन - अधिकारी कमान'
                  )}
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
                <span>{refreshing ? tr('Syncing...', 'रिफ्रेश होत आहे...', 'रिफ्रेशिंग...') : tr('Sync Live Data', 'ताजे करा', 'ताज़ा करें')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{tr('New Campaign', 'नवीन मोहीम', 'नया अभियान')}</span>
              </button>
            </div>
          </div>

          {/* Local Tab Navigation */}
          <div className="flex items-center gap-1 sm:gap-2 mt-4 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-3">
            {[
              { id: 'overview', label: tr('Overview', 'आढावा', 'अवलोकन'), icon: Activity },
              { id: 'campaigns', label: `${tr('Campaigns', 'मोहिमा', 'अभियान')} (${drives.length})`, icon: Syringe },
              { id: 'create', label: tr('Plan Campaign', 'मोहीम नियोजन', 'अभियान योजना'), icon: PlusCircle },
              { id: 'ring', label: `${tr('Ring Buffer', 'रिंग बफर', 'रिंग बफर')} (${outbreaks.length})`, icon: Radio },
              { id: 'map', label: tr('GIS Telemetry Map', 'जीआयएस नकाशा', 'जीआईएस निगरानी नक्शा'), icon: Compass },
              { id: 'coverage', label: tr('Coverage Analytics', 'कव्हरेज विश्लेषण', 'कवरेज विश्लेषण'), icon: BarChart3 },
              { id: 'teams', label: `${tr('Field Teams', 'कार्यकारी पथके', 'कार्यकारी दल')} (${staff.length})`, icon: Users }
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
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('Active Drives', 'सक्रिय मोहिमा', 'सक्रिय अभियान')}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.activeDrives : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                {tr('Active in field', 'क्षेत्रात सक्रिय', 'सक्रिय अभियान क्षेत्र में')}
              </p>
            </div>

            {/* 2. Upcoming Drives */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('Upcoming Drives', 'आगामी मोहिमा', 'आगामी अभियान')}
                </span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.upcomingDrives : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-blue-700 font-medium mt-1">
                {tr('Scheduled camps', 'नियोजित शिबिरे', 'आगामी निर्धारित शिविर')}
              </p>
            </div>

            {/* 3. Target Animals */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('Target Animals', 'लक्षित जनावरे', 'लक्षित पशु')}
                </span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {kpis ? kpis.targetAnimals.toLocaleString() : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {tr('Total district target', 'एकूण जिल्हा लक्ष्य', 'कुल लक्षित पशु संख्या')}
              </p>
            </div>

            {/* 4. Vaccinated */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('Vaccinated', 'लसीकरण पूर्ण', 'टीकाकरण पूर्ण')}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {kpis ? kpis.vaccinatedAnimals.toLocaleString() : 'Data unavailable'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-bold text-emerald-700">
                  {kpis ? `${kpis.coveragePct}% ${tr('Coverage', 'कव्हरेज', 'कवरेज')}` : ''}
                </span>
              </div>
            </div>

            {/* 5. Pending Vaccinations */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('Pending', 'प्रलंबित', 'शेष / लंबित')}
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">
                {kpis ? kpis.pendingVaccinations.toLocaleString() : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                {tr('Remaining animals', 'उर्वरित जनावरे', 'शेष प्रतिरक्षण लक्ष्य')}
              </p>
            </div>

            {/* 6. High-Risk Areas */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {tr('High-Risk Areas', 'उच्च-जोखिम क्षेत्रे', 'उच्च-जोखिम क्षेत्र')}
                </span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-600">
                {kpis ? (kpis.highRiskAreas ? kpis.highRiskAreas.length : 0) : 'Data unavailable'}
              </div>
              <p className="text-[11px] text-red-700 font-medium mt-1">
                {tr('Outbreaks & low coverage', 'उद्रेक व कमी कव्हरेज', 'प्रकोप व कम कवरेज क्षेत्र')}
              </p>
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
                    {tr('District Routine Plan', 'जिल्हा नियमित योजना', 'जिला नियमित योजना')}
                  </span>
                  <h3 className="text-lg font-black mt-2 text-white !text-white" style={{ color: '#ffffff' }}>
                    {tr('Mass Vaccination Campaign', 'सामूहिक लसीकरण मोहीम', 'सामूहिक टीकाकरण अभियान')}
                  </h3>
                  <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                    {tr(
                      'Schedule pre-monsoon and routine protective vaccination drives across blocks and villages.',
                      'तालुका व ग्राम स्तरावर पावसाळापूर्व व नियमित संरक्षणात्मक लसीकरण मोहिमांचे नियोजन करा.',
                      'ब्लॉक एवं ग्राम स्तर पर पूर्व-मानसून अथवा नियमित सुरक्षात्मक टीकाकरण अभियान की योजना बनाएं।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{tr('Plan Campaign', 'मोहीम आखा', 'अभियान तैयार करें')}</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-red-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm border border-red-800/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-400/30">
                      {tr('Emergency Outbreak Buffer', 'तातडीचा उद्रेक प्रतिबंधक कक्ष', 'आपातकालीन प्रकोप बफर')}
                    </span>
                    <span className="text-xs font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded">
                      {outbreaks.length} {tr('Active Cases', 'सक्रिय प्रकरणे', 'सक्रिय मामले')}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-2 text-white !text-white" style={{ color: '#ffffff' }}>
                    {tr('Ring Vaccination Taskforce', 'रिंग लसीकरण कृती दल', 'रिंग टीकाकरण टास्कफोर्स')}
                  </h3>
                  <p className="text-xs text-red-100/80 mt-1 leading-relaxed">
                    {tr(
                      'Establish immediate containment vaccination in 1–10 km buffer perimeter around verified disease epicenters.',
                      'सत्यापित रोग उद्रेक केंद्राभोवती १-१० किमी परिघात तातडीने रिंग लसीकरण मोहीम सुरू करा.',
                      'सत्यापित रोग प्रकोप के केंद्र से 1–10 किमी परिधि में तत्काल रिंग टीकाकरण अभियान आरंभ करें।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ring')}
                  className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Radio className="w-4 h-4" />
                  <span>{tr('Trigger Ring Buffer', 'रिंग मोहीम सुरू करा', 'प्रकोप रिंग अभियान')}</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {tr('Field Deployment', 'क्षेत्रीय पथक नियुक्ती', 'फील्ड तैनाती')}
                    </span>
                    <span className="text-xs font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded">
                      {staff.length} {tr('Staff Available', 'उपलब्ध कर्मचारी', 'उपलब्ध कर्मचारी')}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-2 text-white !text-white" style={{ color: '#ffffff' }}>
                    {tr('Team Assignment & Logistics', 'पथक नियुक्ती व वाटप', 'दल तैनाती व आवंटन')}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {tr(
                      'Verify availability of Veterinary Officers and field livestock supervisors for drive deployment.',
                      'पशुवैद्यकीय अधिकारी आणि क्षेत्रीय कर्मचाऱ्यांची उपलब्धता तपासून मोहिमांमध्ये नियुक्त करा.',
                      'पशुचिकित्सा अधिकारियों व क्षेत्रीय कार्यकर्ताओं की उपलब्धता सत्यापित कर अभियानों में नियुक्त करें।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>{tr('Deploy Staff', 'पथक नियुक्त करा', 'दल नियुक्त करें')}</span>
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
                      {tr('Priority & High-Risk Areas', 'प्राधान्य व उच्च-जोखिम क्षेत्रे', 'प्राथमिकता एवं उच्च-जोखिम अलर्ट')} • {kpis.highRiskAreas.length}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    {tr('Action Required', 'तातडीची कारवाई', 'कार्रवाई आवश्यक')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  {tr(
                    'Identification of verified outbreak zones and villages with under 50% coverage requiring immediate intervention.',
                    'सत्यापित रोग उद्रेक क्षेत्रे आणि ५०% पेक्षा कमी कव्हरेज असलेल्या गावांची ओळख. तातडीचा हस्तक्षेप आवश्यक.',
                    'वास्तविक रोग प्रकोप एवं 50% से कम टीकाकरण कवरेज वाले क्षेत्रों की पहचान। तत्काल हस्तक्षेप आवश्यक है।'
                  )}
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
                            <span>{tr('Plan Ring', 'रिंग योजना', 'रिंग योजना')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('teams')}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{tr('Deploy Team', 'पथक पाठवा', 'दल भेजें')}</span>
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
                    {tr('Active & Scheduled Campaigns', 'सक्रिय व नियोजित मोहिमा', 'सक्रिय एवं आगामी अभियान')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr(
                      `All authorized vaccination centres and camps across ${officerDistrict}`,
                      `${officerDistrict} जिल्ह्यातील सर्व अधिकृत लसीकरण केंद्र व शिबिरे`,
                      `जिला ${officerDistrict} के सभी अधिकृत टीकाकरण केंद्र एवं शिविर`
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{tr('View All', 'सर्व पहा', 'सभी देखें')} ({drives.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">{tr('Campaign ID / Name', 'मोहीम आयडी / नाव', 'अभियान ID / नाम')}</th>
                      <th className="py-3 px-4">{tr('Disease & Vaccine', 'रोग व लस', 'रोग व टीका')}</th>
                      <th className="py-3 px-4">{tr('Location (Block • Village)', 'स्थान (तालुका • गाव)', 'स्थान (ब्लॉक • गाँव)')}</th>
                      <th className="py-3 px-4">{tr('Target / Done', 'लक्षित / पूर्ण', 'लक्षित / पूर्ण')}</th>
                      <th className="py-3 px-4">{tr('Coverage', 'कव्हरेज', 'कवरेज')}</th>
                      <th className="py-3 px-4">{tr('Assigned Officer', 'नियुक्त अधिकारी', 'नियुक्त अधिकारी')}</th>
                      <th className="py-3 px-4">{tr('Status', 'स्थिती', 'स्थिति')}</th>
                      <th className="py-3 px-4 text-right">{tr('Action', 'कार्रवाई', 'कार्रवाई')}</th>
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
                            {d.assignedOfficer || tr('Not Assigned', 'नियुक्त नाही', 'नियुक्त नहीं')}
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
                              {tr('View Details', 'तपशील', 'विवरण')}
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
                  placeholder={tr('Search by vaccine, block, village, or campaign ID...', 'लस, तालुका, गाव किंवा मोहीम आयडी शोधा...', 'टीका, ब्लॉक, गाँव अथवा अभियान ID खोजें...')}
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
                  <option value="ALL">{tr('All Statuses', 'सर्व स्थिती', 'सभी स्थितियाँ')}</option>
                  <option value="UPCOMING">{tr('Upcoming / Scheduled', 'आगामी / नियोजित', 'आगामी / निर्धारित')}</option>
                  <option value="ACTIVE">{tr('Ongoing / Active', 'सक्रिय', 'सक्रिय')}</option>
                  <option value="COMPLETED">{tr('Completed', 'पूर्ण झालेले', 'पूर्ण')}</option>
                </select>

                <select
                  value={blockFilter}
                  onChange={e => setBlockFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-700"
                >
                  <option value="ALL">{tr('All Blocks', 'सर्व तालुके', 'सभी ब्लॉक')}</option>
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
                              {tr('RING BUFFER', 'रिंग बफर', 'रिंग बफर')}
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
                          <span>{d.campDate ? new Date(d.campDate).toLocaleDateString(currentLang === 'en' ? 'en-IN' : currentLang === 'mr' ? 'mr-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{tr('Officer:', 'अधिकारी:', 'अधिकारी:')} {d.assignedOfficer || tr('Not Assigned', 'नियुक्त नाही', 'नियुक्त नहीं')}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">{tr('Coverage', 'प्रगती', 'प्रगति')}</span>
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
                          <span>{tr('Target:', 'लक्षित:', 'लक्षित:')} {target}</span>
                          <span className="text-amber-700 font-bold">{tr('Pending:', 'शिल्लक:', 'शेष:')} {pending}</span>
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
                        {tr('Details', 'तपशील', 'विवरण')}
                      </button>

                      {d.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => setRecordDoseDrive(d)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                        >
                          + {tr('Record Dose', 'डोस नोंदवा', 'डोज़ दर्ज')}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setAssignModalDrive(d)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer"
                        title={tr('Assign Team', 'पथक नियुक्त करा', 'दल नियुक्त करें')}
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
                {tr('Official Programme Planning', 'शासकीय मोहीम नियोजन', 'आधिकारिक अभियान नियोजन')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                {tr('Schedule New Vaccination Campaign', 'नवीन सामूहिक लसीकरण मोहीम आखा', 'नया सामूहिक टीकाकरण अभियान तैयार करें')}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {tr(
                  'This record will be saved directly into Supabase as an official government drive.',
                  'ही नोंद थेट सुपाबेस डेटाबेसमध्ये अधिकृत शासकीय मोहीम म्हणून जतन केली जाईल.',
                  'यह रिकॉर्ड सीधे सुपाबेस (Supabase) डेटाबेस में आधिकारिक अभियान के रूप में सुरक्षित होगा।'
                )}
              </p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Standard Vaccine Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('Vaccine Standard *', 'लस प्रकार *', 'टीका प्रकार *')}
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
                    {tr('Official Full Name *', 'लसीचे पूर्ण नाव *', 'टीका पूरा नाम *')}
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
                    {tr('Target Disease *', 'लक्ष्य रोग *', 'लक्षित रोग *')}
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
                    {tr('Target Species *', 'लक्षित पशू प्रजाती *', 'लक्षित पशु प्रजाति *')}
                  </label>
                  <select
                    value={campaignForm.targetSpecies}
                    onChange={e => setCampaignForm({ ...campaignForm, targetSpecies: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="Cattle & Buffalo">{tr('Cattle & Buffalo', 'गाय व म्हैस', 'गाय एवं भैंस')}</option>
                    <option value="Goat & Sheep">{tr('Goat & Sheep', 'शेळी व मेंढी', 'बकरी एवं भेड़')}</option>
                    <option value="All Livestock">{tr('All Livestock', 'सर्व पशुधन', 'समस्त पशुधन')}</option>
                  </select>
                </div>

                {/* District (Locked to Officer jurisdiction) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('District', 'जिल्हा', 'जिला')}
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
                    {tr('Block / Taluka *', 'तालुका / ब्लॉक *', 'तालुका / ब्लॉक *')}
                  </label>
                  <input
                    type="text"
                    placeholder={tr('e.g. Saoner, Kamptee, Hingna', 'उदा. सावनेर, कामठी, हिंगणा', 'उदा. Saoner, Kamptee, Hingna')}
                    value={campaignForm.block}
                    onChange={e => setCampaignForm({ ...campaignForm, block: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Village */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('Village / Target Area *', 'गाव / कार्यक्षेत्र *', 'गाँव / क्षेत्र *')}
                  </label>
                  <input
                    type="text"
                    placeholder={tr('e.g. Kelod, Yerkheda', 'उदा. केळोद, येरखेडा', 'उदा. Kelod, Yerkheda')}
                    value={campaignForm.village}
                    onChange={e => setCampaignForm({ ...campaignForm, village: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Venue */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('Dispensary / Venue', 'दवाखाना / शिबिर स्थळ', 'शिविर स्थल')}
                  </label>
                  <input
                    type="text"
                    placeholder={tr('e.g. Primary Veterinary Dispensary', 'उदा. प्राथमिक पशुवैद्यकीय दवाखाना', 'उदा. प्राथमिक पशु चिकित्सालय')}
                    value={campaignForm.venue}
                    onChange={e => setCampaignForm({ ...campaignForm, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-slate-800"
                  />
                </div>

                {/* Target Population */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('Target Animal Count *', 'लक्षित पशू संख्या *', 'लक्षित पशु संख्या *')}
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
                    {tr('Priority Level', 'प्राधान्य स्तर', 'प्राथमिकता')}
                  </label>
                  <select
                    value={campaignForm.priority}
                    onChange={e => setCampaignForm({ ...campaignForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="Normal">{tr('Normal (Routine)', 'सामान्य (नियमित)', 'सामान्य (नियमित)')}</option>
                    <option value="High">{tr('High Risk', 'उच्च प्राधान्य', 'उच्च जोखिम')}</option>
                    <option value="Urgent">{tr('Urgent Outbreak', 'तातडीचा प्रादुर्भाव', 'आपातकालीन प्रकोप')}</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {tr('Start Date *', 'सुरुवात तारीख *', 'आरंभ तिथि *')}
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
                    {tr('End Date', 'समाप्ती तारीख', 'समाप्ति तिथि')}
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
                  {tr('Operational Directives / Notes', 'मोहीम सूचना व नोंदी', 'अभियान निर्देश व टिप्पणियां')}
                </label>
                <textarea
                  rows="3"
                  placeholder={tr('Cold chain protocol, syringes, and logistics instructions...', 'कोल्ड चेन सूचना, सिरिंज व लॉजिस्टिक तपशील...', 'शीत-श्रृंखला (Cold Chain) निर्देश, सिरिंज एवं लॉजिस्टिक्स विवरण...')}
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
                  {tr('Cancel', 'रद्द करा', 'रद्द करें')}
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{tr('Saving...', 'जतन होत आहे...', 'सुरक्षित हो रहा है...')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{tr('Schedule Campaign', 'मोहीम निश्चित करा', 'अभियान सुरक्षित करें')}</span>
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
                    {tr('Epidemic Containment Buffer Protocol', 'उद्रेक प्रतिबंधक बफर प्रोटोकॉल', 'प्रकोप रोकथाम बफर प्रोटोकॉल')}
                  </span>
                </div>
                <h2 className="text-xl font-black mt-1 text-white" style={{ color: '#ffffff' }}>
                  {tr('Outbreak-Driven Ring Vaccination', 'रोग उद्रेक आधारित रिंग लसीकरण', 'रोग प्रकोप आधारित रिंग टीकाकरण')}
                </h2>
                <p className="text-xs text-red-200/90 mt-1 max-w-2xl leading-relaxed">
                  {tr(
                    'Establish an immunization perimeter buffer around confirmed disease epicenters to halt transmission (LSD, FMD, PPR).',
                    'संसर्ग रोखण्यासाठी (LSD, FMD, PPR) पुष्टी झालेल्या उद्रेक केंद्राभोवती लसीकरण बफर तयार करा.',
                    'सत्यापित प्रकोप केंद्र के चारों ओर प्रतिरक्षण बफर स्थापित कर संक्रामक रोगों (LSD, FMD, PPR) के फैलाव को पूर्णतः रोकें।'
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-white">{outbreaks.length}</span>
                <span className="block text-[11px] text-red-300">
                  {tr('Active Outbreaks', 'सक्रिय उद्रेक', 'सक्रिय प्रकोप')}
                </span>
              </div>
            </div>

            {/* Step 1: Select Active Outbreak Case */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>{tr('1. Select Confirmed Outbreak Case', '१. पुष्टी झालेले उद्रेक प्रकरण निवडा', '1. सक्रिय प्रकोप मामला चुनें')}</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {tr(
                  'List of active outbreak cases in Supabase. Select a case to initialize ring containment:',
                  'सुपाबेस मधील सक्रिय उद्रेक प्रकरणांची यादी. रिंग मोहिमेसाठी प्रकरण निवडा:',
                  'नीचे सुपाबेस में दर्ज सक्रिय रोग प्रकोप मामलों की सूची है। रिंग अभियान हेतु मामले का चयन करें:'
                )}
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
                        <span className="text-[11px] text-slate-500">
                          {c.species} ({c.affectedCount} {tr('affected', 'बाधित', 'प्रभावित')})
                        </span>
                        {hasDrive ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {tr('Ring Active', 'रिंग मोहीम सक्रिय', 'रिंग ड्राइव सक्रिय')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-700">
                            {tr('Ring Pending', 'रिंग प्रलंबित', 'रिंग लंबित')}
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
                  <span>{tr('2. Configure Ring Radius & Veterinary Team', '२. रिंग परिघ व पशुवैद्यकीय पथक निश्चित करा', '2. रिंग परिधि व दल विन्यास')}</span>
                </h3>
                <p className="text-xs text-slate-600 mb-5">
                  {tr('Case:', 'प्रकरण:', 'मामला:')} <strong>{selectedOutbreakCase.caseId} ({selectedOutbreakCase.disease})</strong> • {tr('Location:', 'स्थान:', 'स्थान:')} <strong>{selectedOutbreakCase.village}, {selectedOutbreakCase.block}</strong>
                </p>

                <form onSubmit={handleCreateRingCampaign} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Ring Radius Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {tr('Supported Protection Radius *', 'संरक्षण परिघ दायरा *', 'सुरक्षा परिधि दायरा *')}
                      </label>
                      <select
                        value={ringRadiusKm}
                        onChange={e => setRingRadiusKm(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                      >
                        {SUPPORTED_RADII.map(r => (
                          <option key={r} value={r}>{r} {tr('km Radius', 'किमी परिघ', 'किमी परिधि')}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {tr('Supported range: 0.5 – 50.0 km', 'समर्थित मर्यादा: ०.५ – ५०.० किमी', 'डेटाबेस समर्थित सीमा: 0.5 – 50.0 km')}
                      </p>
                    </div>

                    {/* Ring Target Population */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {tr('Estimated Ring Target Count *', 'अंदाजे लक्षित जनावरे *', 'अनुमानित परिधि लक्ष्य *')}
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
                        {tr('Lead Veterinarian', 'प्रमुख पशुवैद्यक', 'प्रभारी पशुचिकित्सक')}
                      </label>
                      <select
                        value={ringAssignedStaffId}
                        onChange={e => setRingAssignedStaffId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
                      >
                        <option value="">{tr('-- Select Available Veterinarian --', '-- उपलब्ध पशुवैद्यक निवडा --', '-- उपलब्ध पशुचिकित्सक चुनें --')}</option>
                        {staff.filter(s => s.role === 'veterinarian' && s.isAvailable).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.block || s.district})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {tr('Ring Outpost Venue', 'रिंग आउटपोस्ट स्थळ', 'आउटपोस्ट / केंद्र स्थल')}
                    </label>
                    <input
                      type="text"
                      placeholder={`${tr('Emergency Ring Outpost', 'तातडीचे रिंग आउटपोस्ट', 'आपातकालीन रिंग केंद्र')} - ${selectedOutbreakCase.village}`}
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
                      {tr('Cancel', 'रद्द करा', 'रद्द करें')}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRing}
                      className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submittingRing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{tr('Saving Ring Drive...', 'रिंग मोहीम जतन होत आहे...', 'रिंग अभियान सुरक्षित हो रहा है...')}</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          <span>{tr('Schedule Ring Drive', 'रिंग मोहीम सुरू करा', 'रिंग टीकाकरण अभियान स्थापित करें')}</span>
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
                  {tr('Active Outbreak & Vaccination GIS Map', 'सक्रिय उद्रेक व लसीकरण जीआयएस नकाशा', 'सक्रिय प्रकोप एवं टीकाकरण जीआईएस नक्शा')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr(
                    'Live geospatial intelligence based on verified GPS coordinates in Supabase',
                    'सुपाबेस मधील अधिकृत जीपीएस निर्देशांकांवर आधारित भौगोलिक माहिती',
                    'सुपाबेस में दर्ज वास्तविक जीपीएस निर्देशांकों पर आधारित दृश्यता'
                  )}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                {outbreaks.length} {tr('Outbreak Epicenters Mapped', 'उद्रेक केंद्र नकाशावर दर्शविले', 'प्रकोप केंद्र मैप किए गए')}
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
                    {tr('Block & Village Coverage Analytics', 'तालुका व ग्रामस्तरीय कव्हरेज विश्लेषण', 'तालुका एवं ग्राम स्तरीय कवरेज विश्लेषण')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tr(
                      'Official vaccination coverage computed from database records',
                      'डेटाबेस नोंदींवरून संगणित केलेली प्रामाणिक प्रगती',
                      'वास्तविक टीकाकरण रिकॉर्ड्स से संगणित प्रामाणिक प्रगति'
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700">
                    {coverageData?.overall?.coveragePct || kpis?.coveragePct || 0}%
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {tr('Overall District Coverage', 'एकूण जिल्हा कव्हरेज', 'समग्र जिला कवरेज')}
                  </span>
                </div>
              </div>

              {/* Block level breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {tr('Block Level Breakdown', 'तालुकानिहाय विश्लेषण', 'ब्लॉक स्तरीय विश्लेषण')}
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
                    <span>{tr('Low-Coverage Action Directives', 'कमी कव्हरेज क्षेत्रे — तातडीची कारवाई आवश्यक', 'कम कवरेज वाले क्षेत्र — त्वरित कार्रवाई आवश्यक')}</span>
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
                          {tr('Create Drive', 'मोहीम आखा', 'अभियान बनाएं')}
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
                  {tr('Veterinary & Field Staff Directory', 'पशुवैद्यक व क्षेत्रीय कर्मचारी रोस्टर', 'पशुचिकित्सक एवं क्षेत्रीय कार्यकर्ता रोस्टर')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr(
                    'Verified personnel registered in Supabase and real-time availability',
                    'सुपाबेस मधील अधिकृत कर्मचारी व त्यांची उपलब्धता स्थिती',
                    'सुपाबेस में पंजीकृत अधिकृत कर्मी एवं उनकी उपलब्धता स्थिति'
                  )}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                {staff.length} {tr('Verified Staff in', 'अधिकृत कर्मचारी -', 'अधिकृत कर्मी -')} {officerDistrict}
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
                      {s.isAvailable ? tr('Available for Deployment', 'तैनातीसाठी उपलब्ध', 'तैनाती हेतु उपलब्ध') : tr('Unavailable (On Leave / Busy)', 'अनुपलब्ध (रजेवर / व्यस्त)', 'अनुपलब्ध (छुट्टी / व्यस्त)')}
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
                      {tr('Assign Drive', 'मोहीम सोपवा', 'अभियान सौंपें')}
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
                <span className="text-slate-500 block">{tr('Status', 'स्थिती', 'स्थिति')}</span>
                <strong className="text-slate-900 font-black">{selectedDriveForDetail.status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">{tr('Target', 'लक्षित', 'लक्षित')}</span>
                <strong className="text-slate-900 font-black">
                  {(selectedDriveForDetail.targetCount || selectedDriveForDetail.capacity || 0).toLocaleString()}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">{tr('Covered', 'पूर्ण', 'पूर्ण')}</span>
                <strong className="text-emerald-700 font-black">
                  {(selectedDriveForDetail.coveredCount || 0).toLocaleString()}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-slate-500 block">{tr('Coverage', 'कव्हरेज', 'कवरेज')}</span>
                <strong className="text-slate-900 font-black">
                  {selectedDriveForDetail.coveragePercentage || 0}%
                </strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{tr('Location:', 'स्थान:', 'स्थान:')} <strong>{selectedDriveForDetail.block}</strong> • {selectedDriveForDetail.village || selectedDriveForDetail.venue} ({selectedDriveForDetail.district})</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{tr('Start Date:', 'आरंभ तारीख:', 'आरंभ तिथि:')} {selectedDriveForDetail.campDate || selectedDriveForDetail.startDate || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{tr('Assigned Officer:', 'नियुक्त अधिकारी:', 'नियुक्त अधिकारी:')} <strong>{selectedDriveForDetail.assignedOfficer || tr('Not Assigned', 'नियुक्त नाही', 'नियुक्त नहीं')}</strong></span>
              </div>
            </div>

            {selectedDriveForDetail.notes && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">
                  {tr('Directives & History:', 'सूचना व इतिहास:', 'निर्देश व ऑडिट इतिहास:')}
                </span>
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
                    {tr('Start Campaign', 'मोहीम सुरू करा', 'अभियान आरंभ करें')}
                  </button>
                ) : null}

                {selectedDriveForDetail.status !== 'Completed' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(selectedDriveForDetail.id || selectedDriveForDetail._id, 'Completed')}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {tr('Close & Complete Campaign', 'मोहीम पूर्ण व बंद करा', 'अभियान पूर्ण व बंद करें')}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriveForDetail(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                {tr('Close', 'बंद करा', 'बंद करें')}
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
                {tr('Assign Team to Campaign', 'मोहिमेत पथक नियुक्त करा', 'अभियान में दल नियुक्त करें')}
              </h3>
              <button type="button" onClick={() => setAssignModalDrive(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {tr('Campaign:', 'मोहीम:', 'अभियान:')} <strong>{assignModalDrive.vaccine}</strong> ({assignModalDrive.campId || assignModalDrive.village})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tr('Select Campaign', 'मोहीम निवडा', 'अभियान चुनें')}
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
                {tr('Select Available Staff *', 'उपलब्ध कर्मचारी निवडा *', 'कर्मी का चयन करें *')}
              </label>
              <select
                value={selectedStaffToAssign}
                onChange={e => setSelectedStaffToAssign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white text-slate-800"
              >
                <option value="">{tr('-- Select Available Staff --', '-- उपलब्ध कर्मचारी निवडा --', '-- उपलब्ध कर्मी चुनें --')}</option>
                {staff.filter(s => s.isAvailable).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roleLabel} • {s.block || s.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tr('Designated Role in Campaign', 'मोहिमेतील पद / भूमिका', 'भूमिका')}
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
                {tr('Cancel', 'रद्द करा', 'रद्द करें')}
              </button>
              <button
                type="button"
                onClick={handleAssignTeam}
                disabled={submittingAssign || !selectedStaffToAssign}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black transition disabled:opacity-50 cursor-pointer"
              >
                {submittingAssign ? tr('Assigning...', 'नियुक्ती होत आहे...', 'नियुक्त हो रहा है...') : tr('Confirm Assignment', 'नियुक्ती निश्चित करा', 'नियुक्त करें')}
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
                {tr('Record Administered Doses', 'दिलेल्या लसींच्या डोसची नोंद करा', 'टीकाकरण डोज़ दर्ज करें')}
              </h3>
              <button type="button" onClick={() => setRecordDoseDrive(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {tr('Campaign:', 'मोहीम:', 'अभियान:')} <strong>{recordDoseDrive.vaccine}</strong> • {tr('Block:', 'तालुका:', 'ब्लॉक:')} <strong>{recordDoseDrive.block}</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {tr('Doses Administered *', 'दिलेले डोस *', 'दी गई खुराक संख्या *')}
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
                {tr('Vaccine Batch Number', 'लस बॅच क्रमांक', 'टीका बैच संख्या')}
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
                {tr('Administering Staff Name', 'लसीकरण करणाऱ्या कर्मचाऱ्याचे नाव', 'टीकाकर्ता का नाम')}
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
                {tr('Cancel', 'रद्द करा', 'रद्द करें')}
              </button>
              <button
                type="button"
                onClick={handleRecordDose}
                disabled={submittingDose}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition disabled:opacity-50 cursor-pointer"
              >
                {submittingDose ? tr('Saving...', 'नोंद होत आहे...', 'रिकॉर्ड हो रहा है...') : tr('Save Doses', 'डोस नोंदवा', 'सुरक्षित करें')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
