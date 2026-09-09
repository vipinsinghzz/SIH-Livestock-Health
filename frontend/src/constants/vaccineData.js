// Comprehensive Indian Livestock Vaccines Registry & AI Recommendation Engine
// Supports Trilingual: English (en), Hindi (hi), Marathi (mr)

export const VACCINE_REGISTRY = [
  {
    id: 'fmd',
    key: 'FMD',
    code: 'FMD',
    name: {
      en: 'FMD (Foot & Mouth Disease)',
      hi: 'खुरपका-मुंहपका (FMD)',
      mr: 'लाळखुरी / तोंडखुरी (FMD)'
    },
    shortName: {
      en: 'FMD Vaccine',
      hi: 'FMD टीका',
      mr: 'FMD लस'
    },
    disease: {
      en: 'Foot and Mouth Disease',
      hi: 'खुरपका-मुंहपका रोग',
      mr: 'लाळखुरी / तोंडखुरी रोग'
    },
    applicableSpecies: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig'],
    defaultIntervalMonths: 6,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Bi-annual (May & November)',
      hi: 'द्विवार्षिक (मई और नवंबर)',
      mr: 'वर्षातून दोनदा (मे आणि नोव्हेंबर)'
    },
    description: {
      en: 'Protects against Aphthovirus strains O, A, Asia-1. Inactivated oil adjuvant.',
      hi: 'खुर और मुंह के छालों व अत्यधिक लार से सुरक्षा। वर्ष में दो बार आवश्यक।',
      mr: 'तोंड आणि खुरांच्या जखमांपासून संरक्षण. वर्षातून दोनदा देणे बंधनकारक.'
    },
    govtScheme: 'NADCP (Free Govt Programme)'
  },
  {
    id: 'hs',
    key: 'HS',
    code: 'HS',
    name: {
      en: 'HS (Haemorrhagic Septicaemia)',
      hi: 'गलघोंटू (HS)',
      mr: 'घटसर्प (HS)'
    },
    shortName: {
      en: 'HS Vaccine',
      hi: 'गलघोंटू टीका (HS)',
      mr: 'घटसर्प लस (HS)'
    },
    disease: {
      en: 'Haemorrhagic Septicaemia',
      hi: 'गलघोंटू (गले की सूजन व सांस अवरोध)',
      mr: 'घटसर्प (गळ्याची सूज)'
    },
    applicableSpecies: ['Cattle', 'Buffalo'],
    defaultIntervalMonths: 12,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Pre-Monsoon (May - June)',
      hi: 'मानसून पूर्व (मई - जून)',
      mr: 'पावसाळ्यापूर्वी (मे - जून)'
    },
    description: {
      en: 'Inactivated Pasteurella multocida vaccine. Vital before rainy season.',
      hi: 'मानसून में फैलने वाले जानलेवा गलघोंटू रोग से सुरक्षा प्रदान करता है।',
      mr: 'पावसाळ्यातील तीव्र गळ्याच्या संसर्गापासून रक्षण करणारी महत्त्वाची लस.'
    },
    govtScheme: 'Govt Pre-Monsoon Drive'
  },
  {
    id: 'bq',
    key: 'BQ',
    code: 'BQ',
    name: {
      en: 'BQ (Black Quarter)',
      hi: 'लंगड़ा बुखार / काला बावा (BQ)',
      mr: 'फऱ्या / फऱ्या रोग (BQ)'
    },
    shortName: {
      en: 'BQ Vaccine',
      hi: 'लंगड़ा बुखार टीका (BQ)',
      mr: 'फऱ्या लस (BQ)'
    },
    disease: {
      en: 'Black Quarter',
      hi: 'लंगड़ा बुखार (मांसपेशियों में सूजन व लंगड़ापन)',
      mr: 'फऱ्या (स्नायूंची सूज व लंगडणे)'
    },
    applicableSpecies: ['Cattle', 'Buffalo', 'Sheep'],
    defaultIntervalMonths: 12,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Pre-Monsoon (May - June)',
      hi: 'मानसून पूर्व (मई - जून)',
      mr: 'पावसाळ्यापूर्वी (मे - जून)'
    },
    description: {
      en: 'Clostridium chauvoei vaccine. Highly critical for young stock 6m-2y.',
      hi: 'युवा पशुओं (6 माह - 2 वर्ष) में होने वाले मांसपेशियों के जानलेवा रोग से बचाव।',
      mr: 'तरुण जनावरांमध्ये होणाऱ्या फऱ्या रोगाविरुद्ध अत्यंत प्रभावी लस.'
    },
    govtScheme: 'Govt Pre-Monsoon Drive'
  },
  {
    id: 'brucellosis',
    key: 'Brucellosis',
    code: 'BRUC',
    name: {
      en: 'Brucellosis (Calfhood S19)',
      hi: 'ब्रुसेलोसिस (बांझपन व गर्भपात रोधक)',
      mr: 'ब्रुसेलोसिस (गर्भपात प्रतिबंधक)'
    },
    shortName: {
      en: 'Brucellosis Vaccine',
      hi: 'ब्रुसेलोसिस टीका',
      mr: 'ब्रुसेलोसिस लस'
    },
    disease: {
      en: 'Brucellosis',
      hi: 'ब्रुसेलोसिस (गर्भपात व बांझपन)',
      mr: 'ब्रुसेलोसिस (गर्भपात व वांझपणा)'
    },
    applicableSpecies: ['Cattle', 'Buffalo'],
    defaultIntervalMonths: 12,
    defaultDose: 'Primary Dose (1st)',
    targetSeason: {
      en: 'Female Calves (4 - 8 Months of Age)',
      hi: 'मादा बछिया (4 से 8 माह की आयु)',
      mr: 'मादी वासरांसाठी (४ ते ८ महिने वय)'
    },
    description: {
      en: 'Live attenuated Cotton strain 19. Lifetime immunity for female calves.',
      hi: 'केवल 4-8 माह की मादा बछियों को एक बार दी जाती है, जो जीवनभर गर्भपात से बचाती है।',
      mr: 'केवळ ४ ते ८ महिन्यांच्या मादी वासरांना दिली जाते; जन्मभर गर्भपातापासून रक्षण करते.'
    },
    govtScheme: 'NADCP 100% Free'
  },
  {
    id: 'lsd',
    key: 'LSD',
    code: 'LSD',
    name: {
      en: 'Lumpy Skin Disease (LSD)',
      hi: 'लम्पी त्वचा रोग (LSD)',
      mr: 'लम्पी चर्मरोग (LSD)'
    },
    shortName: {
      en: 'LSD Vaccine',
      hi: 'लम्पी टीका',
      mr: 'लम्पी लस'
    },
    disease: {
      en: 'Lumpy Skin Disease',
      hi: 'लम्पी चर्मरोग (त्वचा पर सख्त गांठें)',
      mr: 'लम्पी आजार (त्वचेवरील गाठी)'
    },
    applicableSpecies: ['Cattle', 'Buffalo'],
    defaultIntervalMonths: 12,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Annual (Pre-Vector Season / Spring)',
      hi: 'वार्षिक (मच्छर-मक्खी सीजन से पहले)',
      mr: 'वार्षिक (डास-माश्यांच्या प्रादुर्भावापूर्वी)'
    },
    description: {
      en: 'Homologous Lumpi-ProVacInd or Goat Pox heterologous vaccine (3ml S/C).',
      hi: 'मक्खी-मच्छर से फैलने वाली लम्पी गांठों से बचाव हेतु वार्षिक टीका।',
      mr: 'गोचीड, डासांमुळे पसरणाऱ्या लम्पी त्वचारोगापासून वार्षिक संरक्षण.'
    },
    govtScheme: 'Govt Emergency Stock'
  },
  {
    id: 'anthrax',
    key: 'Anthrax',
    code: 'ANTH',
    name: {
      en: 'Anthrax Spore Vaccine',
      hi: 'एंथ्रेक्स टीका (तिल्ली बुखार)',
      mr: 'अँथ्रॅक्स लस (काळपुळी)'
    },
    shortName: {
      en: 'Anthrax Vaccine',
      hi: 'एंथ्रेक्स टीका',
      mr: 'अँथ्रॅक्स लस'
    },
    disease: {
      en: 'Anthrax',
      hi: 'एंथ्रेक्स (तिल्ली बुखार)',
      mr: 'अँथ्रॅक्स (काळपुळी)'
    },
    applicableSpecies: ['Cattle', 'Buffalo', 'Sheep', 'Goat'],
    defaultIntervalMonths: 12,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Pre-Monsoon in Endemic Areas',
      hi: 'संवेदनशील क्षेत्रों में मानसून पूर्व',
      mr: 'पावसाळ्यापूर्वी प्रादुर्भावग्रस्त भागात'
    },
    description: {
      en: 'Live Sterne strain 34F2 spore vaccine for endemic soil-borne zones.',
      hi: 'जमीन से फैलने वाले अति-संक्रामक जीवाणु से 1 वर्ष की सुरक्षा।',
      mr: 'मातीतून पसरणाऱ्या अत्यंत घातक काळपुळी रोगाविरुद्ध १ वर्षाचे संरक्षण.'
    },
    govtScheme: 'State Animal Husbandry Dept'
  },
  {
    id: 'rabies',
    key: 'Rabies',
    code: 'RAB',
    name: {
      en: 'Rabies Post/Pre-Exposure',
      hi: 'रेबीज (कुत्ता काटने पर बचाव)',
      mr: 'रेबीज लस (अलर्क प्रतिबंध)'
    },
    shortName: {
      en: 'Rabies Vaccine',
      hi: 'रेबीज टीका',
      mr: 'रेबीज लस'
    },
    disease: {
      en: 'Rabies',
      hi: 'रेबीज (जलभीति)',
      mr: 'रेबीज (अलर्क रोग)'
    },
    applicableSpecies: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    defaultIntervalMonths: 12,
    defaultDose: 'Emergency / Ring Dose',
    targetSeason: {
      en: 'Post Dog/Wild Animal Bite or Annual',
      hi: 'कुत्ता या जंगली जानवर के काटने पर तुरंत',
      mr: 'कुत्रा किंवा जंगली प्राणी चावल्यास त्वरित'
    },
    description: {
      en: 'Inactivated cell-culture rabies vaccine (Raksharab/Rabivax-S).',
      hi: 'कुत्ते या सियार के काटने पर 5 टीकों की श्रृंखला (दिन 0, 3, 7, 14, 28)।',
      mr: 'प्राणी चावल्यास पाच डोसची मालिका त्वरित द्यावी लागते.'
    },
    govtScheme: 'Govt Veterinary Hospital'
  },
  {
    id: 'ppr',
    key: 'PPR',
    code: 'PPR',
    name: {
      en: 'PPR (Goat Plague / Pest)',
      hi: 'पी.पी.आर. (बकरी प्लेग)',
      mr: 'पी.पी.आर. (शेळी-मेंढी प्लेग)'
    },
    shortName: {
      en: 'PPR Vaccine',
      hi: 'पीपीआर टीका',
      mr: 'पीपीआर लस'
    },
    disease: {
      en: 'Peste des Petits Ruminants',
      hi: 'पीपीआर (बकरियों में तेज बुखार व दस्त)',
      mr: 'पीपीआर (शेळ्यांमधील संसर्गजन्य ताप व अतिसार)'
    },
    applicableSpecies: ['Goat', 'Sheep'],
    defaultIntervalMonths: 36,
    defaultDose: 'Primary Dose (1st)',
    targetSeason: {
      en: 'Every 3 Years (Any season, non-pregnant)',
      hi: 'प्रत्येक 3 वर्ष में एक बार',
      mr: 'दर ३ वर्षांनी एकदा'
    },
    description: {
      en: 'Live attenuated Sungri 96 strain. Gives durable 3-year immunity to small ruminants.',
      hi: 'बकरियों और भेड़ों को 3 वर्ष के लिए जानलेवा प्लेग से अभयदान देता है।',
      mr: 'शेळ्या आणि मेंढ्यांना सलग ३ वर्षे दीर्घकाळ संरक्षण देणारी राष्ट्रीय लस.'
    },
    govtScheme: 'National PPR Eradication Programme'
  },
  {
    id: 'et',
    key: 'ET',
    code: 'ET',
    name: {
      en: 'Enterotoxaemia (ET / Pulpy Kidney)',
      hi: 'फिड़किया / ई.टी. (Enterotoxaemia)',
      mr: 'फिड़किया / ई.टी. लस'
    },
    shortName: {
      en: 'ET Vaccine',
      hi: 'फिड़किया टीका',
      mr: 'फिड़किया लस'
    },
    disease: {
      en: 'Enterotoxaemia',
      hi: 'फिड़किया (अधिक चारा खाने पर अचानक मृत्यु)',
      mr: 'फिड़किया (पोटाचा तीव्र विषबाधा आजार)'
    },
    applicableSpecies: ['Sheep', 'Goat', 'Cattle'],
    defaultIntervalMonths: 12,
    defaultDose: 'Annual Booster',
    targetSeason: {
      en: 'Pre-Monsoon / Flushing (May-June)',
      hi: 'हरी घास उगने से पहले (मई-जून)',
      mr: 'नवीन हिरवा चारा येण्यापूर्वी (मे-जून)'
    },
    description: {
      en: 'Clostridium perfringens type D toxoid. Vital for sheep & goats grazing lush pasture.',
      hi: 'नए हरे चारे के मौसम में बकरियों की अचानक मौत रोकने हेतु अनिवार्य।',
      mr: 'हिरव्या चाऱ्याच्या हंगामात शेळ्या-मेंढ्यांचे अचानक मृत्यू टाळण्यासाठी आवश्यक.'
    },
    govtScheme: 'State Sheep & Goat Development Board'
  },
  {
    id: 'theileriosis',
    key: 'Theileriosis',
    code: 'THEIL',
    name: {
      en: 'Theileriosis (Rakshavac-T)',
      hi: 'थायलेरियासिस (चिचड़ी बुखार टीका)',
      mr: 'थायलेरियासिस (गोचीड ताप लस)'
    },
    shortName: {
      en: 'Theileriosis Vaccine',
      hi: 'थायलेरियासिस टीका',
      mr: 'थायलेरियासिस लस'
    },
    disease: {
      en: 'Bovine Theileriosis',
      hi: 'थायलेरियासिस (रक्त परजीवी रोग)',
      mr: 'थायलेरियासिस (रक्तपरजीवी आजार)'
    },
    applicableSpecies: ['Cattle'],
    defaultIntervalMonths: 24,
    defaultDose: 'Primary Dose (1st)',
    targetSeason: {
      en: 'Crossbred / HF / Jersey Cattle',
      hi: 'संकरित व विदेशी गायों हेतु',
      mr: 'संकरित व विदेशी गाईंसाठी विशेष'
    },
    description: {
      en: 'Theileria annulata cell culture vaccine. Crucial for exotic crossbreds.',
      hi: 'चिचड़ी (गोचीड) से संकरित गायों में होने वाले गंभीर खून की कमी वाले रोग से बचाव।',
      mr: 'संकरित गाईंना गोचीड तापामुळे होणाऱ्या गंभीर अशक्तपणापासून रक्षण करते.'
    },
    govtScheme: 'NDDB / Dairy Cooperatives'
  },
  {
    id: 'other',
    key: 'Other',
    code: 'OTHER',
    name: {
      en: 'Other / Custom Vaccine',
      hi: 'अन्य टीका (विवरण दर्ज करें)',
      mr: 'इतर लस (तपशील नोंदवा)'
    },
    shortName: {
      en: 'Custom Vaccine',
      hi: 'अन्य टीका',
      mr: 'इतर लस'
    },
    disease: {
      en: 'Custom Veterinary Prevention',
      hi: 'अन्य बीमारी रोकथाम',
      mr: 'इतर आजार प्रतिबंध'
    },
    applicableSpecies: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'],
    defaultIntervalMonths: 6,
    defaultDose: 'Primary Dose (1st)',
    targetSeason: {
      en: 'As prescribed by Veterinarian',
      hi: 'पशु चिकित्सक के परामर्श अनुसार',
      mr: 'पशुवैद्यकाच्या सल्ल्यानुसार'
    },
    description: {
      en: 'Custom or regional vaccine administered by a certified veterinarian.',
      hi: 'पशु चिकित्सक द्वारा निर्देशित अन्य कोई टीका।',
      mr: 'पशुवैद्यकाने शिफारस केलेली इतर कोणतीही लस.'
    },
    govtScheme: 'Local Veterinary Clinic'
  }
];

