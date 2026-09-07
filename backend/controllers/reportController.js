const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const LabReferral = require('../models/LabReferral');
const { runTriage } = require('../services/aiSimulator');
const { generateAdvisoryForReport } = require('../services/advisoryGenerator');

// Generate unique readable Case ID
const generateCaseId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${dateStr}-${randomSuffix}`;
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
      mortalityCount,
      affectedCount,
      location,
      photos,
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

    // 1. Create Report
    const report = await Report.create({
      caseId,
      reporterId: req.user._id,
      animalId: animalId || null,
      herdId: herdId || null,
      species,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      mortalityCount: parseInt(mortalityCount, 10) || 0,
      affectedCount: parseInt(affectedCount, 10) || 1,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        village: location.village,
        block: location.block,
        district: location.district || req.user.district || 'Pune'
      },
      photos: photos || [],
      reporterContact: reporterContact || {
        phone: req.user.phone,
        name: req.user.name
      },
      notes: notes || '',
      status: 'Reported'
    });

    // 2. Trigger Mock AI Triage
    const triageData = await runTriage({
      species: report.species,
      symptoms: report.symptoms,
      mortalityCount: report.mortalityCount,
      affectedCount: report.affectedCount,
      location: report.location,
      notes: report.notes
    }, report._id);

    // 3. Save TriageResult
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

    // 4. Update Report status to Triaged
    report.status = 'Triaged';
    await report.save();

    // 5. Automatically create advisory for high/moderate risk
    let advisory = null;
    try {
      advisory = await generateAdvisoryForReport(report, triageResult);
    } catch (advErr) {
      console.error('[Report Controller] Advisory creation notice:', advErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted and triaged successfully.',
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
      limit = 100,
      page = 1
    } = req.query;

    const query = {};

    // Role-based scoping: farmers only see their own submitted reports by default
    if (req.user.role === 'farmer' && !outbreakOnly) {
      query.reporterId = req.user._id;
    }

    if (district) {
      query['location.district'] = new RegExp(district, 'i');
    }
    if (block) {
      query['location.block'] = new RegExp(block, 'i');
    }
    if (status) {
      query.status = status;
    }
    if (species) {
      query.species = species;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const reports = await Report.find(query)
      .populate('reporterId', 'name phone role village')
      .populate('animalId', 'tagId breed age')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Attach TriageResults to reports
    const reportIds = reports.map(r => r._id);
    const triageResults = await TriageResult.find({ reportId: { $in: reportIds } }).lean();

    const triageMap = {};
    triageResults.forEach(tr => {
      triageMap[tr.reportId.toString()] = tr;
    });

    let results = reports.map(r => ({
      ...r,
      triageResult: triageMap[r._id.toString()] || null
    }));

    // Post-filter by riskLevel or outbreakOnly if requested
    if (riskLevel) {
      results = results.filter(r => r.triageResult && r.triageResult.riskLevel.toLowerCase() === riskLevel.toLowerCase());
    }
    if (outbreakOnly === 'true') {
      results = results.filter(r => r.triageResult && r.triageResult.outbreakFlag === true);
    }

    const totalCount = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: results.length,
      total: totalCount,
      page: parseInt(page, 10),
      reports: results
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
    const report = await Report.findById(req.params.id)
      .populate('reporterId', 'name phone role village block district email')
      .populate('animalId')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found with given ID.'
      });
    }

    const triageResult = await TriageResult.findOne({ reportId: report._id }).lean();
    const labReferrals = await LabReferral.find({ reportId: report._id }).populate('collectedBy', 'name role').lean();

    res.status(200).json({
      success: true,
      report: {
        ...report,
        triageResult,
        labReferrals
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

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    report.status = status;
    if (notes) {
      report.notes = report.notes ? `${report.notes}\n[${new Date().toISOString()}] ${req.user.name}: ${notes}` : `[${new Date().toISOString()}] ${req.user.name}: ${notes}`;
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      report
    });
  } catch (error) {
    next(error);
  }
};
