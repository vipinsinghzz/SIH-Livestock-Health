// Intent Classification & Context Resolution Engine for Kisan Saathi AI (PS-128)
// Ensures medical context (previous diagnosis, disease alerts, emergency hotline) is ONLY used when relevant to the user query.

const INTENTS = {
  JOKE_OR_HUMOR: 'JOKE_OR_HUMOR',
  GREETING_SIMPLE: 'GREETING_SIMPLE',
  GENERAL_HUSBANDRY: 'GENERAL_HUSBANDRY',
  VACCINATION_INQUIRY: 'VACCINATION_INQUIRY',
  GOVERNMENT_SCHEME: 'GOVERNMENT_SCHEME',
  DISEASE_FOLLOWUP: 'DISEASE_FOLLOWUP',
  NEW_SYMPTOM_OR_DISEASE: 'NEW_SYMPTOM_OR_DISEASE',
  EMERGENCY: 'EMERGENCY',
  GENERAL_QUERY: 'GENERAL_QUERY'
};

/**
 * Detects the intent of a user query and determines what context should be included or excluded.
 * @param {string} query - The farmer's text or spoken message
 * @param {object} context - { animal, diagnosis, symptoms, conversationHistory }
 */
function detectIntent(query = '', context = {}) {
  const q = (query || '').toLowerCase().trim();
  const { animal, diagnosis } = context;
  const animalName = (animal?.name || '').toLowerCase();

  // 1. Check for Jokes / Humor / Entertainment
  const humorTerms = [
    'joke', 'jokes', 'चुटकुला', 'चुटकुले', 'मजाक', 'हंसाओ', 'हंसाने',
    'हंसा दो', 'शायरी', 'कॉमेडी', 'comedy', 'funny', 'विनोद', 'हंसी', 'मनोरंजन'
  ];
  if (humorTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.JOKE_OR_HUMOR,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: false,
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: false,
      description: 'Farmer wants lighthearted entertainment or a joke.'
    };
  }

  // 2. Check for Emergency SOS
  const emergencyTerms = [
    'तड़प रहा', 'अचानक गिर गया', 'सांस फूल', 'जहर', 'मर रहा',
    'बहुत खून', 'तुरंत डॉक्टर', 'इमरजेंसी', 'emergency', 'dying',
    'poison', 'unconscious', 'बेहोश', 'बेहोशी'
  ];
  if (emergencyTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.EMERGENCY,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: true,
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: true,
      description: 'Critical life-threatening animal condition.'
    };
  }

  // 3. Check for Simple Greetings
  const greetingTerms = [
    'नमस्ते', 'नमस्कार', 'राम-राम', 'राम राम', 'प्रणाम', 'hello', 'hi',
    'hey', 'गुड मॉर्निंग', 'शुभ प्रभात', 'kem cho', 'sat sri akal',
    'सलाम', 'आप कैसे हैं', 'how are you'
  ];
  const isGreetingOnly =
    greetingTerms.some((t) => q.includes(t)) &&
    !/(बुखार|बीमार|दवा|इलाज|दूध|टीका|गांठ|दाने)/i.test(q) &&
    q.length < 35;
  if (isGreetingOnly) {
    return {
      intent: INTENTS.GREETING_SIMPLE,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: false,
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: false,
      description: 'Farmer initiated a casual greeting.'
    };
  }

  // 4. Check for Disease Follow-Up (referring to previous diagnosis or treatment)
  const hasMedicalHistory = Boolean(diagnosis && (diagnosis.possibleCondition || diagnosis.predictedDisease));
  const followupTerms = [
    'इलाज क्या है', 'दवा बताओ', 'दवा कौन सी', 'दवाई', 'घाव कैसे',
    'गांठें कब', 'ठीक कब', 'यह ठीक कैसे', 'इसका क्या करें',
    'क्या यह फैलेगा', 'क्या दूसरी गायों', 'घरेलू उपचार', 'treatment',
    'cure', 'medicine', 'contagious'
  ];
  const isDirectFollowup = hasMedicalHistory && followupTerms.some((t) => q.includes(t));
  const mentionsAnimalInTreatment =
    animalName && q.includes(animalName) && /(इलाज|दवा|बीमार|हालत|तबीयत|संभाल)/i.test(q);

  if (isDirectFollowup || mentionsAnimalInTreatment) {
    return {
      intent: INTENTS.DISEASE_FOLLOWUP,
      shouldIncludeDiagnosis: true,
      shouldIncludeAnimal: true,
      shouldIncludeAlerts: true,
      shouldIncludeHelpline: true,
      description: 'Follow-up regarding previously diagnosed medical condition.'
    };
  }

  // 5. Check for Vaccination Inquiries
  const vaccineTerms = [
    'टीका', 'टीके', 'टीकाकरण', 'वैक्सीन', 'वैक्सीनेशन', 'लसीकरण',
    'लस', 'vaccin', 'fmd टीका', 'गलघोंटू', 'लंगड़ा बुखार',
    'ब्रूसीलोसिस', 'पीपीआर', 'camp', 'शिविर'
  ];
  if (vaccineTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.VACCINATION_INQUIRY,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: true,
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: false,
      description: 'Inquiry regarding vaccination schedules and camp locations.'
    };
  }

  // 6. Check for Government Schemes / Subsidies / Financial
  const schemeTerms = [
    'योजना', 'सब्सिडी', 'सबसिडी', 'क्रेडिट कार्ड', 'kcc', 'pkcc',
    'लोन', 'ऋण', 'बीमा', 'गोकुल मिशन', 'अनुदान', 'मुआवजा',
    'subsidy', 'scheme', 'insurance', 'loan'
  ];
  if (schemeTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.GOVERNMENT_SCHEME,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: false,
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: false,
      description: 'Inquiry regarding government schemes, subsidies, and credit.'
    };
  }

  // 7. Check for General Animal Husbandry (Milk, feed, breeding, management)
  const husbandryTerms = [
    'दूध', 'मिल्क', 'दूध उत्पादन', 'दूध कैसे बढ़ाएं', 'फैट', 'snf',
    'चारा', 'आहार', 'खुराक', 'साइलेज', 'खली', 'चोकर', 'बिनौला',
    'मिनरल मिक्स्चर', 'पोषाहार', 'नस्ल', 'गाभिन', 'गर्भावस्था',
    'प्रसव', 'सीमन', 'कृत्रिम गर्भाधान', 'बाड़ा', 'गोठा', 'सफाई',
    'खिलाना', 'खिलाएं', 'खिलाया', 'milk', 'feed', 'fodder', 'silage',
    'nutrition', 'fat', 'breed', 'pregnancy'
  ];
  if (husbandryTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.GENERAL_HUSBANDRY,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: Boolean(animal && (q.includes(animalName) || /(मेरी गाय|मेरी भैंस|पशु)/i.test(q))),
      shouldIncludeAlerts: false,
      shouldIncludeHelpline: false,
      description: 'Livestock management, milk yield, feed nutrition, or breeding.'
    };
  }

  // 8. Check for New Clinical Symptoms / Disease
  const symptomTerms = [
    'बुखार', 'चारा नहीं', 'भूख नहीं', 'लार', 'खुर', 'घाव', 'दस्त',
    'गोबर', 'पतला', 'आंखों से पानी', 'सूजन', 'गांठ', 'दाने', 'चेचक',
    'धब्बे', 'मवाद', 'कीड़े', 'लंगड़ा', 'fever', 'cough', 'wound',
    'diarrhea', 'pus', 'swelling', 'nodule', 'rash', 'limping'
  ];
  if (symptomTerms.some((t) => q.includes(t))) {
    return {
      intent: INTENTS.NEW_SYMPTOM_OR_DISEASE,
      shouldIncludeDiagnosis: false,
      shouldIncludeAnimal: true,
      shouldIncludeAlerts: true,
      shouldIncludeHelpline: true,
      description: 'Farmer reported active clinical signs or sickness.'
    };
  }

  // 9. Default: General query
  return {
    intent: INTENTS.GENERAL_QUERY,
    shouldIncludeDiagnosis: false,
    shouldIncludeAnimal: false,
    shouldIncludeAlerts: false,
    shouldIncludeHelpline: false,
    description: 'General question without explicit medical markers.'
  };
}

