const Advisory = require('../models/Advisory');

// @desc    Get all advisories (filtered by district/block/severity)
// @route   GET /api/advisories
// @access  Private
exports.getAdvisories = async (req, res, next) => {
  try {
    const { district, block, severity } = req.query;
    const query = {};

    if (district && district !== 'All') {
      query.$or = [{ targetDistrict: 'All' }, { targetDistrict: new RegExp(district, 'i') }];
    }
    if (block && block !== 'All') {
      query.$or = [{ targetBlock: 'All' }, { targetBlock: new RegExp(block, 'i') }];
    }
    if (severity) {
      query.severity = severity;
    }

    const advisories = await Advisory.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: advisories.length,
      advisories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create manual advisory / bulletin
// @route   POST /api/advisories
// @access  Private (Officer, Admin)
exports.createAdvisory = async (req, res, next) => {
  try {
    const { title, message, severity, disease, targetVillage, targetBlock, targetDistrict } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required.'
      });
    }

    const advisory = await Advisory.create({
      title: typeof title === 'object' ? title : { en: title, hi: title },
      message: typeof message === 'object' ? message : { en: message, hi: message },
      severity: severity || 'Moderate',
      disease: disease || 'General Livestock Alert',
      targetVillage: targetVillage || 'All',
      targetBlock: targetBlock || 'All',
      targetDistrict: targetDistrict || req.user.district || 'Pune',
      issuedBy: req.user.name + ' (' + req.user.role + ')'
    });

    res.status(201).json({
      success: true,
      message: 'Advisory issued successfully.',
      advisory
    });
  } catch (error) {
    next(error);
  }
};
