const supabaseDb = require('../services/supabaseDb');
const LabReferral = require('../models/LabReferral');
const Report = require('../models/Report');

// @desc    Create a lab sample referral for a case
// @route   POST /api/lab-referrals
// @access  Private (Veterinarian, Field Worker, Officer, Admin)
exports.createLabReferral = async (req, res, next) => {
  try {
    const { reportId, caseId, sampleType, collectionDate, referredLab, notes } = req.body;
    const targetRefId = reportId || caseId;

    if (!targetRefId || !sampleType) {
      return res.status(400).json({
        success: false,
        message: 'Report ID or Case ID and sample type are required.'
      });
    }

    let report = await supabaseDb.reports.findById(targetRefId);
    let linkedCase = null;

    // If not found as report directly, check if targetRefId is a disease case
    if (!report) {
      linkedCase = await supabaseDb.diseaseCases.findById(targetRefId);
      if (linkedCase) {
        // Check if report already exists for this case_id
        const existingReports = await supabaseDb.reports.find({ caseId: linkedCase.caseId });
        if (existingReports && existingReports.length > 0) {
          report = existingReports[0];
        } else {
          // Create matching report in Supabase so foreign key report_id is valid
          try {
            report = await supabaseDb.reports.create({
              caseId: linkedCase.caseId,
              reporterId: linkedCase.farmerId || String(req.user.id || req.user._id),
              animalId: linkedCase.animalId || null,
              species: linkedCase.species || 'Cattle',
              symptoms: linkedCase.symptoms || [],
              mortalityCount: 0,
              affectedCount: linkedCase.affectedCount || 1,
              latitude: linkedCase.latitude || 18.5204,
              longitude: linkedCase.longitude || 73.8567,
              village: linkedCase.farmerLocation?.village || 'Unknown Village',
              block: linkedCase.farmerLocation?.block || 'Unknown Block',
              district: linkedCase.districtId || 'Pune',
              status: 'Escalated',
              notes: `Auto-generated surveillance report for referral case ${linkedCase.caseId}. ${notes || ''}`
            });
          } catch (repErr) {
            console.warn('[LabController] Could not auto-create report for case:', repErr.message);
          }
        }
      }
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Associated report or disease case not found.'
      });
    }

    const labName = referredLab || 'District Disease Diagnostic Laboratory (DDDL), Pune';
    const collectorIdStr = String(req.user.id || req.user._id);

    // Create in Supabase PostgreSQL
    const referral = await supabaseDb.labReferrals.create({
      reportId: report.id,
      sampleType,
      collectionDate: collectionDate || new Date().toISOString(),
      referredLab: labName,
      status: 'Collected',
      collectedBy: collectorIdStr,
      resultSummary: {
        notes: notes || ''
      }
    });

    // Elevate report status to 'Escalated' if it was 'Reported' or 'Triaged'
    if (['Reported', 'Triaged', 'Field Verified'].includes(report.status)) {
      await supabaseDb.reports.updateById(report.id, { status: 'Escalated' });
    }

    // If linked to a disease case, log on case timeline
    if (linkedCase) {
      try {
        await supabaseDb.diseaseCases.updateStatus(
          linkedCase.id || linkedCase.caseId,
          linkedCase.status,
          `Diagnostic sample (${sampleType}) collected for lab analysis at ${labName}.`,
          collectorIdStr,
          req.user.name
        );
      } catch (cErr) {}
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
// @access  Private (Veterinarian, Field Worker, Officer, Admin)
exports.updateLabReferral = async (req, res, next) => {
  try {
    const { status, confirmedDisease, notes } = req.body;

    const existing = await supabaseDb.labReferrals.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lab referral not found.'
      });
    }

    const updatePayload = {};
    if (status) updatePayload.status = status;

    const existingSummary = existing.resultSummary || {};
    if (confirmedDisease || notes || status) {
      updatePayload.resultSummary = {
        ...existingSummary,
        confirmedDisease: confirmedDisease || existingSummary.confirmedDisease,
        notes: notes || existingSummary.notes,
        confirmedDate: status === 'Result Confirmed' ? new Date().toISOString() : existingSummary.confirmedDate
      };
    }

    const updatedReferral = await supabaseDb.labReferrals.updateById(req.params.id, updatePayload);

    // If result confirmed, add audit trail to report and any linked disease case
    if (status === 'Result Confirmed' && confirmedDisease) {
      const reportId = existing.reportId || existing.report?.id;
      if (reportId) {
        const report = await supabaseDb.reports.findById(reportId);
        if (report) {
          const updatedNotes = report.notes
            ? `${report.notes}\n[LAB CONFIRMED] ${confirmedDisease}`
            : `[LAB CONFIRMED] ${confirmedDisease}`;
          await supabaseDb.reports.updateById(report.id, { notes: updatedNotes });

          if (report.caseId) {
            try {
              const caseDoc = await supabaseDb.diseaseCases.findById(report.caseId);
              if (caseDoc) {
                await supabaseDb.diseaseCases.updateStatus(
                  caseDoc.id,
                  caseDoc.status === 'Investigating' ? 'Confirmed' : caseDoc.status,
                  `[LAB CONFIRMED] Diagnostic result confirmed: ${confirmedDisease}.`,
                  String(req.user.id || req.user._id),
                  req.user.name,
                  { clinicalDiagnosis: confirmedDisease }
                );
              }
            } catch (caseUpErr) {}
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Lab referral updated.',
      referral: updatedReferral || existing
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
