const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const VaccinationDrive = require('../models/VaccinationDrive');
const LabReferral = require('../models/LabReferral');

// @desc    Get aggregated dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private
exports.getSummary = async (req, res, next) => {
  try {
    const { district, block } = req.query;
    const filter = {};

    if (district && district !== 'All') {
      filter['location.district'] = new RegExp(district, 'i');
    }
    if (block && block !== 'All') {
      filter['location.block'] = new RegExp(block, 'i');
    }

    // Role adjustment: if user is farmer, get personal summary as well
    const totalReports = await Report.countDocuments(filter);
    const activeCases = await Report.countDocuments({
      ...filter,
      status: { $in: ['Reported', 'Triaged', 'Field Verified', 'Escalated'] }
    });
    const containedCases = await Report.countDocuments({
      ...filter,
      status: { $in: ['Contained', 'Closed'] }
    });

    // Sum of mortalities
    const mortalityAgg = await Report.aggregate([
      { $match: filter },
      { $group: { _id: null, totalDeaths: { $sum: '$mortalityCount' }, totalAffected: { $sum: '$affectedCount' } } }
    ]);
    const totalMortality = mortalityAgg[0]?.totalDeaths || 0;
    const totalAffected = mortalityAgg[0]?.totalAffected || 0;

    // Triage metrics (High/Critical risk count & Outbreak flags)
    const allFilteredReportIds = (await Report.find(filter).select('_id')).map(r => r._id);
    const triageStats = await TriageResult.aggregate([
      { $match: { reportId: { $in: allFilteredReportIds } } },
      {
        $group: {
          _id: null,
          criticalCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'Critical'] }, 1, 0] } },
          highCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'High'] }, 1, 0] } },
          moderateCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'Moderate'] }, 1, 0] } },
          lowCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'Low'] }, 1, 0] } },
          outbreakCount: { $sum: { $cond: ['$outbreakFlag', 1, 0] } }
        }
      }
    ]);

    const triageMetrics = triageStats[0] || {
      criticalCount: 0,
      highCount: 0,
      moderateCount: 0,
      lowCount: 0,
      outbreakCount: 0
    };

    // Disease frequency breakdown for pie/bar chart
    const diseaseBreakdown = await TriageResult.aggregate([
      { $match: { reportId: { $in: allFilteredReportIds } } },
      { $unwind: '$suspectedDiseases' },
      {
        $group: {
          _id: '$suspectedDiseases.name',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$suspectedDiseases.confidenceScore' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Status Funnel Breakdown
    const statusAgg = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusFunnel = {
      Reported: 0,
      Triaged: 0,
      'Field Verified': 0,
      Escalated: 0,
      Contained: 0,
      Closed: 0
    };
    statusAgg.forEach(s => {
      if (statusFunnel[s._id] !== undefined) statusFunnel[s._id] = s.count;
    });

    // Block level distribution
    const blockDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$location.block', count: { $sum: 1 }, deaths: { $sum: '$mortalityCount' } } },
      { $sort: { count: -1 } }
    ]);

    // Vaccination Coverage
    const vaccFilter = {};
    if (district && district !== 'All') vaccFilter.district = new RegExp(district, 'i');
    if (block && block !== 'All') vaccFilter.block = new RegExp(block, 'i');

    const vaccAgg = await VaccinationDrive.aggregate([
      { $match: vaccFilter },
      {
        $group: {
          _id: null,
          totalTarget: { $sum: '$targetCount' },
          totalCovered: { $sum: '$coveredCount' }
        }
      }
    ]);
    const totalTarget = vaccAgg[0]?.totalTarget || 1;
    const totalCovered = vaccAgg[0]?.totalCovered || 0;
    const vaccinationCoveragePct = Math.min(100, Math.round((totalCovered / totalTarget) * 100));

    // Lab referrals pipeline counts
    const labStats = await LabReferral.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalReports,
        activeCases,
        containedCases,
        totalMortality,
        totalAffected,
        triageMetrics,
        diseaseBreakdown: diseaseBreakdown.map(d => ({
          name: d._id,
          cases: d.count,
          avgConfidencePct: Math.round(d.avgConfidence * 100)
        })),
        statusFunnel,
        blockDistribution,
        vaccination: {
          totalTarget,
          totalCovered,
          coveragePct: vaccinationCoveragePct
        },
        labPipeline: labStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 30-day temporal trend data for charts
// @route   GET /api/dashboard/trends
// @access  Private
exports.getTrends = async (req, res, next) => {
  try {
    const { district, block } = req.query;
    const filter = {};

    if (district && district !== 'All') filter['location.district'] = new RegExp(district, 'i');
    if (block && block !== 'All') filter['location.block'] = new RegExp(block, 'i');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.createdAt = { $gte: thirtyDaysAgo };

    const reports = await Report.find(filter).select('caseId createdAt mortalityCount location status').lean();
    const reportIds = reports.map(r => r._id);
    const triages = await TriageResult.find({ reportId: { $in: reportIds } }).select('reportId riskLevel outbreakFlag').lean();

    const triageMap = {};
    triages.forEach(t => {
      triageMap[t.reportId.toString()] = t;
    });

    // Group by Date YYYY-MM-DD
    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      dateMap[dateKey] = {
        date: dateKey,
        displayDate: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
        cases: 0,
        mortalities: 0,
        criticalCases: 0,
        outbreaks: 0
      };
    }

    reports.forEach(r => {
      const dateKey = new Date(r.createdAt).toISOString().slice(0, 10);
      if (dateMap[dateKey]) {
        dateMap[dateKey].cases += 1;
        dateMap[dateKey].mortalities += r.mortalityCount || 0;
        const tr = triageMap[r._id.toString()];
        if (tr?.riskLevel === 'Critical' || tr?.riskLevel === 'High') {
          dateMap[dateKey].criticalCases += 1;
        }
        if (tr?.outbreakFlag) {
          dateMap[dateKey].outbreaks += 1;
        }
      }
    });

    const trendData = Object.values(dateMap);

    res.status(200).json({
      success: true,
      data: trendData
    });
  } catch (error) {
    next(error);
  }
};
