// Controller for PS-128 Disease-to-Veterinarian Referral & Outbreak Response System
const mongoose = require('mongoose');
const supabaseDb = require('../services/supabaseDb');
const DiseaseCase = require('../models/DiseaseCase');
const ContainmentZone = require('../models/ContainmentZone');
const VaccinationDrive = require('../models/VaccinationDrive');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Animal = require('../models/Animal');
const geocodingService = require('../services/geocodingService');
const notificationService = require('../services/notificationService');
const gisService = require('../services/gisService');
const realtimeHub = require('../services/realtimeHub');

// Helper to escape regex special characters
function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Map disease name to appropriate emergency ring vaccine
function getVaccineForDisease(disease = '') {
  const d = disease.toLowerCase();
  if (d.includes('lumpy')) {
    return 'Lumpy Skin Disease (Neethling strain)';
  }
  if (d.includes('foot') || d.includes('fmd') || d.includes('mouth')) {
    return 'FMD Trivalent Inactivated Adjuvanted Vaccine';
  }
  if (d.includes('blackleg')) {
    return 'Clostridium Chauvoei Bacterin (Blackleg Vaccine)';
  }
  if (d.includes('anthrax')) {
    return 'Anthrax Spore Live Vaccine (Sterne Strain)';
  }
  if (d.includes('brucellosis') || d.includes('brucella')) {
    return 'Brucella Abortus S19 Vaccine';
  }
  if (d.includes('haemorrhagic') || d.includes('hs')) {
    return 'HS Alum-Precipitated Vaccine';
  }
  return `${disease} Ring Vaccination Vaccine`;
}

/**
 * @desc    Create a new disease referral case (from AI diagnosis or Field Worker log)
 * @route   POST /api/cases
 * @access  Private (Farmer, Field Worker, Veterinarian, Officer)
 */
exports.createCase = async (req, res) => {
  try {
    const {
      animalId,
      animalName,
      species,
      image,
      disease,
      confidence,
      risk,
      coordinates,
      symptoms,
      temperature,
      duration,
      affectedCount,
      notes,
      clinicalDiagnosis,
      investigationNotes,
      initialStatus,
      farmerName,
      farmerPhone,
      village,
      block,
      district: explicitDistrict
    } = req.body;

    if (!disease) {
      return res.status(400).json({
        success: false,
        message: 'Disease name is required to create a clinical referral case.'
      });
    }

    const isVetStaff = ['field_worker', 'veterinarian', 'officer', 'admin'].includes(req.user.role);

    // 1. Resolve coordinates
    let lat = coordinates?.lat ? parseFloat(coordinates.lat) : (req.user?.location?.lat || 18.5204);
    let lng = coordinates?.lng ? parseFloat(coordinates.lng) : (req.user?.location?.lng || 73.8567);

    // 2. Dynamic District Identification (Never hardcoded)
    let detectedDistrict = explicitDistrict ? explicitDistrict.trim() : '';
    let detectedState = req.user?.state || 'Maharashtra';
    let detectedBlock = block || req.user?.block || '';
    let detectedVillage = village || req.user?.village || '';

    if (lat && lng && !detectedDistrict) {
      try {
        const geoInfo = await geocodingService.reverseGeocode(lat, lng);
        if (geoInfo && geoInfo.district) {
          detectedDistrict = geoInfo.district;
          detectedState = geoInfo.state || detectedState;
          detectedBlock = detectedBlock || geoInfo.block || '';
          detectedVillage = detectedVillage || geoInfo.village || '';
        }
      } catch (geoErr) {
        console.warn('[CaseController] Geocoding lookup failed, falling back to user profile:', geoErr.message);
      }
    }

    // Fallback to user's registered district if geo detection didn't return one
    if (!detectedDistrict) {
      detectedDistrict = req.user?.district || 'Pune';
    }

    // 3. Generate human-friendly Unique Case ID
    const distPrefix = detectedDistrict.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DIS');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const caseId = `CASE-2026-${distPrefix}-${randomSuffix}`;

    // 4. Find ALL active veterinary officials matching this district
    const districtRegex = new RegExp(`^${escapeRegex(detectedDistrict.trim())}$`, 'i');
    const matchingVets = await User.find({
      role: { $in: ['field_worker', 'veterinarian', 'officer'] },
      district: districtRegex,
      isActive: { $ne: false }
    }).select('_id name phone email district block role registrationNo department');

    // 5. Determine initial status and assignment
    // Canonical 5 stages: New -> Investigating -> Confirmed -> Containment -> Resolved
    let targetStatus = 'New';
    let assignedVet = null;
    let acceptedAtTime = null;
    let confirmedAtTime = null;

    if (isVetStaff && initialStatus) {
      const allowedInit = ['New', 'Investigating', 'Confirmed', 'OPEN', 'ACCEPTED'];
      if (allowedInit.includes(initialStatus)) {
        targetStatus = initialStatus;
        if (['Investigating', 'Confirmed', 'ACCEPTED'].includes(initialStatus)) {
          assignedVet = req.user._id;
          acceptedAtTime = new Date();
          if (initialStatus === 'Confirmed') {
            confirmedAtTime = new Date();
          }
        }
      }
    }

    const countAffected = parseInt(affectedCount, 10) > 0 ? parseInt(affectedCount, 10) : 1;

    // Contact info
    const contactName = isVetStaff && farmerName ? farmerName : (req.user.name || 'Farmer');
    const contactPhone = isVetStaff && farmerPhone ? farmerPhone : (req.user.phone || '');

    // 6. Create the DiseaseCase in MongoDB
    const safeAnimalId = animalId && mongoose.Types.ObjectId.isValid(animalId) ? animalId : null;
    const newCase = await DiseaseCase.create({
      caseId,
      farmerId: req.user._id,
      animalId: safeAnimalId,
      animalName: animalName || '',
      species: species || 'Cattle',
      image: image || '',
      disease,
      confidence: confidence ? Math.round(Number(confidence)) : 88,
      risk: risk || 'High',
      districtId: detectedDistrict,
      state: detectedState,
      coordinates: { lat, lng },
      farmerLocation: {
        village: detectedVillage,
        block: detectedBlock,
        district: detectedDistrict,
        state: detectedState
      },
      farmerContact: {
        name: contactName,
        phone: contactPhone
      },
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      temperature: parseFloat(temperature || 0),
      duration: parseFloat(duration || 0),
      affectedCount: countAffected,
      notes: notes || '',
      clinicalDiagnosis: clinicalDiagnosis || '',
      investigationNotes: investigationNotes || '',
      status: targetStatus,
      assignedVetId: assignedVet,
      acceptedAt: acceptedAtTime,
      confirmedAt: confirmedAtTime,
      timeline: [
        {
          status: targetStatus,
          updatedBy: req.user._id,
          updaterName: req.user.name,
          timestamp: new Date(),
          notes: isVetStaff
            ? `Case logged directly by veterinary official ${req.user.name} (${disease} - ${targetStatus}).`
            : `Referral case initiated following AI detection (${disease} - ${confidence || 88}% confidence).`
        }
      ]
    });

    // 7. Notify all matching veterinarians in the district via SSE and persistent queue
    const notifiedRecords = await notificationService.notifyDistrictVets(newCase, matchingVets);

    // Save notified vets onto the case document
    newCase.notifiedVets = notifiedRecords;
    await newCase.save();

    // Populate for immediate frontend rendering
    await newCase.populate('farmerId', 'name phone village block district');
    if (assignedVet) {
      await newCase.populate('assignedVetId', 'name phone email registrationNo department');
    }

    // Module 6: Dual-write Disease Case to Supabase PostgreSQL
    try {
      await supabaseDb.diseaseCases.create({
        caseId: newCase.caseId,
        farmerId: String(req.user._id || req.user.id),
        animalId: animalId || null,
        animalName: animalName || '',
        species: species || 'Cattle',
        imageUrl: image || '',
        disease,
        confidence: confidence ? Math.round(Number(confidence)) : 88,
        risk: risk || 'High',
        districtId: detectedDistrict,
        state: detectedState,
        latitude: lat,
        longitude: lng,
        symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
        temperature: parseFloat(temperature || 0),
        duration: parseFloat(duration || 0),
        affectedCount: countAffected,
        notes: notes || '',
        status: targetStatus,
        assignedVetId: assignedVet ? String(assignedVet) : null
      });
    } catch (sbErr) {
      console.warn('[CaseController] Supabase dual-write notice:', sbErr.message);
    }

    try {
      await realtimeHub.notifyCaseCreated(newCase, matchingVets);
    } catch (rtErr) {}

    res.status(201).json({
      success: true,
      message: `Case ${caseId} created successfully.`,
      case: newCase,
      matchingVetsCount: matchingVets.length,
      matchingVets: matchingVets.map((v) => ({ id: v._id, name: v.name, role: v.role }))
    });
  } catch (err) {
    console.error('[CaseController] Error creating case:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create disease referral case.',
      error: err.message
    });
  }
};

