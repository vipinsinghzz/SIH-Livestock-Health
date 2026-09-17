/**
 * Livestock Saathi - Vaccination & Camp Controller (Supabase PostgreSQL Backed)
 * File: backend/controllers/vaccinationController.js
 *
 * Replaces legacy Mongoose direct database dependencies with the production
 * Supabase PostgreSQL repository architecture (public.vaccination_drives,
 * public.vaccination_camp_registrations, public.animal_vaccinations, public.animal_timeline).
 */

const supabaseDb = require('../services/supabaseDb');
const { resolveFarmerProfile } = require('./animalController');

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

    const drives = await supabaseDb.vaccinationDrives.find({
      district,
      block,
      state,
      status,
      vaccine,
      search,
      limit
    });

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;
    const radiusKm = radius && radius !== 'all' ? parseFloat(radius) : null;

    let enrichedDrives = (drives || []).map(d => {
      const cLat = d.latitude !== undefined ? d.latitude : d.coordinates?.lat;
      const cLng = d.longitude !== undefined ? d.longitude : d.coordinates?.lng;
      const dist = (userLat && userLng && cLat && cLng)
        ? calculateDistance(userLat, userLng, cLat, cLng)
        : null;

      const totalTarget = d.capacity || d.targetCount || 1;
      const totalDone = d.coveredCount || d.bookedSlots || 0;
      const coveragePercentage = Math.min(100, Math.round((totalDone / totalTarget) * 100));

      return {
        ...d,
        id: d.id || d._id,
        _id: d._id || d.id,
        coordinates: { lat: cLat || 18.1517, lng: cLng || 74.5772 },
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
    console.error('[VaccinationController] GET DRIVES ERROR:', error.message);
    next(error);
  }
};

// @desc    Get single vaccination drive by ID or campId
// @route   GET /api/vaccination-drives/:id
// @access  Public / Optional Auth
exports.getVaccinationDriveById = async (req, res, next) => {
  try {
    const drive = await supabaseDb.vaccinationDrives.findById(req.params.id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination drive not found.'
      });
    }

    const cLat = drive.latitude !== undefined ? drive.latitude : drive.coordinates?.lat;
    const cLng = drive.longitude !== undefined ? drive.longitude : drive.coordinates?.lng;

    res.status(200).json({
      success: true,
      drive: {
        ...drive,
        id: drive.id || drive._id,
        _id: drive._id || drive.id,
        coordinates: { lat: cLat || 18.1517, lng: cLng || 74.5772 }
      }
    });
  } catch (error) {
    console.error('[VaccinationController] GET DRIVE BY ID ERROR:', error.message);
    next(error);
  }
};

// @desc    Get vaccination camp registrations for the logged in farmer
// @route   GET /api/vaccination-drives/my-registrations
// @access  Private (Farmers)
exports.getMyRegistrations = async (req, res, next) => {
  try {
    const profile = await resolveFarmerProfile(req.user);
    if (!profile || !profile.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view camp registrations.'
      });
    }

    const farmerId = String(profile.id).trim();
    const farmerPhone = String(profile.phone || req.user.phone || '').trim();

    const registrations = await supabaseDb.campRegistrations.findByFarmer(farmerId, farmerPhone);

    const myAppointments = (registrations || []).map((reg) => {
      const d = reg.drive || {};
      const campDate = d.campDate || d.camp_date || d.startDate || d.start_date || reg.registeredAt;
      return {
        id: reg.id || reg._id,
        campId: d.campId || d.camp_id || 'CAMP-REG',
        driveId: reg.driveId || reg.drive_id || d.id || d._id,
        vaccine: d.vaccine || 'Livestock Vaccine',
        vaccineFullName: d.vaccineFullName || d.vaccine_full_name || d.vaccine || 'Livestock Vaccine',
        venue: d.venue || 'Veterinary Centre',
        village: d.village || '',
        block: d.block || '',
        district: d.district || '',
        campDate,
        startTime: d.startTime || d.start_time || '09:30 AM',
        endTime: d.endTime || d.end_time || '04:00 PM',
        assignedOfficer: d.assignedOfficer || d.assigned_officer || 'Veterinary Officer',
        token: reg.token,
        animalCount: reg.animalCount || reg.animal_count || (Array.isArray(reg.animalIds) ? reg.animalIds.length : 1),
        animalIds: reg.animalIds || reg.animal_ids || [],
        registeredAt: reg.registeredAt || reg.registered_at,
        status: d.status || 'Upcoming'
      };
    });

    res.status(200).json({
      success: true,
      count: myAppointments.length,
      registrations: myAppointments
    });
  } catch (error) {
    console.error('[VaccinationController] GET MY REGISTRATIONS ERROR:', error.message);
    next(error);
  }
};

