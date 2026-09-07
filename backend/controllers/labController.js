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

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Associated report not found.'
      });
    }

    const referral = await LabReferral.create({
      reportId,
      sampleType,
      collectionDate: collectionDate || new Date(),
      referredLab: referredLab || 'District Disease Diagnostic Laboratory (DDDL), Pune',
      status: 'Collected',
      collectedBy: req.user._id,
      resultSummary: {
        notes: notes || ''
      }
    });

    // Automatically elevate report status to 'Escalated' if it was 'Reported' or 'Triaged'
    if (['Reported', 'Triaged', 'Field Verified'].includes(report.status)) {
      report.status = 'Escalated';
      await report.save();
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
      const report = await Report.findById(referral.reportId);
      if (report) {
        report.notes = report.notes
          ? `${report.notes}\n[LAB CONFIRMED] ${confirmedDisease}`
          : `[LAB CONFIRMED] ${confirmedDisease}`;
        await report.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Lab referral updated.',
      referral
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

    const referrals = await LabReferral.find(query)
      .populate({
        path: 'reportId',
        select: 'caseId species symptoms location status mortalityCount',
        populate: { path: 'reporterId', select: 'name phone' }
      })
      .populate('collectedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: referrals.length,
      referrals
    });
  } catch (error) {
    next(error);
  }
};