/**
 * @desc    Get referral cases with role-based filtering & security
 * @route   GET /api/cases
 * @access  Private (Farmers see their own; Vets see district cases; Admin sees all)
 */
exports.getCases = async (req, res) => {
  try {
    const { status, filter, district, disease, limit = 100 } = req.query;
    let query = {};

    if (req.user.role === 'farmer') {
      // Farmers see their own cases
      query.farmerId = req.user._id;
      if (status) {
        if (status === 'New' || status === 'OPEN') {
          query.status = { $in: ['New', 'OPEN'] };
        } else if (status === 'Investigating' || status === 'ACCEPTED') {
          query.status = { $in: ['Investigating', 'ACCEPTED'] };
        } else if (status === 'Containment' || status === 'IN_TREATMENT') {
          query.status = { $in: ['Containment', 'IN_TREATMENT'] };
        } else if (status === 'Resolved' || status === 'RESOLVED') {
          query.status = { $in: ['Resolved', 'RESOLVED'] };
        } else {
          query.status = status;
        }
      }
    } else if (['field_worker', 'veterinarian', 'officer'].includes(req.user.role)) {
      // Veterinarians: Can see open/district cases or cases assigned to them
      const targetDistrict = district || req.user.district || 'Pune';
      const userDistrictRegex = new RegExp(`^${escapeRegex(targetDistrict.trim())}$`, 'i');

      if (filter === 'my_cases' || filter === 'assigned') {
        query.assignedVetId = req.user._id;
      } else if (filter === 'open' || filter === 'new') {
        query.status = { $in: ['New', 'OPEN'] };
        query.districtId = userDistrictRegex;
      } else {
        query.$or = [
          { districtId: userDistrictRegex },
          { assignedVetId: req.user._id }
        ];
      }

      if (status && !query.status) {
        if (status === 'New' || status === 'OPEN') {
          query.status = { $in: ['New', 'OPEN'] };
        } else if (status === 'Investigating' || status === 'ACCEPTED') {
          query.status = { $in: ['Investigating', 'ACCEPTED'] };
        } else if (status === 'Containment' || status === 'IN_TREATMENT') {
          query.status = { $in: ['Containment', 'IN_TREATMENT'] };
        } else if (status === 'Resolved' || status === 'RESOLVED') {
          query.status = { $in: ['Resolved', 'RESOLVED'] };
        } else {
          query.status = status;
        }
      }
    } else if (req.user.role === 'admin') {
      if (district) {
        query.districtId = new RegExp(`^${escapeRegex(district.trim())}$`, 'i');
      }
      if (status) {
        if (status === 'New' || status === 'OPEN') {
          query.status = { $in: ['New', 'OPEN'] };
        } else if (status === 'Investigating' || status === 'ACCEPTED') {
          query.status = { $in: ['Investigating', 'ACCEPTED'] };
        } else if (status === 'Containment' || status === 'IN_TREATMENT') {
          query.status = { $in: ['Containment', 'IN_TREATMENT'] };
        } else if (status === 'Resolved' || status === 'RESOLVED') {
          query.status = { $in: ['Resolved', 'RESOLVED'] };
        } else {
          query.status = status;
        }
      }
    }

    if (disease) {
      query.disease = new RegExp(`^${escapeRegex(disease.trim())}$`, 'i');
    }

    const cases = await DiseaseCase.find(query)
      .populate('farmerId', 'name phone village block district')
      .populate('assignedVetId', 'name phone email registrationNo department')
      .populate('animalId', 'tagId name species breed')
      .populate('containmentZoneId')
      .populate('ringVaccinationDriveId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 100);

    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (err) {
    console.error('[CaseController] Error fetching cases:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve referral cases.',
      error: err.message
    });
  }
};

/**
 * @desc    Get single case by ID
 * @route   GET /api/cases/:id
 * @access  Private
 */
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    let caseDoc;

    if (id.startsWith('CASE-')) {
      caseDoc = await DiseaseCase.findOne({ caseId: id });
    } else {
      caseDoc = await DiseaseCase.findById(id);
    }

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Disease referral case not found.'
      });
    }

    // Authorization checks
    if (req.user.role === 'farmer') {
      if (!caseDoc.farmerId.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view another farmer\'s case.'
        });
      }
    } else if (['field_worker', 'veterinarian', 'officer'].includes(req.user.role)) {
      const userDistrict = (req.user.district || '').toLowerCase().trim();
      const caseDistrict = (caseDoc.districtId || '').toLowerCase().trim();
      const isAssigned = caseDoc.assignedVetId && caseDoc.assignedVetId.equals(req.user._id);

      if (userDistrict !== caseDistrict && !isAssigned && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Case is registered in a different veterinary jurisdiction.'
        });
      }
    }

    await caseDoc.populate('farmerId', 'name phone village block district');
    await caseDoc.populate('assignedVetId', 'name phone email registrationNo department');
    await caseDoc.populate('animalId', 'tagId name species breed');
    await caseDoc.populate('containmentZoneId');
    await caseDoc.populate('ringVaccinationDriveId');

    res.json({
      success: true,
      case: caseDoc
    });
  } catch (err) {
    console.error('[CaseController] Error fetching case details:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve case details.',
      error: err.message
    });
  }
};

