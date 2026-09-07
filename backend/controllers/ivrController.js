const User = require('../models/User');
const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const { runTriage } = require('../services/aiSimulator');
const { generateAdvisoryForReport } = require('../services/advisoryGenerator');

// Common block coordinates in Pune district for voice caller geolocation
const VILLAGE_COORDS = {
  'baramati': { lat: 18.1517, lng: 74.5772, block: 'Baramati' },
  'shirur': { lat: 18.8276, lng: 74.3774, block: 'Shirur' },
  'haveli': { lat: 18.5204, lng: 73.8567, block: 'Haveli' },
  'khed': { lat: 18.8500, lng: 73.9000, block: 'Khed' },
  'indapur': { lat: 18.1167, lng: 75.0333, block: 'Indapur' },
  'default': { lat: 18.5204, lng: 73.8567, block: 'Baramati' }
};

// @desc    IVR / Telephony Webhook stub (Twilio / Exotel compatible)
// @route   POST /api/ivr/webhook
// @access  Public (Webhook)
exports.ivrWebhook = async (req, res, next) => {
  try {
    console.log('[IVR Webhook] Inbound voice call webhook received:', req.body);

    const {
      From, // Caller phone number (e.g. +919876543210)
      CallSid,
      SpeechResult, // Twilio STT transcribed speech
      Transcript, // Exotel / external STT transcript
      SymptomsText, // Form input fallback
      Species,
      Village,
      Block,
      Mortality
    } = req.body;

    const callerPhone = From || req.body.caller || '+919900011223';
    const spokenText = SpeechResult || Transcript || SymptomsText || 'Cow has mouth blisters and drooling saliva with fever';
    const species = Species || 'Cattle';
    const villageName = Village || 'Baramati Rural';
    const blockName = Block || 'Baramati';
    const mortalityCount = parseInt(Mortality, 10) || 0;

    // 1. Locate or create a shadow farmer account for this caller
    let user = await User.findOne({ phone: callerPhone });
    if (!user) {
      user = await User.create({
        name: `IVR Caller (${callerPhone.slice(-4)})`,
        role: 'farmer',
        phone: callerPhone,
        email: `ivr_${Date.now()}@pashurakshak.in`,
        passwordHash: 'ivr_system_caller_no_password',
        village: villageName,
        block: blockName,
        district: 'Pune',
        preferredLanguage: 'hi'
      });
    }

    // 2. Parse symptoms from the transcribed voice text
    const words = spokenText.toLowerCase();
    const parsedSymptoms = [];
    if (words.includes('blister') || words.includes('छाले') || words.includes('घाव')) parsedSymptoms.push('mouth blisters');
    if (words.includes('drool') || words.includes('saliv') || words.includes('लार')) parsedSymptoms.push('excessive salivation');
    if (words.includes('fever') || words.includes('बुखार')) parsedSymptoms.push('high fever');
    if (words.includes('lump') || words.includes('nodule') || words.includes('गांठ')) parsedSymptoms.push('skin lumps');
    if (words.includes('throat') || words.includes('swelling') || words.includes('सूजन')) parsedSymptoms.push('throat swelling');
    if (words.includes('breath') || words.includes('सांस')) parsedSymptoms.push('difficulty breathing');
    if (words.includes('lame') || words.includes('limp') || words.includes('लंगड़ा')) parsedSymptoms.push('lameness');
    if (words.includes('death') || words.includes('मृत्यु') || words.includes('मर')) parsedSymptoms.push('sudden death');

    if (parsedSymptoms.length === 0) {
      parsedSymptoms.push('unspecified symptom reported via IVR: ' + spokenText.slice(0, 50));
    }

    // 3. Resolve location
    const locMatch = VILLAGE_COORDS[blockName.toLowerCase()] || VILLAGE_COORDS.default;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const caseId = `IVR-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Report
    const report = await Report.create({
      caseId,
      reporterId: user._id,
      species,
      symptoms: parsedSymptoms,
      mortalityCount,
      affectedCount: 1,
      location: {
        lat: locMatch.lat + (Math.random() * 0.02 - 0.01),
        lng: locMatch.lng + (Math.random() * 0.02 - 0.01),
        village: villageName,
        block: blockName,
        district: 'Pune'
      },
      photos: [],
      reporterContact: {
        phone: callerPhone,
        name: user.name
      },
      notes: `Reported via IVR Voice System. CallSid: ${CallSid || 'N/A'}. Transcript: "${spokenText}"`,
      status: 'Reported'
    });

    // 5. Trigger Mock AI Triage
    const triageData = await runTriage({
      species: report.species,
      symptoms: report.symptoms,
      mortalityCount: report.mortalityCount,
      location: report.location,
      notes: report.notes
    }, report._id);

    const triageResult = await TriageResult.create({
      reportId: report._id,
      riskLevel: triageData.riskLevel,
      suspectedDiseases: triageData.suspectedDiseases,
      recommendedAction: triageData.recommendedAction,
      outbreakFlag: triageData.outbreakFlag,
      clusterDetails: triageData.clusterDetails,
      explanation: triageData.explanation,
      modelVersion: triageData.modelVersion
    });

    report.status = 'Triaged';
    await report.save();

    await generateAdvisoryForReport(report, triageResult);

    // If caller requested XML (Twilio TwiML)
    const acceptsXml = req.headers.accept && req.headers.accept.includes('xml');
    if (acceptsXml) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="hi-IN">पशुरक्षक में आपका स्वागत है। आपका केस नंबर ${caseId} दर्ज कर लिया गया है। प्रारंभिक जांच में जोखिम स्तर ${triageResult.riskLevel} है। पशु चिकित्सक को सूचित किया गया है।</Say>
</Response>`;
      res.set('Content-Type', 'text/xml');
      return res.send(twiml);
    }

    // Default JSON response
    res.status(201).json({
      success: true,
      message: 'IVR symptom call processed and triaged successfully.',
      caseId,
      callerPhone,
      transcribedText: spokenText,
      parsedSymptoms,
      report,
      triageResult
    });
  } catch (error) {
    next(error);
  }
};