export const DOSE_NUMBER_OPTIONS = [
  { id: 'Primary Dose (1st)', en: 'Primary Dose (1st)', hi: 'प्राथमिक खुराक (पहला डोज)', mr: 'प्राथमिक मात्रा (पहिला डोस)' },
  { id: 'Booster Dose (2nd)', en: 'Booster Dose (2nd)', hi: 'बूस्टर खुराक (दूसरा डोज)', mr: 'बूस्टर मात्रा (दुसरा डोस)' },
  { id: 'Annual Booster', en: 'Annual Booster', hi: 'वार्षिक बूस्टर टीका', mr: 'वार्षिक बूस्टर लस' },
  { id: 'Emergency / Ring Dose', en: 'Emergency / Ring Dose', hi: 'आपातकालीन / रिंग टीकाकरण', mr: 'तातडीचा / रिंग डोस' }
];

export const VACCINATION_CAMPS_PRESETS = [
  'National Animal Disease Control Programme (NADCP)',
  'Gram Panchayat Free Village Camp',
  'Pre-Monsoon Livestock Health Drive',
  'District Veterinary Polyclinic',
  'Dairy Cooperative Society Camp',
  'Private Veterinary Clinic'
];

export const calculateNextDueDate = (vaccineKey, administeredDateStr) => {
  const baseDate = administeredDateStr ? new Date(administeredDateStr) : new Date();
  if (isNaN(baseDate.getTime())) return '';

  const found = VACCINE_REGISTRY.find(
    (v) =>
      v.key.toLowerCase() === (vaccineKey || '').toLowerCase() ||
      v.id.toLowerCase() === (vaccineKey || '').toLowerCase() ||
      v.name.en.toLowerCase().includes((vaccineKey || '').toLowerCase())
  );

  const months = found ? found.defaultIntervalMonths : 6;
  const nextDate = new Date(baseDate);
  nextDate.setMonth(nextDate.getMonth() + months);

  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getVaccineStatusInfo = (nextDueDateRaw, lang = 'hi') => {
  if (!nextDueDateRaw) {
    return {
      statusKey: 'Completed',
      label: lang === 'en' ? 'Completed' : lang === 'mr' ? 'पूर्ण' : 'पूर्ण',
      color: 'emerald',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      daysDiff: null,
      isDueSoon: false,
      isOverdue: false
    };
  }

  const nextDate = new Date(nextDueDateRaw);
  if (isNaN(nextDate.getTime())) {
    return {
      statusKey: 'Completed',
      label: lang === 'en' ? 'Completed' : lang === 'mr' ? 'पूर्ण' : 'पूर्ण',
      color: 'emerald',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      daysDiff: null,
      isDueSoon: false,
      isOverdue: false
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  const diffMs = nextDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      statusKey: 'Overdue',
      label:
        lang === 'en'
          ? `Overdue (${overdueDays}d)`
          : lang === 'mr'
          ? `थकबाकी (${overdueDays} दिवस)`
          : `अतिदेय (${overdueDays} दिन)`,
      color: 'red',
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-extrabold',
      daysDiff: diffDays,
      isDueSoon: false,
      isOverdue: true
    };
  }

  if (diffDays <= 7) {
    return {
      statusKey: 'Due Soon',
      label:
        lang === 'en'
          ? `Due Soon (${diffDays === 0 ? 'Today' : `${diffDays}d`})`
          : lang === 'mr'
          ? `लवकरच देय (${diffDays === 0 ? 'आज' : `${diffDays} दिवस`})`
          : `शीघ्र देय (${diffDays === 0 ? 'आज' : `${diffDays} दिन`})`,
      color: 'yellow',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      daysDiff: diffDays,
      isDueSoon: true,
      isOverdue: false
    };
  }

  return {
    statusKey: 'Completed',
    label: lang === 'en' ? 'Completed' : lang === 'mr' ? 'पूर्ण' : 'सुरक्षित',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    daysDiff: diffDays,
    isDueSoon: false,
    isOverdue: false
  };
};

export const getAIVaccineRecommendations = ({
  species = 'Cattle',
  age = 3,
  breed = '',
  gender = 'Female',
  diseaseHistory = [],
  district = 'Pune',
  currentVaccinations = [],
  lang = 'hi'
}) => {
  const recommendations = [];
  const normalizedSpecies = (species || 'Cattle').toLowerCase();
  const currentMonth = new Date().getMonth();
  const isMonsoonSeason = currentMonth >= 4 && currentMonth <= 9;

  const isRecentlyGiven = (vaccineKey) => {
    const keyLower = vaccineKey.toLowerCase();
    return currentVaccinations.some((v) => {
      const vName = (v.vaccine || v.name || '').toLowerCase();
      if (!vName.includes(keyLower)) return false;
      if (!v.date) return false;
      const vDate = new Date(v.date);
      if (isNaN(vDate.getTime())) return false;
      const diffMonths = (Date.now() - vDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return diffMonths < 4;
    });
  };

  if (!isRecentlyGiven('fmd')) {
    recommendations.push({
      vaccineId: 'fmd',
      key: 'FMD',
      name: lang === 'en' ? 'FMD (Foot & Mouth Disease)' : lang === 'mr' ? 'लाळखुरी (FMD)' : 'खुरपका-मुंहपका (FMD)',
      priority: 'High Priority',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      reason:
        lang === 'en'
          ? `Bi-annual national requirement for ${species}. High transmission risk across herd borders.`
          : lang === 'mr'
          ? `${species} साठी राष्ट्रीय लाळखुरी निर्मूलन कार्यक्रम अंतर्गत वर्षातून २ वेळा अनिवार्य.`
          : `${species} के लिए राष्ट्रीय स्तर पर 6 माह में द्विवार्षिक अनिवार्य टीकाकरण।`,
      dose: 'Annual Booster',
      suggestedCamp: 'National Animal Disease Control Programme (NADCP)'
    });
  }

  if (['cattle', 'buffalo'].includes(normalizedSpecies) && !isRecentlyGiven('hs')) {
    const isWaterloggedDistrict = ['pune', 'kolhapur', 'satara', 'sangli', 'solapur', 'ahmednagar'].some((d) =>
      (district || '').toLowerCase().includes(d)
    );

    recommendations.push({
      vaccineId: 'hs',
      key: 'HS',
      name: lang === 'en' ? 'HS (Haemorrhagic Septicaemia)' : lang === 'mr' ? 'घटसर्प (HS)' : 'गलघोंटू (HS)',
      priority: isMonsoonSeason || isWaterloggedDistrict ? 'High Priority' : 'Recommended',
      badgeColor: isMonsoonSeason ? 'bg-red-100 text-red-900 border-red-300 font-extrabold' : 'bg-amber-100 text-amber-900 border-amber-300',
      reason:
        lang === 'en'
          ? `Critical pre-monsoon safeguard for ${district} district. High mortality in water-logged pasture.`
          : lang === 'mr'
          ? `${district} जिल्ह्यातील पावसाळी दमट हवामानामुळे घटसर्प रोगाचा मोठा धोका असतो.`
          : `${district} जिले में बारिश के मौसम में दलदली व नम चरागाहों में गलघोंटू का भारी खतरा।`,
      dose: 'Annual Booster',
      suggestedCamp: 'Pre-Monsoon Livestock Health Drive'
    });
  }

  if (['cattle', 'buffalo', 'sheep'].includes(normalizedSpecies) && age <= 3 && !isRecentlyGiven('bq')) {
    recommendations.push({
      vaccineId: 'bq',
      key: 'BQ',
      name: lang === 'en' ? 'BQ (Black Quarter)' : lang === 'mr' ? 'फऱ्या रोग (BQ)' : 'लंगड़ा बुखार (BQ)',
      priority: 'Seasonal Alert',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      reason:
        lang === 'en'
          ? `Young ${species} (${age} yrs) are most vulnerable to muscle clostridial infections.`
          : lang === 'mr'
          ? `तरुण जनावरांमध्ये (${age} वर्षे) स्नायूंच्या फऱ्या रोगाची शक्यता सर्वाधिक असते.`
          : `युवा पशु (${age} वर्ष) में मांसपेशियों की सूजन व लंगड़ा बुखार का जोखिम अधिक होता है।`,
      dose: 'Annual Booster',
      suggestedCamp: 'Gram Panchayat Free Village Camp'
    });
  }

  if (
    ['cattle', 'buffalo'].includes(normalizedSpecies) &&
    gender.toLowerCase() === 'female' &&
    age <= 1 &&
    !isRecentlyGiven('brucellosis')
  ) {
    recommendations.push({
      vaccineId: 'brucellosis',
      key: 'Brucellosis',
      name: lang === 'en' ? 'Brucellosis (Calfhood S19)' : lang === 'mr' ? 'ब्रुसेलोसिस लस' : 'ब्रुसेलोसिस (बांझपन रोधक)',
      priority: 'High Priority',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
      reason:
        lang === 'en'
          ? 'Single-dose lifetime protection against reproductive loss and abortion for female calves.'
          : lang === 'mr'
          ? 'मादी वासराला भविष्यातील गर्भपात व वांझपणापासून आयुष्यभराचे संरक्षण देणारा महत्त्वाचा डोस.'
          : 'मादा बछिया के लिए जीवनभर गर्भपात व बांझपन से मुक्ति हेतु एकमात्र सुरक्षित टीका।',
      dose: 'Primary Dose (1st)',
      suggestedCamp: 'National Animal Disease Control Programme (NADCP)'
    });
  }

  const hasLSDHistory = diseaseHistory.some(
    (h) =>
      (typeof h === 'string' && (h.toLowerCase().includes('lumpy') || h.toLowerCase().includes('nodule'))) ||
      (h && typeof h === 'object' && ((h.title || '').toLowerCase().includes('lumpy') || (h.disease || '').toLowerCase().includes('lumpy')))
  );

  if (['cattle', 'buffalo'].includes(normalizedSpecies) && !isRecentlyGiven('lsd')) {
    recommendations.push({
      vaccineId: 'lsd',
      key: 'LSD',
      name: lang === 'en' ? 'Lumpy Skin Disease (LSD)' : lang === 'mr' ? 'लम्पी चर्मरोग लस (LSD)' : 'लम्पी त्वचा रोग (LSD)',
      priority: hasLSDHistory ? 'High Priority' : 'Recommended',
      badgeColor: hasLSDHistory ? 'bg-red-100 text-red-900 border-red-300 font-extrabold' : 'bg-emerald-100 text-emerald-900 border-emerald-300',
      reason:
        lang === 'en'
          ? hasLSDHistory
            ? 'Previous history of nodules/skin disease detected. Annual booster advised to maintain antibodies.'
            : 'Vector-borne risk during monsoon/summer across Western & Central India.'
          : lang === 'mr'
          ? hasLSDHistory
            ? 'या जनावरास पूर्वी त्वचेच्या गाठींची लक्षणे आढळली होती. प्रतिकारशक्ती टिकवण्यासाठी वार्षिक बूस्टर आवश्यक.'
            : 'डास व गोचीड प्रादुर्भावाच्या काळात लम्पी त्वचारोगापासून वार्षिक सुरक्षा.'
          : hasLSDHistory
          ? 'पूर्व इतिहास में लम्पी/त्वचा गांठें देखी गई थीं। रोग प्रतिरोधक क्षमता हेतु वार्षिक बूस्टर आवश्यक।'
          : 'मच्छर व मक्खियों से फैलने वाले लम्पी चर्मरोग से वार्षिक सुरक्षा।',
      dose: 'Annual Booster',
      suggestedCamp: 'District Veterinary Polyclinic'
    });
  }

  const isCrossbred =
    ['crossbred', 'jersey', 'holstein', 'hf'].some((b) => (breed || '').toLowerCase().includes(b)) ||
    (species === 'Cattle' && (breed || '').toLowerCase().includes('cross'));

  if (isCrossbred && !isRecentlyGiven('theileriosis')) {
    recommendations.push({
      vaccineId: 'theileriosis',
      key: 'Theileriosis',
      name: lang === 'en' ? 'Theileriosis (Rakshavac-T)' : lang === 'mr' ? 'थायलेरियासिस (गोचीड ताप)' : 'थायलेरियासिस (चिचड़ी बुखार)',
      priority: 'High Priority',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
      reason:
        lang === 'en'
          ? `Crossbred breed (${breed}) has 4x higher risk of acute tick-borne Theileria anaemia.`
          : lang === 'mr'
          ? `संकरित जात (${breed}) गोचीड तापामुळे होणाऱ्या तीव्र रक्ताल्पतेस अत्यंत संवेदनशील असते.`
          : `संकरित नस्ल (${breed}) में चिचड़ी बुखार से जानलेवा एनीमिया का 4 गुना अधिक खतरा होता है।`,
      dose: 'Primary Dose (1st)',
      suggestedCamp: 'Dairy Cooperative Society Camp'
    });
  }

  if (['goat', 'sheep'].includes(normalizedSpecies) && !isRecentlyGiven('ppr')) {
    recommendations.push({
      vaccineId: 'ppr',
      key: 'PPR',
      name: lang === 'en' ? 'PPR (Goat Plague)' : lang === 'mr' ? 'पी.पी.आर. (बकरी प्लेग)' : 'पी.पी.आर. (बकरी प्लेग)',
      priority: 'High Priority',
      badgeColor: 'bg-red-100 text-red-900 border-red-300 font-extrabold',
      reason:
        lang === 'en'
          ? 'PPR causes up to 80% mortality in small ruminants. 1 dose grants 3-year immunity.'
          : lang === 'mr'
          ? 'शेळ्या-मेंढ्यांमधील प्लेग रोगापासून सलग ३ वर्षे १००% संरक्षण देणारा महत्त्वाचा डोस.'
          : 'बकरियों में 80% मृत्यु दर वाला संक्रामक प्लेग। एक टीका 3 साल तक सुरक्षा देता है।',
      dose: 'Primary Dose (1st)',
      suggestedCamp: 'National PPR Eradication Programme'
    });
  }

  if (['goat', 'sheep'].includes(normalizedSpecies) && !isRecentlyGiven('et')) {
    recommendations.push({
      vaccineId: 'et',
      key: 'ET',
      name: lang === 'en' ? 'Enterotoxaemia (ET)' : lang === 'mr' ? 'फिड़किया लस (ET)' : 'फिड़किया टीका (ET)',
      priority: 'Seasonal Alert',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      reason:
        lang === 'en'
          ? 'Prevents pulpy kidney poisoning when grazing new lush fodder.'
          : lang === 'mr'
          ? 'हिरवा रसरशीत चारा खाल्ल्यानंतर होणाऱ्या विषबाधेपासून शेळ्यांना वाचवते.'
          : 'नए रसीले हरे चारे के सेवन से होने वाली अचानक मृत्यु (फिड़किया) से सुरक्षा।',
      dose: 'Annual Booster',
      suggestedCamp: 'Gram Panchayat Free Village Camp'
    });
  }

  return recommendations.slice(0, 3);
};