/**
 * Returns tailored contextual action buttons based on detected intent.
 */
function getSuggestedActionsForIntent(intent, district = 'Nagpur', language = 'hi') {
  const langKey = (language || 'hi').split('-')[0].toLowerCase();

  switch (intent) {
    case INTENTS.JOKE_OR_HUMOR:
      return [
        langKey === 'mr' ? 'दुग्धोत्पादन कसे वाढवावे?' : langKey === 'en' ? 'How to increase milk yield?' : 'दूध उत्पादन कैसे बढ़ाएं?',
        langKey === 'mr' ? 'संतुलित पशु आहार कसा असावा?' : langKey === 'en' ? 'Balanced animal nutrition' : 'पशुओं का संतुलित आहार',
        langKey === 'mr' ? 'लसीकरण वेळापत्रक' : langKey === 'en' ? 'Vaccination Schedule' : 'टीकाकरण समय-सारणी'
      ];

    case INTENTS.GREETING_SIMPLE:
      return [
        langKey === 'mr' ? 'जनावरांची आरोग्य तपासणी करा' : langKey === 'en' ? 'Check animal symptoms' : 'बीमारी के लक्षण जांचें',
        langKey === 'mr' ? 'दुग्ध उत्पादन वाढवण्याचे उपाय' : langKey === 'en' ? 'Boost milk production' : 'दूध बढ़ाने के उपाय',
        langKey === 'mr' ? 'शासकीय योजनांची माहिती' : langKey === 'en' ? 'Govt livestock schemes' : 'पशुपालन सरकारी योजनाएं'
      ];

    case INTENTS.GENERAL_HUSBANDRY:
      return [
        langKey === 'mr' ? 'सायलेज (मुरघास) बनवण्याची पद्धत' : langKey === 'en' ? 'Silage making process' : 'साइलेज बनाने की विधि',
        langKey === 'mr' ? 'दूध फॅट आणि SNF वाढवा' : langKey === 'en' ? 'Improve milk FAT & SNF' : 'दूध में फैट और SNF कैसे बढ़ाएं',
        langKey === 'mr' ? 'गाभण जनावरांची काळजी' : langKey === 'en' ? 'Pregnant cow care' : 'गाभिन गाय की देखभाल'
      ];

    case INTENTS.VACCINATION_INQUIRY:
      return [
        {
          type: 'vaccination',
          label: langKey === 'mr' ? `${district} मधील लसीकरण शिबिरे` : langKey === 'en' ? `Vaccination Camps in ${district}` : `${district} में टीकाकरण शिविर`,
          url: `/vaccination?district=${encodeURIComponent(district)}`
        },
        langKey === 'mr' ? 'FMD (लाळ्या-खुरकूत) लस वेळ' : langKey === 'en' ? 'FMD vaccine timing' : 'FMD (खुरपका) टीका कब लगवाएं?',
        langKey === 'mr' ? 'लाळ्या आणि घटसर्प लस' : langKey === 'en' ? 'HS & BQ vaccines' : 'गलघोंटू (HS) और लंगड़ा (BQ) टीका'
      ];

    case INTENTS.GOVERNMENT_SCHEME:
      return [
        langKey === 'mr' ? 'पशु किसान क्रेडिट कार्ड (KCC)' : langKey === 'en' ? 'Pashu Kisan Credit Card (KCC)' : 'पशु किसान क्रेडिट कार्ड (KCC)',
        langKey === 'mr' ? 'दुग्ध व्यवसाय सबसिडी योजना' : langKey === 'en' ? 'Dairy subsidy schemes' : 'डेयरी फार्मिंग सब्सिडी',
        langKey === 'mr' ? 'पशुधन विमा कसा काढावा?' : langKey === 'en' ? 'Livestock insurance guide' : 'पशु बीमा कैसे कराएं?'
      ];

    case INTENTS.DISEASE_FOLLOWUP:
    case INTENTS.NEW_SYMPTOM_OR_DISEASE:
    case INTENTS.EMERGENCY:
      return [
        {
          type: 'helpline',
          label: langKey === 'mr' ? 'आपत्कालीन हेल्पलाइन १९६२' : langKey === 'en' ? 'Emergency Helpline 1962' : 'आपातकालीन हेल्पलाइन 1962',
          tel: '1962'
        },
        {
          type: 'vet',
          label: langKey === 'mr' ? 'नजीकचे पशुवैद्यक शोधा' : langKey === 'en' ? 'Find Local Veterinarians' : 'नजदीकी डॉक्टर खोजें',
          url: '/veterinary-help'
        },
        langKey === 'mr' ? 'घरातील प्राथमिक उपचार' : langKey === 'en' ? 'First-aid care tips' : 'घरेलू प्राथमिक उपचार'
      ];

    default:
      return [
        langKey === 'mr' ? 'लक्षणे तपासा' : langKey === 'en' ? 'Check symptoms' : 'लक्षण जांचें',
        langKey === 'mr' ? 'दुग्ध उत्पादन उपाय' : langKey === 'en' ? 'Milk yield tips' : 'दूध उत्पादन उपाय',
        langKey === 'mr' ? 'लसीकरण वेळापत्रक' : langKey === 'en' ? 'Vaccination schedule' : 'टीकाकरण सारणी'
      ];
  }
}