/**
 * @desc    Atomic Case Claim & Assignment (Race-Condition Free)
 *          New/OPEN -> Investigating (Assigned to first responding vet)
 * @route   PATCH /api/cases/:id/claim
 * @access  Private (Veterinarians / Field Workers only)
 */
exports.claimCase = async (req, res) => {
  try {
    const { id } = req.params;

    if (!['field_worker', 'veterinarian', 'officer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only registered veterinary officials can claim cases.'
      });
    }

    const caseQuery = id.startsWith('CASE-') ? { caseId: id } : (mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { caseId: id });
    const existingCheck = await DiseaseCase.findOne(caseQuery);
    if (!existingCheck) {
      return res.status(404).json({
        success: false,
        message: 'Referral case not found.'
      });
    }

    const userDistrict = (req.user.district || '').toLowerCase().trim();
    const caseDistrict = (existingCheck.districtId || '').toLowerCase().trim();
    if (req.user.role !== 'admin' && userDistrict !== caseDistrict) {
      return res.status(403).json({
        success: false,
        message: `Jurisdiction mismatch: You are in ${req.user.district}, but this case is in ${existingCheck.districtId}.`
      });
    }

    // ATOMIC CAS (Compare-And-Swap) in MongoDB
    // Matches if status is 'New' or legacy 'OPEN' and assignedVetId is null
    const updatedCase = await DiseaseCase.findOneAndUpdate(
      {
        ...caseQuery,
        status: { $in: ['New', 'OPEN'] },
        assignedVetId: null
      },
      {
        $set: {
          status: 'Investigating',
          assignedVetId: req.user._id,
          acceptedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'Investigating',
            updatedBy: req.user._id,
            updaterName: req.user.name,
            timestamp: new Date(),
            notes: `Case claimed by Dr. ${req.user.name}. Clinical investigation initiated.`
          }
        }
      },
      { new: true }
    )
      .populate('farmerId', 'name phone village block district')
      .populate('assignedVetId', 'name phone email registrationNo department')
      .populate('animalId', 'tagId name species breed');

    if (!updatedCase) {
      // Either case does not exist or was ALREADY CLAIMED by another vet!
      const currentCase = await DiseaseCase.findOne(caseQuery).populate('assignedVetId', 'name phone email');

      if (currentCase && !['New', 'OPEN'].includes(currentCase.status)) {
        return res.status(409).json({
          success: false,
          alreadyClaimed: true,
          message: `This case was already claimed by ${currentCase.assignedVetId?.name || 'another veterinarian'}.`,
          assignedVet: currentCase.assignedVetId,
          status: currentCase.status
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Unable to claim case: Case is not in New/OPEN status.'
      });
    }

    // Update notification status for this vet to 'READ'
    await Notification.updateMany(
      { caseId: updatedCase._id, recipientId: req.user._id },
      { $set: { status: 'READ' } }
    );

    // Module 6: Sync claim to Supabase PostgreSQL
    try {
      await supabaseDb.diseaseCases.claimCase(
        updatedCase.caseId || id,
        String(req.user._id || req.user.id),
        req.user.name
      );
    } catch (sbErr) {}

    try {
      await realtimeHub.notifyCaseClaimed(updatedCase, req.user);
    } catch (rtErr) {}

    res.json({
      success: true,
      message: `Case ${updatedCase.caseId} successfully claimed by Dr. ${req.user.name}.`,
      case: updatedCase
    });
  } catch (err) {
    console.error('[CaseController] Error claiming case:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to claim case.',
      error: err.message
    });
  }
};

