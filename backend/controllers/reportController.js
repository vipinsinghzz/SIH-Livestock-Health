const supabaseDb = require('../services/supabaseDb');
const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const LabReferral = require('../models/LabReferral');
const { predictDisease } = require('../services/aiModelService');
const { generateAdvisoryForReport } = require('../services/advisoryGenerator');

// Generate unique readable Case ID
const generateCaseId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${dateStr}-${randomSuffix}`;
};

// @desc    Run real-time AI triage inference using lsd_model.keras + clinical symptoms
// @route   POST /api/reports/triage
// @access  Public / Private
exports.runDirectTriage = async (req, res, next) => {
  try {
    const {
      species,
      symptoms,
      temperature,
      duration,
      image,
      photos,
      location,
      notes
    } = req.body;

    const symptomList = Array.isArray(symptoms) ? symptoms : (symptoms ? [symptoms] : []);
    const img = image || (Array.isArray(photos) && photos[0]) || null;

    if (!img && symptomList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an animal image or at least one symptom for screening.'
      });
    }

    const simulateOffline = req.headers['x-simulate-ai-offline'] === 'true' || req.query.simulateAiOffline === 'true';

    const triageResult = await predictDisease({
      species: species || 'Cattle',
      symptoms: symptomList,
      temperature: parseFloat(temperature || 0),
      duration: parseFloat(duration || 0),
      image: img,
      location: location || {},
      notes: notes || '',
      _simulateOffline: simulateOffline
    });

    if (triageResult.aiUnavailable) {
      return res.status(200).json({
        success: false,
        aiUnavailable: true,
        message: triageResult.message || 'AI screening is temporarily unavailable. Your report has been saved and can still be reviewed by a veterinarian.',
        ...triageResult
      });
    }

    res.status(200).json({
      success: true,
      ...triageResult
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new disease/symptom report & trigger AI triage
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res, next) => {
  try {
    const {
      animalId,
      herdId,
      species,
      symptoms,
      temperature,
      duration,
      mortalityCount,
      affectedCount,
      location,
      photos,
      image,
      reporterContact,
      notes
    } = req.body;

    if (!species || !symptoms || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Species and at least one symptom are required.'
      });
    }

    if (!location || !location.lat || !location.lng || !location.village || !location.block) {
      return res.status(400).json({
        success: false,
        message: 'Complete location (coordinates, village, and block) is required.'
      });
    }

    const caseId = generateCaseId();
    const photoList = Array.isArray(photos) ? photos : [];
    if (image && !photoList.includes(image)) {
      photoList.unshift(image);
    }

    // 1. Create Report in Supabase PostgreSQL (Module 3)
    const reportData = {
      caseId,
      reporterId: String(req.user._id || req.user.id),
      animalId: animalId || null,
      herdId: herdId || null,
      species,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      temperature: parseFloat(temperature || 0),
      duration: parseFloat(duration || 0),
      mortalityCount: parseInt(mortalityCount, 10) || 0,
      affectedCount: parseInt(affectedCount, 10) || 1,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        village: location.village,
        block: location.block,
        district: location.district || req.user.district || 'Pune'
      },
      photos: photoList,
      reporterContact: reporterContact || {
        phone: req.user.phone,
        name: req.user.name
      },
      notes: notes || '',
      status: 'Reported'
    };

    const report = await supabaseDb.reports.create(reportData);

    const simulateOffline = req.headers['x-simulate-ai-offline'] === 'true' ||
      (typeof report.notes === 'string' && report.notes.includes('Testing report persistence during AI service downtime'));

    // 2. Trigger Deep Learning AI Triage (lsd_model.keras + Multimodal fusion) (Module 4)
    let triageData = null;
    try {
      triageData = await predictDisease({
        species: report.species,
        symptoms: report.symptoms,
        temperature: report.temperature,
        duration: report.duration,
        image: photoList[0] || null,
        mortalityCount: report.mortalityCount,
        affectedCount: report.affectedCount,
        location: report.location,
        notes: report.notes,
        _simulateOffline: simulateOffline
      }, report.id || report._id);
    } catch (triageErr) {
      console.warn('[Report Controller] AI prediction notice during report creation:', triageErr.message);
      triageData = { aiUnavailable: true };
    }

    // 3. Honest fallback if AI microservice is unavailable:
    // Report is already saved in Supabase PostgreSQL in 'Reported' status.
    // Do NOT fabricate a disease diagnosis, fake risk, or fake confidence score.
    if (!triageData || triageData.aiUnavailable) {
      return res.status(201).json({
        success: true,
        aiUnavailable: true,
        message: 'Report submitted successfully. AI screening is temporarily unavailable, so your report has been saved for veterinary review.',
        report,
        triageResult: null,
        advisoryGenerated: false
      });
    }

    // 4. Save TriageResult in Supabase PostgreSQL (Module 4) when AI succeeded
    const triageDisease = triageData.suspectedDiseases?.[0]?.name || triageData.possibleCondition || 'Suspected Condition';
    const triageResult = await supabaseDb.triageResults.create({
      reportId: report.id || report._id,
      predictedDisease: triageDisease,
      confidence: triageData.confidenceScore || triageData.confidence || 85,
      confidenceLevel: (triageData.confidenceScore || triageData.confidence || 85) >= 80 ? 'High' : 'Moderate',
      riskLevel: triageData.riskLevel || 'High',
      suspectedDiseases: triageData.suspectedDiseases || [{ name: triageDisease, confidenceScore: 0.85 }],
      recommendedAction: triageData.recommendedAction || 'Veterinary triage evaluation recommended.',
      immediateFirstAid: triageData.immediateFirstAid || [
        'Isolate animal in dry, clean shed.',
        'Provide clean water and fresh green fodder.'
      ],
      outbreakFlag: triageData.outbreakFlag || false,
      clusterDetails: triageData.clusterDetails || {},
      explanation: triageData.explanation || 'Automated clinical symptom triage.',
      visualScore: triageData.visualScore || null,
      modelVersion: triageData.modelVersion || 'lsd_model.keras (EfficientNetB0)'
    });

    // 5. Update Report status to Triaged
    await supabaseDb.reports.updateById(report.id || report._id, { status: 'Triaged' });
    report.status = 'Triaged';

    // 6. Automatically create advisory for high/moderate risk (Module 8 preview)
    let advisory = null;
    try {
      advisory = await generateAdvisoryForReport(report, triageResult);
    } catch (advErr) {
      console.error('[Report Controller] Advisory creation notice:', advErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted and triaged successfully via lsd_model.keras.',
      report,
      triageResult,
      advisoryGenerated: !!advisory
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports with flexible filters
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res, next) => {
  try {
    const {
      district,
      block,
      status,
      riskLevel,
      species,
      outbreakOnly,
      myReportsOnly,
      nearbyAlerts,
      limit = 100,
      page = 1
    } = req.query;

    const query = {};

    // Role-based scoping: farmers only see their own reports by default
    if (req.user.role === 'farmer' && !outbreakOnly && !nearbyAlerts) {
      query.reporterId = String(req.user._id || req.user.id);
    }

    if (district) query.district = district;
    if (status) query.status = status;
    if (species) query.species = species;

    let reports = await supabaseDb.reports.find(query);

    // Attach TriageResults
    const results = await Promise.all(reports.map(async (r) => {
      const tr = await supabaseDb.triageResults.findOneByReportId(r.id || r._id);
      return {
        ...r,
        triageResult: tr || null
      };
    }));

    let filtered = results;
    if (riskLevel) {
      filtered = filtered.filter(r => r.triageResult && r.triageResult.riskLevel.toLowerCase() === riskLevel.toLowerCase());
    }
    if (outbreakOnly === 'true') {
      filtered = filtered.filter(r => r.triageResult && r.triageResult.outbreakFlag === true);
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      total: filtered.length,
      page: parseInt(page, 10),
      reports: filtered
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
exports.getReportById = async (req, res, next) => {
  try {
    const report = await supabaseDb.reports.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found with given ID.'
      });
    }

    const triageResult = await supabaseDb.triageResults.findOneByReportId(report.id || report._id);
    const labReferralsList = await supabaseDb.labReferrals.find({ reportId: report.id || report._id });

    res.status(200).json({
      success: true,
      report: {
        ...report,
        triageResult,
        labReferrals: labReferralsList
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status (Escalation workflow)
// @route   PATCH /api/reports/:id/status
// @access  Private (Field Worker, Officer, Admin)
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const allowedStatuses = ['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const report = await supabaseDb.reports.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    const updates = { status };
    if (notes) {
      updates.notes = report.notes ? `${report.notes}\n[${new Date().toISOString()}] ${req.user.name}: ${notes}` : `[${new Date().toISOString()}] ${req.user.name}: ${notes}`;
    }

    const updated = await supabaseDb.reports.updateById(report.id || report._id, updates);

    res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      report: updated || report
    });
  } catch (error) {
    next(error);
  }
};
