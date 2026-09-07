/**
 * Automatic Advisory Generator
 * Creates English and Hindi alerts when an AI Triage produces Moderate/High/Critical risk
 */
const Advisory = require('../models/Advisory');

// Templates for auto-generated advisories
const ADVISORY_TEMPLATES = {
  'Foot and Mouth Disease (FMD)': {
    en: {
      title: 'Alert: Suspected Foot & Mouth Disease (FMD) in your area',
      message: 'Cases with mouth and hoof blisters and excessive drooling have been reported. Immediately quarantine affected cattle. Disinfect sheds with 4% washing soda solution. Do not share communal grazing grounds.'
    },
    hi: {
      title: 'चेतावनी: आपके क्षेत्र में खुरपका-मुंहपका (FMD) रोग की आशंका',
      message: 'मुंह और खुरों में छाले तथा अत्यधिक लार गिरने के लक्षण पाए गए हैं। प्रभावित पशुओं को तुरंत अलग करें। बाड़ों को 4% कपड़े धोने के सोडे से धोएं। सार्वजनिक चरागाहों में न ले जाएं।'
    }
  },
  'Lumpy Skin Disease (LSD)': {
    en: {
      title: 'Alert: Lumpy Skin Disease (LSD) Detected',
      message: 'Multiple skin nodules and high fever have been reported in livestock. Isolate affected animals, use insect/fly repellents, and register with your local para-vet for ring vaccination.'
    },
    hi: {
      title: 'चेतावनी: लंपी त्वचा रोग (LSD) की पहचान',
      message: 'पशुओं में त्वचा पर गांठें और तेज बुखार की सूचना मिली है। बीमार पशुओं को अलग रखें, मक्खी-मच्छर से बचाएं और पशु चिकित्सक से संपर्क कर टीकाकरण कराएं।'
    }
  },
  'Haemorrhagic Septicaemia (HS)': {
    en: {
      title: 'CRITICAL ALERT: Suspected Haemorrhagic Septicaemia (Galghotu)',
      message: 'Sudden high fever, throat swelling, and breathing difficulty reported. HS is fast-spreading and fatal. Contact the nearest veterinary dispensary immediately for emergency treatment.'
    },
    hi: {
      title: 'अति आवश्यक चेतावनी: गलघोंटू (HS) रोग की गंभीर आशंका',
      message: 'पशुओं में गले की सूजन, तेज बुखार और सांस लेने में कठिनाई देखी गई है। यह रोग जानलेवा हो सकता है। तुरंत नजदीकी पशु औषधालय से आपातकालीन उपचार कराएं।'
    }
  },
  'Anthrax': {
    en: {
      title: 'EMERGENCY BIORISK ALERT: Suspected Anthrax Event',
      message: 'Unexplained sudden livestock mortality reported. DO NOT OPEN CARCASS. Avoid all contact. Notify district animal husbandry helpline immediately. Carcass must be buried deep with quicklime.'
    },
    hi: {
      title: 'आपातकालीन चेतावनी: एंथ्रेक्स (तिल्ली रोग) की आशंका',
      message: 'पशु की अचानक मृत्यु की सूचना है। शव को न चीरें न छुएं। तुरंत जिला पशुपालन विभाग को सूचित करें। शव को चूने के साथ 2 मीटर गहरे गड्ढे में दफनाएं।'
    }
  },
  'Peste des Petits Ruminants (PPR)': {
    en: {
      title: 'Alert: Suspected PPR (Goat Plague) in small ruminants',
      message: 'High fever, mouth sores, and severe diarrhea reported in goats/sheep. Isolate infected herd members, provide clean water with electrolytes, and request ring vaccination.'
    },
    hi: {
      title: 'चेतावनी: बकरियों और भेड़ों में पीपीआर (बकरी प्लेग) की आशंका',
      message: 'बकरियों/भेड़ों में तेज बुखार, मुंह में छाले और दस्त की सूचना है। बीमार पशुओं को अलग रखें, ओआरएस पानी दें और टीकाकरण के लिए पशु डॉक्टर से संपर्क करें।'
    }
  },
  'Avian Influenza': {
    en: {
      title: 'HIGH ALERT: Suspected Avian Influenza in Poultry',
      message: 'Sudden mortality and cyanotic wattles in poultry flocks. Halt bird movement. Wear protective masks/gloves. Contact district poultry surveillance team immediately.'
    },
    hi: {
      title: 'गंभीर चेतावनी: मुर्गियों में बर्ड फ्लू (एवियन इन्फ्लूएंजा) की आशंका',
      message: 'मुर्गियों में अचानक मौत और कलगी का नीला पड़ना देखा गया है। पक्षियों का परिवहन रोकें। मास्क और दस्ताने पहनें तथा तुरंत पशुपालन विभाग को रिपोर्ट करें।'
    }
  }
};

async function generateAdvisoryForReport(report, triageResult) {
  try {
    if (!['Moderate', 'High', 'Critical'].includes(triageResult.riskLevel) && !triageResult.outbreakFlag) {
      return null;
    }

    const topDisease = triageResult.suspectedDiseases?.[0]?.name || 'General Livestock Alert';
    const template = ADVISORY_TEMPLATES[topDisease] || {
      en: {
        title: `Health Warning: ${topDisease} in ${report.location.block}`,
        message: `${triageResult.explanation} Recommended Action: ${triageResult.recommendedAction}`
      },
      hi: {
        title: `स्वास्थ्य चेतावनी: ${report.location.block} में ${topDisease} के लक्षण`,
        message: `${triageResult.explanation} अनुशंसित कार्रवाई: ${triageResult.recommendedAction}`
      }
    };

    const advisory = await Advisory.create({
      reportId: report._id,
      title: {
        en: template.en.title,
        hi: template.hi.title
      },
      message: {
        en: template.en.message,
        hi: template.hi.message
      },
      severity: triageResult.riskLevel,
      disease: topDisease,
      targetVillage: report.location.village || 'All',
      targetBlock: report.location.block || 'All',
      targetDistrict: report.location.district || 'Pune',
      issuedBy: 'PashuRakshak AI Surveillance System'
    });

    console.log(`[Advisory] Created advisory (${advisory._id}) for ${topDisease} in ${report.location.block}`);
    return advisory;
  } catch (err) {
    console.error('[Advisory Generator] Error creating advisory:', err.message);
    return null;
  }
}

module.exports = {
  generateAdvisoryForReport,
  ADVISORY_TEMPLATES
};