/**
 * @desc    Update Case Status & Clinical Actions across 5-stage lifecycle
 *          New -> Investigating -> Confirmed -> Containment -> Resolved
 * @route   PATCH /api/cases/:id/status
 * @access  Private (Assigned Veterinarian or Admin)
 */
exports.updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      clinicalDiagnosis,
      affectedCount,
      investigationNotes,
      treatmentNotes,
      prescription,
      notes
    } = req.body;

    const validStatuses = [
      'Investigating',
      'Confirmed',
      'Containment',
      'Resolved',
      'ACCEPTED',
      'IN_TREATMENT',
      'RESOLVED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`
      });
    }

    const caseQuery = id.startsWith('CASE-') ? { caseId: id } : (mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { caseId: id });
    const caseDoc = await DiseaseCase.findOne(caseQuery);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found.'
      });
    }

    // Security check: Must be the assigned vet or an admin
    const isAssignedVet = caseDoc.assignedVetId && caseDoc.assignedVetId.equals(req.user._id);
    if (!isAssignedVet && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned veterinarian can update case status and clinical records.'
      });
    }

    // Canonical status mapping
    let canonicalStatus = status;
    if (status === 'ACCEPTED') canonicalStatus = 'Investigating';
    if (status === 'IN_TREATMENT') canonicalStatus = 'Containment';
    if (status === 'RESOLVED') canonicalStatus = 'Resolved';

    caseDoc.status = canonicalStatus;

    if (canonicalStatus === 'Investigating' && !caseDoc.acceptedAt) {
      caseDoc.acceptedAt = new Date();
    }
    if (canonicalStatus === 'Confirmed' && !caseDoc.confirmedAt) {
      caseDoc.confirmedAt = new Date();
    }
    if (canonicalStatus === 'Containment' && !caseDoc.containmentStartedAt) {
      caseDoc.containmentStartedAt = new Date();
    }
    if (canonicalStatus === 'Resolved') {
      caseDoc.resolvedAt = new Date();
    }

    if (clinicalDiagnosis) caseDoc.clinicalDiagnosis = clinicalDiagnosis;
    if (investigationNotes) caseDoc.investigationNotes = investigationNotes;
    if (treatmentNotes) caseDoc.treatmentNotes = treatmentNotes;
    if (prescription) caseDoc.prescription = prescription;
    if (parseInt(affectedCount, 10) > 0) caseDoc.affectedCount = parseInt(affectedCount, 10);

    const timelineNote =
      notes ||
      `Case transitioned to ${canonicalStatus}.${
        clinicalDiagnosis ? ` Clinical diagnosis: ${clinicalDiagnosis}.` : ''
      }${treatmentNotes ? ' Clinical/Treatment notes updated.' : ''}`;

    caseDoc.timeline.push({
      status: canonicalStatus,
      updatedBy: req.user._id,
      updaterName: req.user.name,
      timestamp: new Date(),
      notes: timelineNote
    });

    await caseDoc.save();
    await caseDoc.populate('farmerId', 'name phone village block district');
    await caseDoc.populate('assignedVetId', 'name phone email registrationNo department');
    await caseDoc.populate('containmentZoneId');
    await caseDoc.populate('ringVaccinationDriveId');

    // Update animal health record if resolved
    if (caseDoc.animalId && canonicalStatus === 'Resolved') {
      try {
        await Animal.findByIdAndUpdate(caseDoc.animalId, {
          healthStatus: 'Recovered',
          lastCheckup: new Date().toLocaleDateString('en-GB')
        });
      } catch (e) {
        console.warn('Could not update animal health record:', e.message);
      }
    }

    // Module 6: Sync status update to Supabase PostgreSQL
    try {
      await supabaseDb.diseaseCases.updateStatus(
        caseDoc.caseId || caseDoc._id.toString(),
        canonicalStatus,
        timelineNote,
        String(req.user._id || req.user.id),
        req.user.name
      );
    } catch (sbErr) {}

    // Broadcast SSE & Supabase Realtime update
    notificationService.notifyCaseUpdate(caseDoc, 'CASE_STATUS_UPDATE');

    try {
      await supabaseDb.auditLogs.log(
        'UPDATE_CASE_STATUS',
        'disease_case',
        caseDoc.caseId || caseDoc._id.toString(),
        String(req.user._id || req.user.id),
        { oldStatus: currentStatus, newStatus: canonicalStatus, note: timelineNote }
      );
    } catch (auditErr) {}

    try {
      await realtimeHub.notifyCaseStatusUpdated(caseDoc, req.user, currentStatus, canonicalStatus);
    } catch (rtErr) {}

    res.json({
      success: true,
      message: `Case ${caseDoc.caseId} updated to ${canonicalStatus}.`,
      case: caseDoc
    });
  } catch (err) {
    console.error('[CaseController] Error updating case status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update case status.',
      error: err.message
    });
  }
};

