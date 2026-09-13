const supabaseDb = require('../services/supabaseDb');
const LabReferral = require('../models/LabReferral');
const Report = require('../models/Report');

// @desc    Create a lab sample referral for a case
// @route   POST /api/lab-referrals
// @access  Private (Field Worker, Officer, Admin)
exports.createLabReferral = async (req, res, next) => {
  try {
    const { reportId, sampleType, collectionDate, referredLab, notes } = req.body;

    if (!reportId || !sampleType) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and sample type are required.'
      });
    }

    const report = await supabaseDb.reports.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Associated report not found.'
      });
    }

    // Module 7: Create in Supabase PostgreSQL
    const referral = await supabaseDb.labReferrals.create({
      reportId: report.id || report._id,
      sampleType,
      collectionDate: collectionDate || new Date().toISOString(),
      referredLab: referredLab || 'District Disease Diagnostic Laboratory (DDDL), Pune',
      status: 'Collected',
      collectedBy: String(req.user._id || req.user.id),
      resultSummary: {
        notes: notes || ''
      }
    });

    // Elevate report status to 'Escalated' if it was 'Reported' or 'Triaged'
    if (['Reported', 'Triaged', 'Field Verified'].includes(report.status)) {
      await supabaseDb.reports.updateById(report.id || report._id, { status: 'Escalated' });
    }

    res.status(201).json({
      success: true,
      message: 'Sample collection logged and lab referral generated successfully.',
      referral
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lab referral status and diagnostic results
// @route   PATCH /api/lab-referrals/:id
// @access  Private (Field Worker, Officer, Admin)
exports.updateLabReferral = async (req, res, next) => {
  try {
    const { status, confirmedDisease, notes } = req.body;

    const referral = await LabReferral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Lab referral not found.'
      });
    }

    if (status) referral.status = status;
    if (confirmedDisease || notes) {
      referral.resultSummary = {
        confirmedDisease: confirmedDisease || referral.resultSummary?.confirmedDisease,
        notes: notes || referral.resultSummary?.notes,
        confirmedDate: status === 'Result Confirmed' ? new Date() : referral.resultSummary?.confirmedDate
      };
    }

    await referral.save();

    // If result confirmed, add audit trail to report
    if (status === 'Result Confirmed' && confirmedDisease) {
      const report = await supabaseDb.reports.findById(referral.reportId);
      if (report) {
        const updatedNotes = report.notes
          ? `${report.notes}\n[LAB CONFIRMED] ${confirmedDisease}`
          : `[LAB CONFIRMED] ${confirmedDisease}`;
        await supabaseDb.reports.updateById(report.id || report._id, { notes: updatedNotes });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Lab referral updated.',
      referral: supabaseDb.toCamel(referral.toObject ? referral.toObject() : referral)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all lab referrals
// @route   GET /api/lab-referrals
// @access  Private
exports.getLabReferrals = async (req, res, next) => {
  try {
    const { status, sampleType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (sampleType) query.sampleType = sampleType;

    const referrals = await supabaseDb.labReferrals.find(query);

    res.status(200).json({
      success: true,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    next(error);
  }
};
