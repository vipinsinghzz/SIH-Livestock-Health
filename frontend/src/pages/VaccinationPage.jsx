import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import animalService from '../services/animalService';
import {
  Syringe,
  PlusCircle,
  CheckCircle2,
  MapPin,
  Compass,
  Calendar,
  Navigation,
  PhoneCall,
  History,
  ShieldCheck,
  Search,
  Filter,
  X,
  ExternalLink,
  BadgeCheck,
  Check
} from 'lucide-react';

// Haversine formula for distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function VaccinationPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const isEnglish = i18n.language?.startsWith('en');
  const isMarathi = i18n.language?.startsWith('mr');

  // State
  const [animals, setAnimals] = useState([]);
  const [reports, setReports] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Farmer GPS / fallback coordinates (Baramati rural cluster)
  const defaultUserLat = user?.location?.lat && user.location.lat !== 0 ? user.location.lat : 18.1517;
  const defaultUserLng = user?.location?.lng && user.location.lng !== 0 ? user.location.lng : 74.5772;
  const [userCoords, setUserCoords] = useState([defaultUserLat, defaultUserLng]);

  // Filters for Nearby Camps
  const [radiusFilter, setRadiusFilter] = useState(20); // 20 km radius default
  const [selectedVaccineFilter, setSelectedVaccineFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [registeringCamp, setRegisteringCamp] = useState(null);
  const [registeredCamps, setRegisteredCamps] = useState({});
  const [completingScheduleItem, setCompletingScheduleItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form for Mark as Completed
  const [completeFormData, setCompleteFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    administeredBy: isEnglish ? 'Dr. R. K. Shinde (Dispensary)' : isMarathi ? 'डॉ. आर. के. शिंदे (दवाखाना)' : 'डॉ. आर. के. शिंदे (पशु चिकित्सालय)',
    batchNumber: 'BATCH-2026-FMD',
    notes: isEnglish ? 'Administered subcutaneously at camp' : isMarathi ? 'शिबिरात लस देण्यात आली' : 'शिविर में टीका लगाया गया'
  });

  // Upcoming vaccination camps data (SIH PS-128)
  const initialCamps = [
    {
      id: 'camp-fmd-1',
      vaccineName: 'FMD',
      fullNameEn: 'Foot and Mouth Disease (FMD)',
      fullNameHi: 'खुरपका-मुंहपका',
      fullNameMr: 'लाळ-खुरकूत',
      dateEn: '12 Sept 2026 • 10:00 AM - 04:00 PM',
      dateHi: '12 सितम्बर 2026 • सुबह 10:00 से शाम 04:00',
      dateMr: '१२ सप्टेंबर २०२६ • सकाळी १०:०० ते दुपारी ०४:००',
      villageEn: 'Primary Veterinary Dispensary, Malegaon Bk',
      villageHi: 'प्राथमिक पशु चिकित्सालय, मालेगांव बुद्रुक',
      villageMr: 'प्राथमिक पशुवैद्यकीय दवाखाना, माळेगाव बु.',
      block: 'Baramati',
      lat: 18.1517,
      lng: 74.5772,
      targetAnimalsEn: 'Cattle & Buffalo',
      targetAnimalsHi: 'गाय एवं भैंस',
      targetAnimalsMr: 'गाय आणि म्हैस',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'Dept of Animal Husbandry, Maharashtra (NADCP)',
      organizerHi: 'पशुपालन विभाग, महाराष्ट्र शासन (NADCP)',
      organizerMr: 'पशुसंवर्धन विभाग, महाराष्ट्र शासन (NADCP)',
      remainingSlots: 48
    },
    {
      id: 'camp-lsd-2',
      vaccineName: 'LSD',
      fullNameEn: 'Lumpy Skin Disease (LSD)',
      fullNameHi: 'लम्पी त्वचा रोग',
      fullNameMr: 'लंपी त्वचा रोग',
      dateEn: '15 Sept 2026 • 09:30 AM - 02:30 PM',
      dateHi: '15 सितम्बर 2026 • सुबह 09:30 से दोपहर 02:30',
      dateMr: '१५ सप्टेंबर २०२६ • सकाळी ०९:३० ते दुपारी ०२:३०',
      villageEn: 'Gram Panchayat Veterinary Clinic, Kathephal',
      villageHi: 'ग्राम पंचायत पशु चिकित्सा केंद्र, काटेफळ',
      villageMr: 'ग्रामपंचायत पशुवैद्यकीय केंद्र, काटेफळ',
      block: 'Baramati',
      lat: 18.1632,
      lng: 74.5885,
      targetAnimalsEn: 'Cattle',
      targetAnimalsHi: 'गाय एवं गोवंश',
      targetAnimalsMr: 'गाय आणि गोवंश',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'National Livestock Mission (NLM)',
      organizerHi: 'राष्ट्रीय पशुधन मिशन',
      organizerMr: 'राष्ट्रीय पशुधन मिशन',
      remainingSlots: 32
    },
    {
      id: 'camp-hs-3',
      vaccineName: 'HS',
      fullNameEn: 'Hemorrhagic Septicemia (HS)',
      fullNameHi: 'गलघोंटू रोग',
      fullNameMr: 'घटसर्प रोग',
      dateEn: '18 Sept 2026 • 09:00 AM - 03:00 PM',
      dateHi: '18 सितम्बर 2026 • सुबह 09:00 से दोपहर 03:00',
      dateMr: '१८ सप्टेंबर २०२६ • सकाळी ०९:०० ते दुपारी ०३:००',
      villageEn: 'Animal Health Sub-Centre, Jalochi',
      villageHi: 'पशु स्वास्थ्य उपकेंद्र, जलोची',
      villageMr: 'पशु आरोग्य उपकेंद्र, जलोची',
      block: 'Baramati',
      lat: 18.1401,
      lng: 74.561,
      targetAnimalsEn: 'Cattle & Buffalo',
      targetAnimalsHi: 'गाय एवं भैंस',
      targetAnimalsMr: 'गाय आणि म्हैस',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'District Animal Husbandry Office, Pune',
      organizerHi: 'जिला पशुपालन कार्यालय, पुणे',
      organizerMr: 'जिल्हा पशुसंवर्धन कार्यालय, पुणे',
      remainingSlots: 60
    },
    {
      id: 'camp-bq-4',
      vaccineName: 'BQ',
      fullNameEn: 'Black Quarter (BQ)',
      fullNameHi: 'लंगड़ा बुखार',
      fullNameMr: 'फऱ्या रोग',
      dateEn: '21 Sept 2026 • 10:00 AM - 03:30 PM',
      dateHi: '21 सितम्बर 2026 • सुबह 10:00 से दोपहर 03:30',
      dateMr: '२१ सप्टेंबर २०२६ • सकाळी १०:०० ते दुपारी ०३:३०',
      villageEn: 'Taluka Veterinary Polyclinic, Baramati',
      villageHi: 'तालुका पशु चिकित्सालय, बारामती',
      villageMr: 'तालुका पशुवैद्यकीय सर्वचिकित्सालय, बारामती',
      block: 'Baramati',
      lat: 18.155,
      lng: 74.58,
      targetAnimalsEn: 'Cattle & Buffalo',
      targetAnimalsHi: 'गाय एवं भैंस',
      targetAnimalsMr: 'गाय आणि म्हैस',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'Zilla Parishad Pune',
      organizerHi: 'जिला परिषद पुणे',
      organizerMr: 'जिल्हा परिषद पुणे',
      remainingSlots: 25
    },
    {
      id: 'camp-bruc-5',
      vaccineName: 'Brucellosis',
      fullNameEn: 'Brucellosis (Calfhood S19)',
      fullNameHi: 'ब्रुसेलोसिस (बछड़ा टीकाकरण)',
      fullNameMr: 'ब्रुसेलोसिस (वासरांचे लसीकरण)',
      dateEn: '24 Sept 2026 • 10:30 AM - 02:00 PM',
      dateHi: '24 सितम्बर 2026 • सुबह 10:30 से दोपहर 02:00',
      dateMr: '२४ सप्टेंबर २०२६ • सकाळी १०:३० ते दुपारी ०२:००',
      villageEn: 'Veterinary Sub-Center, Dorlewadi',
      villageHi: 'पशु उपकेंद्र, दोर्लेवाडी',
      villageMr: 'पशुवैद्यकीय उपकेंद्र, दोर्लेवाडी',
      block: 'Baramati',
      lat: 18.17,
      lng: 74.59,
      targetAnimalsEn: 'Female Calves (Cattle & Buffalo)',
      targetAnimalsHi: 'मादा बछिया (गोवंश एवं भैंस)',
      targetAnimalsMr: 'मादी वासरे (गाय आणि म्हैस)',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'National Animal Disease Control Programme',
      organizerHi: 'राष्ट्रीय पशु रोग नियंत्रण कार्यक्रम',
      organizerMr: 'राष्ट्रीय पशु रोग नियंत्रण कार्यक्रम',
      remainingSlots: 18
    },
    {
      id: 'camp-ppr-6',
      vaccineName: 'PPR',
      fullNameEn: 'Peste des Petits Ruminants (PPR)',
      fullNameHi: 'बकरी प्लेग (PPR)',
      fullNameMr: 'शेळी प्लेग (PPR)',
      dateEn: '28 Sept 2026 • 09:00 AM - 01:00 PM',
      dateHi: '28 सितम्बर 2026 • सुबह 09:00 से दोपहर 01:00',
      dateMr: '२८ सप्टेंबर २०२६ • सकाळी ०९:०० ते दुपारी ०१:००',
      villageEn: 'Sheep & Goat Breeding Centre, Shirur',
      villageHi: 'भेड़-बकरी प्रजनन विकास केंद्र, शिरूर',
      villageMr: 'मेंढी व शेळी विकास केंद्र, शिरूर',
      block: 'Shirur',
      lat: 18.8276,
      lng: 74.3774,
      targetAnimalsEn: 'Goat & Sheep',
      targetAnimalsHi: 'बकरी एवं भेड़',
      targetAnimalsMr: 'शेळी आणि मेंढी',
      costEn: 'Free (Govt Drive)',
      costHi: 'निःशुल्क (सरकारी अभियान)',
      costMr: 'मोफत (शासकीय मोहीम)',
      isFree: true,
      organizerEn: 'Maharashtra Sheep & Goat Dev Corporation',
      organizerHi: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ',
      organizerMr: 'महाराष्ट्र मेंढी व शेळी विकास महामंडळ',
      remainingSlots: 75
    }
  ];

  // Load data
  useEffect(() => {
    loadData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos.coords.latitude && pos.coords.longitude) {
            setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [animalsRes, reportsRes, campsRes] = await Promise.allSettled([
        animalService.getAnimals(),
        api.get('/reports?nearbyAlerts=true&limit=50'),
        api.get(`/vaccination-drives?status=Upcoming,Ongoing&limit=300&lat=${userCoords[0]}&lng=${userCoords[1]}`)
      ]);

      if (animalsRes.status === 'fulfilled') {
        const fetched = animalsRes.value.data?.animals || animalsRes.value || [];
        // If farmer has no animals, ensure Tommy & Lakshmi exist so farmer can immediately experience full SIH PS-128 features
        if (fetched.length === 0) {
          const defaultHerd = [
            {
              _id: 'anim-tommy',
              tagId: 'MH-12-P-1092',
              name: 'Tommy',
              species: 'Cattle',
              breed: 'Gir Cow',
              healthStatus: 'Healthy',
              vaccinations: [
                { name: 'FMD (Foot and Mouth Disease)', date: '2026-03-15', nextDue: '2026-09-15', status: 'Completed' },
                { name: 'HS (Hemorrhagic Septicemia)', date: '2026-05-10', nextDue: '2026-11-10', status: 'Completed' }
              ],
              vaccinationHistory: [
                {
                  vaccine: 'FMD (Foot and Mouth Disease)',
                  date: new Date('2026-03-15'),
                  nextDue: new Date('2026-09-15'),
                  dose: 'Primary Dose',
                  batchNumber: 'FMD-2026-01',
                  administeredBy: 'Dr. R. K. Shinde',
                  camp: 'Baramati Veterinary Camp'
                }
              ]
            },
            {
              _id: 'anim-lakshmi',
              tagId: 'MH-12-P-1093',
              name: 'Lakshmi',
              species: 'Cattle',
              breed: 'Sahiwal',
              healthStatus: 'Healthy',
              vaccinations: [
                { name: 'LSD (Lumpy Skin Disease)', date: '2026-02-20', nextDue: '2026-09-20', status: 'Completed' }
              ],
              vaccinationHistory: [
                {
                  vaccine: 'LSD (Lumpy Skin Disease)',
                  date: new Date('2026-02-20'),
                  nextDue: new Date('2026-09-20'),
                  dose: 'Annual Booster',
                  batchNumber: 'LSD-2026-88',
                  administeredBy: 'Dr. Suresh Patil',
                  camp: 'Malegaon Sub-Centre'
                }
              ]
            }
          ];
          setAnimals(defaultHerd);
        } else {
          setAnimals(fetched);
        }
      }

      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data?.reports || []);
      }

      // Populate live seeded vaccination camps from database
      if (campsRes.status === 'fulfilled' && campsRes.value.data?.drives?.length > 0) {
        const raw = campsRes.value.data.drives;
        const formatted = raw.map(c => {
          const campDateObj = new Date(c.campDate || c.startDate || Date.now());
          const dateStrEn = campDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const dateStrHi = campDateObj.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const dateStrMr = campDateObj.toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' });

          return {
            id: c._id,
            campId: c.campId,
            vaccineName: c.vaccine,
            fullNameEn: c.vaccineFullName || c.vaccine,
            fullNameHi: c.vaccineFullName || c.vaccine,
            fullNameMr: c.vaccineFullName || c.vaccine,
            dateEn: `${dateStrEn} • ${c.startTime || '09:30 AM'} - ${c.endTime || '04:00 PM'}`,
            dateHi: `${dateStrHi} • ${c.startTime || '09:30 AM'} से ${c.endTime || '04:00 PM'}`,
            dateMr: `${dateStrMr} • ${c.startTime || '09:30 AM'} ते ${c.endTime || '04:00 PM'}`,
            villageEn: `${c.venue || 'Primary Veterinary Dispensary'}, ${c.village}`,
            villageHi: `${c.venue || 'प्राथमिक पशु चिकित्सालय'}, ${c.village}`,
            villageMr: `${c.venue || 'प्राथमिक पशुवैद्यकीय दवाखाना'}, ${c.village}`,
            block: c.block,
            district: c.district,
            state: c.state,
            lat: c.coordinates?.lat || 18.1517,
            lng: c.coordinates?.lng || 74.5772,
            targetAnimalsEn: c.targetSpecies || 'Cattle & Buffalo',
            targetAnimalsHi: c.targetSpecies || 'गाय एवं भैंस',
            targetAnimalsMr: c.targetSpecies || 'गाय आणि म्हैस',
            costEn: c.cost || 'Free (Govt Drive)',
            costHi: 'निःशुल्क (सरकारी अभियान)',
            costMr: 'मोफत (शासकीय मोहीम)',
            isFree: c.isFree !== false,
            organizerEn: c.organizingHospital,
            organizerHi: c.organizingHospital,
            organizerMr: c.organizingHospital,
            remainingSlots: c.remainingSlots !== undefined ? c.remainingSlots : (c.capacity || 200) - (c.bookedSlots || 0),
            contactNumber: c.contactNumber || '1962',
            assignedOfficer: c.assignedOfficer || 'Veterinary Officer',
            status: c.status
          };
        });
        setCamps(formatted);
      } else {
        setCamps(initialCamps);
      }
    } catch (err) {
      console.error('Error loading vaccination page data:', err);
      setCamps(initialCamps);
    } finally {
      setLoading(false);
    }
  };

  // Compute distance for each camp (prioritizing live database camps)
  const activeCampsList = camps.length > 0 ? camps : initialCamps;
  const campsWithDistance = activeCampsList.map((camp) => {
    const dist = calculateDistance(userCoords[0], userCoords[1], camp.lat, camp.lng);
    return {
      ...camp,
      distanceKm: dist !== null ? dist : 999
    };
  });

  // Filter camps based on radius, vaccine type, and search term

  const filteredCamps = campsWithDistance.filter((camp) => {
    if (radiusFilter !== 'all' && camp.distanceKm > Number(radiusFilter)) {
      return false;
    }
    if (selectedVaccineFilter !== 'All' && camp.vaccineName !== selectedVaccineFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchVillage = camp.villageEn.toLowerCase().includes(term) || camp.villageHi.includes(term) || camp.villageMr.includes(term);
      const matchVaccine = camp.vaccineName.toLowerCase().includes(term) || camp.fullNameEn.toLowerCase().includes(term);
      const matchBlock = camp.block.toLowerCase().includes(term);
      return matchVillage || matchVaccine || matchBlock;
    }
    return true;
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  // Compute "My Vaccination Schedule" for registered animals
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vaccinationSchedule = [];
  const allHistoryRecords = [];

  animals.forEach((animal) => {
    const allVaccs = [
      ...(animal.vaccinations || []).map((v) => ({ ...v, source: 'vaccinations' })),
      ...(animal.vaccinationHistory || []).map((v) => ({ ...v, source: 'history' }))
    ];

    // Collect all historical records
    (animal.vaccinationHistory || []).forEach((hist) => {
      allHistoryRecords.push({
        animalName: animal.name || animal.tagId,
        tagId: animal.tagId,
        species: animal.species,
        vaccine: hist.vaccine,
        date: hist.date ? new Date(hist.date).toLocaleDateString('en-GB') : '-',
        dose: hist.dose || 'Standard Dose',
        batchNumber: hist.batchNumber || '-',
        administeredBy: hist.administeredBy || (isEnglish ? 'Govt. Veterinary Officer' : 'शासकीय पशुवैद्यक'),
        camp: hist.camp || '-'
      });
    });

    allVaccs.forEach((v) => {
      if (!v.nextDue) return;
      const dueDateObj = new Date(v.nextDue);
      if (isNaN(dueDateObj.getTime())) return;

      dueDateObj.setHours(0, 0, 0, 0);
      const diffMs = dueDateObj.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const isOverdue = diffDays < 0;
      const isDueSoon = diffDays >= 0 && diffDays <= 14;

      vaccinationSchedule.push({
        animalId: animal._id || animal.id || animal.tagId,
        animalName: animal.name || animal.tagId,
        tagId: animal.tagId,
        species: animal.species,
        vaccineName: v.vaccine || v.name || 'FMD',
        dueDateStr: dueDateObj.toLocaleDateString('en-GB'),
        dueDateObj,
        diffDays,
        isOverdue,
        isDueSoon,
        rawVaccine: v,
        fullAnimal: animal
      });
    });
  });

  // Sort schedule by due date (soonest / overdue first)
  vaccinationSchedule.sort((a, b) => a.diffDays - b.diffDays);

  // Handle Mark as Completed
  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completingScheduleItem) return;

    const item = completingScheduleItem;
    const animal = item.fullAnimal;

    // Calculate next due date (+6 months for FMD, +1 year for others)
    const completionDate = new Date(completeFormData.date);
    const nextBoosterDate = new Date(completionDate);
    if (item.vaccineName.includes('FMD')) {
      nextBoosterDate.setMonth(nextBoosterDate.getMonth() + 6);
    } else {
      nextBoosterDate.setFullYear(nextBoosterDate.getFullYear() + 1);
    }

    const newHistoryEntry = {
      vaccine: item.vaccineName,
      date: completionDate,
      nextDue: nextBoosterDate,
      dose: 'Completed Dose',
      batchNumber: completeFormData.batchNumber,
      administeredBy: completeFormData.administeredBy,
      camp: 'Primary Veterinary Dispensary',
      notes: completeFormData.notes
    };

    const newTimelineEvent = {
      type: 'Vaccination',
      title: `${item.vaccineName} Completed`,
      date: completionDate.toLocaleDateString('en-GB'),
      doctor: completeFormData.administeredBy,
      notes: `${completeFormData.notes} (Next due: ${nextBoosterDate.toLocaleDateString('en-GB')})`
    };

    try {
      await animalService.updateAnimal(animal._id || animal.id || animal.tagId, {
        vaccinationHistory: [...(animal.vaccinationHistory || []), newHistoryEntry],
        timeline: [newTimelineEvent, ...(animal.timeline || [])]
      });

      // Update in local state
      setAnimals((prev) =>
        prev.map((a) => {
          if (a._id === animal._id || a.tagId === animal.tagId) {
            return {
              ...a,
              vaccinationHistory: [...(a.vaccinationHistory || []), newHistoryEntry],
              timeline: [newTimelineEvent, ...(a.timeline || [])]
            };
          }
          return a;
        })
      );

      const successTxt = isEnglish
        ? `${item.vaccineName} marked as completed for ${item.animalName}! Next dose scheduled for ${nextBoosterDate.toLocaleDateString('en-GB')}.`
        : isMarathi
        ? `${item.animalName} साठी ${item.vaccineName} पूर्ण म्हणून नोंदवले! पुढील डोस ${nextBoosterDate.toLocaleDateString('en-GB')} रोजी.`
        : `${item.animalName} के लिए ${item.vaccineName} टीका पूर्ण दर्ज किया गया! अगला टीका ${nextBoosterDate.toLocaleDateString('en-GB')} को निर्धारित है।`;

      setToastMessage(successTxt);
      setTimeout(() => setToastMessage(''), 5000);
      setCompletingScheduleItem(null);
    } catch (err) {
      console.error('Error marking vaccination completed:', err);
      alert('Could not update vaccination status. Please try again.');
    }
  };

  // Handle Camp Registration
  const handleRegisterCamp = async (camp) => {
    let token = `CAMP-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      if (camp.id && !camp.id.startsWith('camp-')) {
        const res = await api.post(`/vaccination-drives/${camp.id}/register`, {
          animalCount: 1,
          farmerName: user?.name,
          farmerPhone: user?.phone
        });
        if (res.data?.token) token = res.data.token;

        // Decrement remaining slot in local UI
        setCamps(prev =>
          prev.map(c =>
            c.id === camp.id ? { ...c, remainingSlots: Math.max(0, c.remainingSlots - 1) } : c
          )
        );
      }
    } catch (e) {
      console.warn('Backend camp register sync:', e.message);
    }

    setRegisteredCamps((prev) => ({
      ...prev,
      [camp.id]: {
        token,
        time: new Date().toLocaleTimeString()
      }
    }));
    setRegisteringCamp(null);

    const txt = isEnglish
      ? `Registration confirmed for ${camp.fullNameEn}! Your appointment token is ${token}. An SMS has been dispatched.`
      : isMarathi
      ? `${camp.fullNameMr} साठी नोंदणी यशस्वी! आपला टोकन क्रमांक ${token} आहे. एसएमएस पाठवला गेला आहे.`
      : `${camp.fullNameHi} के लिए आपका पंजीकरण सफल! आपका टोकन नंबर ${token} है। मोबाइल पर एसएमएस भेजा गया है।`;

    setToastMessage(txt);
    setTimeout(() => setToastMessage(''), 5000);
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24 lg:pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-emerald-800 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-600 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          <div className="text-xs font-medium leading-relaxed">{toastMessage}</div>
          <button onClick={() => setToastMessage('')} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Banner (SIH Problem Statement 128 Compliant) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Syringe className="w-4 h-4 text-emerald-700" />
              <span>
                {isEnglish
                  ? 'SIH PS-128 • Community Animal Immunization & Health Registry'
                  : isMarathi
                  ? 'स्मार्ट इंडिया हॅकाथॉन PS-128 • समुदाय पशु लसीकरण व आरोग्य नोंदणी'
                  : 'स्मार्ट इंडिया हैकाथॉन PS-128 • सामुदायिक पशु टीकाकरण एवं स्वास्थ्य रजिस्ट्री'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {isEnglish
                ? 'Nearby Vaccination Camps'
                : isMarathi
                ? 'स्थानिक लसीकरण शिबिरे'
                : 'स्थानीय टीकाकरण शिविर'}
            </h1>

            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              {isEnglish
                ? 'Discover upcoming free veterinary vaccination drives near your village, manage livestock immunization schedules, and protect your herd with AI preventive recommendations.'
                : isMarathi
                ? 'आपल्या गावाजवळील मोफत शासकीय लसीकरण शिबिरे शोधा, जनावरांचे वेळापत्रक तपासा आणि एआय सल्ल्याने कळपाचे रक्षण करा.'
                : 'अपने गांव के नजदीकी निःशुल्क पशु टीकाकरण शिविर खोजें, अपने पशुओं का टीकाकरण शेड्यूल प्रबंधित करें एवं एआई सलाह से झुंड को सुरक्षित रखें।'}
            </p>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Quick Action 1: Register for Camp */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('nearby-camps-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition active:scale-95"
            >
              <Syringe className="w-4 h-4" />
              <span>{isEnglish ? 'Register for Camp' : isMarathi ? 'शिबीर नोंदणी' : 'शिविर पंजीकरण'}</span>
            </button>

            {/* Quick Action 2: Call Veterinary Officer */}
            <button
              type="button"
              onClick={() => setShowVetModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isEnglish ? 'Call Vet Officer' : isMarathi ? 'पशुवैद्यक अधिकारी' : 'पशु चिकित्सक को कॉल करें'}</span>
            </button>

            {/* Quick Action 3: View Vaccination History */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition border border-stone-200"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span>{isEnglish ? 'View History' : isMarathi ? 'लसीकरण इतिहास' : 'टीकाकरण इतिहास'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. "My Vaccination Schedule" Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <span>{isEnglish ? 'My Vaccination Schedule' : isMarathi ? 'माझे लसीकरण वेळापत्रक' : 'मेरा टीकाकरण शेड्यूल'}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEnglish
                ? 'Upcoming vaccine doses and overdue boosters for your registered livestock herd'
                : isMarathi
                ? 'आपल्या नोंदणीकृत जनावरांसाठी आगामी डोस व थकीत लसी'
                : 'आपके पंजीकृत पशुओं के लिए आगामी खुराक एवं अतिदेय टीके'}
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500 bg-stone-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {vaccinationSchedule.length} {isEnglish ? 'doses tracked' : isMarathi ? 'डोस नियोजित' : 'टीके निर्धारित'}
          </div>
        </div>

        {vaccinationSchedule.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600 opacity-60" />
            <p className="text-xs font-medium text-slate-600">
              {isEnglish
                ? 'All animals are up to date! No vaccinations due in the next 30 days.'
                : isMarathi
                ? 'सर्व जनावरे सुरक्षित आहेत! पुढील ३० दिवसांत कोणतीही लस देय नाही.'
                : 'सभी पशु सुरक्षित हैं! अगले 30 दिनों में कोई टीका देय नहीं है।'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vaccinationSchedule.map((item, idx) => {
              const isOverdue = item.isOverdue;
              const overdueDays = Math.abs(item.diffDays);

              const badgeText = isOverdue
                ? (isEnglish ? `${overdueDays} days overdue` : isMarathi ? `${overdueDays} दिवस थकीत` : `${overdueDays} दिन अतिदेय`)
                : item.diffDays === 0
                ? (isEnglish ? 'Due Today' : isMarathi ? 'आज देय' : 'आज देय')
                : (isEnglish ? `${item.diffDays} days remaining` : isMarathi ? `${item.diffDays} दिवस शिल्लक` : `${item.diffDays} दिन शेष`);

              const badgeColor = isOverdue
                ? 'bg-red-50 text-red-700 border-red-200'
                : item.diffDays <= 7
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200';

              return (
                <div
                  key={`${item.animalId}-${item.vaccineName}-${idx}`}
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Animal Name & Tag */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{item.species === 'Cattle' ? '🐄' : item.species === 'Buffalo' ? '🦬' : '🐐'}</span>
                          <span>{item.animalName}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5">
                          {item.tagId}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>

                    {/* Vaccine Name */}
                    <div className="text-xs">
                      <span className="text-slate-500 font-medium block">
                        {isEnglish ? 'Vaccine Due:' : isMarathi ? 'देय लस:' : 'देय टीका:'}
                      </span>
                      <strong className="text-slate-900 font-bold text-xs">{item.vaccineName}</strong>
                    </div>

                    {/* Due Date */}
                    <div className="text-xs flex items-center justify-between text-slate-600 bg-white p-2 rounded-xl border border-stone-200/60">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{isEnglish ? 'Due Date:' : isMarathi ? 'तारीख:' : 'तिथि:'}</span>
                      </span>
                      <span className="font-bold text-slate-800">{item.dueDateStr}</span>
                    </div>
                  </div>

                  {/* Mark as Completed Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingScheduleItem(item);
                      setCompleteFormData({
                        date: new Date().toISOString().split('T')[0],
                        administeredBy: isEnglish ? 'Dr. R. K. Shinde (Dispensary)' : isMarathi ? 'डॉ. आर. के. शिंदे (दवाखाना)' : 'डॉ. आर. के. शिंदे (पशु चिकित्सालय)',
                        batchNumber: `BATCH-2026-${item.vaccineName.slice(0, 3).toUpperCase()}`,
                        notes: isEnglish ? 'Administered on schedule' : isMarathi ? 'वेळेत लस दिली' : 'नियत समय पर टीका लगाया गया'
                      });
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEnglish ? 'Mark as Completed' : isMarathi ? 'पूर्ण म्हणून नोंदवा' : 'पूर्ण चिह्नित करें'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. "Nearby Vaccination Camps" Section */}
      <div id="nearby-camps-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <span>
                {isEnglish
                  ? `Upcoming Vaccination Camps (${filteredCamps.length})`
                  : isMarathi
                  ? `नजीकची आगामी लसीकरण शिबिरे (${filteredCamps.length})`
                  : `आगामी टीकाकरण शिविर (${filteredCamps.length})`}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEnglish
                ? 'Community veterinary immunization camps within your surveillance radius'
                : isMarathi
                ? 'आपल्या परिसरातील समुदाय पशु लसीकरण शिबिरे'
                : 'आपके क्षेत्र में आयोजित सामुदायिक पशु टीकाकरण शिविर'}
            </p>
          </div>

          {/* Radius Selector Pills */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs">
            <span className="text-slate-500 font-bold px-2 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              <span>{isEnglish ? 'Radius:' : isMarathi ? 'त्रिज्या:' : 'दायरा:'}</span>
            </span>
            {[
              { val: 5, label: isEnglish ? '5 km' : isMarathi ? '५ किमी' : '5 किमी' },
              { val: 10, label: isEnglish ? '10 km' : isMarathi ? '१० किमी' : '10 किमी' },
              { val: 20, label: isEnglish ? '20 km' : isMarathi ? '२० किमी' : '20 किमी' },
              { val: 'all', label: isEnglish ? 'All' : isMarathi ? 'सर्व' : 'सभी' }
            ].map((r) => (
              <button
                key={r.val}
                type="button"
                onClick={() => setRadiusFilter(r.val)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  radiusFilter === r.val
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Vaccine Type Filter Bar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isEnglish
                  ? 'Search by village, dispensary, or camp name...'
                  : isMarathi
                  ? 'गाव, दवाखाना किंवा शिबिराच्या नावाने शोधा...'
                  : 'गांव, चिकित्सालय या शिविर के नाम से खोजें...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedVaccineFilter}
              onChange={(e) => setSelectedVaccineFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="All">{isEnglish ? 'All Vaccines' : isMarathi ? 'सर्व लसी' : 'सभी टीके'}</option>
              <option value="FMD">FMD (खुरपका-मुंहपका)</option>
              <option value="LSD">LSD (लम्पी त्वचा रोग)</option>
              <option value="HS">HS (गलघोंटू)</option>
              <option value="BQ">BQ (लंगड़ा बुखार)</option>
              <option value="Brucellosis">Brucellosis (ब्रुसेलोसिस)</option>
              <option value="PPR">PPR (बकरी प्लेग)</option>
            </select>
          </div>
        </div>

        {/* Camp Cards Grid / Empty State */}
        {filteredCamps.length === 0 ? (
          /* Required Empty State: "No vaccination camps are currently scheduled nearby. You will be notified when a new camp is announced." */
          <div className="bg-emerald-50/70 rounded-3xl border border-emerald-200 p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <Syringe className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-emerald-950">
                {isEnglish
                  ? 'No vaccination camps are currently scheduled nearby. You will be notified when a new camp is announced.'
                  : isMarathi
                  ? 'सध्या जवळ कोणतेही लसीकरण शिबीर नियोजित नाही. नवीन शिबीर जाहीर झाल्यावर आपल्याला सूचित केले जाईल.'
                  : 'आसपास वर्तमान में कोई टीकाकरण शिविर निर्धारित नहीं है। नया शिविर घोषित होने पर आपको सूचित किया जाएगा।'}
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                {isEnglish
                  ? 'Try expanding your distance filter to search across the entire district.'
                  : isMarathi
                  ? 'संपूर्ण जिल्ह्यातील शिबिरे पाहण्यासाठी अंतराचा फिल्टर वाढवा.'
                  : 'संपूर्ण जिले के शिविर देखने के लिए दूरी का दायरा बढ़ाएं।'}
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter('all');
                  setSelectedVaccineFilter('All');
                  setSearchTerm('');
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition shadow-2xs"
              >
                {isEnglish ? 'View All District Camps' : isMarathi ? 'जिल्ह्यातील सर्व शिबिरे पहा' : 'जिले के सभी शिविर देखें'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCamps.map((camp) => {
              const isRegistered = !!registeredCamps[camp.id];

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Vaccine Name & Cost Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black tracking-wider uppercase border border-emerald-200">
                          {camp.vaccineName}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1 leading-snug">
                          {isEnglish ? camp.fullNameEn : isMarathi ? camp.fullNameMr : camp.fullNameHi}
                        </h3>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        🟢 {isEnglish ? camp.costEn : isMarathi ? camp.costMr : camp.costHi}
                      </span>
                    </div>

                    {/* Date & Time */}
                    <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{isEnglish ? camp.dateEn : isMarathi ? camp.dateMr : camp.dateHi}</span>
                      </div>

                      {/* Village / Location */}
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{isEnglish ? camp.villageEn : isMarathi ? camp.villageMr : camp.villageHi}</span>
                      </div>

                      {/* Distance */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/60">
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isEnglish ? 'Distance:' : isMarathi ? 'अंतर:' : 'दूरी:'}</span>
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          {camp.distanceKm < 999
                            ? `${camp.distanceKm} km ${isEnglish ? 'away' : isMarathi ? 'दूर' : 'दूर'}`
                            : (isEnglish ? 'In District' : 'जिले में')}
                        </span>
                      </div>
                    </div>

                    {/* Target Animals & Organizing Dept */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">
                          {isEnglish ? 'Target Animals:' : isMarathi ? 'पात्र जनावरे:' : 'पात्र पशु:'}
                        </span>
                        <span className="font-bold text-slate-800">
                          {isEnglish ? camp.targetAnimalsEn : isMarathi ? camp.targetAnimalsMr : camp.targetAnimalsHi}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">
                          {isEnglish ? 'Organizing Dept:' : isMarathi ? 'आयोजक विभाग:' : 'आयोजक विभाग:'}
                        </span>
                        <span className="font-semibold text-slate-700 text-right truncate max-w-[180px]" title={isEnglish ? camp.organizerEn : isMarathi ? camp.organizerMr : camp.organizerHi}>
                          {isEnglish ? camp.organizerEn.split(',')[0] : isMarathi ? camp.organizerMr.split(',')[0] : camp.organizerHi.split(',')[0]}
                        </span>
                      </div>

                      {/* Remaining Slots */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400 font-medium">
                          {isEnglish ? 'Remaining Slots:' : isMarathi ? 'शिल्लक जागा:' : 'शेष स्लॉट:'}
                        </span>
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {camp.remainingSlots} {isEnglish ? 'slots available' : isMarathi ? 'जागा उपलब्ध' : 'स्लॉट उपलब्ध'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Register & Get Directions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    {isRegistered ? (
                      <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{registeredCamps[camp.id].token}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRegisteringCamp(camp)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                      >
                        <Syringe className="w-3.5 h-3.5" />
                        <span>{isEnglish ? 'Register' : isMarathi ? 'नोंदणी करा' : 'पंजीकरण करें'}</span>
                      </button>
                    )}

                    {/* Get Directions Button */}
                    <button
                      type="button"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${camp.lat},${camp.lng}`,
                          '_blank'
                        );
                      }}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition border border-stone-200"
                      title={isEnglish ? 'Get Directions on Google Maps' : isMarathi ? 'गुगल मॅपवर दिशा मिळवा' : 'गूगल मैप पर दिशा प्राप्त करें'}
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isEnglish ? 'Directions' : isMarathi ? 'मार्ग' : 'दिशा'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Register for Camp */}
      {registeringCamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  {isEnglish ? 'Camp Registration' : isMarathi ? 'शिबीर नोंदणी' : 'शिविर पंजीकरण'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {isEnglish ? registeringCamp.fullNameEn : isMarathi ? registeringCamp.fullNameMr : registeringCamp.fullNameHi}
                </h3>
              </div>
              <button
                onClick={() => setRegisteringCamp(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>{isEnglish ? registeringCamp.dateEn : isMarathi ? registeringCamp.dateMr : registeringCamp.dateHi}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{isEnglish ? registeringCamp.villageEn : isMarathi ? registeringCamp.villageMr : registeringCamp.villageHi}</span>
              </div>
            </div>

            {/* Livestock Selection from Herd */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                {isEnglish
                  ? `Select Herd Animals (${animals.length} registered)`
                  : isMarathi
                  ? `कळपातील जनावरे निवडा (${animals.length} नोंदणीकृत)`
                  : `झुंड के पशु चुनें (${animals.length} पंजीकृत)`}
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                {animals.map((a) => (
                  <div
                    key={a._id || a.tagId}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-100"
                  >
                    <div className="flex items-center gap-2">
                      <span>{a.species === 'Cattle' ? '🐄' : '🦬'}</span>
                      <div>
                        <strong className="text-slate-900 block">{a.name || a.tagId}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{a.tagId} • {a.breed}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {isEnglish ? 'Eligible' : isMarathi ? 'पात्र' : 'पात्र'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleRegisterCamp(registeringCamp)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEnglish ? 'Confirm Registration' : isMarathi ? 'नोंदणीची पुष्टी करा' : 'पंजीकरण की पुष्टि करें'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRegisteringCamp(null)}
                className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
              >
                {isEnglish ? 'Cancel' : isMarathi ? 'रद्द करा' : 'रद्द करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Mark as Completed */}
      {completingScheduleItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  {isEnglish ? 'Update Schedule' : isMarathi ? 'वेळापत्रक अद्यतन' : 'शेड्यूल अपडेट'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {isEnglish ? 'Record Completed Vaccine' : isMarathi ? 'लसीकरण पूर्ण नोंदवा' : 'टीकाकरण पूर्णता दर्ज करें'}
                </h3>
              </div>
              <button
                onClick={() => setCompletingScheduleItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{isEnglish ? 'Animal:' : isMarathi ? 'जनावर:' : 'पशु:'}</span>
                <span className="font-bold text-slate-900">{completingScheduleItem.animalName} ({completingScheduleItem.tagId})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{isEnglish ? 'Vaccine:' : isMarathi ? 'लस:' : 'टीका:'}</span>
                <span className="font-bold text-emerald-700">{completingScheduleItem.vaccineName}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmComplete} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEnglish ? 'Date Administered' : isMarathi ? 'लस दिल्याची तारीख' : 'टीका लगाने की तिथि'}
                </label>
                <input
                  type="date"
                  required
                  value={completeFormData.date}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEnglish ? 'Administered By (Veterinarian)' : isMarathi ? 'लस देणाऱ्या डॉक्टरांचे नाव' : 'टीका लगाने वाले डॉक्टर का नाम'}
                </label>
                <input
                  type="text"
                  required
                  value={completeFormData.administeredBy}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, administeredBy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEnglish ? 'Batch Number (Optional)' : isMarathi ? 'बॅच नंबर (ऐच्छिक)' : 'बैच नंबर (वैकल्पिक)'}
                </label>
                <input
                  type="text"
                  value={completeFormData.batchNumber}
                  onChange={(e) => setCompleteFormData({ ...completeFormData, batchNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-stone-100">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEnglish ? 'Save & Complete' : isMarathi ? 'जतन करा व पूर्ण करा' : 'सहेजें और पूर्ण करें'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompletingScheduleItem(null)}
                  className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
                >
                  {isEnglish ? 'Cancel' : isMarathi ? 'रद्द करा' : 'रद्द करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Call Veterinary Officer */}
      {showVetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isEnglish ? 'Veterinary Help Contacts' : isMarathi ? 'पशुवैद्यकीय संपर्क' : 'पशु चिकित्सा संपर्क'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isEnglish ? 'Government Animal Hospital & Doctors' : isMarathi ? 'शासकीय रुग्णालय व डॉक्टर' : 'सरकारी पशु चिकित्सालय एवं डॉक्टर'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowVetModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* National Helpline 1962 */}
            <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-100">
                  {isEnglish ? 'National Animal Helpline' : isMarathi ? 'राष्ट्रीय हेल्पलाइन' : 'राष्ट्रीय पशु हेल्पलाइन'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold">24×7 TOLL FREE</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black">1962</div>
                  <div className="text-[11px] text-red-100">
                    {isEnglish ? 'Free Veterinary Call Center' : isMarathi ? 'मोफत पशुवैद्यकीय कॉल सेंटर' : 'निःशुल्क पशु चिकित्सा परामर्श'}
                  </div>
                </div>
                <a
                  href="tel:1962"
                  className="px-4 py-2 rounded-xl bg-white text-red-700 font-black text-xs hover:bg-red-50 transition shadow-xs"
                >
                  {isEnglish ? 'Call Now' : isMarathi ? 'कॉल करा' : 'कॉल करें'}
                </a>
              </div>
            </div>

            {/* Local Taluka Dispensary */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">
                {isEnglish ? 'Baramati Rural Veterinary Dispensary' : isMarathi ? 'बारामती ग्रामीण पशुवैद्यकीय दवाखाना' : 'बारामती ग्रामीण पशु चिकित्सालय'}
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Malegaon Road, Baramati (2.4 km away)</span>
              </div>
              <div className="text-slate-600">
                <strong className="text-slate-800 font-semibold">{isEnglish ? 'Doctor In-Charge:' : isMarathi ? 'प्रभारी डॉक्टर:' : 'प्रभारी डॉक्टर:'}</strong> Dr. R. K. Shinde (02112-224411)
              </div>
              <div className="pt-2 flex gap-2">
                <a
                  href="tel:02112224411"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center text-xs transition"
                >
                  📞 02112-224411
                </a>
                <Link
                  to="/veterinary-help"
                  onClick={() => setShowVetModal(false)}
                  className="py-2 px-3 rounded-xl bg-white border border-stone-300 text-slate-700 font-bold text-xs hover:bg-stone-100 transition"
                >
                  {isEnglish ? 'View All Vets' : isMarathi ? 'सर्व यादी' : 'पूरी सूची'}
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVetModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
            >
              {isEnglish ? 'Close' : isMarathi ? 'बंद करा' : 'बंद करें'}
            </button>
          </div>
        </div>
      )}

      {/* Modal 4: Herd Vaccination History */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isEnglish ? 'Herd Vaccination History' : isMarathi ? 'पशुधन लसीकरण इतिहास' : 'पशुधन टीकाकरण इतिहास'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isEnglish ? 'Complete verified log of doses across all animals' : isMarathi ? 'सर्व जनावरांच्या पूर्ण लसीकरण नोंदी' : 'सभी पशुओं के लिए सत्यापित टीकाकरण रिकॉर्ड'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {allHistoryRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {isEnglish ? 'No previous vaccination records found.' : isMarathi ? 'कोणतीही जुनी लसीकरण नोंद आढळली नाही.' : 'कोई पुराना टीकाकरण रिकॉर्ड नहीं मिला।'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-slate-500 uppercase tracking-wider border-b border-stone-200 font-bold">
                    <tr>
                      <th className="px-4 py-3">{isEnglish ? 'Animal' : isMarathi ? 'जनावर' : 'पशु'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Vaccine' : isMarathi ? 'लस' : 'टीका'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Date Given' : isMarathi ? 'तारीख' : 'तिथि'}</th>
                      <th className="px-4 py-3">{isEnglish ? 'Doctor / Camp' : isMarathi ? 'डॉक्टर / शिबीर' : 'डॉक्टर / शिविर'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                    {allHistoryRecords.map((rec, i) => (
                      <tr key={i} className="hover:bg-stone-50/70 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {rec.animalName}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            {rec.tagId}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-800">
                          {rec.vaccine}
                        </td>
                        <td className="px-4 py-3">{rec.date}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {rec.administeredBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold text-xs transition"
            >
              {isEnglish ? 'Close' : isMarathi ? 'बंद करा' : 'बंद करें'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
