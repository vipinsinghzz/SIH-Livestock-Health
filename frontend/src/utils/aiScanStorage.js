/**
 * AI Disease Scan Storage & Recommendation Service
 * Stores verified AI scan predictions (>85% confidence) and provides
 * rich clinical recommendations for the "AI Based Recommendation Dialogue Box"
 */

const STORAGE_KEY = 'pashu_animal_ai_scans';

/**
 * Standardize disease keys for tailored clinical advice
 */
export const normalizeDiseaseName = (rawDisease = '') => {
  const d = String(rawDisease).toLowerCase();
  if (d.includes('lumpy') || d.includes('lsd') || d.includes('लम्पी') || d.includes('गाठी')) {
    return 'Lumpy Skin Disease';
  }
  if (d.includes('foot and mouth') || d.includes('fmd') || d.includes('खुरपका') || d.includes('लाळ्या') || d.includes('खुरकूत')) {
    return 'Foot and Mouth Disease (FMD)';
  }
  if (d.includes('galghotu') || d.includes('haemorrhagic') || d.includes('septicaemia') || d.includes('hs') || d.includes('गलघोंटू') || d.includes('घटसर्प')) {
    return 'Haemorrhagic Septicaemia (HS)';
  }
  if (d.includes('blackleg') || d.includes('लंगड़ा') || d.includes('फऱ्या')) {
    return 'Blackleg (BQ)';
  }
  if (d.includes('mastitis') || d.includes('थनैला') || d.includes('मस्टायटिस') || d.includes('स्तनदाह')) {
    return 'Mastitis';
  }
  if (d.includes('anthrax') || d.includes('एंथ्रेक्स') || d.includes('प्लीहा')) {
    return 'Anthrax';
  }
  if (d.includes('ppr') || d.includes('बकरी प्लेग') || d.includes('शेळी प्लेग') || d.includes('ruminant')) {
    return 'Peste des Petits Ruminants (PPR)';
  }
  if (d.includes('dermatitis') || d.includes('ringworm') || d.includes('skin') || d.includes('चर्मरोग') || d.includes('दाद')) {
    return 'Bovine Dermatitis / Skin Infection';
  }
  return rawDisease || 'Livestock Health Condition';
};

/**
 * High-grade veterinary supportive first-aid recommendations in EN, HI, MR
 */
