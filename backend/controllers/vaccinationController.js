const VaccinationDrive = require('../models/VaccinationDrive');

// Haversine formula for distance calculation in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// @desc    Get all vaccination drives / camps with search & geo-distance
// @route   GET /api/vaccination-drives
// @access  Public / Optional Auth
exports.getVaccinationDrives = async (req, res, next) => {
  try {
    const {
      district,
      block,
      state,
      status,
      vaccine,
      search,
      lat,
      lng,
      radius,
      limit = 250
    } = req.query;

    const query = {};

    if (state && state !== 'All') query.state = new RegExp(state, 'i');
    if (district && district !== 'All') query.district = new RegExp(district, 'i');
    if (block && block !== 'All') query.block = new RegExp(block, 'i');

    if (status && status !== 'All') {
      const statusArr = status.split(',').map(s => s.trim());
      query.status = statusArr.length > 1 ? { $in: statusArr } : statusArr[0];
    }

    if (vaccine && vaccine !== 'All') {
      query.$or = [
        { vaccine: new RegExp(`^${vaccine}`, 'i') },
        { vaccineFullName: new RegExp(vaccine, 'i') }
      ];
    }

    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = new RegExp(s, 'i');
      const searchConditions = [
        { village: sRegex },
        { block: sRegex },
        { district: sRegex },
        { venue: sRegex },
        { vaccine: sRegex },
        { vaccineFullName: sRegex },
        { organizingHospital: sRegex },
        { assignedOfficer: sRegex },
        { campId: sRegex }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 250, 500);
    const drives = await VaccinationDrive.find(query)
      .sort({ campDate: 1, startDate: -1 })
      .limit(maxLimit)
      .lean();

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const radiusKm = radius && radius !== 'all' ? parseFloat(radius) : null;

    let enrichedDrives = drives.map(d => {
      const cLat = d.coordinates?.lat;
      const cLng = d.coordinates?.lng;
      const dist = (userLat && userLng && cLat && cLng)
        ? calculateDistance(userLat, userLng, cLat, cLng)
        : null;

      const totalTarget = d.capacity || d.targetCount || 1;
      const totalDone = d.coveredCount || d.bookedSlots || 0;
      const coveragePercentage = Math.min(100, Math.round((totalDone / totalTarget) * 100));

      return {
        ...d,
        distanceKm: dist,
        coveragePercentage
      };
    });

    if (userLat && userLng && radiusKm) {
      enrichedDrives = enrichedDrives.filter(d => d.distanceKm !== null && d.distanceKm <= radiusKm);
    }

    if (userLat && userLng) {
      enrichedDrives.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    res.status(200).json({
      success: true,
      count: enrichedDrives.length,
      drives: enrichedDrives
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register livestock for a vaccination camp
// @route   POST /api/vaccination-drives/:id/register
// @access  Public / Private (Farmers)
exports.registerForCamp = async (req, res, next) => {
  try {
    const { animalIds = [], animalCount = 1, farmerName, farmerPhone } = req.body;
    const countToBook = Math.max(
      1,
      Array.isArray(animalIds) && animalIds.length > 0
        ? animalIds.length
        : parseInt(animalCount, 10) || 1
    );

    const drive = await VaccinationDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination camp not found.'
      });
    }

    if (drive.remainingSlots < countToBook) {
      return res.status(400).json({
        success: false,
        message: `Only ${drive.remainingSlots} slots remaining for this camp.`
      });
    }

    drive.bookedSlots = (drive.bookedSlots || 0) + countToBook;
    drive.remainingSlots = Math.max(0, (drive.capacity || 200) - drive.bookedSlots);
    await drive.save();

    const token = `#CAMP-${Math.floor(1000 + Math.random() * 9000)}`;

    res.status(200).json({
      success: true,
      message: 'Livestock registered for vaccination camp successfully.',
      token,
      bookedSlots: drive.bookedSlots,
      remainingSlots: drive.remainingSlots,
      camp: {
        id: drive._id,
        campId: drive.campId,
        vaccine: drive.vaccine,
        venue: drive.venue,
        village: drive.village,
        block: drive.block,
        campDate: drive.campDate,
        startTime: drive.startTime
      }
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
    const {
      vaccine,
      targetSpecies,
      village,
      block,
      district,
      state,
      venue,
      capacity,
      targetCount,
      startDate,
      endDate
    } = req.body;

    if (!vaccine || !village || !block) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine name, village, and block are required.'
      });
    }

    const totalCap = parseInt(capacity || targetCount || 200, 10);
    const drive = await VaccinationDrive.create({
      vaccine,
      targetSpecies: targetSpecies || 'Cattle & Buffalo',
      village,
      block,
      district: district || 'Pune',
      state: state || 'Maharashtra',
      venue: venue || `Primary Veterinary Dispensary, ${village}`,
      coordinates: { lat: 18.1517, lng: 74.5772 },
      organizingHospital: `Block Veterinary Dispensary, ${village}`,
      assignedOfficer: req.user ? req.user.name : 'Veterinary Officer',
      assignedOfficerId: req.user ? req.user._id : null,
      capacity: totalCap,
      targetCount: totalCap,
      bookedSlots: 0,
      remainingSlots: totalCap,
      coveredCount: 0,
      startDate: startDate || new Date(),
      campDate: startDate || new Date(),
      endDate: endDate || null,
      status: 'Upcoming'
    });

    res.status(201).json({
      success: true,
      message: 'Vaccination drive created successfully.',
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
    } else if (drive.coveredCount >= (drive.capacity || drive.targetCount || 200)) {
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

