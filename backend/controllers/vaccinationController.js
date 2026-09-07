const VaccinationDrive = require('../models/VaccinationDrive');

// @desc    Get all vaccination drives with progress indicators
// @route   GET /api/vaccination-drives
// @access  Private
exports.getVaccinationDrives = async (req, res, next) => {
  try {
    const { district, block, status, vaccine } = req.query;
    const query = {};

    if (district && district !== 'All') query.district = new RegExp(district, 'i');
    if (block && block !== 'All') query.block = new RegExp(block, 'i');
    if (status) query.status = status;
    if (vaccine) query.vaccine = new RegExp(vaccine, 'i');

    const drives = await VaccinationDrive.find(query).sort({ startDate: -1 }).lean();

    const enrichedDrives = drives.map(d => ({
      ...d,
      coveragePercentage: Math.min(100, Math.round((d.coveredCount / (d.targetCount || 1)) * 100))
    }));

    res.status(200).json({
      success: true,
      count: enrichedDrives.length,
      drives: enrichedDrives
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new vaccination drive
// @route   POST /api/vaccination-drives
// @access  Private (Officer, Admin)
exports.createVaccinationDrive = async (req, res, next) => {
  try {
    const { vaccine, targetSpecies, village, block, district, targetCount, startDate, endDate } = req.body;

    if (!vaccine || !village || !block || !targetCount) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine name, village, block, and target count are required.'
      });
    }

    const drive = await VaccinationDrive.create({
      vaccine,
      targetSpecies: targetSpecies || 'Cattle & Buffalo',
      village,
      block,
      district: district || 'Pune',
      targetCount: parseInt(targetCount, 10),
      coveredCount: 0,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      status: 'Active'
    });

    res.status(201).json({
      success: true,
      message: 'Vaccination drive launched successfully.',
      drive
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vaccination drive progress
// @route   PATCH /api/vaccination-drives/:id
// @access  Private (Field Worker, Officer, Admin)
exports.updateVaccinationDrive = async (req, res, next) => {
  try {
    const { coveredCount, incrementCoveredBy, status } = req.body;

    const drive = await VaccinationDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination drive not found.'
      });
    }

    if (coveredCount !== undefined) {
      drive.coveredCount = parseInt(coveredCount, 10);
    } else if (incrementCoveredBy) {
      drive.coveredCount += parseInt(incrementCoveredBy, 10);
    }

    if (status) {
      drive.status = status;
    } else if (drive.coveredCount >= drive.targetCount) {
      drive.status = 'Completed';
    }

    await drive.save();

    res.status(200).json({
      success: true,
      message: 'Vaccination drive updated successfully.',
      drive
    });
  } catch (error) {
    next(error);
  }
};