// @desc    Register livestock for a vaccination camp
// @route   POST /api/vaccination-drives/:id/register
// @access  Private (Farmers)
exports.registerForCamp = async (req, res, next) => {
  try {
    const profile = await resolveFarmerProfile(req.user);
    if (!profile || !profile.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to register for vaccination camp.'
      });
    }

    const farmerId = String(profile.id).trim();
    const farmerName = profile.name || req.user.name || req.body.farmerName || 'Farmer';
    const farmerPhone = profile.phone || req.user.phone || req.body.farmerPhone || '';

    const paramId = req.params.id;
    const drive = await supabaseDb.vaccinationDrives.findById(paramId);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination camp not found.'
      });
    }

    const { animalIds = [], animalCount = 1 } = req.body;
    const requestedCount = Array.isArray(animalIds) && animalIds.length > 0
      ? animalIds.length
      : Math.max(1, parseInt(animalCount, 10) || 1);

    // Capacity & Slot Verification
    const remainingSlots = drive.remainingSlots !== undefined
      ? drive.remainingSlots
      : Math.max(0, (drive.capacity || 200) - (drive.bookedSlots || 0));

    if (remainingSlots <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This vaccination camp is already at full capacity.'
      });
    }

    if (remainingSlots < requestedCount) {
      return res.status(400).json({
        success: false,
        message: `Only ${remainingSlots} slots remaining for this camp.`
      });
    }

    const verifiedAnimals = [];

    // IDOR Enforcement: Verify that every requested animal actually belongs to the authenticated farmer
    if (Array.isArray(animalIds) && animalIds.length > 0) {
      for (const aId of animalIds) {
        let animal = await supabaseDb.animals.findById(aId);
        if (!animal) {
          animal = await supabaseDb.animals.findByTagId(aId);
        }

        if (!animal) {
          return res.status(404).json({
            success: false,
            message: `Animal not found: ${aId}`
          });
        }

        const ownerObj = typeof animal.ownerId === 'object' && animal.ownerId !== null ? animal.ownerId : null;
        const animalOwnerId = String(ownerObj?.id || ownerObj?._id || animal.ownerId || animal.owner_id || '').trim();
        const animalOwnerEmail = (ownerObj?.email || '').toLowerCase().trim();
        const farmerEmail = (profile?.email || req.user.email || '').toLowerCase().trim();

        const isOwner = (farmerId && animalOwnerId && farmerId === animalOwnerId) ||
                        (farmerEmail && animalOwnerEmail && farmerEmail === animalOwnerEmail);

        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: `Unauthorized: Animal ${animal.name || animal.tagId || aId} does not belong to your registered herd.`
          });
        }

        verifiedAnimals.push(animal);
      }
    } else {
      // If no specific animal IDs were passed, select requested count from the farmer's verified herd
      const farmerHerd = await supabaseDb.animals.find({ ownerId: farmerId });
      if (!farmerHerd || farmerHerd.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'You have no registered animals in your herd to book for this camp.'
        });
      }
      if (farmerHerd.length < requestedCount) {
        return res.status(400).json({
          success: false,
          message: `Requested ${requestedCount} animals, but your herd only has ${farmerHerd.length} registered animal(s).`
        });
      }
      verifiedAnimals.push(...farmerHerd.slice(0, requestedCount));
    }

    const countToBook = Math.max(1, verifiedAnimals.length);

    // Duplicate Registration Check
    const drivePrimaryId = drive.id || drive._id;
    const existingReg = await supabaseDb.campRegistrations.findByDriveAndFarmer(drivePrimaryId, farmerId);
    if (existingReg) {
      return res.status(409).json({
        success: false,
        message: 'You have already registered for this vaccination camp.',
        existingToken: existingReg.token
      });
    }

    // Concurrency / Slot Update
    const newBooked = (drive.bookedSlots || 0) + countToBook;
    const newRemaining = Math.max(0, (drive.capacity || 200) - newBooked);

    await supabaseDb.vaccinationDrives.update(drivePrimaryId, {
      bookedSlots: newBooked,
      remainingSlots: newRemaining
    });

    // Record Registration in PostgreSQL
    const token = `#CAMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetAnimalIds = verifiedAnimals.map(a => String(a.id || a._id || a.tagId));

    await supabaseDb.campRegistrations.create({
      driveId: drivePrimaryId,
      farmerId,
      farmerName,
      farmerPhone,
      animalIds: targetAnimalIds,
      animalCount: countToBook,
      token,
      registeredAt: new Date().toISOString()
    });

    // Create scheduled vaccination record and timeline milestone in Supabase
    const campDateObj = new Date(drive.campDate || drive.startDate || Date.now());
    const campDateFormatted = campDateObj.toLocaleDateString('en-GB');

    for (const animal of verifiedAnimals) {
      const animId = animal.id || animal._id;
      if (supabaseDb.supabase) {
        try {
          await supabaseDb.supabase.from('animal_vaccinations').insert({
            animal_id: animId,
            vaccine_name: drive.vaccineFullName || drive.vaccine,
            date: campDateObj.toISOString(),
            next_due: campDateObj.toISOString(),
            status: 'Scheduled',
            dose: 'Primary Dose',
            camp: `${drive.venue || 'Veterinary Camp'}, ${drive.village || ''}`,
            notes: `Appointment Token: ${token} • Scheduled via Community Camp`
          });
        } catch (ve) {
          console.warn('[VaccinationController] Notice inserting scheduled vaccination:', ve.message);
        }

        try {
          await supabaseDb.supabase.from('animal_timeline').insert({
            animal_id: animId,
            event_type: 'Vaccination',
            title: `Camp Appointment: ${drive.vaccineFullName || drive.vaccine}`,
            date: campDateFormatted,
            doctor: drive.assignedOfficer || 'Veterinarian',
            notes: `Venue: ${drive.venue} • Token: ${token} • Slots: ${countToBook}`,
            status: 'Scheduled'
          });
        } catch (te) {
          console.warn('[VaccinationController] Notice inserting timeline milestone:', te.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Livestock registered for vaccination camp successfully.',
      token,
      bookedSlots: newBooked,
      remainingSlots: newRemaining,
      camp: {
        id: drivePrimaryId,
        campId: drive.campId || drive.camp_id,
        vaccine: drive.vaccine,
        vaccineFullName: drive.vaccineFullName || drive.vaccine,
        venue: drive.venue,
        village: drive.village,
        block: drive.block,
        campDate: drive.campDate || drive.startDate,
        startTime: drive.startTime || '09:30 AM'
      },
      linkedAnimalsCount: verifiedAnimals.length
    });
  } catch (error) {
    console.error('[VaccinationController] REGISTER FOR CAMP ERROR:', error.message);
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
      vaccineFullName,
      targetSpecies,
      village,
      block,
      district,
      state,
      venue,
      capacity,
      targetCount,
      startDate,
      endDate,
      startTime,
      endTime,
      cost,
      notes
    } = req.body;

    if (!vaccine || !village || !block) {
      return res.status(400).json({
        success: false,
        message: 'Vaccine name, village, and block are required.'
      });
    }

    const totalCap = parseInt(capacity || targetCount || 200, 10);
    const drive = await supabaseDb.vaccinationDrives.create({
      vaccine,
      vaccineFullName: vaccineFullName || vaccine,
      targetSpecies: targetSpecies || 'Cattle & Buffalo',
      village,
      block,
      district: district || 'Pune',
      state: state || 'Maharashtra',
      venue: venue || `Primary Veterinary Dispensary, ${village}`,
      latitude: 18.1517,
      longitude: 74.5772,
      organizingHospital: `Block Veterinary Dispensary, ${village}`,
      assignedOfficer: req.user ? req.user.name : 'Veterinary Officer',
      assignedOfficerId: req.user ? (req.user.id || req.user._id) : null,
      capacity: totalCap,
      targetCount: totalCap,
      bookedSlots: 0,
      remainingSlots: totalCap,
      coveredCount: 0,
      startDate: startDate || new Date(),
      campDate: startDate || new Date(),
      endDate: endDate || null,
      startTime: startTime || '09:30 AM',
      endTime: endTime || '04:00 PM',
      cost: cost || 'Free (Govt Drive)',
      status: 'Upcoming',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Vaccination drive created successfully.',
      drive
    });
  } catch (error) {
    console.error('[VaccinationController] CREATE DRIVE ERROR:', error.message);
    next(error);
  }
};

// @desc    Update vaccination drive progress
// @route   PATCH /api/vaccination-drives/:id
// @access  Private (Field Worker, Officer, Admin)
exports.updateVaccinationDrive = async (req, res, next) => {
  try {
    const { coveredCount, incrementCoveredBy, status } = req.body;

    const drive = await supabaseDb.vaccinationDrives.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Vaccination drive not found.'
      });
    }

    let newCovered = drive.coveredCount || 0;
    if (coveredCount !== undefined) {
      newCovered = parseInt(coveredCount, 10);
    } else if (incrementCoveredBy) {
      newCovered += parseInt(incrementCoveredBy, 10);
    }

    let newStatus = drive.status;
    if (status) {
      newStatus = status;
    } else if (newCovered >= (drive.capacity || drive.targetCount || 200)) {
      newStatus = 'Completed';
    }

    const updated = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, {
      coveredCount: newCovered,
      status: newStatus
    });

    res.status(200).json({
      success: true,
      message: 'Vaccination drive updated successfully.',
      drive: updated || drive
    });
  } catch (error) {
    console.error('[VaccinationController] UPDATE DRIVE ERROR:', error.message);
    next(error);
  }
};
