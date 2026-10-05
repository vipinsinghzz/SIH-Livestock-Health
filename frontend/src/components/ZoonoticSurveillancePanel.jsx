import React, { useState } from 'react';
import {
  Biohazard,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Users,
  Syringe,
  FileText,
  PhoneCall,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Skull,
  HeartPulse,
  Info,
  ExternalLink,
  Download,
  Send,
  X,
  ChevronRight,
  Activity,
  Check,
  Radio,
  FileEdit
} from 'lucide-react';

export default function ZoonoticSurveillancePanel({
  isEnglish = true,
  isMarathi = false,
  userDistrict = 'Nagpur',
  userBlock = 'Saoner',
  referralCases = [],
  onOpenContainmentModal,
  onOpenRingVaccinationModal
}) {
  // State for active disease knowledge view
  const [selectedDiseaseTab, setSelectedDiseaseTab] = useState('anthrax');

  // Interactive One Health alert simulation state
  const [cmoAlertSent, setCmoAlertSent] = useState(false);
  const [cmoAlertDispatchId, setCmoAlertDispatchId] = useState('');
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  // Modals state
  const [showSopModal, setShowSopModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showDispatchToast, setShowDispatchToast] = useState(false);

  // Default featured demo showcase case: Anthrax Case in Saoner, Nagpur
  const featuredAnthraxCase = {
    caseId: 'CASE-2026-NAG-ZOON-01',
    dbRefId: 'CASE-20260829-5022',
    diseaseName: isEnglish ? 'Anthrax (Bacillus anthracis)' : isMarathi ? 'अँथ्रॅक्स (फरांडी रोग / बॅसिलस अँथ्रॅक्स)' : 'एंथ्रेक्स (बैसिलस एंथ्रेक्स / गिल्टी रोग)',
    scientificName: 'Bacillus anthracis',
    pathogenType: isEnglish ? 'Spore-Forming Gram-Positive Bacillus' : isMarathi ? 'बीजाणू निर्माण करणारा ग्राम-पॉझिटिव्ह बॅक्टेरिया' : 'बीजाणु-निर्माता ग्राम-पॉजिटिव बैक्टीरिया',
    bioriskTier: 'Level 4 Biohazard / WOAH Listed Class A',
    riskLevel: 'Critical',
    aiConfidence: '96%',
    animalTag: 'NG-SP-104',
    animalName: isEnglish ? 'Nandi Bull (Gaolao Breed)' : isMarathi ? 'नंदी वळू (गावळाव जात)' : 'नंदी बैल (गावलाव नस्ल)',
    species: isEnglish ? 'Cattle' : isMarathi ? 'गोवंश' : 'गोवंश (गाय/बैल)',
    farmerName: 'Suresh Rao Patil',
    farmerPhone: '+91 98230 45671',
    village: 'Saoner Rural',
    block: userBlock || 'Saoner',
    district: userDistrict || 'Nagpur',
    state: 'Maharashtra',
    coordinates: { lat: 21.385, lng: 78.918 },
    reportedDate: '29 Sep 2026, 06:15 AM',
    status: isEnglish ? 'Active Containment & Investigation' : isMarathi ? 'सक्रिय नियंत्रण व तपासणी सुरू' : 'सक्रिय रोकथाम एवं जांच जारी',
    humanContactsCount: 4,
    prophylaxisDrug: 'Doxycycline 100mg BID + Ciprofloxacin 500mg BID',
    prophylaxisCoverage: '100% (4 of 4 handlers monitored by PHC Saoner)',
    symptoms: [
      {
        en: 'Sudden unexplained peracute death (within 2-4 hours of onset)',
        mr: 'कोणत्याही पूर्वसूचनेशिवाय अचानक आकस्मिक मृत्यू (२ ते ४ तासांत)',
        hi: 'बिना पूर्व लक्षणों के अचानक आकस्मिक मृत्यु (२-४ घंटों के भीतर)'
      },
      {
        en: 'Dark, tarry, unclotted blood oozing from nostrils, mouth, and rectum',
        mr: 'नाक, तोंड व गुदद्वारातून गडद काळे रक्त न गोठणारे रक्तस्त्राव',
        hi: 'नाक, मुंह और गुदा से गहरा काला, न जमने वाला खून बहना'
      },
      {
        en: 'Total absence of rigor mortis with accelerated tympany (bloating)',
        mr: 'शरीर ताठर न होणे (Rigor Mortis चा अभाव) व पोट फुगणे',
        hi: 'कड़ापन (Rigor Mortis) न होना तथा पेट में तीव्र गैस/अफरा (ब्लोट)'
      },
      {
        en: 'Microscopy: Capsulated non-motile gram-positive bacilli (M\'Fadyean positive)',
        mr: 'रक्त तपासणी: कॅप्सुलेटेड ग्राम-पॉझिटिव्ह बॅसिली (M\'Fadyean चाचणी पॉझिटिव्ह)',
        hi: 'सूक्ष्मदर्शी परीक्षण: कैप्सूल युक्त ग्राम-पॉजिटिव बेसिली (M\'Fadyean टेस्ट पॉजिटिव)'
      }
    ],
    transmissionRoutes: [
      {
        type: isEnglish ? 'Cutaneous Anthrax (95% risk)' : isMarathi ? 'त्वचेचा संसर्ग (९५% धोका)' : 'त्वचा संसर्ग (९५% जोखिम)',
        desc: isEnglish ? 'Handling animal hide, blood, or body fluids through micro-abrasions in human skin' : isMarathi ? 'कातडी, रक्त किंवा स्रावांच्या मानवी त्वचेच्या संपर्कामुळे फोड/काळा डाग तयार होतो' : 'खाल, खून या शारीरिक स्राव के मानव त्वचा पर कट/खरोंच के संपर्क में आने से'
      },
      {
        type: isEnglish ? 'Gastrointestinal Anthrax' : isMarathi ? 'पचनाद्वारे संसर्ग' : 'पाचन तंत्र संसर्ग',
        desc: isEnglish ? 'Consuming unboiled raw milk or contaminated meat products from infected livestock' : isMarathi ? 'संसर्गबाधित जनावराचे कच्चे दूध किंवा मांस सेवनाने तीव्र आतड्यांचा दाह' : 'संक्रमित पशु का कच्चा दूध या दूषित मांस खाने से'
      },
      {
        type: isEnglish ? 'Inhalational / Woolsorters (Severe)' : isMarathi ? 'श्वासाद्वारे संसर्ग (अतिगंभीर)' : 'सांस द्वारा संसर्ग (अति-गंभीर)',
        desc: isEnglish ? 'Aerosolized spores inhaled during necropsy or carcass handling (High mortality)' : isMarathi ? 'शवविच्छेदनादरम्यान हवेत पसरलेले बीजाणू श्वासात जाणे (शवविच्छेदन कठोर मनाई)' : 'शव खोलने पर हवा में फैले बीजाणुओं को सांस में लेने से (शव परीक्षण सख्त वर्जित)'
      }
    ]
  };

  // Contacts tracked for this active case
  const humanContactsList = [
    {
      id: 'HC-01',
      name: 'Suresh Rao Patil',
      relation: isEnglish ? 'Farmer / Owner' : isMarathi ? 'शेतकरी / मालक' : 'किसान / पशु स्वामी',
      age: 48,
      exposureType: isEnglish ? 'Direct contact with oral secretions during halter untying' : isMarathi ? 'कासरा सोडताना लाळ व नाकाच्या स्त्रावाचा संपर्क' : 'रस्सी खोलते समय लार और नाक के स्राव का सीधा संपर्क',
      status: 'Asymptomatic',
      prophylaxisDay: 'Day 3 of 60 (Doxycycline 100mg BID)',
      supervisedBy: 'Dr. V. K. Sharma (PHC Saoner)'
    },
    {
      id: 'HC-02',
      name: 'Anita Suresh Patil',
      relation: isEnglish ? 'Spouse / Cattle Attendant' : isMarathi ? 'पत्नी / गोठा मदतनीस' : 'पत्नी / गोशाला सहायक',
      age: 44,
      exposureType: isEnglish ? 'Cleaned barn floor and morning feed bucket' : isMarathi ? 'गोठा स्वच्छता व चारा भांड्याची हाताळणी' : 'गोशाला की सफाई और चारे की बाल्टी संभालना',
      status: 'Asymptomatic',
      prophylaxisDay: 'Day 3 of 60 (Doxycycline 100mg BID)',
      supervisedBy: 'Sister Sunita (Saoner Sub-Center)'
    },
    {
      id: 'HC-03',
      name: 'Ganesh Suresh Patil',
      relation: isEnglish ? 'Son (Milker)' : isMarathi ? 'मुलगा (दूध काढणारा)' : 'पुत्र (दूध निकालने वाला)',
      age: 21,
      exposureType: isEnglish ? 'Attempted to give water prior to sudden collapse' : isMarathi ? 'पशु खाली पडण्यापूर्वी पाणी पाजण्याचा प्रयत्न' : 'पशु के गिरने से पहले पानी पिलाने का प्रयास',
      status: 'Asymptomatic',
      prophylaxisDay: 'Day 3 of 60 (Doxycycline 100mg BID)',
      supervisedBy: 'Dr. V. K. Sharma (PHC Saoner)'
    },
    {
      id: 'HC-04',
      name: 'Mahadev Uike',
      relation: isEnglish ? 'Farm Hand / Laborer' : isMarathi ? 'मदतनीस कामगार' : 'सहायक मजदूर',
      age: 35,
      exposureType: isEnglish ? 'Assisted in cordoning off area with lime powder' : isMarathi ? 'चुना पावडर टाकून परिसर सील करण्यात मदत' : 'चूना पाउडर डालकर घेराबंदी करने में सहायता',
      status: 'Asymptomatic',
      prophylaxisDay: 'Day 3 of 60 (Ciprofloxacin 500mg BID)',
      supervisedBy: 'Dr. V. K. Sharma (PHC Saoner)'
    }
  ];

  // Database-Fed Zoonotic Diseases Catalog in PashuMitra
  const zoonoticCatalog = {
    anthrax: {
      id: 'anthrax',
      name: isEnglish ? 'Anthrax (बैसिलस एंथ्रेक्स)' : isMarathi ? 'अँथ्रॅक्स (फरांडी रोग)' : 'एंथ्रेक्स (गिल्टी रोग)',
      pathogen: 'Bacillus anthracis',
      species: 'Cattle, Buffalo, Sheep, Goat, Humans',
      severity: 'Critical / 100% Case Fatality if untreated',
      vector: isEnglish ? 'Carcass fluids, skin cuts, unboiled milk, soil spores' : isMarathi ? 'रक्तस्त्राव, त्वचेचा संपर्क, न उकळलेले दूध, मातीतील बीजाणू' : 'रक्त स्राव, त्वचा संपर्क, कच्चा दूध, मिट्टी के बीजाणु',
      humanIncubation: '1 to 7 days (Cutaneous: 1-12 days)',
      humanSigns: isEnglish ? 'Black necrotic eschar (carbuncle), high fever, sepsis' : isMarathi ? 'काळा व्रण (कळकट फोड), उच्च ताप, सेप्सिस' : 'काला घाव (एस्चार), तेज बुखार, सेप्सिस',
      sopSummary: isEnglish ? 'DO NOT OPEN CARCASS. Deep burial with quicklime (>2.5m). Sterne strain ring vaccination within 5km.' : isMarathi ? 'शवविच्छेदन कठोर मनाई. २.५ मीटर खड्ड्यात चुन्यासह पुरणे. ५ किमी परिघात स्टर्न लस.' : 'शव कभी न खोलें। २.५ मीटर गहरे गड्ढे में चूने सहित दफन। ५ किमी दायरे में स्टर्न वैक्सीन।',
      vaccine: 'Anthrax Spore Vaccine (Sterne Strain 34F2)'
    },
    brucellosis: {
      id: 'brucellosis',
      name: isEnglish ? 'Brucellosis (ब्रूसीलोसिस / Bang\'s Disease)' : isMarathi ? 'ब्रुसेलोसिस (गर्भपात रोग)' : 'ब्रूसीलोसिस (संक्रामक गर्भपात)',
      pathogen: 'Brucella abortus / Brucella melitensis',
      species: 'Cattle, Buffalo, Goat, Sheep, Humans',
      severity: 'High / Chronic Debilitating Undulant Fever',
      vector: isEnglish ? 'Aborted fetus, placenta, vaginal discharges, raw milk & cheese' : isMarathi ? 'गर्भपात झालेला गर्भ, वार, योनीस्राव, न तापवलेले कच्चे दूध' : 'गर्भपात का भ्रूण, जेर, योनि स्राव, कच्चा बिना उबला दूध',
      humanIncubation: '2 to 4 weeks (up to several months)',
      humanSigns: isEnglish ? 'Malta/Undulant fever, night sweats, joint & spinal pain, orchitis' : isMarathi ? 'उतार-चढावाचा ताप, रात्रीचा घाम, सांधेदुखी, तीव्र कंबरदुखी' : 'उतार-चढ़ाव वाला बुखार (अंडुलेंट फीवर), जोड़ों में दर्द, पसीना',
      sopSummary: isEnglish ? 'Wear impervious gloves when handling calving or placenta. Boil all milk. Vaccinate female calves at 4-8 months with S19/RB51.' : isMarathi ? 'वार हाताळताना रबरी हातमोजे वापरा. दूध पूर्ण उकळा. कालवडींना ४-८ महिन्यांत S19 लस द्या.' : 'जेर संभालते समय मोटे दस्ताने पहनें। दूध अच्छी तरह उबालें। ४-८ माह की बछड़ियों को S19 टीका।',
      vaccine: 'Brucella S19 / RB-51 Live Vaccine'
    },
    rabies: {
      id: 'rabies',
      name: isEnglish ? 'Rabies (रेबीज / Hydrophobia)' : isMarathi ? 'रेबीज (अलर्क रोग)' : 'रेबीज (जलभीति)',
      pathogen: 'Rabies Lyssavirus (Rhabdoviridae)',
      species: 'Dogs, Cattle, Buffalo, Cats, All Mammals',
      severity: 'Critical / 100% Fatal once clinical encephalomyelitis begins',
      vector: isEnglish ? 'Saliva of rabid animal via bite, scratch, or mucous membrane lick' : isMarathi ? 'पिसाळलेल्या प्राण्याची लाळ, चावा किंवा जखमेवरील चाटणे' : 'पागल पशु की लार, काटने या खरोंच के माध्यम से संचरण',
      humanIncubation: '1 to 3 months (can range from 1 week to 1 year)',
      humanSigns: isEnglish ? 'Hydrophobia (fear of water), aerophobia, agitation, paralysis, coma' : isMarathi ? 'पाण्याची भीती (हायड्रोफोबिया), लाळ गळणे, मज्जासंस्था निकामी' : 'पानी से डर (हाइड्रोफोबिया), अत्यधिक लार, बेचैनी, पक्षाघात',
      sopSummary: isEnglish ? 'Never put bare hands in choking cattle mouth. Immediate wound washing with soap for 15 mins. Post-Exposure Prophylaxis (PEP: ARV + RIG).' : isMarathi ? 'खोकणाऱ्या जनावराच्या तोंडात हात घालू नका. साबणाने १५ मिनिटे जखम धुवा. तातडीने ARV+RIG लस घ्या.' : 'पशु के मुंह में कभी नंगे हाथ न डालें। साबुन से १५ मिनट धोएं। तुरंत एंटी-रेबीज टीका (PEP)।',
      vaccine: 'Inactivated Cell-Culture Rabies Vaccine + RIG'
    },
    bovinetb: {
      id: 'bovinetb',
      name: isEnglish ? 'Bovine Tuberculosis (टीबी / Bovine TB)' : isMarathi ? 'बोव्हाइन टीबी (जनावरांतील क्षयरोग)' : 'बोवाइन टीबी (पशु क्षयरोग)',
      pathogen: 'Mycobacterium bovis',
      species: 'Cattle, Buffalo, Humans, Wildlife',
      severity: 'Moderate to High / Chronic Pulmonary & Extra-pulmonary Disease',
      vector: isEnglish ? 'Aerosol inhalation in poorly ventilated barns, unpasteurized milk' : isMarathi ? 'हवेतून श्वासाद्वारे संसर्ग, न उकळलेले कच्चे दूध पिणे' : 'हवा में सांस द्वारा संचरण, कच्चा बिना पाश्चुरीकृत दूध',
      humanIncubation: 'Months to years (latent infection possible)',
      humanSigns: isEnglish ? 'Chronic cough, hemoptysis, cervical lymphadenopathy (scrofula), night sweats' : isMarathi ? 'तीव्र खोकला, कफातून रक्त, मानेतील गाठी (Scrofula), वजन घटणे' : 'लगातार खांसी, गले की गिल्टियां (स्क्रॉफुला), वजन कम होना',
      sopSummary: isEnglish ? 'Single Intradermal Tuberculin Test (SID). Mandatory milk pasteurization. Isolate reactors from dairy chain.' : isMarathi ? 'ट्युबरक्युलिन त्वचेची चाचणी. दूध निर्जंतुकीकरण बंधनकारक. बाधित पशु गोठ्यातून वेगळा करा.' : 'ट्यूबरकुलिन टेस्ट। दूध को अनिवार्य रूप से उबालना। संक्रमित पशु को दुग्ध चक्र से पृथक करना।',
      vaccine: 'BCG (Experimental in cattle) / Herd Test-and-Segregate'
    }
  };

  // Handler for sending One Health direct alert to District CMO
  const handleTransmitCmoAlert = () => {
    setIsSendingAlert(true);
    setTimeout(() => {
      const generatedId = `CMO-DISPATCH-${Date.now().toString().slice(-6)}`;
      setCmoAlertDispatchId(generatedId);
      setCmoAlertSent(true);
      setIsSendingAlert(false);
      setShowDispatchToast(true);
      setTimeout(() => setShowDispatchToast(false), 6000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP ONE HEALTH ALERT BANNER WITH REAL-TIME LINKAGE */}
      <div className="rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-stone-900 text-white p-6 sm:p-8 border border-red-500/40 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-60 h-60 bg-amber-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/60 text-red-200 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                <span>One Health Protocol Active</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                {isEnglish ? 'Class A Zoonotic Biohazard' : isMarathi ? 'वर्ग-अ झुनोटिक संसर्ग' : 'श्रेणी-ए ज़ूनोटिक संक्रामक जोखिम'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                {isEnglish ? `CMO Liaison: ${userDistrict} District` : isMarathi ? `जिल्हा आरोग्य अधिकारी समन्वय: ${userDistrict}` : `सीएमओ समन्वय: ${userDistrict} जिला`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Biohazard className="w-8 h-8 text-red-400 shrink-0" />
              <span>
                {isEnglish
                  ? 'Zoonotic Disease Surveillance & One Health Defense'
                  : isMarathi
                  ? 'झुनोटिक आजार देखरेख व वन हेल्थ नियंत्रण प्रणाली'
                  : 'ज़ूनोटिक रोग निगरानी एवं वन हेल्थ रक्षा प्रणाली'}
              </span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {isEnglish
                ? 'Coordinated cross-species pathogen tracking for Anthrax, Brucellosis, Rabies, and Bovine TB with real-time biometric liaison to the District Chief Medical Officer (CMO), primary health centres (PHC), and emergency containment taskforces.'
                : isMarathi
                ? 'अँथ्रॅक्स, ब्रुसेलोसिस, रेबीज आणि बोव्हाइन टीबी या प्राण्यांकडून माणसांत पसरणाऱ्या रोगांचे नियंत्रण आणि जिल्हा मुख्य वैद्यकीय अधिकारी (CMO) व प्राथमिक आरोग्य केंद्रांशी तात्काळ समन्वय.'
                : 'एंथ्रेक्स, ब्रूसीलोसिस, रेबीज और बोवाइन टीबी जैसी पशुओं से मनुष्यों में फैलने वाली संक्रामक बीमारियों की त्वरित निगरानी एवं जिला मुख्य चिकित्सा अधिकारी (CMO) व प्राथमिक स्वास्थ्य केंद्रों के साथ संयुक्त कार्रवाई।'}
            </p>
          </div>

          {/* Quick Action Hub */}
          <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTransmitCmoAlert}
              disabled={isSendingAlert || cmoAlertSent}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                cmoAlertSent
                  ? 'bg-emerald-600/90 text-white border border-emerald-400/50'
                  : 'bg-red-600 hover:bg-red-500 text-white border border-red-400/50'
              }`}
            >
              {isSendingAlert ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>{isEnglish ? 'Transmitting Alert...' : isMarathi ? 'संदेश पाठवत आहे...' : 'अलर्ट भेजा जा रहा है...'}</span>
                </>
              ) : cmoAlertSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{isEnglish ? 'CMO Alert Dispatched' : isMarathi ? 'CMO कडे अलर्ट पाठवला' : 'सीएमओ अलर्ट प्रेषित'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isEnglish ? 'Notify District CMO' : isMarathi ? 'जिल्हा CMO ला अलर्ट पाठवा' : 'जिला सीएमओ को अलर्ट भेजें'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSopModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{isEnglish ? 'Carcass Biosafety SOP' : isMarathi ? 'शव विल्हेवाट SOP' : 'शव निस्तारण एसओपी'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS STRIP: ZOONOTIC READINESS & ACTIVE CASES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-red-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-red-800 uppercase tracking-wide">
            <span>{isEnglish ? 'Active Biohazard Case' : isMarathi ? 'सक्रिय बायोहॅझार्ड केस' : 'सक्रिय बायोहैजार्ड मामला'}</span>
            <Biohazard className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-2">1 {isEnglish ? 'Active' : isMarathi ? 'सक्रिय' : 'सक्रिय'}</div>
          <span className="text-xs text-red-900/70 font-semibold block mt-0.5">
            Anthrax (Saoner Rural, {userDistrict})
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wide">
            <span>{isEnglish ? 'Human Contacts Traced' : isMarathi ? 'मानवी संपर्क देखरेख' : 'मानव संपर्क निगरानी'}</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">4 {isEnglish ? 'Persons' : isMarathi ? 'व्यक्ती' : 'व्यक्ति'}</div>
          <span className="text-xs text-amber-900/70 font-semibold block mt-0.5">
            {isEnglish ? '14-Day Surveillance (0 symptomatic)' : isMarathi ? '१४ दिवस देखरेख (० लक्षणे)' : '१४ दिवसीय निगरानी (० लक्षण)'}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wide">
            <span>{isEnglish ? 'Prophylaxis Coverage' : isMarathi ? 'प्रतिबंधक औषधोपचार' : 'निवारक उपचार कवरेज'}</span>
            <HeartPulse className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">100%</div>
          <span className="text-xs text-emerald-900/70 font-semibold block mt-0.5">
            Doxycycline 100mg BID (PHC Supervised)
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase tracking-wide">
            <span>{isEnglish ? 'Ring Vaccination Core' : isMarathi ? 'रिंग लसीकरण परिमिती' : 'रिंग टीकाकरण परिधि'}</span>
            <Syringe className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">5.0 km</div>
          <span className="text-xs text-blue-900/70 font-semibold block mt-0.5">
            Sterne Strain 34F2 Live Spore
          </span>
        </div>
      </div>

      {/* DISPATCH TOAST FEEDBACK */}
      {showDispatchToast && (
        <div className="p-4 rounded-2xl bg-emerald-900 text-white flex items-center justify-between shadow-lg border border-emerald-500 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-black">
                {isEnglish ? 'One Health Biohazard Alert Transmitted Successfully' : isMarathi ? 'वन हेल्थ बायोहॅझार्ड अलर्ट यशस्वीरित्या पाठवला' : 'वन हेल्थ बायोहैजार्ड अलर्ट सफलतापूर्वक भेजा गया'}
              </div>
              <div className="text-xs text-emerald-200 mt-0.5">
                {isEnglish
                  ? `Dispatch Reference: ${cmoAlertDispatchId} • Direct push to District CMO (${userDistrict}) & Medical Officer Saoner PHC.`
                  : isMarathi
                  ? `संदर्भ क्रमांक: ${cmoAlertDispatchId} • जिल्हा मुख्य वैद्यकीय अधिकारी (${userDistrict}) व सावनेर आरोग्य केंद्रास माहिती प्रेषित.`
                  : `संदर्भ संख्या: ${cmoAlertDispatchId} • जिला सीएमओ (${userDistrict}) एवं सावनेर प्राथमिक स्वास्थ्य केंद्र को प्रेषित।`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDispatchToast(false)}
            className="p-1 rounded-md hover:bg-white/10 text-white/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. FEATURED ACTIVE ZOONOTIC SHOWCASE CARD (ANTHRAX OUTBREAK CASE) */}
      <div className="bg-white rounded-3xl border-2 border-red-500/40 shadow-md overflow-hidden">
        {/* Showcase Header Strip */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Skull className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-red-900 shadow-xs">
                  {isEnglish ? 'Demo Showcase Case' : isMarathi ? 'डेमो प्रात्यक्षिक केस' : 'डेमो प्रदर्शन मामला'}
                </span>
                <span className="text-xs font-mono font-bold text-red-200">
                  {featuredAnthraxCase.caseId} (Database Ref: {featuredAnthraxCase.dbRefId})
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {featuredAnthraxCase.diseaseName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-400 text-red-200 text-xs font-black uppercase">
              {featuredAnthraxCase.bioriskTier}
            </span>
          </div>
        </div>

        {/* Case Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                {isEnglish ? 'Affected Animal' : isMarathi ? 'बाधित पशु' : 'संक्रमित पशु'}
              </span>
              <span className="text-sm font-black text-slate-900 mt-1 block">
                {featuredAnthraxCase.animalName}
              </span>
              <span className="text-xs font-mono text-slate-500 font-bold">
                Tag: {featuredAnthraxCase.animalTag} ({featuredAnthraxCase.species})
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                {isEnglish ? 'Owner & Location' : isMarathi ? 'मालक व स्थान' : 'पशु स्वामी व स्थान'}
              </span>
              <span className="text-sm font-black text-slate-900 mt-1 block">
                {featuredAnthraxCase.farmerName}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {featuredAnthraxCase.village}, {featuredAnthraxCase.block} ({featuredAnthraxCase.district})
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                {isEnglish ? 'AI Triage & Pathogen' : isMarathi ? 'AI चाचणी व सूक्ष्मजीव' : 'एआई परीक्षण एवं रोगाणु'}
              </span>
              <span className="text-sm font-black text-red-700 mt-1 block">
                {featuredAnthraxCase.aiConfidence} {isEnglish ? 'Confidence' : isMarathi ? 'निश्चितता' : 'सटीकता'}
              </span>
              <span className="text-xs text-slate-600 font-medium italic">
                {featuredAnthraxCase.scientificName}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                {isEnglish ? 'Surveillance Status' : isMarathi ? 'सद्यस्थिती' : 'वर्तमान स्थिति'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full mt-1">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                <span>{featuredAnthraxCase.status}</span>
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-0.5">
                {featuredAnthraxCase.reportedDate}
              </span>
            </div>
          </div>

          {/* Two-Column Clinical Presentation & Human Health Liaison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column A: Pathognomonic Clinical Presentation */}
            <div className="p-5 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
              <h4 className="text-sm font-black text-red-950 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700" />
                <span>
                  {isEnglish
                    ? 'Pathognomonic Animal Signs Observed in Database'
                    : isMarathi
                    ? 'डेटाबेसमधील प्रात्यक्षिक लक्षणे व क्लिनिकल चिन्हे'
                    : 'डेटाबेस में दर्ज नैदानिक लक्षण एवं प्रमाण'}
                </span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-800">
                {featuredAnthraxCase.symptoms.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <span>{isEnglish ? s.en : isMarathi ? s.mr : s.hi}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-red-200/80 text-xs text-red-900 font-bold">
                ⚠️ {isEnglish ? 'CRITICAL BIOSECURITY RULE: NEVER PERFORM POST-MORTEM (NECROPSY)' : isMarathi ? 'महत्त्वाचा नियम: शवविच्छेदन करण्यास १००% सक्त मनाई' : 'महत्वपूर्ण नियम: शव विच्छेदन (पोस्टमॉर्टम) सख्त वर्जित है'}
              </div>
            </div>

            {/* Column B: Human Health Linkage & Contact Tracing */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>
                    {isEnglish
                      ? 'One Health Contact Tracing & Human Risk'
                      : isMarathi
                      ? 'मानवी संपर्क शोध व आरोग्य रक्षण (One Health)'
                      : 'मानव संपर्क ट्रेसिंग एवं स्वास्थ्य सुरक्षा'}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowContactsModal(true)}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  {isEnglish ? 'View All 4 Contacts' : isMarathi ? '४ व्यक्तींची यादी पहा' : 'सभी ४ संपर्कों को देखें'}
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-800">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="font-bold text-slate-700">
                    {isEnglish ? 'Direct Human Handlers Identified:' : isMarathi ? 'थेट संपर्कातील व्यक्ती:' : 'पहचाने गए प्रत्यक्ष संपर्क:'}
                  </span>
                  <span className="font-black text-amber-900">4 {isEnglish ? 'Family / Attendants' : isMarathi ? 'कुटुंबीय / मदतनीस' : 'परिवारजन / सहायक'}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="font-bold text-slate-700">
                    {isEnglish ? 'Post-Exposure Prophylaxis (PEP):' : isMarathi ? 'प्रतिबंधक औषध पुरवठा:' : 'निवारक दवाइयां (पीईपी):'}
                  </span>
                  <span className="font-black text-emerald-800">
                    {isEnglish ? '100% Doxycycline Issued' : isMarathi ? '१००% डॉक्सीसायक्लिन सुरू' : '१००% डॉक्सीसाइक्लिन शुरू'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="font-bold text-slate-700">
                    {isEnglish ? 'Surveillance Facility:' : isMarathi ? 'आरोग्य केंद्र समन्वय:' : 'निगरानी स्वास्थ्य केंद्र:'}
                  </span>
                  <span className="font-bold text-slate-900">PHC Saoner & District CMO Office</span>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/80 text-xs text-amber-900 font-bold flex items-center justify-between">
                <span>{isEnglish ? 'Active Clinical Symptoms in Humans:' : isMarathi ? 'मानवात आढळलेली लक्षणे:' : 'मनुष्यों में प्रकट लक्षण:'}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                  {isEnglish ? '0 Asymptomatic (All Safe)' : isMarathi ? '० (सर्व सुरक्षित)' : '० (सभी सुरक्षित)'}
                </span>
              </div>
            </div>
          </div>

          {/* Biosafety Protocol Cards: 4 Mandatory Directives */}
          <div>
            <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <span>
                {isEnglish
                  ? 'Mandatory Biosafety Containment Actions (Veterinary Standard Directives)'
                  : isMarathi
                  ? 'सक्तीच्या जैवसुरक्षा मार्गदर्शक सूचना व कृती'
                  : 'अनिवार्य जैव-सुरक्षा नियंत्रण निर्देश'}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
                <span className="text-xs font-black text-red-950 block mb-1">
                  1. 🚫 {isEnglish ? 'NO NECROPSY' : isMarathi ? 'शवविच्छेदन बंदी' : 'शव परीक्षण वर्जित'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {isEnglish
                    ? 'Never open carcass. Air exposure triggers sporulation into soil, persisting for 50+ years.'
                    : isMarathi
                    ? 'शव कापू नका. हवेतील प्राणवायूमुळे बीजाणू तयार होतात जे मातीत ५० वर्षे टिकतात.'
                    : 'शव कभी न खोलें। हवा लगने से बीजाणु बनते हैं जो मिट्टी में ५०+ वर्षों तक जीवित रहते हैं।'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-300">
                <span className="text-xs font-black text-slate-950 block mb-1">
                  2. ⚰️ {isEnglish ? 'DEEP BURIAL + LIME' : isMarathi ? 'खोल पुरणे + चुना' : 'गहरा दफन + चूना'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {isEnglish
                    ? 'Excavate > 2.5m deep pit. Cover carcass completely with 50 kg quicklime (CaO) and barbed wire cordon.'
                    : isMarathi
                    ? '२.५ मीटर खोल खड्ड्यात ५० किलो चुन्याच्या थरासह गाडावे आणि कुंपण लावावे.'
                    : '२.५ मीटर से अधिक गहरे गड्ढे में ५० किलो चूने (CaO) की परत के साथ सुरक्षित दफन करें।'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                <span className="text-xs font-black text-teal-950 block mb-1">
                  3. 💉 {isEnglish ? 'STERNE VACCINATION' : isMarathi ? 'स्टर्न रिंग लसीकरण' : 'स्टर्न रिंग टीकाकरण'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {isEnglish
                    ? 'Deploy Anthrax Spore Vaccine (Sterne Strain 34F2) for all livestock within 5 km radial ring.'
                    : isMarathi
                    ? '५ किमी परिघातील सर्व जनावरांना अँथ्रॅक्स स्पोर व्हॅक्सिन (स्टर्न ३४F२) लस द्यावी.'
                    : '५ किमी परिधि के सभी पशुओं को एंथ्रेक्स स्पोर वैक्सीन (स्टर्न ३४F२) लगाई जाए।'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-black text-amber-950 block mb-1">
                  4. 🥛 {isEnglish ? 'DAIRY & MOVEMENT BAN' : isMarathi ? 'दूध व पशु वाहतूक बंदी' : 'दुग्ध व आवागमन प्रतिबंध'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {isEnglish
                    ? 'Complete prohibition on selling raw milk, livestock transport, or animal trade for 21 days.'
                    : isMarathi
                    ? 'गावातून कच्चे दूध विक्री व जनावरांच्या वाहतुकीवर २१ दिवसांची पूर्ण बंदी.'
                    : 'गांव से कच्चा दूध बेचने और पशुओं के परिवहन/व्यापार पर २१ दिनों का पूर्ण प्रतिबंध।'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTransmitCmoAlert}
                disabled={isSendingAlert || cmoAlertSent}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs ${
                  cmoAlertSent
                    ? 'bg-emerald-700 text-white'
                    : 'bg-red-700 hover:bg-red-800 text-white'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {cmoAlertSent
                    ? isEnglish ? 'CMO Alert Sent' : isMarathi ? 'CMO ला अलर्ट पाठवला' : 'सीएमओ को भेजा गया'
                    : isEnglish ? 'Transmit Emergency Alert to CMO' : isMarathi ? 'जिल्हा CMO ला तातडीचा अलर्ट पाठवा' : 'सीएमओ को आपातकालीन अलर्ट भेजें'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowSopModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>{isEnglish ? 'View Biosafety SOP' : isMarathi ? 'जैवसुरक्षा SOP पहा' : 'बायोसुरक्षा एसओपी देखें'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowContactsModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-700" />
                <span>{isEnglish ? 'Contact Tracing Log (4)' : isMarathi ? 'संपर्क शोध नोंद (४)' : 'संपर्क लॉग (४)'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onOpenRingVaccinationModal && (
                <button
                  type="button"
                  onClick={onOpenRingVaccinationModal}
                  className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Syringe className="w-4 h-4" />
                  <span>{isEnglish ? 'Trigger Ring Vaccination' : isMarathi ? 'रिंग लसीकरण सुरू करा' : 'रिंग टीकाकरण शुरू करें'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DATABASE ZOONOTIC CATALOG SELECTOR (Anthrax, Brucellosis, Rabies, Bovine TB) */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Biohazard className="w-5 h-5 text-red-600" />
              <span>
                {isEnglish
                  ? 'Zoonotic Pathogens Fed in PashuMitra Database & AI Simulators'
                  : isMarathi
                  ? 'पशुमित्र डेटाबेस व AI मध्ये समाविष्ट झुनोटिक आजार'
                  : 'पशुमित्र डेटाबेस एवं एआई में उपलब्ध ज़ूनोटिक बीमारियां'}
              </span>
            </h3>
            <span className="text-xs font-bold text-slate-500 uppercase">
              {isEnglish ? '4 Diseases Registered' : isMarathi ? '४ आजार नोंदणीकृत' : '४ बीमारियां पंजीकृत'}
            </span>
          </div>
          <p className="text-sm text-slate-600 font-medium mt-1">
            {isEnglish
              ? 'Select any registered pathogen below to inspect transmission vectors, human manifestations, and standard emergency actions.'
              : isMarathi
              ? 'संसर्ग मार्ग, मानवी लक्षणे व कृती आराखडा पाहण्यासाठी खालील रोगावर क्लिक करा.'
              : 'संचरण मार्ग, मानव स्वास्थ्य लक्षण और आपातकालीन प्रोटोकॉल देखने हेतु बीमारी चुनें।'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(zoonoticCatalog).map(([key, item]) => {
            const isSelected = selectedDiseaseTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDiseaseTab(key)}
                className={`p-3.5 rounded-2xl text-left transition border cursor-pointer ${
                  isSelected
                    ? 'bg-red-700 text-white border-red-700 shadow-sm'
                    : 'bg-stone-50 hover:bg-stone-100 text-slate-800 border-stone-200'
                }`}
              >
                <div className="text-xs font-mono font-bold opacity-80">
                  {key === 'anthrax' ? '☣️ Case Active' : '🔬 Reference'}
                </div>
                <div className="text-sm font-black mt-1 line-clamp-1">{item.name.split('(')[0]}</div>
                <div className={`text-xs mt-0.5 line-clamp-1 italic ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                  {item.pathogen}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Selected Pathogen Card */}
        {zoonoticCatalog[selectedDiseaseTab] && (
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {zoonoticCatalog[selectedDiseaseTab].name}
                </h4>
                <p className="text-xs text-slate-500 font-mono italic">
                  Pathogen: {zoonoticCatalog[selectedDiseaseTab].pathogen} • Affected Species: {zoonoticCatalog[selectedDiseaseTab].species}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-900 text-xs font-black border border-red-300">
                {zoonoticCatalog[selectedDiseaseTab].severity}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  {isEnglish ? 'Transmission Vector' : isMarathi ? 'संसर्ग वाहक व माध्यम' : 'संचरण माध्यम'}
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {zoonoticCatalog[selectedDiseaseTab].vector}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  {isEnglish ? 'Human Incubation & Symptoms' : isMarathi ? 'मानवातील लक्षणे' : 'मानव लक्षण एवं अवधि'}
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  <strong className="block text-slate-900 mb-0.5">
                    {isEnglish ? 'Incubation: ' : isMarathi ? 'कालावधी: ' : 'अवधि: '}
                    {zoonoticCatalog[selectedDiseaseTab].humanIncubation}
                  </strong>
                  {zoonoticCatalog[selectedDiseaseTab].humanSigns}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-stone-200">
                <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  {isEnglish ? 'Standard Vaccine & SOP' : isMarathi ? 'लस व प्रमाणित SOP' : 'मानक टीका एवं एसओपी'}
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  <strong className="block text-teal-800 mb-0.5">
                    {zoonoticCatalog[selectedDiseaseTab].vaccine}
                  </strong>
                  {zoonoticCatalog[selectedDiseaseTab].sopSummary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CARCASS BIOSAFETY STANDARD OPERATING PROCEDURE (SOP) */}
      {showSopModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <Biohazard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isEnglish ? 'Standard Operating Procedure: Anthrax Biosafety' : isMarathi ? 'प्रमाणित कार्यपद्धती: अँथ्रॅक्स जैवसुरक्षा' : 'मानक संचालन प्रक्रिया: एंथ्रेक्स बायोसुरक्षा'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Department of Animal Husbandry • One Health Biosecurity Protocol SOP-ZOON-01
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <strong className="font-black text-red-950 text-sm block mb-1">
                  1. Strict Prohibition of Necropsy (Post-Mortem Examination)
                </strong>
                <p>
                  Opening an anthrax carcass exposes vegetative bacilli (*Bacillus anthracis*) to atmospheric oxygen, inducing immediate sporulation. Anthrax spores are virtually indestructible in soil, persisting for over 50 years and permanently contaminating agricultural pastures.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <strong className="font-black text-slate-900 text-sm block">
                  2. Deep Burial Pit Protocol (Protocol Specifications)
                </strong>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Pit depth must be at least <strong>2.5 meters (8 feet)</strong> deep, located away from water wells and drainage streams.</li>
                  <li>Spread a <strong>10 cm base layer of Quicklime (Calcium Oxide, CaO)</strong> at the bottom of the excavation pit.</li>
                  <li>Carefully lower intact carcass using mechanical slings or excavator bucket. Do not drag or rupture hide.</li>
                  <li>Cover carcass thoroughly with an additional <strong>50 kg of quicklime powder</strong> before refilling soil.</li>
                  <li>Compact topsoil tightly and erect a perimeter barbed wire fence with biohazard warning signage.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                <strong className="font-black text-teal-950 text-sm block">
                  3. Protective Equipment & Disinfection for Field Personnel
                </strong>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Veterinarians and para-vets must wear Level 3 PPE: N95/FFP3 respirator, heavy chemical-resistant nitrile gloves, rubber gumboots, and eye goggles.</li>
                  <li>All contaminated halters, ropes, bedding straw, and manure must be incinerated on-site or buried with the carcass.</li>
                  <li>Disinfect metal stalls, tools, and gumboots using <strong>5% Formalin solution</strong> or <strong>10% Sodium Hypochlorite (Bleach)</strong> with at least 30 minutes contact time.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <strong className="font-black text-amber-950 text-sm block mb-1">
                  4. Human Contact Prophylaxis Mandate
                </strong>
                <p>
                  Any person who came in direct contact with carcass body fluids or unboiled milk must immediately report to Saoner PHC for 60-day oral prophylaxis (Doxycycline 100mg twice daily or Ciprofloxacin 500mg twice daily).
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSopModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm cursor-pointer"
              >
                {isEnglish ? 'Close SOP Directive' : isMarathi ? 'बंद करा' : 'बंद करें'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HUMAN CONTACT TRACING DETAILS */}
      {showContactsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {isEnglish ? 'One Health Contact Tracing Register' : isMarathi ? 'मानवी संपर्क शोध नोंदवही (One Health)' : 'मानव संपर्क ट्रेसिंग रजिस्टर'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Case: {featuredAnthraxCase.caseId} • Saoner Rural Cluster, {userDistrict}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactsModal(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {humanContactsList.map((contact) => (
                <div key={contact.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-slate-500 font-bold mr-2">{contact.id}</span>
                      <strong className="text-sm font-black text-slate-900">{contact.name}</strong>
                      <span className="text-slate-500 ml-2">({contact.age} yrs • {contact.relation})</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      {contact.status}
                    </span>
                  </div>

                  <p className="text-slate-700">
                    <strong>Exposure Type:</strong> {contact.exposureType}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-slate-500 pt-1 border-t border-stone-200/70">
                    <span><strong>Prophylaxis:</strong> {contact.prophylaxisDay}</span>
                    <span><strong>Supervisor:</strong> {contact.supervisedBy}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium">
              ✅ <strong>Surveillance Status:</strong> All 4 exposed persons are under daily telephonic and in-person cutaneous check by Saoner Primary Health Centre (PHC). Zero malignant carbuncles or febrile symptoms observed as of today.
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowContactsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm cursor-pointer"
              >
                {isEnglish ? 'Close Register' : isMarathi ? 'नोंदवही बंद करा' : 'रजिस्टर बंद करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