/**
 * @desc    Get Spatial Outbreak Clusters in District (<= 5km grouping of same disease)
 * @route   GET /api/cases/clusters
 * @access  Private (Veterinarians, Officers, Admin)
 */
exports.getSpatialOutbreakClusters = async (req, res) => {
  try {
    const targetDistrict = req.query.district || req.user.district || 'Pune';
    const distanceKm = parseFloat(req.query.distanceKm || req.query.radiusKm) || 5.0;
    const minCases = parseInt(req.query.minCases, 10) || 2;

    const clusters = await gisService.getOutbreakClusters(targetDistrict, distanceKm, minCases);

    res.json({
      success: true,
      district: targetDistrict,
      count: clusters.length,
      clusters
    });
  } catch (err) {
    console.error('[CaseController] Error generating spatial clusters:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to compute spatial outbreak clusters.',
      error: err.message
    });
  }
};

/**
 * @desc    Get cases within radius (PostGIS ST_DWithin)
 * @route   GET /api/cases/nearby
 * @access  Private
 */
exports.getNearbyCases = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 15, days = 30, district } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude coordinates are required.' });
    }

    const userRole = req.user ? req.user.role : 'farmer';
    const callerId = req.user ? (req.user._id ? req.user._id.toString() : (req.user.id || '')) : '';

    // Enforce role-based radius and query constraints
    let effectiveRadius = parseFloat(radiusKm);
    let maxLimit = 100;
    let effectiveDistrict = district;

    if (userRole === 'farmer') {
      // Farmers capped at 10.0 km radius and 30 cases maximum
      effectiveRadius = Math.min(effectiveRadius || 10.0, 10.0);
      maxLimit = 30;
      // Enforce farmer's own district to prevent cross-district surveillance enumeration
      if (req.user && req.user.district) {
        effectiveDistrict = req.user.district;
      }
    } else if (userRole === 'veterinarian' || userRole === 'field_worker') {
      effectiveRadius = Math.min(effectiveRadius || 15.0, 30.0);
      maxLimit = 100;
    } else {
      effectiveRadius = Math.min(effectiveRadius || 25.0, 100.0);
      maxLimit = 200;
    }

    const rawCases = await gisService.getCasesInRadius(lat, lng, effectiveRadius, days, effectiveDistrict);
    
    // Privacy protection: Fuzz peer farmer coordinates and mask village details
    const cases = rawCases.slice(0, maxLimit).map(c => {
      const isOwnCase = callerId && (c.farmerId === callerId || c.ownerId === callerId);
      if (userRole !== 'farmer' || isOwnCase) {
        return c;
      }
      // Fuzz peer farmer coordinates to protect farm privacy
      const fuzzed = gisService.fuzzCoordinates ? gisService.fuzzCoordinates(c.latitude, c.longitude, 1.5) : {
        lat: Math.round(c.latitude * 100) / 100,
        lng: Math.round(c.longitude * 100) / 100
      };
      return {
        ...c,
        latitude: fuzzed.lat,
        longitude: fuzzed.lng,
        village: 'Vicinity (~1.5km)',
        isFuzzed: true
      };
    });

    res.json({
      success: true,
      count: cases.length,
      radiusKm: effectiveRadius,
      days: parseInt(days, 10),
      cases
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby cases.', error: err.message });
  }
};

/**
 * @desc    On-demand epidemiological risk calculation & surveillance pipeline
 * @route   GET /api/cases/risk-analysis
 * @access  Private
 */