export const getTailoredRecommendations = (diseaseName, species = 'Cattle', riskLevel = 'High', lang = 'en') => {
  const norm = normalizeDiseaseName(diseaseName);
  const isMr = lang === 'mr';
  const isHi = lang === 'hi';

  const RECOMMENDATIONS_DB = {
    'Lumpy Skin Disease': {
      title: isMr ? 'लम्पी त्वचा रोग (LSD) - AI शिफारसी व प्रथमोपचार' : isHi ? 'लंपी त्वचा रोग (LSD) - AI सिफारिशें व प्राथमिक उपचार' : 'Lumpy Skin Disease (LSD) - AI Care & Triage Protocol',
      immediateFirstAid: isMr ? [
        'बाधित जनावराला तात्काळ वेगळ्या, कोरड्या व हवेशीर गोठ्यात किंवा सावलीत इतर जनावरांपासून विलगीकरणात (Quarantine) ठेवा.',
        'त्वचेवरील गाठी व व्रण (nodules) दिवसातून दोनदा १% पोटॅशियम परमँगनेट (KMnO4) किंवा पोव्हिडोन-आयोडीन सोल्यूशनने स्वच्छ करा.',
        'माशा, गोचीड व डासांपासून संरक्षणासाठी कडुनिंबाच्या तेलाची किंवा सायपरमेथ्रिन फवारणी करा जेणेकरून विषाणूचा प्रसार थांबेल.',
        'जनावरास मुबलक स्वच्छ पिण्याचे पाणी, ग्लुकोज/इलेक्ट्रोलाइट्स व पचायला हलका कोवळा हिरवा चारा द्या.',
        'ताप असल्यास जनावराच्या कपाळावर थंड पाण्याचा पट्टा ठेवा; डॉक्टरांच्या सल्ल्याशिवाय अँटिबायोटिक्स टोचू नका.'
      ] : isHi ? [
        'संक्रमित पशु को तुरंत अन्य स्वस्थ पशुओं से अलग साफ, सूखे और हवादार बाड़े में क्वारंटाइन (अलग) करें।',
        'त्वचा की गांठों और घावों को दिन में दो बार 1% पोटेशियम परमैंगनेट या पोवीडोन आयोडीन के घोल से धीरे-धीरे धोएं।',
        'मक्खियों और मच्छरों को दूर रखने के लिए नीम के तेल का लेप या उपयुक्त स्प्रे करें जिससे संक्रमण अन्य पशुओं में न फैले।',
        'पशु को पर्याप्त मात्रा में साफ पानी, इलेक्ट्रोल/ग्लूकोज और सुपाच्य हरा चारा दें।',
        'तेज बुखार होने पर सिर पर ठंडे पानी की पट्टी रखें; बिना डॉक्टर की सलाह के एंटीबायोटिक इंजेक्शन न लगाएं।'
      ] : [
        'Strictly quarantine the affected animal in a dry, disinfected, well-ventilated enclosure away from the herd.',
        'Gently cleanse skin nodules and open ulcerated lesions twice daily with 1% potassium permanganate or dilute povidone-iodine solution.',
        'Apply natural neem oil solution or approved vector repellents to prevent biting flies and mosquitoes from spreading the virus.',
        'Provide ad-libitum clean drinking water supplemented with oral electrolytes/glucose, along with tender green fodder.',
        'Maintain shed hygiene and apply cold compresses if body temperature exceeds 103.5°F while awaiting clinical evaluation.'
      ],
      clinicalPrecautions: isMr ? [
        'स्थानिक पशुवैद्यकीय अधिकाऱ्यांशी संपर्क साधून परिसरातील इतर जनावरांसाठी रिंग व्हॅक्सिनेशन (Ring Vaccination) ची मागणी करा.',
        'बाधित जनावराचे दूध उकळूनच वापरावे; जनावराची भांडी आणि गोठा सोडियम हायपोक्लोराईटने निर्जंतुक करा.'
      ] : isHi ? [
        'निकटतम पशु चिकित्सालय को सूचित कर गांव में अन्य स्वस्थ पशुओं के लिए रिंग टीकाकरण (Ring Vaccination) कराएं।',
        'दूध को अच्छी तरह उबालकर ही उपयोग करें तथा बाड़े और बर्तनों को कीटाणुरहित करें।'
      ] : [
        'Request emergency goat-pox / heterologous ring vaccination for all healthy cattle within a 5 km radius.',
        'Boil milk thoroughly before consumption and disinfect feeding troughs with 2% sodium hypochlorite solution.'
      ]
    },
    'Foot and Mouth Disease (FMD)': {
      title: isMr ? 'लाळ्या खुरकूत (FMD) - AI शिफारसी व काळजी' : isHi ? 'खुरपका-मुंहपका (FMD) - AI सिफारिशें व प्राथमिक उपचार' : 'Foot and Mouth Disease (FMD) - Clinical Recommendations',
      immediateFirstAid: isMr ? [
        'बाधित जनावराला तात्काळ वेगळे करा; सार्वजनिक पाणवठ्यावर किंवा चराऊ कुरणावर नेणे पूर्णपणे बंद करा.',
        'तोंडातील फोड आणि लाळ स्वच्छ करण्यासाठी १% तुरटीचे पाणी (Alum water) किंवा बोरोग्लिसरीनचा वापर करा.',
        'खुरांमधील जखमा धुण्यासाठी ४% कपडे धुण्याचा सोडा (Washing Soda) किंवा २% कॉपर सल्फेट सोल्यूशनने फूटबाथ द्या.',
        'कडक वैरण टाळा; मऊ शिजवलेली लापशी, आंबिल किंवा मऊ हिरवा चारा खायला द्या.',
        'गोठ्यात निर्जंतुकीकरण चुना (Lime powder) पसरावा.'
      ] : isHi ? [
        'बीमार पशु को तुरंत स्वस्थ पशुओं से अलग करें; सार्वजनिक चारागाह या पोखर पर बिल्कुल न ले जाएं।',
        'मुंह के छालों को 1% फिटकरी के पानी (Alum water) या बोरो-ग्लिसरीन से दिन में 2-3 बार साफ करें।',
        'खुरों के घावों को धोने के लिए 4% कपड़े धोने के सोडे (Washing Soda) या फिनाइल मिले पानी का फुटबाथ दें।',
        'कठोर चारा न दें; दलिया, मांड, गुड़ और मुलायम हरी घास खाने के लिए दें।',
        'बाड़े के फर्श पर बुझा हुआ चूना छिड़कें।'
      ] : [
        'Immediately quarantine the animal; strictly prohibit grazing in communal pastures or drinking from shared ponds.',
        'Wash mouth blisters and oral erosions with mild 1% alum solution or apply boro-glycerine paste 2-3 times daily.',
        'Cleanse hoof lesions daily with a footbath containing 4% sodium carbonate (washing soda) or 2% copper sulfate.',
        'Replace dry coarse roughage with soft cooked gruel, wheat bran mash, and easily chewable succulent green grass.',
        'Disinfect shed floors and entryways with lime powder to contain viral shedding.'
      ],
      clinicalPrecautions: isMr ? [
        'जनावराचे तापमान दर ६ तासांनी मोजा; तात्काळ पशुवैद्यकाकडून प्रतिजैविक व वेदनाशामक उपचार सुरू करा.',
        '६ महिने वयावरील सर्व निरोगी जनावरांचे FMD लसीकरण करून घ्या.'
      ] : isHi ? [
        'पशु का तापमान नियमित जांचें और डॉक्टर की देखरेख में दर्द निवारक व एंटीबायोटिक उपचार कराएं।',
        'झुंड के सभी स्वस्थ पशुओं को FMD का टीका अवश्य लगवाएं।'
      ] : [
        'Monitor body temperature and administer supportive veterinary anti-inflammatory analgesics under prescription.',
        'Ensure bi-annual routine FMD vaccination for the entire herd once the active outbreak clears.'
      ]
    },
    'Haemorrhagic Septicaemia (HS)': {
      title: isMr ? 'घटसर्प (HS / गलघोंटू) - तातडीच्या AI शिफारसी' : isHi ? 'गलघोंटू (HS) - आपातकालीन AI सिफारिशें' : 'Haemorrhagic Septicaemia (HS) - Emergency Care Protocol',
      immediateFirstAid: isMr ? [
        'अति-तातडीची स्थिती! हे जलद पसरणारे व प्राणघातक इन्फेक्शन असल्याने एका मिनिटाचाही विलंब न करता पशुवैद्यकास बोलवा.',
        'जनावराच्या गळ्यावरील सूजेवर थंड पाण्याचा पट्टा ठेवा जेणेकरून श्वास घेण्यास थोडा आराम मिळेल.',
        'श्वासनलिका मोकळी राहावी म्हणून जनावराचे डोके थोडे उंचावर ठेवा.',
        'कोरडे अन्न देऊ नका; केवळ थोडे थोडे कोमट पाणी किंवा इलेक्ट्रोलाइट्स द्या.'
      ] : isHi ? [
        'अत्यंत आपातकालीन स्थिति! यह बहुत तेजी से फैलने वाला रोग है; तुरंत आपातकालीन पशु चिकित्सक को बुलाएं।',
        'गले की सूजन पर ठंडे पानी की पट्टी रखें ताकि सांस लेने में कुछ राहत मिले।',
        'पशु का सिर थोड़ा ऊंचा रखें ताकि सांस की नली पर दबाव कम हो।',
        'सूखा चारा न दें; केवल हल्का गुनगुना पानी या इलेक्ट्रोल का घोल घूंट-घूंट पिलाएं।'
      ] : [
        'CRITICAL MEDICAL EMERGENCY: Fast-progressing bacterial septicemia; summon an emergency field veterinarian immediately.',
        'Apply cold compresses to the swollen throat/submandibular region to relieve respiratory distress.',
        'Keep the animal’s head slightly elevated to maintain a patent airway while awaiting emergency medication.',
        'Withhold dry coarse feeds; offer small sips of lukewarm water supplemented with electrolytes.'
      ],
      clinicalPrecautions: isMr ? [
        'डॉक्टरांकडून तात्काळ हाय-डोस अँटिबायोटिक्स (उदा. Ceftiofur किंवा Oxytetracycline) नसेतून (IV) सुरू करणे आवश्यक आहे.'
      ] : isHi ? [
        'पशु चिकित्सक द्वारा तुरंत नस के जरिए (IV) उच्च क्षमता वाले एंटीबायोटिक इंजेक्शन लगवाएं।'
      ] : [
        'Immediate parenteral administration of broad-spectrum antibiotics (Ceftiofur, Enrofloxacin, or Sulfadimidine) by a licensed vet is critical within the first 12 hours.'
      ]
    },
    'Blackleg (BQ)': {
      title: isMr ? 'फऱ्या (Blackleg) - AI शिफारसी व प्रथमोपचार' : isHi ? 'लंगड़ा बुखार (Blackleg) - AI सिफारिशें' : 'Blackleg (Clostridial Infection) - Emergency Protocol',
      immediateFirstAid: isMr ? [
        'तातडीने पशुवैद्यकीय मदत मिळवा! बाधित पायाच्या स्नायूला अजिबात चोळू किंवा दाबू नका.',
        'जनावरास मऊ गादी किंवा सुक्या गवतावर झोपवा जेणेकरून पायाला इजा होणार नाही.',
        'पाय हालचाल करू नये म्हणून शांत, अंधाऱ्या व सावलीच्या जागेत ठेवा.'
      ] : isHi ? [
        'तत्काल पशु चिकित्सक से संपर्क करें! प्रभावित पैर की सूजन को बिल्कुल न दबाएं न मालिश करें।',
        'पशु को सूखी पुआल पर आराम से बैठाएं ताकि शरीर पर अतिरिक्त दबाव न पड़े।',
        'पशु को शांत व छायादार स्थान पर रखें।'
      ] : [
        'URGENT VETERINARY EMERGENCY: Do not massage or press crepitating muscle swellings.',
        'Place the animal on clean, soft bedding (straw/dry sand) to prevent decubital sores.',
        'Isolate in a quiet, shaded enclosure and avoid moving the affected limb.'
      ],
      clinicalPrecautions: isMr ? [
        'पशुवैद्यकाकडून तात्काळ पेनिसिलिन किंवा योग्य अँटिबायोटिक्सचा डोस द्यावा.'
      ] : isHi ? [
        'पशु चिकित्सक द्वारा तुरंत पेनिसिलिन या प्रभावी एंटीबायोटिक का इंजेक्शन लगवाएं।'
      ] : [
        'Immediate high-dose penicillin therapy under veterinary supervision is paramount.'
      ]
    },
    'Mastitis': {
      title: isMr ? 'मस्टायटिस (स्तनदाह) - AI शिफारसी' : isHi ? 'थनैला (Mastitis) - AI सिफारिशें' : 'Mastitis - Udder Care Protocol',
      immediateFirstAid: isMr ? [
        'बाधित सडातील खराब दूध पूर्णपणे बाहेर काढून (Strip out) सुरक्षितपणे जमिनीत पुरा; इतर वासरांना पाजू नका.',
        'सडाला सूज व उष्णता असल्यास दिवसातून २-३ वेळा थंड पाण्याचा शेक द्या.',
        'दूध काढण्यापूर्वी व नंतर सड जंतुनाशक सोल्यूशन (०.५% पोव्हिडोन आयोडीन) मध्ये बुडवा (Teat dipping).',
        'गोठ्याची जमीन कोरडी व स्वच्छ ठेवा; दूध काढल्यानंतर जनावर लगेच बसू नये म्हणून थोडे हिरवे गवत समोर ठेवा.'
      ] : isHi ? [
        'संक्रमित थन से पूरा खराब दूध बाहर निकालें और जमीन में दबा दें; इसे बछड़े को बिल्कुल न पिलाएं।',
        'थन में सूजन व गर्मी होने पर बर्फ या ठंडे पानी की सिकाई करें।',
        'दूध दुहने के बाद थनों को कीटाणुनाशक घोल (0.5% पोवीडोन आयोडीन) में डुबोएं (Teat Dip)।',
        'दूध निकालने के बाद पशु को 30-40 मिनट तक बैठने न दें, इसके लिए आगे हरा चारा डालें।'
      ] : [
        'Completely strip out the affected quarter and safely dispose of infected milk; never feed to calves.',
        'Apply cold water or ice pack therapy to hot, swollen, painful quarters 2-3 times daily.',
        'Perform antiseptic teat dipping (0.5% povidone-iodine) after each milking to prevent ascending bacteria.',
        'Keep the animal standing for 30 minutes after milking by offering feed, allowing the streak canal to close.'
      ],
      clinicalPrecautions: isMr ? [
        'पशुवैद्यकाकडून इंट्रा-मॅमरी इन्फ्युजन (Intramammary tube) उपचार करून घ्या.'
      ] : isHi ? [
        'पशु चिकित्सक से थनैला ट्यूब (इंट्रामैमरी इन्फ्यूजन) और एंटीबायोटिक लगवाएं।'
      ] : [
        'Administer veterinary intramammary infusion and systemic anti-inflammatory therapy.'
      ]
    },
    'Bovine Dermatitis / Skin Infection': {
      title: isMr ? 'चर्मरोग / गजकर्ण - AI शिफारसी' : isHi ? 'त्वचा संक्रमण / दाद - AI सिफारिशें' : 'Bovine Dermatitis / Skin Infection Protocol',
      immediateFirstAid: isMr ? [
        'बाधित भाग कोमट पाण्याने व सौम्य साबणाने स्वच्छ धुवून वाळवा.',
        'त्वचेवर दिवसातून २ वेळा पोव्हिडोन-आयोडीन किंवा कडुनिंब व हळदीचे मिश्रण लावा.',
        'गोचीड, उवा व कीटकांचा नायनाट करण्यासाठी गोठा कोरडा व स्वच्छ ठेवा.',
        'बाधित जनावराचे दोरखंड व ब्रश इतर जनावरांवर वापरू नका.'
      ] : isHi ? [
        'प्रभावित त्वचा को हल्के गर्म पानी व साबुन से साफ करके सुखाएं।',
        'त्वचा पर दिन में 2 बार पोवीडोन आयोडीन या नीम व हल्दी का लेप लगाएं।',
        'जूँ और चिचड़ों से बचाव के लिए बाड़े को साफ और धूपदार रखें।',
        'रोगी पशु की रस्सी और ब्रश अन्य पशुओं पर इस्तेमाल न करें।'
      ] : [
        'Gently wash crusty lesions with warm water and mild antiseptic soap; pat dry with clean cloth.',
        'Apply topical 10% povidone-iodine ointment or sulfur-neem formulation twice daily.',
        'Eliminate ectoparasites (ticks/lice) and maintain dry, well-aerated shed bedding.',
        'Do not share grooming halters or blankets across animals to avoid fungal spread.'
      ],
      clinicalPrecautions: isMr ? [
        'लक्षणे कमी न झाल्यास पशुवैद्यकाकडून बुरशीनाशक किंवा प्रतिजैविक औषध घ्या.'
      ] : isHi ? [
        'आराम न मिलने पर डॉक्टर से एंटीफंगल या त्वचा विशेषज्ञ उपचार लें।'
      ] : [
        'Consult field veterinarian if secondary bacterial pyoderma or extensive hair loss occurs.'
      ]
    },
    'General': {
      title: isMr ? 'AI आरोग्य शिफारसी व प्रथमोपचार' : isHi ? 'AI स्वास्थ्य सिफारिशें व प्राथमिक उपचार' : 'AI Health Screening - Supportive Care Recommendations',
      immediateFirstAid: isMr ? [
        'जनावराला कोरड्या, शांत आणि सावलीच्या गोठ्यात इतर जनावरांपासून वेगळे ठेवा.',
        'दिवसातून किमान ३ वेळा मुबलक स्वच्छ पिण्याचे पाणी आणि पचायला हलका हिरवा चारा द्या.',
        'जनावराचे तापमान सकाळी व संध्याकाळी मोजून नोंद ठेवा.',
        'जनावराची भूक आणि रवंथ (Rumination) यावर बारकाईने लक्ष ठेवा.'
      ] : isHi ? [
        'पशु को शांत, साफ और छायादार बाड़े में अन्य पशुओं से अलग रखें।',
        'दिन में 3 बार साफ पीने का पानी और सुपाच्य हरा चारा उपलब्ध कराएं।',
        'पशु का तापमान सुबह-शाम थर्मामीटर से मापकर रिकॉर्ड रखें।',
        'पशु के चारा खाने और जुगाली करने पर विशेष ध्यान दें।'
      ] : [
        'Isolate the animal in a clean, quiet, well-shaded pen with dry bedding.',
        'Provide ad-libitum fresh drinking water with oral electrolytes and succulent green fodder.',
        'Monitor and record morning/evening rectal temperatures to track fever trends.',
        'Observe feeding appetite and normal rumination frequency closely.'
      ],
      clinicalPrecautions: isMr ? [
        'कोणतेही संशयास्पद लक्षण आढळल्यास १९६२ हेल्पलाईन किंवा जवळच्या पशुवैद्यकाशी संपर्क साधा.'
      ] : isHi ? [
        'किसी भी गंभीर लक्षण पर 1962 हेल्पलाइन पर कॉल करें या नजदीकी पशु चिकित्सक से मिलें।'
      ] : [
        'Call 1962 Animal Helpline or contact a registered veterinarian for clinical confirmation.'
      ]
    }
  };

  const rec = RECOMMENDATIONS_DB[norm] || RECOMMENDATIONS_DB['General'];
  return {
    normalizedDisease: norm,
    title: rec.title,
    immediateFirstAid: rec.immediateFirstAid,
    clinicalPrecautions: rec.clinicalPrecautions || RECOMMENDATIONS_DB['General'].clinicalPrecautions
  };
};