/**
 * High quality intent-aware fallback responses when Gemini LLM is unreachable.
 */
function getFallbackForIntent({ intent, query, language = 'hi', animal = null, diagnosis = null, district = 'Nagpur' }) {
  const langKey = (language || 'hi').split('-')[0].toLowerCase();
  const animalName = animal?.name || (langKey === 'mr' ? 'जनावर' : langKey === 'en' ? 'animal' : 'पशु');

  if (intent === INTENTS.JOKE_OR_HUMOR) {
    if (langKey === 'mr') {
      return {
        reply: `शेतकरी दादा, एक छान विनोद ऐका:\n\nएकदा डॉक्टर शेतकर्‍याला म्हणाले, "तुमच्या गायीला रोज सकाळी गाणी ऐकवा, दूध जास्त देईल!"\nशेतकरी म्हणाला, "डॉक्टर साहेब, गाणी ऐकून ती नाचायला लागली तर दूध न सांडता लोणीच निघेल ना!" 😄`,
        riskLevel: 'Low',
        keyAdvice: ['हसत राहा आणि जनावरांची काळजी घ्या.']
      };
    }
    if (langKey === 'en') {
      return {
        reply: `Here's a lighthearted farm joke for you:\n\nA farmer bought a high-tech talking cow. The buyer asked the cow, "Do you give 20 liters of milk?"\nThe cow whispered: "Sir, I do all the talking here, the buffalo does the hard work!" 😄`,
        riskLevel: 'Low',
        keyAdvice: ['Keep smiling and take good care of your livestock.']
      };
    }
    return {
      reply: `किसान भाई, एक मजेदार चुटकुला सुनिए:\n\nएक बार डॉक्टर ने किसान से कहा: "अपनी गाय को संगीत सुनाया करो, वो खुश होकर ज्यादा दूध देगी!"\nकिसान बोला: "अरे डॉक्टर साहब, पिछली बार गाना सुनाया तो वो नाचने लगी और दूध का सीधे मक्खन बन गया!" 😄`,
      riskLevel: 'Low',
      keyAdvice: ['मुस्कुराते रहिए और पशुओं की अच्छी देखभाल कीजिए।']
    };
  }

  if (intent === INTENTS.GREETING_SIMPLE) {
    if (langKey === 'mr') {
      return {
        reply: `नमस्कार शेतकरी मित्र! मी आपला "किसान साथी" AI सहाय्यक आहे. आज मी आपल्या जनावरांचे आरोग्य, चारा, दुग्धोत्पादन किंवा शासकीय योजनांबद्दल काय मदत करू?`,
        riskLevel: 'Low',
        keyAdvice: ['आपण कोणताही प्रश्न विचारू शकता.']
      };
    }
    if (langKey === 'en') {
      return {
        reply: `Hello farmer friend! I am your "Kisan Saathi" AI assistant. How can I help you today with animal health, feed, milk production, or government schemes?`,
        riskLevel: 'Low',
        keyAdvice: ['Feel free to ask any livestock question.']
      };
    }
    return {
      reply: `राम-राम किसान भाई! मैं आपका "किसान साथी" AI सहायक हूं। आज मैं आपके पशुओं की सेहत, आहार, दूध उत्पादन या सरकारी योजनाओं में क्या मदद कर सकता हूं?`,
      riskLevel: 'Low',
      keyAdvice: ['आप बेझिझक कोई भी सवाल पूछ सकते हैं।']
    };
  }

  if (intent === INTENTS.GENERAL_HUSBANDRY) {
    if (langKey === 'mr') {
      return {
        reply: `दुग्ध उत्पादन आणि जनावरांचे पोषण वाढवण्यासाठी महत्त्वाचे उपाय:\n\n• संतुलित आहार: हिरवा चारा (६०%) आणि सुका चारा (४०%) सोबत दररोज ५० ग्रॅम मिनरल मिक्स्चर द्या.\n• स्वच्छ पाणी: एका दुभत्या गायीला दिवसाला ७० ते ८० लिटर स्वच्छ पिण्याचे पाणी उपलब्ध करा.\n• नियमित वेळेवर दोहन: दररोज ठरलेल्या वेळी आणि शांत वातावरणात दूध काढा.\n• ऊर्जा खाद्य: सरकी पेंड किंवा मका भरडा खाद्यात समाविष्ट करा.`,
        riskLevel: 'Low',
        keyAdvice: ['दररोज ५० ग्रॅम मिनरल मिक्स्चर द्या.', 'भरपूर स्वच्छ पिण्याचे पाणी उपलब्ध करा.']
      };
    }
    if (langKey === 'en') {
      return {
        reply: `Practical steps to boost milk yield and livestock nutrition:\n\n• Balanced Diet: Feed 60% green fodder and 40% dry fodder, supplemented with 50g mineral mixture daily.\n• Clean Water: Provide 70-80 liters of clean, cool drinking water per milking cow daily.\n• Bypass Fat & Energy: Include crushed maize, mustard cake, or bypass fat in lactation concentrate.\n• Fixed Milking Routine: Milk at the exact same hours every day in a stress-free shed.`,
        riskLevel: 'Low',
        keyAdvice: ['Add 50g mineral mixture daily', 'Ensure 24/7 clean drinking water']
      };
    }
    return {
      reply: `दूध उत्पादन और पशु स्वास्थ्य बढ़ाने के व्यावहारिक उपाय:\n\n• संतुलित आहार: ६०% हरा चारा और ४०% सूखा चारा दें। आहार में रोजाना ५० ग्राम मिनरल मिक्सचर और ३० ग्राम नमक जरूर मिलाएं।\n• स्वच्छ जल: एक दुधारू गाय को रोजाना ७०-८० लीटर साफ पानी की जरूरत होती है।\n• ऊर्जावान दाना मिश्रण: चोकर, खली (सरसों/बिनौला) और दलिया का संतुलित मिश्रण खिलाएं।\n• समय पर दोहन: रोजाना एक निश्चित समय पर ही दूध दुहें और बाड़े को साफ व सूखा रखें।`,
      riskLevel: 'Low',
      keyAdvice: ['रोजाना ५० ग्राम मिनरल मिक्सचर खिलाएं।', '२४ घंटे साफ पीने का पानी उपलब्ध रखें।']
    };
  }

  if (intent === INTENTS.VACCINATION_INQUIRY) {
    if (langKey === 'mr') {
      return {
        reply: `जनावरांचे महत्त्वाचे लसीकरण वेळापत्रक:\n\n१. FMD (लाळ्या-खुरकूत): वर्षातून २ वेळा (सप्टेंबर आणि मार्च).\n२. घटसर्प (HS) व फऱ्या (BQ): पावसाळ्यापूर्वी (मे-जून).\n३. ब्रुसेलोसिस: ४ ते ८ महिन्यांच्या कालवडींना एकदाच.\n४. PPR (शेळ्यांसाठी): वर्षातून एकदा.\n\nआपल्या नजीकच्या सरकारी पशुवैद्यकीय दवाखान्यात जाऊन मोफत लस टोचून घ्या.`,
        riskLevel: 'Low',
        keyAdvice: ['पावसाळ्यापूर्वी घटसर्प व फऱ्या लस द्या.', 'FMD लस दर ६ महिन्यांनी टोचा.']
      };
    }
    if (langKey === 'en') {
      return {
        reply: `Essential Livestock Vaccination Schedule:\n\n1. FMD (Foot & Mouth): Bi-annually (September and March).\n2. HS (Haemorrhagic Septicaemia) & BQ (Blackleg): Pre-monsoon (May-June).\n3. Brucellosis: Once in lifetime for female calves aged 4-8 months.\n4. PPR (Sheep & Goats): Annually.\n\nVisit your local government veterinary clinic for free seasonal vaccination camps.`,
        riskLevel: 'Low',
        keyAdvice: ['Administer HS/BQ vaccines before monsoons.', 'Give FMD booster every 6 months.']
      };
    }
    return {
      reply: `पशुओं का आवश्यक टीकाकरण कैलेंडर:\n\n१. खुरपका-मुंहपका (FMD): साल में २ बार (सितंबर और मार्च).\n२. गलघोंटू (HS) और लंगड़ा बुखार (BQ): मानसून से ठीक पहले (मई-जून).\n३. ब्रूसीलोसिस: ४ से ८ महीने की बछड़ियों को जीवन में एक बार.\n४. पीपीआर (बकरियों के लिए): साल में एक बार.\n\nटीका हमेशा स्वस्थ पशु को ही लगवाएं और सरकारी पशु चिकित्सालय के शिविरों का लाभ लें।`,
      riskLevel: 'Low',
      keyAdvice: ['मानसून से पहले गलघोंटू और लंगड़ा टीका लगवाएं।', 'बीमार पशु को टीका न लगाएं।']
    };
  }

  if (intent === INTENTS.GOVERNMENT_SCHEME) {
    if (langKey === 'mr') {
      return {
        reply: `पशुपालकांसाठी प्रमुख शासकीय योजना:\n\n• पशु किसान क्रेडिट कार्ड (KCC): गायीसाठी ₹४०,००० आणि म्हशीसाठी ₹६०,००० पर्यंत ४% व्याजावर खेळते भांडवल.\n• राष्ट्रीय गोकुळ मिशन: देशी गोवंशाच्या पैदासीसाठी आणि दुग्ध व्यवसायासाठी ५०% पर्यंत सबसिडी.\n• पशुधन विमा योजना: अनुसूचित जाती/जमातीसाठी ७०% आणि इतर प्रवर्गासाठी ५०% हप्त्याची सबसिडी.\n\nअर्ज करण्यासाठी गावातील राष्ट्रीयीकृत बँक किंवा पंचायत समितीच्या पशुसंवर्धन विभागाशी संपर्क साधा.`,
        riskLevel: 'Low',
        keyAdvice: ['KCC साठी नजीकच्या बँकेत अर्ज करा.', 'पशु विमा योजनेचा लाभ घ्या.']
      };
    }
    if (langKey === 'en') {
      return {
        reply: `Key Government Schemes for Dairy & Livestock Farmers:\n\n• Pashu Kisan Credit Card (KCC): Working capital loan up to ₹40,000 per cow / ₹60,000 per buffalo at just 4% interest.\n• Rashtriya Gokul Mission: Up to 50% capital subsidy for establishing indigenous dairy farms and breed centers.\n• Livestock Insurance Scheme: 50% to 70% premium subsidy to insure cattle against sudden death or illness.\n\nApply at your nearest nationalized bank branch or block veterinary development office.`,
        riskLevel: 'Low',
        keyAdvice: ['Apply for KCC at your rural bank', 'Get cattle insured under subsidy']
      };
    }
    return {
      reply: `पशुपालकों के लिए प्रमुख सरकारी योजनाएं:\n\n• पशु किसान क्रेडिट कार्ड (KCC): प्रति गाय ₹४०,००० और प्रति भैंस ₹६०,००० तक का लोन मात्र ४% ब्याज दर पर उपलब्ध।\n• राष्ट्रीय गोकुल मिशन: देशी नस्ल सुधार और आधुनिक डेयरी फार्म स्थापित करने पर ५०% तक का अनुदान (सब्सिडी)।\n• पशुधन बीमा योजना: पशु की असामयिक मृत्यु पर सुरक्षा; प्रीमियम पर ५०% से ७०% तक सरकारी सब्सिडी।\n\nआवेदन के लिए नजदीकी बैंक शाखा या ब्लॉक के पशुपालन प्रसार अधिकारी से संपर्क करें।`,
      riskLevel: 'Low',
      keyAdvice: ['KCC कार्ड बनवाकर कम ब्याज पर लोन लें।', 'पशुओं का सरकारी सब्सिडी पर बीमा कराएं।']
    };
  }

  // Clinical Disease Follow-up or New Symptom fallback
  const condition = diagnosis?.possibleCondition || 'लक्षण';
  if (langKey === 'mr') {
    return {
      reply: `${animalName ? `${animalName} च्या ` : ''}${condition} बाबत प्राथमिक मार्गदर्शन:\n\n१. बाधित जनावराला सावलीत, हवेशीर जागेत वेगळे ठेवा.\n२. अंगावर कडुनिंबाच्या पाल्याचे पाणी फवारा जेणेकरून माश्या बसणार नाहीत.\n३. ओआरएस (ORS) किंवा गुळ-मिठाचे कोमट पाणी पाजा.\n४. डॉक्टरांच्या सल्ल्याशिवाय कोणतीही मानवी औषधे देऊ नका. टोल-फ्री १९६२ वर संपर्क साधा.`,
      riskLevel: diagnosis?.riskLevel || 'Moderate',
      keyAdvice: ['जनावराला वेगळे ठेवा.', 'कडुनिंब अर्काचा वापर करा.', '१९६२ वर संपर्क करा.']
    };
  }
  if (langKey === 'en') {
    return {
      reply: `Clinical guidance for ${animalName ? `${animalName}'s ` : ''}${condition}:\n\n1. Keep the animal strictly isolated in a clean, ventilated shed.\n2. Apply neem decoction or herbal spray to prevent flies on skin wounds.\n3. Provide clean lukewarm water with oral electrolytes (ORS).\n4. Do not administer unprescribed medicines. Contact veterinary helpline 1962 promptly.`,
      riskLevel: diagnosis?.riskLevel || 'Moderate',
      keyAdvice: ['Isolate affected animal', 'Apply neem repellent', 'Call 1962 for on-ground vet']
    };
  }

  return {
    reply: `${animalName ? `${animalName} के ` : ''}${condition} के संदर्भ में प्राथमिक देखभाल:\n\n१. पशु को तुरंत साफ, हवादार और छायादार बाड़े में अलग रखें।\n२. शरीर पर मक्खियों और कीड़ों से बचाव हेतु नीम के पानी का छिड़काव करें।\n३. ताजा पानी में हल्का ओआरएस (ORS) या गुड़-नमक का घोल मिलाकर पिलाएं।\n४. बिना डॉक्टर की पर्ची के कोई दवा न दें। अधिक सहायता के लिए तुरंत 1962 पर कॉल करें।`,
    riskLevel: diagnosis?.riskLevel || 'Moderate',
    keyAdvice: ['बीमार पशु को अलग रखें।', 'नीम के पानी से घाव साफ रखें।', '1962 पर संपर्क करें।']
  };
}

module.exports = {
  INTENTS,
  detectIntent,
  getSuggestedActionsForIntent,
  getFallbackForIntent
};
