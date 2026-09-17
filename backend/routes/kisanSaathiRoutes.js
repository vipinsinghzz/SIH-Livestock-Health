// Kisan Saathi AI Intelligent Assistant Routes (PS-128)
// Integrates livestock profile, image diagnosis (lsd_model.keras), live NADRES district outbreaks, and Gemini LLM.

const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const nadresService = require('../services/nadresService');
const weatherService = require('../services/weatherService');
const supabaseDb = require('../services/supabaseDb');
const { resolveFarmerProfile } = require('../controllers/animalController');
const { optionalProtect } = require('../middleware/auth');

/**
 * Generates rule-based clinical fallback if LLM is unavailable
 */
function buildClinicalFallback({ query, language = 'hi', animal, diagnosis, symptoms = [], districtAlerts = [], district = 'Nagpur' }) {
  const langKey = (language || 'hi').split('-')[0].toLowerCase();
  const animalName = animal?.name || (langKey === 'en' ? 'your animal' : langKey === 'mr' ? 'आपले जनावर' : 'आपका पशु');
  const hasAlerts = Array.isArray(districtAlerts) && districtAlerts.length > 0;
  const alertNames = hasAlerts ? districtAlerts.map(a => a.diseaseName).join(', ') : '';

  if (langKey === 'mr') {
    let text = `नमस्कार! मी किसान साथी एआय सहाय्यक. `;
    if (animal) {
      text += `${animalName} (${animal.breed || 'जनावर'}, वय ${animal.age || 4} वर्षे) च्या नोंदीनुसार: `;
    }
    if (diagnosis) {
      text += `एआय इमेज तपासणीनुसार ${diagnosis.possibleCondition || 'लक्षणे'} (${diagnosis.confidenceScore || 85}% अचूकता, धोका: ${diagnosis.riskLevel || 'मध्यम'}) चे संकेत आढळले आहेत. `;
    } else if (symptoms.length > 0) {
      text += `निवडलेली लक्षणे (${symptoms.join(', ')}) संसर्गाची शक्यता दर्शवतात. `;
    }
    if (hasAlerts) {
      text += `\n\n⚠️ महत्त्वाचा इशारा: आपल्या ${district} जिल्ह्यात सध्या ${alertNames} चा सक्रिय उद्रेक नोंदवला गेला आहे. इतर जनावरांना तत्काळ वेगळे करा आणि चारा-पाणी वेगळे ठेवा.`;
    }
    text += `\n\nतातडीचे उपाय: जनावराला हवेशीर सावलीत बांधा, स्वच्छ कोमट पाणी द्या. अधिक उपचारासाठी टोल-फ्री क्रमांक 1962 वर पशुवैद्यकीय मदत मिळवा.`;

    return {
      reply: text,
      riskLevel: diagnosis?.riskLevel || (hasAlerts ? 'High' : 'Moderate'),
      keyAdvice: [
        'बाधित जनावराला निरोगी कळपापासून वेगळे करा.',
        'स्वच्छ पिण्याचे पाणी आणि जंतूनाशक फवारणी करा.',
        'पशुसंवर्धन हेल्पलाईन 1962 वर संपर्क साधा.'
      ]
    };
  }

  if (langKey === 'en') {
    let text = `Greetings! I am Kisan Saathi AI Livestock Assistant. `;
    if (animal) {
      text += `For patient ${animalName} (${animal.breed || 'Livestock'}, ${animal.age || 4} yrs): `;
    }
    if (diagnosis) {
      text += `AI image diagnosis indicates ${diagnosis.possibleCondition || 'clinical signs'} (${diagnosis.confidenceScore || 85}% match, Risk: ${diagnosis.riskLevel || 'Moderate'}). `;
    } else if (symptoms.length > 0) {
      text += `Reported symptoms (${symptoms.join(', ')}) suggest possible infectious stress. `;
    }
    if (hasAlerts) {
      text += `\n\n⚠️ District Warning: Active high-risk outbreak of ${alertNames} is reported in ${district} District. Maintain strict biosecurity and prevent herd mixing at community ponds.`;
    }
    text += `\n\nImmediate Actions: Isolate ${animalName} in a clean, shaded pen. Check body temperature and rumen motility. For immediate veterinary assistance, call toll-free 1962 or visit your nearest veterinary clinic.`;

    return {
      reply: text,
      riskLevel: diagnosis?.riskLevel || (hasAlerts ? 'High' : 'Moderate'),
      keyAdvice: [
        'Isolate symptomatic animal immediately in shaded pen.',
        'Disinfect feeding troughs and restrict community grazing.',
        'Contact veterinary helpline 1962 for on-ground inspection.'
      ]
    };
  }

  // Default: Hindi
  let text = `राम-राम! मैं किसान साथी एआई सहायक। `;
  if (animal) {
    text += `${animalName} (${animal.breed || 'पशु'}, उम्र ${animal.age || 4} वर्ष) के संदर्भ में: `;
  }
  if (diagnosis) {
    text += `एआई जांच के अनुसार ${diagnosis.possibleCondition || 'संकेत'} (${diagnosis.confidenceScore || 85}% संभावना, जोखिम: ${diagnosis.riskLevel || 'मध्यम'}) पाए गए हैं। `;
  } else if (symptoms.length > 0) {
    text += `चुने गए लक्षण (${symptoms.join(', ')}) संक्रमण की ओर संकेत करते हैं। `;
  }
  if (hasAlerts) {
    text += `\n\n⚠️ जिला पूर्वचेतावनी: आपके ${district} जिले में इस समय ${alertNames} का उच्च-जोखिम प्रकोप सक्रिय है। अपने पशुओं को सामूहिक चरागाहों और संक्रमित बाड़ों से दूर रखें।`;
  }
  text += `\n\nतत्काल प्राथमिक उपचार: ${animalName} को हवादार छायादार स्थान पर अलग बांधें, ताजा पानी दें। गंभीर स्थिति में तुरंत टोल-फ्री 1962 पर कॉल करें।`;

  return {
    reply: text,
    riskLevel: diagnosis?.riskLevel || (hasAlerts ? 'High' : 'Moderate'),
    keyAdvice: [
      'संक्रमित पशु को तुरंत स्वस्थ पशुओं से अलग करें।',
      'बाड़े और खुरली में चूना या कीटाणुनाशक का छिड़काव करें।',
      'पशु चिकित्सा सहायता के लिए 1962 पर कॉल करें।'
    ]
  };
}