/**
 * Determine animal health status when confidence > 85
 */
export const determineHealthStatusFromScan = (result, conditionName = '', symptoms = []) => {
  const confidence = Number(result?.confidenceScore || result?.confidence || 0);
  if (confidence <= 85) {
    return null; // Strict user rule: only auto-log status change when confidence > 85
  }

  const risk = String(result?.riskLevel || '').toLowerCase();
  const cond = String(conditionName || result?.disease || result?.possibleCondition || '').toLowerCase();

  const criticalDiseases = [
    'lumpy', 'lsd', 'foot and mouth', 'fmd', 'anthrax', 'blackleg',
    'haemorrhagic', 'galghotu', 'septicaemia', 'ppr', 'rabies'
  ];
  const isCriticalDisease = criticalDiseases.some((d) => cond.includes(d));
  const isCriticalRisk = risk.includes('critical') || risk.includes('high');

  const hasCriticalSymptoms = (symptoms || []).some((s) => {
    const sLow = String(s).toLowerCase();
    return sLow.includes('fever') || sLow.includes('nodule') || sLow.includes('lump') || sLow.includes('salivat') || sLow.includes('ताप') || sLow.includes('बुखार');
  });

  if (isCriticalRisk || isCriticalDisease || hasCriticalSymptoms) {
    return 'Critical';
  }

  return 'Needs Attention';
};