exports.getOutbreakRiskAnalysis = async (req, res) => {
  try {
    const { caseId, lat, lng, disease, affectedCount = 1, district = 'Pune' } = req.query;
    const refLat = parseFloat(lat) || 18.5204;
    const refLng = parseFloat(lng) || 73.8567;

    const nearbyCases = await gisService.getCasesInRadius(refLat, refLng, 15.0, 30, district);
    const containmentInfo = await gisService.getContainmentStatus(refLat, refLng);
    const vaccinationInfo = await gisService.getVaccinationCoverage(refLat, refLng, 10.0);
    const clusters = await gisService.getOutbreakClusters(district, 5.0, 2);

    const riskResult = gisService.calculateOutbreakRisk(
      { caseId, disease, affectedCount: parseInt(affectedCount, 10), status: 'Investigating' },
      nearbyCases,
      clusters,
      containmentInfo,
      vaccinationInfo
    );

    res.json({
      success: true,
      district,
      coordinates: { lat: refLat, lng: refLng },
      riskAnalysis: riskResult,
      nearbyCasesSummary: {
        totalInRadius: nearbyCases.length,
        insideContainment: containmentInfo.insideContainment,
        vaccinationCoveragePct: vaccinationInfo.coveragePercentage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to compute risk analysis.', error: err.message });
  }
};

/**
 * @desc    Create Containment Zone for an Outbreak Case
 * @route   POST /api/cases/containment-zones
 * @access  Private (Veterinarians, Officers, Admin)
 */
exports.createContainmentZone = async (req, res) => {
  try {
    const {
      caseId,
      disease,
      district: explicitDistrict,
      block,
      village,
      center,
      radiusKm,
      enforcedRules,
      notes
    } = req.body;

    let targetDisease = disease;
    let targetDistrict = explicitDistrict || req.user.district || 'Pune';
    let targetBlock = block || '';
    let targetVillage = village || '';
    let targetCenter = center;
    let linkedCase = null;

    if (caseId) {
      linkedCase = await DiseaseCase.findById(caseId);
      if (linkedCase) {
        targetDisease = targetDisease || linkedCase.disease;
        targetDistrict = targetDistrict || linkedCase.districtId;
        targetBlock = targetBlock || linkedCase.farmerLocation?.block || '';
        targetVillage = targetVillage || linkedCase.farmerLocation?.village || '';
        targetCenter = targetCenter || linkedCase.coordinates;
      }
    }

    if (!targetDisease) {
      return res.status(400).json({
        success: false,
        message: 'Disease name is required for containment zone declaration.'
      });
    }

    if (!targetCenter?.lat || !targetCenter?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Center GPS coordinates (lat, lng) are required.'
      });
    }

    const distPrefix = targetDistrict.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DIS');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const zoneId = `ZONE-2026-${distPrefix}-${randomSuffix}`;

    const defaultRules = [
      'Strict quarantine of affected livestock within perimeter',
      'Ban on animal movement, livestock trade, and cattle markets',
      'Daily disinfectant spraying of barns and watering troughs',
      'Immediate ring vaccination within containment buffer'
    ];

    const newZone = await ContainmentZone.create({
      zoneId,
      caseId: linkedCase ? linkedCase._id : null,
      disease: targetDisease,
      district: targetDistrict,
      block: targetBlock,
      village: targetVillage,
      center: {
        lat: parseFloat(targetCenter.lat),
        lng: parseFloat(targetCenter.lng)
      },
      radiusKm: parseFloat(radiusKm) || 5.0,
      status: 'ACTIVE',
      enforcedRules: Array.isArray(enforcedRules) && enforcedRules.length ? enforcedRules : defaultRules,
      createdByVetId: req.user._id,
      creatorName: req.user.name,
      notes: notes || `Containment zone declared by Dr. ${req.user.name} for ${targetDisease} control.`
    });

    // If linked to a case, advance case to 'Containment'
    if (linkedCase) {
      linkedCase.containmentZoneId = newZone._id;
      linkedCase.status = 'Containment';
      linkedCase.containmentStartedAt = new Date();
      linkedCase.timeline.push({
        status: 'Containment',
        updatedBy: req.user._id,
        updaterName: req.user.name,
        timestamp: new Date(),
        notes: `Containment Zone ${zoneId} established (${newZone.radiusKm} km radius).`
      });
      await linkedCase.save();

      // Notify case owner
      notificationService.notifyCaseUpdate(linkedCase, 'CONTAINMENT_ESTABLISHED');
    }

    // Module 10: Dual-write to Supabase PostgreSQL
    try {
      await supabaseDb.containmentZones.create({
        zoneId: newZone.zoneId,
        caseId: linkedCase ? (linkedCase.caseId || linkedCase._id.toString()) : null,
        disease: targetDisease,
        district: targetDistrict,
        block: targetBlock,
        village: targetVillage,
        centerLat: newZone.center?.lat,
        centerLng: newZone.center?.lng,
        radiusKm: newZone.radiusKm,
        status: newZone.status,
        enforcedRules: newZone.enforcedRules,
        createdByVetId: String(req.user._id || req.user.id),
        creatorName: req.user.name
      });
    } catch (sbErr) {}

    // Broadcast to district veterinary network
    notificationService.broadcastToDistrictVets(targetDistrict, 'CONTAINMENT_ZONE_CREATED', {
      zone: newZone,
      timestamp: new Date()
    });

    try {
      await realtimeHub.notifyContainmentZone(newZone, 'CREATED');
    } catch (rtErr) {}

    try {
      await supabaseDb.auditLogs.log(
        'CREATE_CONTAINMENT_ZONE',
        'containment_zone',
        newZone.zoneId,
        String(req.user._id || req.user.id),
        { disease: targetDisease, district: targetDistrict, radiusKm: newZone.radiusKm }
      );
    } catch (auditErr) {}

    res.status(201).json({
      success: true,
      message: `Containment Zone ${zoneId} created successfully.`,
      zone: newZone,
      case: linkedCase
    });
  } catch (err) {
    console.error('[CaseController] Error creating containment zone:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create containment zone.',
      error: err.message
    });
  }
};

/**
 * @desc    Get Containment Zones in District
 * @route   GET /api/cases/containment-zones
 * @access  Private (Veterinarians, Officers, Admin)
 */
exports.getContainmentZones = async (req, res) => {
  try {
    const { district, status } = req.query;
    const targetDistrict = district || req.user.district || 'Pune';
    const query = {
      district: new RegExp(`^${escapeRegex(targetDistrict.trim())}$`, 'i')
    };

    if (status) {
      query.status = status;
    }

    const rawZones = await ContainmentZone.find(query)
      .populate('caseId', 'caseId disease risk species affectedCount coordinates status')
      .populate('createdByVetId', 'name phone email registrationNo')
      .populate('ringVaccinationDriveId', 'campId vaccine status campDate capacity')
      .sort({ createdAt: -1 });

    const userRole = req.user ? req.user.role : 'farmer';
    const zones = rawZones.map(z => {
      if (userRole !== 'farmer') {
        return z;
      }
      // Farmer view: public biosecurity health alert only, no private case or vet contact details
      const center = z.center || { lat: z.centerLat, lng: z.centerLng };
      const fuzzedCenter = {
        lat: center.lat ? Math.round(center.lat * 100) / 100 : null,
        lng: center.lng ? Math.round(center.lng * 100) / 100 : null
      };
      return {
        _id: z._id,
        zoneId: z.zoneId,
        disease: z.disease,
        district: z.district,
        block: z.block,
        village: z.village,
        center: fuzzedCenter,
        radiusKm: z.radiusKm,
        status: z.status,
        enforcedRules: z.enforcedRules,
        createdAt: z.createdAt
      };
    });

    res.json({
      success: true,
      district: targetDistrict,
      count: zones.length,
      zones
    });
  } catch (err) {
    console.error('[CaseController] Error fetching containment zones:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve containment zones.',
      error: err.message
    });
  }
};