const {
  detectIntent,
  getSuggestedActionsForIntent,
  getFallbackForIntent
} = require('../services/intentService');

// @route   POST /api/kisan-saathi/consult
// @desc    Intelligent personalized clinical consultation combining animal profile, image diagnosis, symptoms, and district alerts
// @access  Public / Optional Auth
router.post('/consult', optionalProtect, async (req, res, next) => {
  try {
    const {
      message,
      query,
      language = 'hi',
      animalId,
      animal: clientAnimal,
      diagnosis,
      symptoms = [],
      district: clientDistrict,
      state: clientState,
      lat,
      lng,
      conversationHistory = []
    } = req.body;

    const userQuery = message || query || '';

    // 1. Resolve animal profile (from Supabase DB if animalId provided, otherwise client payload)
    let resolvedAnimal = null;

    if (animalId) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to consult with an animal ID.'
        });
      }

      let dbAnimal = null;
      try {
        dbAnimal = await supabaseDb.animals.findById(animalId);
      } catch (dbErr) {
        console.error('[KisanSaathiRoutes] Error fetching animal by ID:', dbErr.message);
        return res.status(500).json({
          success: false,
          message: 'Unable to retrieve animal record at this time.'
        });
      }

      if (!dbAnimal) {
        return res.status(404).json({
          success: false,
          message: 'Animal not found.'
        });
      }

      // Role-based Ownership Enforcement: Farmers can only consult for their own animals
      if (req.user.role === 'farmer') {
        const profile = await resolveFarmerProfile(req.user);
        const farmerId = String(profile?.id || req.user.id || req.user._id || '').trim();
        const farmerEmail = (profile?.email || req.user.email || '').toLowerCase().trim();

        const ownerObj = typeof dbAnimal.ownerId === 'object' && dbAnimal.ownerId !== null ? dbAnimal.ownerId : null;
        const animalOwnerId = String(ownerObj?.id || ownerObj?._id || dbAnimal.ownerId || dbAnimal.owner_id || '').trim();
        const animalOwnerEmail = (ownerObj?.email || '').toLowerCase().trim();

        const isOwner = (farmerId && animalOwnerId && farmerId === animalOwnerId) ||
                        (farmerEmail && animalOwnerEmail && farmerEmail === animalOwnerEmail);

        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to consult for this animal.'
          });
        }
      }

      // Authoritative DB record takes precedence over client-supplied animal object
      resolvedAnimal = {
        ...dbAnimal,
        id: dbAnimal.id || dbAnimal._id || animalId,
        tagId: dbAnimal.tagId || dbAnimal.tag_id || null,
        name: dbAnimal.name || null,
        species: dbAnimal.species || null,
        breed: dbAnimal.breed || null,
        age: (dbAnimal.age !== undefined && dbAnimal.age !== null) ? dbAnimal.age : null,
        gender: dbAnimal.gender || null,
        healthStatus: dbAnimal.healthStatus || dbAnimal.health_status || null,
        milkYield: dbAnimal.milkYield || dbAnimal.milkYieldDaily || dbAnimal.milk_yield_daily || null,
        milkYieldDaily: dbAnimal.milkYieldDaily || dbAnimal.milkYield || dbAnimal.milk_yield_daily || null,
        district: dbAnimal.district || null,
        village: dbAnimal.village || null,
        block: dbAnimal.block || null
      };
    } else if (clientAnimal && typeof clientAnimal === 'object') {
      // Backward compatibility: preserve client-supplied animal object if no animalId supplied
      resolvedAnimal = clientAnimal;
    }

    // 2. Detect Intent & Context Relevance
    const intentResult = detectIntent(userQuery, {
      animal: resolvedAnimal,
      diagnosis,
      symptoms,
      conversationHistory
    });

    // 3. Resolve real-time district disease surveillance alerts ONLY if relevant
    let activeDistrict = clientDistrict || resolvedAnimal?.district || req.user?.district || 'Nagpur';
    let activeState = clientState || resolvedAnimal?.state || req.user?.state || 'Maharashtra';
    let districtAlerts = [];

    if (intentResult.shouldIncludeAlerts) {
      try {
        const districtAlertData = await nadresService.getVillageAlerts({
          lat,
          lng,
          district: activeDistrict,
          state: activeState
        });
        activeDistrict = districtAlertData.district || activeDistrict;
        activeState = districtAlertData.state || activeState;
        districtAlerts = districtAlertData.alerts || [];
      } catch (e) {
        console.warn('NADRES alerts fetch error in consult route:', e.message);
      }
    }

    // 4. Fetch live weather context ONLY if clinical alerts relevant
    let weatherData = null;
    if (intentResult.shouldIncludeAlerts) {
      weatherData = await weatherService
        .getLiveWeather({
          lat,
          lng,
          district: activeDistrict,
          state: activeState
        })
        .catch(() => null);
    }

    // 5. Generate intelligent guidance with Gemini LLM
    let aiResponse = null;
    try {
      aiResponse = await geminiService.generatePersonalizedConsultation({
        query: userQuery,
        language,
        animal: resolvedAnimal,
        diagnosis,
        symptoms,
        districtAlerts,
        district: activeDistrict,
        state: activeState,
        weather: weatherData,
        farmerName:
          req.user?.name ||
          (language === 'en' ? 'Farmer' : language === 'mr' ? 'शेतकरी मित्र' : 'किसान साथी'),
        conversationHistory
      });
    } catch (err) {
      console.warn('[KisanSaathiRoutes] Gemini service error, using intent fallback:', err.message);
    }

    // 6. Fallback to intent-aware response if Gemini LLM did not respond
    if (!aiResponse || !aiResponse.reply) {
      const fallback = getFallbackForIntent({
        intent: intentResult.intent,
        query: userQuery,
        language,
        animal: resolvedAnimal,
        diagnosis,
        district: activeDistrict
      });

      aiResponse = {
        success: true,
        reply: fallback.reply,
        riskLevel: fallback.riskLevel,
        keyAdvice: fallback.keyAdvice,
        model: 'veterinary-clinical-engine',
        isAIPowered: false,
        timestamp: new Date().toISOString()
      };
    }

    // 7. Append intent-matched contextual action buttons (no helpline 1962 on jokes/milk production!)
    const suggestedActions = getSuggestedActionsForIntent(
      intentResult.intent,
      activeDistrict,
      language
    );

    res.status(200).json({
      success: true,
      reply: aiResponse.reply,
      riskLevel: aiResponse.riskLevel,
      keyAdvice: aiResponse.keyAdvice || [],
      intent: intentResult.intent,
      model: aiResponse.model,
      isAIPowered: aiResponse.isAIPowered,
      animal: intentResult.shouldIncludeAnimal ? resolvedAnimal : null,
      district: activeDistrict,
      state: activeState,
      districtAlertsCount: districtAlerts.length,
      districtAlerts: intentResult.shouldIncludeAlerts ? districtAlerts.slice(0, 3) : [],
      suggestedActions,
      timestamp: aiResponse.timestamp || new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
