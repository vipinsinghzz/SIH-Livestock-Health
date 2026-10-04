/**
 * PashuCare - Vaccination & Camp Controller (Supabase PostgreSQL Backed)
 * File: backend/controllers/vaccinationController.js
 *
 * District/Program Management for Authorized Officers & Mass Vaccination Campaign Governance:
 * - Real Supabase PostgreSQL database persistence (public.vaccination_drives,
 *   public.animal_vaccinations, public.vaccination_camp_registrations, public.disease_cases)
 * - Zero MongoDB dependency
 * - Campaign Planning & Scheduling
 * - Outbreak-driven Ring Vaccination Coordination
 * - Team & Field Worker Assignment with Availability verification
 * - Campaign Monitoring & Village/Block Level Real Coverage Analytics
 * - Campaign Status Lifecycle (Scheduled -> Active/Ongoing -> Completed)
 * - Safe Dose Administration Recording & Audited Closure
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

// Canonical disease-to-vaccine mapping for ring campaigns
function getVaccineForDisease(disease = '') {
  const d = (disease || '').toLowerCase();
  if (d.includes('lumpy') || d.includes('lsd')) {
    return 'Lumpy Skin Disease (Neethling strain)';
  }
  if (d.includes('foot') || d.includes('fmd') || d.includes('mouth')) {
    return 'FMD Trivalent Inactivated Adjuvanted Vaccine';
  }
  if (d.includes('blackleg') || d.includes('bq') || d.includes('quarter')) {
    return 'Clostridium Chauvoei Bacterin (Blackleg Vaccine)';
  }
  if (d.includes('anthrax')) {
    return 'Anthrax Spore Live Vaccine (Sterne Strain)';
  }
  if (d.includes('brucellosis') || d.includes('brucella')) {
    return 'Brucella Abortus S19 Vaccine';
  }
  if (d.includes('haemorrhagic') || d.includes('hs') || d.includes('septicaemia') || d.includes('septicemia')) {
    return 'HS Alum-Precipitated Vaccine';
  }
  if (d.includes('ppr') || d.includes('peste') || d.includes('ruminant')) {
    return 'PPR Live Attenuated Vaccine (Sungri 96)';
  }
  return `${disease} Ring Vaccination Vaccine`;
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

      const totalTarget = parseInt(d.targetCount || d.capacity || 1, 10);
      const totalDone = parseInt(d.coveredCount || d.bookedSlots || 0, 10);
      const coveragePercentage = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;
      const pendingCount = Math.max(0, totalTarget - totalDone);

      return {
        ...d,
        id: d.id || d._id,
        _id: d._id || d.id,
        coordinates: { lat: cLat || 21.1458, lng: cLng || 79.0882 },
        distanceKm: dist,
        targetCount: totalTarget,
        coveredCount: totalDone,
        pendingCount,
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
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination drive not found.'
      });
    }

    const cLat = drive.latitude !== undefined ? drive.latitude : drive.coordinates?.lat;
    const cLng = drive.longitude !== undefined ? drive.longitude : drive.coordinates?.lng;

    const totalTarget = parseInt(drive.targetCount || drive.capacity || 1, 10);
    const totalDone = parseInt(drive.coveredCount || drive.bookedSlots || 0, 10);
    const coveragePercentage = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;
    const pendingCount = Math.max(0, totalTarget - totalDone);

    // If linked to an outbreak case, fetch case details
    let linkedCase = null;
    if (supabaseDb.diseaseCases) {
      try {
        const foundCase = await supabaseDb.diseaseCases.findByRingDriveId(drive.id || drive._id);
        if (foundCase) {
          linkedCase = {
            id: foundCase.id,
            caseId: foundCase.caseId,
            disease: foundCase.disease,
            species: foundCase.species,
            status: foundCase.status,
            village: foundCase.farmerLocation?.village || foundCase.village,
            block: foundCase.farmerLocation?.block || foundCase.block,
            coordinates: {
              lat: foundCase.latitude || foundCase.coordinates?.lat,
              lng: foundCase.longitude || foundCase.coordinates?.lng
            }
          };
        }
      } catch (ce) {}
    }

    const assignedVets = Array.isArray(drive.assignedVets || drive.assigned_vets)
      ? [...(drive.assignedVets || drive.assigned_vets)]
      : (drive.assignedOfficerId ? [drive.assignedOfficerId] : []);
    const assignedFieldWorkers = Array.isArray(drive.assignedFieldWorkers || drive.assigned_field_workers)
      ? [...(drive.assignedFieldWorkers || drive.assigned_field_workers)]
      : [];

    res.status(200).json({
      success: true,
      drive: {
        ...drive,
        id: drive.id || drive._id,
        _id: drive._id || drive.id,
        targetCount: totalTarget,
        coveredCount: totalDone,
        pendingCount,
        coveragePercentage,
        coordinates: { lat: cLat || 21.1458, lng: cLng || 79.0882 },
        assignedVets,
        assigned_vets: assignedVets,
        assignedFieldWorkers,
        assigned_field_workers: assignedFieldWorkers,
        linkedCase
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
      if (supabaseDb.animalVaccinations) {
        try {
          await supabaseDb.animalVaccinations.create({
            animalId: animId,
            vaccineName: drive.vaccineFullName || drive.vaccine,
            date: campDateObj.toISOString(),
            status: 'Scheduled',
            dose: 'Primary Dose',
            camp: `${drive.venue || 'Veterinary Camp'}, ${drive.village || ''}`,
            notes: `Appointment Token: ${token} • Scheduled via Community Camp`
          });
        } catch (ve) {
          console.warn('[VaccinationController] Notice inserting scheduled vaccination:', ve.message);
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

// @desc    Create a new vaccination campaign / drive
// @route   POST /api/vaccination-drives
// @access  Private (Officer, Admin, Field Worker, Vet)
exports.createVaccinationDrive = async (req, res, next) => {
  try {
    const {
      vaccine,
      vaccineFullName,
      disease,
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
      priority,
      notes,
      caseId
    } = req.body;

    if (!vaccine || !village || !block) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Vaccine name, village, and block are required.'
      });
    }

    const totalCap = parseInt(capacity || targetCount || 200, 10);
    if (isNaN(totalCap) || totalCap < 1) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CAPACITY',
        message: 'Target livestock population must be at least 1.'
      });
    }

    const dist = district || req.user?.district || 'Nagpur';
    const distPrefix = dist.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DIS');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const campId = req.body.campId || `CAMP-2026-${distPrefix}-${randomSuffix}`;

    const drive = await supabaseDb.vaccinationDrives.create({
      campId,
      vaccine,
      vaccineFullName: vaccineFullName || vaccine,
      targetSpecies: targetSpecies || 'Cattle & Buffalo',
      village,
      block,
      district: dist,
      state: state || 'Maharashtra',
      venue: venue || `Primary Veterinary Dispensary, ${village}`,
      latitude: parseFloat(req.body.latitude || req.body.lat || 21.1458),
      longitude: parseFloat(req.body.longitude || req.body.lng || 79.0882),
      organizingHospital: req.body.organizingHospital || `Block Veterinary Dispensary, ${village}`,
      assignedOfficer: req.body.assignedOfficer || (req.user ? req.user.name : 'Veterinary Officer'),
      assignedOfficerId: req.body.assignedOfficerId || (req.user ? (req.user.id || req.user._id) : null),
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
      status: req.body.status || 'Scheduled',
      notes: notes ? `${notes}${disease ? ` • Disease: ${disease}` : ''}${priority ? ` • Priority: ${priority}` : ''}` : (disease ? `Target Disease: ${disease}` : '')
    });

    if (caseId && supabaseDb.diseaseCases) {
      try {
        await supabaseDb.diseaseCases.updateStatus(
          caseId,
          undefined,
          `Vaccination Campaign Linked (${campId})`,
          req.user?.id,
          req.user?.name,
          { ringVaccinationDriveId: drive.id }
        );
      } catch (linkErr) {
        console.warn('[VaccinationController] Link to case notice:', linkErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Vaccination campaign scheduled successfully in official registry.',
      drive
    });
  } catch (error) {
    console.error('[VaccinationController] CREATE DRIVE ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'VACCINATION_CAMPAIGN_CREATE_FAILED',
      message: 'Unable to create vaccination campaign in database.'
    });
  }
};

// @desc    Update vaccination drive progress
// @route   PATCH /api/vaccination-drives/:id
// @access  Private (Field Worker, Officer, Admin)
exports.updateVaccinationDrive = async (req, res, next) => {
  try {
    const { coveredCount, incrementCoveredBy, status, notes } = req.body;

    const drive = await supabaseDb.vaccinationDrives.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination drive not found.'
      });
    }

    const targetCount = parseInt(drive.targetCount || drive.capacity || 200, 10);
    let newCovered = parseInt(drive.coveredCount || 0, 10);

    if (coveredCount !== undefined) {
      newCovered = parseInt(coveredCount, 10);
    } else if (incrementCoveredBy) {
      newCovered += parseInt(incrementCoveredBy, 10);
    }

    let newStatus = drive.status;
    if (status) {
      newStatus = status;
    } else if (newCovered >= targetCount) {
      newStatus = 'Completed';
    }

    const updatePayload = {
      coveredCount: newCovered,
      remainingSlots: Math.max(0, targetCount - newCovered),
      status: newStatus
    };

    if (notes) {
      updatePayload.notes = drive.notes ? `${drive.notes}\n${notes}` : notes;
    }

    const updated = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, updatePayload);

    res.status(200).json({
      success: true,
      message: 'Vaccination drive updated successfully.',
      drive: updated || drive
    });
  } catch (error) {
    console.error('[VaccinationController] UPDATE DRIVE ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'DRIVE_UPDATE_FAILED',
      message: 'Unable to update vaccination drive.'
    });
  }
};

// ============================================================================
// OFFICER SPECIFIC OPERATIONS (DISTRICT/PROGRAM MANAGEMENT)
// ============================================================================

// @desc    Get real-time operational KPIs for Officer Vaccination Dashboard
// @route   GET /api/vaccination-drives/kpis
// @access  Private (Officer, Admin)
exports.getOfficerKpis = async (req, res, next) => {
  try {
    const district = req.query.district || req.user?.district || 'Nagpur';
    const block = req.query.block;

    const drives = await supabaseDb.vaccinationDrives.find({
      district: district && district !== 'All' ? district : undefined,
      block: block && block !== 'All' ? block : undefined
    });

    let activeDrives = 0;
    let upcomingDrives = 0;
    let completedDrives = 0;
    let targetAnimals = 0;
    let vaccinatedAnimals = 0;

    const blockCoverageMap = {};

    (drives || []).forEach(d => {
      const st = String(d.status || '').toLowerCase();
      if (st === 'active' || st === 'ongoing') {
        activeDrives++;
      } else if (st === 'upcoming' || st === 'scheduled') {
        upcomingDrives++;
      } else if (st === 'completed') {
        completedDrives++;
      }

      const tCount = parseInt(d.targetCount || d.capacity || 0, 10);
      const cCount = parseInt(d.coveredCount || 0, 10);
      targetAnimals += tCount;
      vaccinatedAnimals += cCount;

      const blk = d.block || 'District Sector';
      if (!blockCoverageMap[blk]) {
        blockCoverageMap[blk] = { target: 0, covered: 0, drives: 0, villages: new Set() };
      }
      blockCoverageMap[blk].target += tCount;
      blockCoverageMap[blk].covered += cCount;
      blockCoverageMap[blk].drives++;
      if (d.village) blockCoverageMap[blk].villages.add(d.village);
    });

    const pendingVaccinations = Math.max(0, targetAnimals - vaccinatedAnimals);
    const coveragePct = targetAnimals > 0 ? Math.min(100, Math.round((vaccinatedAnimals / targetAnimals) * 100)) : 0;

    // Fetch active outbreak cases to identify high-risk outbreak zones
    let activeOutbreaks = [];
    try {
      if (supabaseDb.diseaseCases) {
        const cases = await supabaseDb.diseaseCases.find({
          districtId: district && district !== 'All' ? district : undefined
        });
        activeOutbreaks = (cases || []).filter(c => {
          const st = String(c.status || '').toLowerCase();
          return st !== 'resolved' && st !== 'closed';
        });
      }
    } catch (e) {
      console.warn('[VaccinationController] Active outbreaks fetch notice:', e.message);
    }

    // Identify High-Risk Areas based on real outbreak cases and low coverage (< 50%)
    const highRiskAreas = [];

    // Outbreak-driven risks
    activeOutbreaks.forEach(c => {
      highRiskAreas.push({
        block: c.farmerLocation?.block || c.block || 'Outbreak Sector',
        village: c.farmerLocation?.village || c.village || 'Outbreak Vicinity',
        riskType: 'Active Outbreak',
        reason: `Confirmed ${c.disease || 'Livestock Outbreak'} (Case ${c.caseId || 'Pending'})`,
        priority: 'Urgent Ring Vaccination Required',
        caseId: c.id || c.caseId
      });
    });

    // Coverage-driven risks (< 50% coverage on active/upcoming drives)
    Object.keys(blockCoverageMap).forEach(blk => {
      const bData = blockCoverageMap[blk];
      const bPct = bData.target > 0 ? Math.round((bData.covered / bData.target) * 100) : 0;
      if (bPct < 50 && bData.target > 0) {
        highRiskAreas.push({
          block: blk,
          village: Array.from(bData.villages).slice(0, 3).join(', ') || 'Multiple Villages',
          riskType: 'Low Vaccination Coverage',
          reason: `Coverage is at ${bPct}% (${bData.covered} of ${bData.target} animals)`,
          priority: 'Dispatch Additional Teams',
          coveragePct: bPct
        });
      }
    });

    const kpisPayload = {
      activeDrives,
      upcomingDrives,
      completedDrives,
      targetAnimals,
      vaccinated: vaccinatedAnimals,
      vaccinatedAnimals,
      pendingVaccinations,
      coveragePct,
      highRiskAreas,
      highRiskAreasCount: highRiskAreas.length,
      district: district || 'Nagpur',
      totalDrives: (drives || []).length,
      dataUnavailable: (drives || []).length === 0
    };

    res.status(200).json({
      success: true,
      data: kpisPayload,
      kpis: kpisPayload
    });
  } catch (error) {
    console.error('[VaccinationController] GET OFFICER KPIS ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'VACCINATION_KPIS_FETCH_FAILED',
      message: 'Unable to retrieve vaccination KPI statistics.'
    });
  }
};

// @desc    Get real Supabase staff (Veterinarians and Field Workers) with availability
// @route   GET /api/vaccination-drives/available-staff
// @access  Private (Officer, Admin)
exports.getAvailableStaff = async (req, res, next) => {
  try {
    const district = req.query.district || req.user?.district || 'Nagpur';

    let profiles = [];
    if (supabaseDb.profiles) {
      const vets = await supabaseDb.profiles.find({ role: 'veterinarian' });
      const workers = await supabaseDb.profiles.find({ role: 'field_worker' });
      profiles = [...(vets || []), ...(workers || [])];
    }

    if (district && district !== 'All') {
      profiles = profiles.filter(p => !p.district || p.district.toLowerCase().includes(district.toLowerCase()));
    }

    const formattedStaff = profiles.map(p => {
      const isAvail = p.isAvailable !== false && p.availability !== 'OFFLINE' && p.isActive !== false;
      return {
        id: p.id || p._id,
        name: p.name || 'Veterinary Staff',
        role: p.role,
        roleLabel: p.role === 'veterinarian' ? 'Veterinary Officer / Doctor' : 'Community Field Worker',
        district: p.district || 'Nagpur',
        block: p.block || '',
        village: p.village || '',
        phone: p.phone || '',
        email: p.email || '',
        specialization: p.specialization || (p.role === 'veterinarian' ? 'Livestock Epidemiology & Medicine' : 'Field Operations & Vaccination'),
        availability: p.availability || (isAvail ? 'AVAILABLE' : 'OFFLINE'),
        isAvailable: isAvail
      };
    });

    const veterinarians = formattedStaff.filter(s => s.role === 'veterinarian');
    const fieldWorkers = formattedStaff.filter(s => s.role === 'field_worker');

    res.status(200).json({
      success: true,
      count: formattedStaff.length,
      staff: formattedStaff,
      veterinarians,
      fieldWorkers
    });
  } catch (error) {
    console.error('[VaccinationController] GET AVAILABLE STAFF ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'STAFF_FETCH_FAILED',
      message: 'Failed to retrieve veterinary and field staff profiles.'
    });
  }
};

// @desc    Assign veterinarians or field workers to a campaign
// @route   POST /api/vaccination-drives/:id/assign-team
// @access  Private (Officer, Admin)
exports.assignTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId, staffName, role, notes, vetIds, workerIds } = req.body;

    const drive = await supabaseDb.vaccinationDrives.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination campaign not found.'
      });
    }

    const timestampStr = new Date().toISOString().split('T')[0];
    let updatedNotes = drive.notes || '';
    let updatedAssignedVets = Array.isArray(drive.assignedVets || drive.assigned_vets)
      ? [...(drive.assignedVets || drive.assigned_vets)]
      : [];
    let updatedAssignedWorkers = Array.isArray(drive.assignedFieldWorkers || drive.assigned_field_workers)
      ? [...(drive.assignedFieldWorkers || drive.assigned_field_workers)]
      : [];
    let primaryOfficerName = drive.assignedOfficer;
    let primaryOfficerId = drive.assignedOfficerId;

    // Handle batch team assignment (vetIds, workerIds)
    if (Array.isArray(vetIds) || Array.isArray(workerIds)) {
      if (Array.isArray(vetIds)) {
        for (const vId of vetIds) {
          if (!updatedAssignedVets.includes(vId)) {
            updatedAssignedVets.push(vId);
            try {
              const p = await supabaseDb.profiles.findById(vId);
              if (p) {
                if (!primaryOfficerName) {
                  primaryOfficerName = p.name;
                  primaryOfficerId = p.id;
                }
                const entry = `[Veterinarian Assigned]: ${p.name} on ${timestampStr}`;
                updatedNotes = updatedNotes ? `${updatedNotes}\n${entry}` : entry;
              }
            } catch (e) { }
          }
        }
      }

      if (Array.isArray(workerIds)) {
        for (const wId of workerIds) {
          if (!updatedAssignedWorkers.includes(wId)) {
            updatedAssignedWorkers.push(wId);
            try {
              const p = await supabaseDb.profiles.findById(wId);
              if (p) {
                const entry = `[Field Worker Assigned]: ${p.name} on ${timestampStr}`;
                updatedNotes = updatedNotes ? `${updatedNotes}\n${entry}` : entry;
              }
            } catch (e) { }
          }
        }
      }
    } else {
      // Handle single staff assignment (from UI modal)
      let assignedName = staffName;
      let assignedId = staffId;

      if (staffId) {
        const staffProfile = await supabaseDb.profiles.findById(staffId);
        if (!staffProfile) {
          return res.status(404).json({
            success: false,
            error: 'STAFF_NOT_FOUND',
            message: 'Selected staff profile not found.'
          });
        }

        if (staffProfile.isAvailable === false || staffProfile.availability === 'OFFLINE' || staffProfile.isActive === false) {
          return res.status(400).json({
            success: false,
            error: 'STAFF_UNAVAILABLE',
            message: `Staff member ${staffProfile.name} is currently marked as unavailable or offline.`
          });
        }

        assignedName = staffProfile.name;
        assignedId = staffProfile.id || staffProfile._id;
        if (staffProfile.role === 'veterinarian' && !updatedAssignedVets.includes(assignedId)) {
          updatedAssignedVets.push(assignedId);
        } else if (staffProfile.role === 'field_worker' && !updatedAssignedWorkers.includes(assignedId)) {
          updatedAssignedWorkers.push(assignedId);
        }
      }

      if (!assignedName) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_STAFF_INFO',
          message: 'Please select a staff member or enter a team name.'
        });
      }

      primaryOfficerName = assignedName;
      primaryOfficerId = assignedId || null;
      const assignmentEntry = `[Team Assigned]: ${assignedName} (${role || 'Lead Response Staff'}) on ${timestampStr}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${assignmentEntry}` : assignmentEntry;
    }

    const updated = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, {
      assignedOfficer: primaryOfficerName,
      assignedOfficerId: primaryOfficerId || null,
      notes: updatedNotes
    });

    const enrichedDrive = {
      ...(updated || drive),
      assignedVets: updatedAssignedVets,
      assignedFieldWorkers: updatedAssignedWorkers,
      assigned_vets: updatedAssignedVets,
      assigned_field_workers: updatedAssignedWorkers
    };

    res.status(200).json({
      success: true,
      message: `Team member ${primaryOfficerName || 'Staff'} assigned to vaccination campaign successfully.`,
      drive: enrichedDrive
    });
  } catch (error) {
    console.error('[VaccinationController] ASSIGN TEAM ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'TEAM_ASSIGNMENT_FAILED',
      message: 'Failed to assign staff to vaccination campaign.'
    });
  }
};

// @desc    Update campaign status (Scheduled -> Active/Ongoing -> Completed)
// @route   PATCH /api/vaccination-drives/:id/status
// @access  Private (Officer, Admin)
exports.updateCampaignStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowedStatuses = ['Upcoming', 'Scheduled', 'Ongoing', 'Active', 'Completed'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Invalid campaign status. Must be one of: ${allowedStatuses.join(', ')}.`
      });
    }

    const drive = await supabaseDb.vaccinationDrives.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination campaign not found.'
      });
    }

    const timestampStr = new Date().toISOString();
    const actorName = req.user ? req.user.name : 'Officer';
    const statusNote = `[Status Change -> ${status}] by ${actorName} at ${timestampStr}${notes ? ` - ${notes}` : ''}`;
    const updatedNotes = drive.notes ? `${drive.notes}\n${statusNote}` : statusNote;

    const updatePayload = {
      status,
      notes: updatedNotes
    };

    if (status === 'Completed' && !drive.endDate) {
      updatePayload.endDate = timestampStr;
    }

    const updated = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, updatePayload);

    res.status(200).json({
      success: true,
      message: `Campaign status updated to ${status} successfully.`,
      drive: updated || drive
    });
  } catch (error) {
    console.error('[VaccinationController] UPDATE STATUS ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'CAMPAIGN_STATUS_UPDATE_FAILED',
      message: 'Failed to update campaign status.'
    });
  }
};

// @desc    Close and archive a vaccination campaign
// @route   POST /api/vaccination-drives/:id/close
// @access  Private (Officer, Admin)
exports.closeCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const drive = await supabaseDb.vaccinationDrives.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination campaign not found.'
      });
    }

    const actorName = req.user ? req.user.name : 'Officer';
    const closureEntry = `[Campaign Closed] Completed by ${actorName} on ${new Date().toISOString()}${notes ? ` - ${notes}` : ''}`;
    const updatedNotes = drive.notes ? `${drive.notes}\n${closureEntry}` : closureEntry;

    const updated = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, {
      status: 'Completed',
      endDate: new Date().toISOString(),
      notes: updatedNotes
    });

    res.status(200).json({
      success: true,
      message: 'Vaccination campaign closed and archived successfully.',
      drive: updated || drive
    });
  } catch (error) {
    console.error('[VaccinationController] CLOSE CAMPAIGN ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'CAMPAIGN_CLOSURE_FAILED',
      message: 'Failed to close vaccination campaign.'
    });
  }
};

// @desc    Record actual administered vaccination dose against a campaign
// @route   POST /api/vaccination-drives/:id/record-vaccination
// @access  Private (Officer, Field Worker, Veterinarian, Admin)
exports.recordVaccinationDose = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      animalId,
      dosesAdministered = 1,
      batchNumber,
      administeredBy,
      notes
    } = req.body;

    const drive = await supabaseDb.vaccinationDrives.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination campaign not found.'
      });
    }

    const countToAdd = Math.max(1, parseInt(dosesAdministered, 10) || 1);
    const currentCovered = parseInt(drive.coveredCount || 0, 10);
    const targetCount = parseInt(drive.targetCount || drive.capacity || 200, 10);
    const newCovered = currentCovered + countToAdd;
    const newRemaining = Math.max(0, targetCount - newCovered);

    let newStatus = drive.status;
    if (newCovered >= targetCount && drive.status !== 'Completed') {
      newStatus = 'Completed';
    } else if (drive.status === 'Scheduled' || drive.status === 'Upcoming') {
      newStatus = 'Ongoing';
    }

    const updatedDrive = await supabaseDb.vaccinationDrives.update(drive.id || drive._id, {
      coveredCount: newCovered,
      remainingSlots: newRemaining,
      status: newStatus
    });

    let createdVaccination = null;
    if (animalId && supabaseDb.animalVaccinations) {
      try {
        createdVaccination = await supabaseDb.animalVaccinations.create({
          animalId,
          vaccineName: drive.vaccineFullName || drive.vaccine,
          date: new Date().toISOString(),
          status: 'Completed',
          dose: 'Primary Dose',
          batchNumber: batchNumber || 'BATCH-2026-GOVT',
          administeredBy: administeredBy || req.user?.name || 'Veterinary Officer',
          camp: `${drive.campId || ''} - ${drive.venue || drive.village || ''}`,
          notes: notes || 'Administered during district vaccination campaign'
        });
      } catch (ve) {
        console.warn('[VaccinationController] Animal vaccination insert notice:', ve.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `${countToAdd} vaccination dose(s) recorded successfully.`,
      drive: updatedDrive || drive,
      coveredCount: newCovered,
      remainingSlots: newRemaining,
      coveragePercentage: Math.min(100, Math.round((newCovered / targetCount) * 100)),
      vaccinationRecord: createdVaccination
    });
  } catch (error) {
    console.error('[VaccinationController] RECORD VACCINATION ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'VACCINATION_RECORD_FAILED',
      message: 'Failed to record vaccination dose.'
    });
  }
};

// @desc    Get real block and village level coverage analytics for Officer monitoring
// @route   GET /api/vaccination-drives/coverage-analytics
// @access  Private (Officer, Admin)
exports.getCoverageAnalytics = async (req, res, next) => {
  try {
    const district = req.query.district || req.user?.district || 'Nagpur';

    const drives = await supabaseDb.vaccinationDrives.find({
      district: district && district !== 'All' ? district : undefined
    });

    const blockMap = {};
    const villageMap = {};

    let totalTarget = 0;
    let totalCovered = 0;

    (drives || []).forEach(d => {
      const blk = d.block || 'General Sector';
      const vil = d.village || 'General Area';
      const target = parseInt(d.targetCount || d.capacity || 0, 10);
      const covered = parseInt(d.coveredCount || 0, 10);

      totalTarget += target;
      totalCovered += covered;

      if (!blockMap[blk]) {
        blockMap[blk] = { block: blk, target: 0, covered: 0, drivesCount: 0 };
      }
      blockMap[blk].target += target;
      blockMap[blk].covered += covered;
      blockMap[blk].drivesCount++;

      const vKey = `${blk}::${vil}`;
      if (!villageMap[vKey]) {
        villageMap[vKey] = { village: vil, block: blk, target: 0, covered: 0 };
      }
      villageMap[vKey].target += target;
      villageMap[vKey].covered += covered;
    });

    const blockCoverage = Object.values(blockMap).map(b => ({
      ...b,
      coveragePct: b.target > 0 ? Math.min(100, Math.round((b.covered / b.target) * 100)) : 0
    })).sort((a, b) => a.coveragePct - b.coveragePct);

    const villageCoverage = Object.values(villageMap).map(v => ({
      ...v,
      coveragePct: v.target > 0 ? Math.min(100, Math.round((v.covered / v.target) * 100)) : 0
    })).sort((a, b) => a.coveragePct - b.coveragePct);

    // Actionable low-coverage priority areas
    const priorityAreas = villageCoverage
      .filter(v => v.coveragePct < 50 && v.target > 0)
      .map(v => ({
        village: v.village,
        block: v.block,
        coveragePct: v.coveragePct,
        target: v.target,
        covered: v.covered,
        pending: Math.max(0, v.target - v.covered),
        recommendation: `Prioritize ${v.village} (${v.block}) — ${v.coveragePct}% coverage (${v.covered}/${v.target} protected). Deploy mobile vaccination unit.`
      }));

    const analyticsPayload = {
      district,
      overall: {
        totalTarget,
        totalCovered,
        coveragePct: totalTarget > 0 ? Math.min(100, Math.round((totalCovered / totalTarget) * 100)) : 0,
        pending: Math.max(0, totalTarget - totalCovered)
      },
      blockCoverage,
      villageCoverage,
      priorityAreas
    };

    res.status(200).json({
      success: true,
      data: analyticsPayload,
      ...analyticsPayload
    });
  } catch (error) {
    console.error('[VaccinationController] COVERAGE ANALYTICS ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'COVERAGE_ANALYTICS_FAILED',
      message: 'Failed to calculate coverage analytics.'
    });
  }
};

// @desc    Get active outbreak cases from Supabase for Ring Vaccination scheduling
// @route   GET /api/vaccination-drives/active-outbreaks
// @access  Private (Officer, Admin)
exports.getActiveOutbreaks = async (req, res, next) => {
  try {
    const district = req.query.district || req.user?.district || 'Nagpur';

    let cases = [];
    if (supabaseDb.diseaseCases) {
      const allCases = await supabaseDb.diseaseCases.find({
        districtId: district && district !== 'All' ? district : undefined
      });
      cases = (allCases || []).filter(c => {
        const st = String(c.status || '').toLowerCase();
        return st !== 'resolved' && st !== 'closed';
      });
    }

    const formattedCases = cases.map(c => ({
      id: c.id || c.caseId,
      caseId: c.caseId || `CASE-${c.id?.slice(0, 8)}`,
      disease: c.disease || 'Livestock Disease Outbreak',
      species: c.species || 'Cattle',
      district: c.districtId || c.district || 'Nagpur',
      block: c.farmerLocation?.block || c.block || 'Outbreak Sector',
      village: c.farmerLocation?.village || c.village || 'Outbreak Site',
      latitude: parseFloat(c.latitude || c.farmerLocation?.lat || 21.1458),
      longitude: parseFloat(c.longitude || c.farmerLocation?.lng || 79.0882),
      affectedCount: c.affectedCount || 1,
      status: c.status || 'New',
      ringVaccinationDriveId: c.ringVaccinationDriveId || null,
      createdAt: c.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedCases.length,
      cases: formattedCases
    });
  } catch (error) {
    console.error('[VaccinationController] GET ACTIVE OUTBREAKS ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'ACTIVE_OUTBREAKS_FETCH_FAILED',
      message: 'Failed to retrieve active outbreak cases.'
    });
  }
};

// @desc    Establish Outbreak-Driven Ring Vaccination Campaign
// @route   POST /api/vaccination-drives/ring-campaign
// @access  Private (Officer, Admin)
exports.createRingCampaign = async (req, res, next) => {
  try {
    const {
      caseId,
      radiusKm = 5.0,
      capacity = 300,
      targetSpecies,
      venue,
      startDate,
      endDate,
      assignedOfficerId,
      assignedOfficer,
      notes
    } = req.body;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CASE_ID',
        message: 'Confirmed outbreak case ID is required for ring vaccination.'
      });
    }

    const radius = parseFloat(radiusKm);
    if (isNaN(radius) || radius < 0.5 || radius > 50.0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RADIUS',
        message: 'Supported ring vaccination radius must be between 0.5 km and 50.0 km.'
      });
    }

    const caseDoc = await supabaseDb.diseaseCases.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: 'CASE_NOT_FOUND',
        message: 'Outbreak case not found in registry.'
      });
    }

    // Duplicate Ring Campaign Protection
    if (caseDoc.ringVaccinationDriveId) {
      const existingDrive = await supabaseDb.vaccinationDrives.findById(caseDoc.ringVaccinationDriveId);
      if (existingDrive && existingDrive.status !== 'Completed') {
        return res.status(409).json({
          success: false,
          error: 'RING_CAMPAIGN_ALREADY_EXISTS',
          message: `An active ring vaccination campaign (${existingDrive.campId || existingDrive.id}) is already assigned to this outbreak case.`,
          existingDrive
        });
      }
    }

    const diseaseName = caseDoc.disease || 'Epidemic Disease';
    const vaccineName = getVaccineForDisease(diseaseName);
    const distPrefix = (caseDoc.districtId || caseDoc.district || 'DIS').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DIS');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const campId = `RING-CAMP-2026-${distPrefix}-${randomSuffix}`;

    const parsedCapacity = parseInt(capacity, 10) > 0 ? parseInt(capacity, 10) : 300;
    const scheduledStart = startDate ? new Date(startDate) : new Date();

    const officerName = assignedOfficer || (req.user ? req.user.name : 'District Animal Husbandry Officer');
    const officerId = assignedOfficerId || (req.user ? (req.user.id || req.user._id) : null);

    const ringNotes = notes || `Outbreak-driven ring vaccination (${radius}km perimeter) for Case ${caseDoc.caseId || caseDoc.id} (${diseaseName}).`;

    const drive = await supabaseDb.vaccinationDrives.create({
      campId,
      state: caseDoc.state || 'Maharashtra',
      district: caseDoc.districtId || caseDoc.district || 'Nagpur',
      block: caseDoc.farmerLocation?.block || caseDoc.block || 'Outbreak Sector',
      village: caseDoc.farmerLocation?.village || caseDoc.village || 'Containment Perimeter',
      venue: venue || `Emergency Ring Vaccination Center - ${caseDoc.farmerLocation?.village || caseDoc.village || 'Outbreak Site'}`,
      latitude: caseDoc.latitude || 21.1458,
      longitude: caseDoc.longitude || 79.0882,
      vaccine: vaccineName,
      vaccineFullName: vaccineName,
      targetSpecies: targetSpecies || caseDoc.species || 'Cattle & Buffalo',
      campDate: scheduledStart.toISOString(),
      startDate: scheduledStart.toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      startTime: '08:30 AM',
      endTime: '05:00 PM',
      cost: 'Free (Emergency Govt Outbreak Ring)',
      isFree: true,
      organizingHospital: 'District Animal Husbandry Taskforce & Veterinary Polyclinic',
      assignedOfficer: officerName,
      assignedOfficerId: officerId,
      contactNumber: req.user?.phone || '1962',
      capacity: parsedCapacity,
      targetCount: parsedCapacity,
      bookedSlots: 0,
      remainingSlots: parsedCapacity,
      coveredCount: 0,
      status: 'Scheduled',
      notes: ringNotes
    });

    // Link campaign to case in Supabase
    try {
      await supabaseDb.diseaseCases.updateStatus(
        caseDoc.id || caseDoc.caseId,
        caseDoc.status,
        `Emergency Ring Vaccination Drive established (${campId} - ${vaccineName}).`,
        officerId,
        officerName,
        { ringVaccinationDriveId: drive.id }
      );
    } catch (linkErr) {
      console.warn('[VaccinationController] Link to case notice:', linkErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Emergency ring vaccination campaign ${campId} scheduled successfully.`,
      drive,
      case: caseDoc
    });
  } catch (error) {
    console.error('[VaccinationController] CREATE RING CAMPAIGN ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'RING_CAMPAIGN_CREATE_FAILED',
      message: 'Failed to schedule emergency ring vaccination campaign.'
    });
  }
};

// @desc    Delete a vaccination campaign (for test data cleanup or decommissioning)
// @route   DELETE /api/vaccination-drives/:id
// @access  Private (Officer, Admin)
exports.deleteVaccinationDrive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await supabaseDb.vaccinationDrives.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'DRIVE_NOT_FOUND',
        message: 'Vaccination drive not found.'
      });
    }

    await supabaseDb.vaccinationDrives.delete(drive.id || drive._id);

    res.status(200).json({
      success: true,
      message: 'Vaccination drive removed successfully.'
    });
  } catch (error) {
    console.error('[VaccinationController] DELETE DRIVE ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: 'DRIVE_DELETE_FAILED',
      message: 'Failed to delete vaccination drive.'
    });
  }
};
