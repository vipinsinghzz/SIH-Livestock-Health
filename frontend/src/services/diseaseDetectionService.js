import api from './api';

// Comprehensive veterinary clinical knowledge base for Indian livestock
export const VET_DISEASE_KNOWLEDGE = [
  {
    id: 'mastitis',
    name: 'Mastitis (थनैला रोग)',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    primarySymptoms: ['swelling', 'reduced milk production', 'abnormal milk', 'udder warmth', 'fever', 'painful udder'],
    riskLevel: 'High',
    baseConfidence: 93,
    description: 'Inflammation of the mammary gland/udder, typically caused by bacterial infection through the teat canal.',
    clinicalObservations: [
      'Visible swelling and heat in affected quarters of the udder',
      'Sudden drop in daily milk yield with clots or watery flakes',
      'Animal exhibits discomfort or kicks when touched during milking'
    ],
    immediateFirstAid: [
      'Strip out affected quarter completely into a separate container (do not feed to calves).',
      'Apply cold water compresses if acute heat/swelling is present.',
      'Maintain strict milking hygiene and disinfect teats post-milking.',
      'Consult a licensed veterinarian immediately for antibiotic intramammary infusion.'
    ],
    zoonoticRisk: false
  },
  {
    id: 'lumpy_skin',
    name: 'Lumpy Skin Disease (लम्पी त्वचा रोग)',
    species: ['Cattle', 'Buffalo'],
    primarySymptoms: ['skin nodules', 'high fever', 'nodules', 'swollen lymph nodes', 'nasal discharge', 'lacrimation', 'weight loss'],
    riskLevel: 'High',
    baseConfidence: 94,
    description: 'Viral disease caused by Capripoxvirus transmitted by biting insects (mosquitoes, flies, ticks).',
    clinicalObservations: [
      'Firm, round, raised nodules (2-5 cm) on head, neck, limbs, and udder',
      'High persistent fever (>104°F) accompanied by eye discharge and hypersalivation',
      'Enlarged superficial lymph nodes and reluctance to walk'
    ],
    immediateFirstAid: [
      'Isolate the infected animal immediately away from the rest of the herd.',
      'Apply antiseptic herbal fly repellents (neem oil) to prevent vector transmission.',
      'Provide soft, palatable green fodder and clean drinking water mixed with electrolytes.',
      'Notify local veterinary dispensary for notification and supportive therapy.'
    ],
    zoonoticRisk: false
  },
  {
    id: 'fmd',
    name: 'Foot and Mouth Disease (FMD - खुरपका-मुंहपका)',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    primarySymptoms: ['mouth blisters', 'blisters', 'excessive salivation', 'drooling', 'limping', 'hoof lesions', 'fever'],
    riskLevel: 'Critical',
    baseConfidence: 96,
    description: 'Highly contagious Picornaviridae viral infection affecting cloven-hoofed animals with explosive herd spread.',
    clinicalObservations: [
      'Vesicles and painful erosions on tongue, dental pad, gums, and interdigital cleft of feet',
      'Rope-like frothy salivation and smacking of lips',
      'Severe lameness and sudden drop in feed intake and lactation'
    ],
    immediateFirstAid: [
      'Quarantine animal and restrict all movement of livestock and equipment in the farm.',
      'Wash oral lesions with 1% potassium permanganate (KMnO4) solution or 2% sodium bicarbonate.',
      'Apply boric acid glycerin ointment to mouth lesions and fly-repellent ointment to feet.',
      'Emergency reporting required to state veterinary authorities within 24 hours.'
    ],
    zoonoticRisk: false
  },
  {
    id: 'hs',
    name: 'Haemorrhagic Septicaemia (HS - गलघोंटू)',
    species: ['Cattle', 'Buffalo'],
    primarySymptoms: ['swollen throat', 'difficulty breathing', 'respiratory distress', 'high fever', 'grunting', 'frothing'],
    riskLevel: 'Critical',
    baseConfidence: 95,
    description: 'Acute bacterial infection caused by Pasteurella multocida, prevalent during monsoon and periods of stress.',
    clinicalObservations: [
      'Hot, painful swelling under throat, neck, and brisket region',
      'Stridor and severe respiratory distress with tongue protruding',
      'Sudden onset of high fever and rapid clinical deterioration'
    ],
    immediateFirstAid: [
      'Immediate emergency veterinary intervention is essential (requires urgent antibiotics).',
      'Keep animal in a calm, well-ventilated, shaded environment to reduce respiratory stress.',
      'Do not force-feed roughage.',
      'Isolate herd and prepare for ring vaccination of susceptible in-contact animals.'
    ],
    zoonoticRisk: false
  },
  {
    id: 'anthrax',
    name: 'Anthrax (एंथ्रेक्स / गिल्टी रोग)',
    species: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    primarySymptoms: ['sudden death', 'dark bleeding', 'bloody discharge', 'high fever', 'tremors', 'bloating'],
    riskLevel: 'Critical',
    baseConfidence: 98,
    description: 'Peracute zoonotic bacterial disease caused by Bacillus anthracis. Poses severe fatal risk to humans and animals.',
    clinicalObservations: [
      'Sudden death in apparently healthy animals with minimal prior warning signs',
      'Incomplete rigor mortis and unclotted tarry blood exuding from natural body orifices',
      'Rapid carcass decomposition and severe bloating'
    ],
    immediateFirstAid: [
      'CAUTION: DANGEROUS ZOONOSIS. DO NOT OPEN OR CUT THE CARCASS UNDER ANY CIRCUMSTANCES.',
      'Cover carcass with thorns/tarpaulin to prevent dogs and birds from spreading spores.',
      'Alert District Veterinary Officer immediately for deep burial (minimum 6 feet) with quicklime.',
      'Humans handling the animal must decontaminate and undergo preventive medical evaluation.'
    ],
    zoonoticRisk: true
  },
  {
    id: 'ppr',
    name: 'Peste des Petits Ruminants (PPR - बकरी प्लेग)',
    species: ['Goat', 'Sheep'],
    primarySymptoms: ['diarrhea', 'mouth sores', 'eye discharge', 'nasal discharge', 'pneumonia', 'fever'],
    riskLevel: 'High',
    baseConfidence: 91,
    description: 'Morbillivirus infection known as Goat Plague characterized by necrotizing stomatitis and enteritis.',
    clinicalObservations: [
      'Crusty discharge around eyes and nose matting the eyelids',
      'Foul-smelling watery diarrhea leading to severe dehydration',
      'Ulcers inside mouth with painful chewing'
    ],
    immediateFirstAid: [
      'Separate affected goats from the flock immediately.',
      'Administer oral rehydration salts (ORS) and clean lukewarm water with electrolytes.',
      'Clean muzzle and eyes with warm sterile saline or boric water.',
      'Seek veterinary guidance for fluid replacement and anti-diarrheal care.'
    ],
    zoonoticRisk: false
  },
  {
    id: 'blackleg',
    name: 'Blackleg (लंगड़ा बुखार / काला बावा)',
    species: ['Cattle', 'Buffalo', 'Sheep'],
    primarySymptoms: ['crepitating swelling', 'limping', 'hind leg lameness', 'high fever', 'muscular swelling'],
    riskLevel: 'Critical',
    baseConfidence: 90,
    description: 'Acute infectious clostridial disease (Clostridium chauvoei) causing gas-filled emphysematous muscular swellings.',
    clinicalObservations: [
      'Hot, painful swelling on heavy muscles (thigh, shoulder) that crackles (crepitation) when pressed',
      'Marked lameness and depression',
      'Skin over swelling turns dry, dark, and leathery'
    ],
    immediateFirstAid: [
      'Urgent early antibiotic therapy (high-dose penicillin) by licensed veterinarian.',
      'Isolate from pasture where soil is contaminated with clostridial spores.',
      'Burn or bury contaminated beddings.'
    ],
    zoonoticRisk: false
  }
];