/**
 * @desc    Update Containment Zone Status (ACTIVE -> CONTAINED -> LIFTED)
 * @route   PATCH /api/cases/containment-zones/:zoneId/status
 * @access  Private (Veterinarians, Officers, Admin)
 */
exports.updateContainmentZoneStatus = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { status, notes } = req.body;

    if (!['ACTIVE', 'CONTAINED', 'LIFTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid containment zone status. Must be ACTIVE, CONTAINED, or LIFTED.'
      });
    }

    let zone = await ContainmentZone.findOne({ zoneId });
    if (!zone) {
      zone = await ContainmentZone.findById(zoneId);
    }

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Containment zone not found.'
      });
    }

    zone.status = status;
    if (notes) {
      zone.notes = `${zone.notes ? zone.notes + ' | ' : ''}${notes}`;
    }
    if (status === 'CONTAINED' && !zone.containedAt) {
      zone.containedAt = new Date();
    }
    if (status === 'LIFTED') {
      zone.liftedAt = new Date();
    }

    await zone.save();

    notificationService.broadcastToDistrictVets(zone.district, 'CONTAINMENT_ZONE_UPDATED', {
      zone,
      timestamp: new Date()
    });

    try {
      await realtimeHub.notifyContainmentZone(zone, 'UPDATED');
    } catch (rtErr) {}

    res.json({
      success: true,
      message: `Containment zone status updated to ${status}.`,
      zone
    });
  } catch (err) {
    console.error('[CaseController] Error updating containment zone:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update containment zone status.',
      error: err.message
    });
  }
};

/**
 * @desc    Schedule Ring Vaccination for Outbreak Case / Containment Buffer
 * @route   POST /api/cases/:id/schedule-ring-vaccination
 * @access  Private (Veterinarians, Officers, Admin)
 */
exports.scheduleRingVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const { campDate, venue, capacity, notes } = req.body;

    const caseDoc = await DiseaseCase.findById(id);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Disease case not found.'
      });
    }

    const vaccineName = getVaccineForDisease(caseDoc.disease);
    const targetCapacity = parseInt(capacity, 10) > 0 ? parseInt(capacity, 10) : 250;
    const scheduledDate = campDate ? new Date(campDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const distPrefix = caseDoc.districtId.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'DIS');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const campId = `RING-CAMP-2026-${distPrefix}-${randomSuffix}`;

    const drive = await VaccinationDrive.create({
      campId,
      state: caseDoc.state || 'Maharashtra',
      district: caseDoc.districtId,
      block: caseDoc.farmerLocation?.block || 'Outbreak Sector',
      village: caseDoc.farmerLocation?.village || 'Perimeter Buffer',
      venue:
        venue ||
        `Emergency Ring Vaccination Camp - ${caseDoc.farmerLocation?.village || caseDoc.districtId}`,
      coordinates: caseDoc.coordinates,
      vaccine: vaccineName,
      vaccineFullName: vaccineName,
      targetSpecies: caseDoc.species || 'Cattle & Buffalo',
      campDate: scheduledDate,
      startTime: '08:30 AM',
      endTime: '05:00 PM',
      isFree: true,
      cost: 'Free (Emergency Govt Outbreak Ring)',
      organizingHospital: req.user.department || 'District Veterinary Outbreak Response Unit',
      assignedOfficer: req.user.name,
      assignedOfficerId: req.user._id,
      contactNumber: req.user.phone || '1962',
      capacity: targetCapacity,
      remainingSlots: targetCapacity,
      bookedSlots: 0,
      targetCount: targetCapacity,
      coveredCount: 0,
      status: 'Upcoming',
      notes:
        notes ||
        `Emergency Ring Vaccination scheduled for Outbreak Case ${caseDoc.caseId} (${caseDoc.disease}).`
    });

    // Link drive to case
    caseDoc.ringVaccinationDriveId = drive._id;
    caseDoc.timeline.push({
      status: caseDoc.status,
      updatedBy: req.user._id,
      updaterName: req.user.name,
      timestamp: new Date(),
      notes: `Emergency Ring Vaccination Drive scheduled (${drive.campId} - ${vaccineName}).`
    });
    await caseDoc.save();

    // If case has containment zone, link drive to zone too
    if (caseDoc.containmentZoneId) {
      await ContainmentZone.findByIdAndUpdate(caseDoc.containmentZoneId, {
        ringVaccinationDriveId: drive._id
      });
    }

    // Broadcast SSE update
    notificationService.broadcastToDistrictVets(caseDoc.districtId, 'RING_VACCINATION_SCHEDULED', {
      caseId: caseDoc._id,
      drive,
      timestamp: new Date()
    });

    try {
      await realtimeHub.notifyRingVaccination(drive);
    } catch (rtErr) {}

    try {
      await supabaseDb.auditLogs.log(
        'SCHEDULE_RING_VACCINATION',
        'vaccination_drive',
        drive.campId,
        String(req.user._id || req.user.id),
        { caseId: caseDoc.caseId || caseDoc._id.toString(), disease: caseDoc.disease, capacity: targetCapacity }
      );
    } catch (auditErr) {}

    res.status(201).json({
      success: true,
      message: `Ring vaccination camp ${campId} scheduled successfully.`,
      drive,
      case: caseDoc
    });
  } catch (err) {
    console.error('[CaseController] Error scheduling ring vaccination:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule ring vaccination drive.',
      error: err.message
    });
  }
};

/**
 * @desc    Generate Dynamic AI Preventive Advisory based on district disease cases & clusters
 * @route   GET /api/cases/advisories
 * @access  Private
 */