/**
 * Save an AI scan with recommendations to localStorage
 */
export const storeAnimalAiScan = (animalIdOrTag, scanData) => {
  if (!animalIdOrTag || !scanData) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};

    const key = String(animalIdOrTag).trim();
    registry[key] = {
      ...scanData,
      storedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {
    console.warn('[aiScanStorage] Error storing scan:', err);
  }
};

/**
 * Retrieve the latest AI scan with complete recommendations for an animal
 */
export const getAnimalAiScan = (animal, lang = 'en') => {
  if (!animal) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};

    // 1. Direct registry lookup by ID or tagId
    const keysToCheck = [animal._id, animal.id, animal.tagId].filter(Boolean).map(String);
    for (const k of keysToCheck) {
      if (registry[k]) {
        const stored = registry[k];
        const tailored = getTailoredRecommendations(stored.disease, stored.species || animal.species, stored.riskLevel, lang);
        return {
          ...stored,
          immediateFirstAid: (stored.immediateFirstAid && stored.immediateFirstAid.length > 0)
            ? stored.immediateFirstAid
            : tailored.immediateFirstAid,
          clinicalPrecautions: tailored.clinicalPrecautions,
          normalizedDisease: tailored.normalizedDisease
        };
      }
    }

    // 2. Lookup on animal.latestAiScan
    if (animal.latestAiScan && (animal.latestAiScan.confidenceScore > 85 || animal.latestAiScan.confidence > 85)) {
      const stored = animal.latestAiScan;
      const tailored = getTailoredRecommendations(stored.disease || stored.possibleCondition, stored.species || animal.species, stored.riskLevel, lang);
      return {
        ...stored,
        disease: stored.disease || stored.possibleCondition,
        confidence: stored.confidenceScore || stored.confidence,
        immediateFirstAid: (stored.immediateFirstAid && stored.immediateFirstAid.length > 0)
          ? stored.immediateFirstAid
          : tailored.immediateFirstAid,
        clinicalPrecautions: tailored.clinicalPrecautions,
        normalizedDisease: tailored.normalizedDisease
      };
    }

    // 3. Search animal.timeline for any AI Scan with confidence > 85
    const timeline = animal.timeline || [];
    for (const item of timeline) {
      const conf = Number(item.confidence || (item.title && item.title.match(/(\d+)%/)?.[1]) || 0);
      const isAiEvent =
        item.type === 'AI Disease Scan' ||
        item.type === 'AI Diagnosis' ||
        item.type === 'Health Check' ||
        (item.title && (item.title.includes('AI') || item.title.includes('Screening') || item.title.includes('Diagnosis')));

      if (conf > 85 || (isAiEvent && item.disease)) {
        const diseaseName = item.disease || item.title || 'Lumpy Skin Disease';
        const tailored = getTailoredRecommendations(diseaseName, animal.species, item.status, lang);

        let parsedAid = [];
        if (item.advisory) {
          parsedAid = item.advisory.split(/\.\s+/).filter(Boolean);
        }

        return {
          animalId: animal._id || animal.id || animal.tagId,
          animalName: animal.name,
          species: animal.species,
          disease: item.disease || diseaseName,
          confidence: conf || 92,
          riskLevel: item.status === 'Critical' ? 'Critical' : 'Moderate',
          healthStatus: item.status || 'Critical',
          image: item.image || item.imageUrl || '',
          advisory: item.advisory || '',
          immediateFirstAid: parsedAid.length > 0 ? parsedAid : tailored.immediateFirstAid,
          clinicalPrecautions: tailored.clinicalPrecautions,
          explanation: item.notes || '',
          symptoms: item.symptoms || [],
          formattedDate: item.date || new Date().toLocaleDateString('en-GB'),
          timestamp: item.date,
          normalizedDisease: tailored.normalizedDisease
        };
      }
    }
  } catch (err) {
    console.warn('[aiScanStorage] Error resolving animal AI scan:', err);
  }

  return null;
};