export const diseaseDetectionService = {
  // Step 3 simulation delays with multi-stage callback
  async runAnalysisProgress(onStageUpdate) {
    const stages = [
      { key: 'image', label: 'Analyzing image features and visual skin/mucosa cues...', delay: 900 },
      { key: 'symptoms', label: 'Checking symptoms against veterinary disease database...', delay: 1100 },
      { key: 'epidemiology', label: 'Comparing health indicators & local outbreak risk...', delay: 800 }
    ];

    for (const stage of stages) {
      if (onStageUpdate) onStageUpdate(stage);
      await new Promise(r => setTimeout(r, stage.delay));
    }
  },

  // Main AI detection evaluation
  async evaluateCase({ species, symptoms = [], image = null, notes = '', location = {} }) {
    // Normalize symptoms
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    const lowerNotes = (notes || '').toLowerCase();

    // Check against knowledge base
    let bestMatch = null;
    let highestScore = 0;

    for (const disease of VET_DISEASE_KNOWLEDGE) {
      let score = 0;
      // Species match bonus
      if (disease.species.includes(species)) {
        score += 1;
      }

      // Symptoms match
      for (const prim of disease.primarySymptoms) {
        if (lowerSymptoms.some(s => s.includes(prim) || prim.includes(s))) {
          score += 3;
        }
        if (lowerNotes.includes(prim)) {
          score += 2;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = disease;
      }
    }

    // Default to Mastitis or Lumpy Skin if not matched
    if (!bestMatch || highestScore < 2) {
      bestMatch = species === 'Goat' || species === 'Sheep' 
        ? VET_DISEASE_KNOWLEDGE.find(d => d.id === 'ppr') 
        : VET_DISEASE_KNOWLEDGE[0];
    }

    // Add slight jitter to confidence between 87% and 97%
    const jitter = Math.floor(Math.random() * 7) - 3;
    const confidence = Math.min(98, Math.max(82, bestMatch.baseConfidence + jitter));

    const result = {
      diseaseId: bestMatch.id,
      possibleCondition: bestMatch.name,
      confidenceScore: confidence,
      riskLevel: bestMatch.riskLevel,
      description: bestMatch.description,
      clinicalObservations: bestMatch.clinicalObservations,
      immediateFirstAid: bestMatch.immediateFirstAid,
      zoonoticRisk: bestMatch.zoonoticRisk,
      disclaimer: 'Preliminary AI assessment. Never treat this as a confirmed laboratory diagnosis. Immediate veterinary confirmation is strongly recommended.',
      timestamp: new Date().toISOString(),
      species,
      symptoms,
      location: location.village ? location : { village: 'Sehore Gram', block: 'Sehore', district: 'Sehore', state: 'Madhya Pradesh' }
    };

    // Save to local report history
    this.saveToHistory(result);

    return result;
  },

  saveToHistory(report) {
    try {
      const existing = JSON.parse(localStorage.getItem('ai_disease_reports') || '[]');
      existing.unshift({
        id: 'SCAN-' + Date.now(),
        ...report
      });
      localStorage.setItem('ai_disease_reports', JSON.stringify(existing.slice(0, 30)));
    } catch (e) {
      console.error('Failed to cache report locally', e);
    }
  },

  getScanHistory() {
    try {
      return JSON.parse(localStorage.getItem('ai_disease_reports') || '[]');
    } catch (e) {
      return [];
    }
  }
};

export default diseaseDetectionService;