exports.getAdvisories = async (req, res) => {
  try {
    const targetDistrict = req.query.district || req.user.district || 'Pune';
    const districtRegex = new RegExp(`^${escapeRegex(targetDistrict.trim())}$`, 'i');

    const activeCases = await DiseaseCase.find({
      districtId: districtRegex,
      status: { $nin: ['Resolved', 'RESOLVED'] }
    }).lean();

    const activeZones = await ContainmentZone.find({
      district: districtRegex,
      status: 'ACTIVE'
    }).lean();

    // Aggregate disease prevalence
    const diseaseCounts = {};
    let totalAffected = 0;
    for (const c of activeCases) {
      const d = c.disease || 'Unknown';
      diseaseCounts[d] = (diseaseCounts[d] || 0) + (c.affectedCount || 1);
      totalAffected += c.affectedCount || 1;
    }

    const topDiseases = Object.entries(diseaseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Generate specific recommendations
    const recommendations = [];

    if (topDiseases.some((d) => d.name.toLowerCase().includes('lumpy'))) {
      recommendations.push({
        disease: 'Lumpy Skin Disease',
        priority: 'CRITICAL',
        protocol: 'Immediate vector control & isolation',
        actions: [
          'Isolate affected cattle in mosquito-proof sheds with net screens',
          'Deploy sodium hypochlorite (1%) disinfectant spray across barn floors',
          'Administer goat pox / live attenuated LSD vaccine within 5km radius',
          'Apply fly repellents (neem oil or cypermethrin) on healthy herd'
        ]
      });
    }

    if (topDiseases.some((d) => d.name.toLowerCase().includes('foot') || d.name.toLowerCase().includes('fmd'))) {
      recommendations.push({
        disease: 'Foot and Mouth Disease (FMD)',
        priority: 'CRITICAL',
        protocol: 'Strict biosecurity & ring barrier',
        actions: [
          'Wash lesions with potassium permanganate (1:10,000) or 4% sodium carbonate',
          'Halt all cattle market transit within 10km buffer',
          'Immediate ring vaccination of all cloven-hoofed animals',
          'Enforce vehicle tire wash basins at farm entry points'
        ]
      });
    }

    if (topDiseases.some((d) => d.name.toLowerCase().includes('blackleg'))) {
      recommendations.push({
        disease: 'Blackleg (Clostridial)',
        priority: 'HIGH',
        protocol: 'Soil pathogen containment & disposal',
        actions: [
          'Avoid opening or skinning deceased carcasses; incinerate or deep bury with quicklime',
          'Shift non-infected stock to higher, uncontaminated pasture',
          'Prophylactic penicillin treatment for in-contact young stock',
          'Vaccinate all cattle aged 6 months to 2 years with polyvalent bacterin'
        ]
      });
    }

    // Default general advisory if no specific disease match
    if (!recommendations.length) {
      recommendations.push({
        disease: topDiseases[0]?.name || 'General Livestock Vigilance',
        priority: activeCases.length > 3 ? 'HIGH' : 'NORMAL',
        protocol: 'Standard Clinical Biosecurity Protocol',
        actions: [
          'Daily temperature monitoring and clinical symptom checks',
          'Quarantine newly arrived livestock for 14 days before herd integration',
          'Ensure clean, chlorinated drinking water supply for all sheds',
          'Report any sudden lethargy or blister formations to veterinary helpline 1962'
        ]
      });
    }

    res.json({
      success: true,
      district: targetDistrict,
      summary: {
        activeCasesCount: activeCases.length,
        totalAnimalsAffected: totalAffected,
        activeContainmentZones: activeZones.length,
        topDiseases
      },
      recommendations,
      generatedAt: new Date()
    });
  } catch (err) {
    console.error('[CaseController] Error generating advisory:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate disease advisory.',
      error: err.message
    });
  }
};

/**
 * @desc    Retry failed notifications for a case (Poor connectivity handling)
 * @route   POST /api/cases/:id/retry-notifications
 * @access  Private
 */
exports.retryNotifications = async (req, res) => {
  try {
    const { id } = req.params;
    const caseDoc = await DiseaseCase.findById(id);
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found.' });
    }

    const districtRegex = new RegExp(`^${escapeRegex(caseDoc.districtId.trim())}$`, 'i');
    const matchingVets = await User.find({
      role: { $in: ['field_worker', 'veterinarian', 'officer'] },
      district: districtRegex,
      isActive: { $ne: false }
    }).select('_id name phone email district block role');

    const notifiedRecords = await notificationService.notifyDistrictVets(caseDoc, matchingVets);
    caseDoc.notifiedVets = notifiedRecords;
    await caseDoc.save();

    res.json({
      success: true,
      message: `Notifications retried for ${matchingVets.length} district veterinarians.`,
      notifiedVets: notifiedRecords
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Retry failed.', error: err.message });
  }
};

/**
 * @desc    Get active veterinarians in a district
 * @route   GET /api/cases/district-vets
 * @access  Private
 */
exports.getDistrictVets = async (req, res) => {
  try {
    const district = req.query.district || req.user.district || 'Pune';
    const districtRegex = new RegExp(`^${escapeRegex(district.trim())}$`, 'i');

    const vets = await User.find({
      role: { $in: ['field_worker', 'veterinarian', 'officer'] },
      district: districtRegex,
      isActive: { $ne: false }
    }).select('_id name phone email district block role registrationNo department');

    res.json({
      success: true,
      district,
      count: vets.length,
      vets
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch district vets.', error: err.message });
  }
};

/**
 * @desc    SSE Real-time Stream for Referral Events
 * @route   GET /api/cases/stream
 * @access  Private (Authenticated)
 */
exports.streamCases = (req, res) => {
  notificationService.subscribe(req, res, req.user);
};
