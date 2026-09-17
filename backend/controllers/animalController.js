const supabaseDb = require('../services/supabaseDb');
const Animal = require('../models/Animal');
const Report = require('../models/Report');
const {
  normalizeIndianPhone,
  getDeterministicInternalEmail,
  getPhoneVariants
} = require('../utils/phoneNormalizer');

/**
 * Resolves the authenticated user's public.profiles record in Supabase.
 * Prefers auth_user_id, then id, then email.
 * Auto-provisions the profile if missing and user is authenticated.
 */
async function resolveFarmerProfile(user) {
  if (!user) return null;

  const authUserId = String(user.auth_user_id || user.id || '').trim();
  const userId = String(user.id || '').trim();
  const email = (user.email || '').toLowerCase().trim();
  const phone = String(user.phone || '').trim();

  if (supabaseDb.supabase) {
    try {
      let matchedProfile = null;

      // 1. Try matching by profile id = userId (if valid UUID)
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        const { data: profileById, error: idError } = await supabaseDb.supabase
          .from('profiles')
          .select('id, auth_user_id, name, email, phone, village, block, district, role')
          .eq('id', userId)
          .maybeSingle();

        if (profileById && !idError) {
          matchedProfile = profileById;
        }
      }

      // 2. Try matching by auth_user_id (prefer matching by Supabase Auth UUID)
      if (!matchedProfile && authUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUserId)) {
        const { data: profileByAuthId, error: authError } = await supabaseDb.supabase
          .from('profiles')
          .select('id, auth_user_id, name, email, phone, village, block, district, role')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (profileByAuthId && !authError) {
          matchedProfile = profileByAuthId;
        }
      }

      // 3. Try matching by email
      if (!matchedProfile && email) {
        const { data: profileByEmail, error: emailError } = await supabaseDb.supabase
          .from('profiles')
          .select('id, auth_user_id, name, email, phone, village, block, district, role')
          .eq('email', email)
          .maybeSingle();

        if (profileByEmail && !emailError) {
          matchedProfile = profileByEmail;
          // Link auth_user_id if not yet linked
          if (authUserId && (!matchedProfile.auth_user_id || matchedProfile.auth_user_id !== authUserId)) {
            try {
              await supabaseDb.supabase
                .from('profiles')
                .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
                .eq('id', matchedProfile.id);
              matchedProfile.auth_user_id = authUserId;
            } catch (linkErr) {
              console.warn('[Animal] Notice linking auth_user_id by email:', linkErr.message);
            }
          }
        }
      }

      // 4. Try matching by phone (supports formats: +91, 91, 0, 10-digit)
      if (!matchedProfile && phone) {
        const uniquePhones = getPhoneVariants(phone);

        const { data: profileByPhone, error: phoneError } = await supabaseDb.supabase
          .from('profiles')
          .select('id, auth_user_id, name, email, phone, village, block, district, role')
          .in('phone', uniquePhones)
          .limit(1)
          .maybeSingle();

        if (profileByPhone && !phoneError) {
          matchedProfile = profileByPhone;
        }
      }

      if (matchedProfile) {
        return matchedProfile;
      }

      // 5. If user is authenticated but profile is missing from public.profiles, auto-provision
      if (authUserId || email || phone) {
        const safeDistrict = user.district ? String(user.district).trim() : 'Pune';
        const safeState = user.state ? String(user.state).trim() : 'Maharashtra';
        const safePhone = normalizeIndianPhone(phone || '9822000000');
        const safeEmail = email || getDeterministicInternalEmail(safePhone);

        // Check if authUserId is synthetic (e.g. 00000000-0000-0000-0000-...)
        const isSyntheticAuthId = authUserId && authUserId.startsWith('00000000-0000-0000-0000-');

        const profileToInsert = {
          name: user.name || 'Farmer',
          role: user.role || 'farmer',
          phone: safePhone,
          email: safeEmail,
          password_hash: '$2b$10$e7a68FwE3P9K.fakePasswordHashForOAuthOrSupaAuthUser',
          district: safeDistrict,
          state: safeState,
          village: user.village || '',
          block: user.block || '',
          preferred_language: user.preferredLanguage || 'hi'
        };

        // Only attach auth_user_id if it is not a synthetic fallback ID
        if (authUserId && !isSyntheticAuthId) {
          profileToInsert.auth_user_id = authUserId;
        }

        let { data: newProfile, error: provError } = await supabaseDb.supabase
          .from('profiles')
          .insert(profileToInsert)
          .select('id, auth_user_id, name, email, phone, village, block, district, role')
          .single();

        // If error 23503 (fk_profiles_auth_user violated because auth_user_id not in auth.users), retry without auth_user_id
        if (provError && provError.code === '23503' && profileToInsert.auth_user_id) {
          console.warn('[Animal] auth_user_id not in auth.users (code 23503), retrying with auth_user_id = null');
          delete profileToInsert.auth_user_id;
          const retryRes = await supabaseDb.supabase
            .from('profiles')
            .insert(profileToInsert)
            .select('id, auth_user_id, name, email, phone, village, block, district, role')
            .single();
          newProfile = retryRes.data;
          provError = retryRes.error;
        }

        if (newProfile && !provError) {
          console.log('[Animal] Auto-provisioned missing profile:', {
            id: newProfile.id,
            email: newProfile.email,
            district: newProfile.district
          });
          return newProfile;
        } else if (provError) {
          console.error('[Animal] Profile auto-provisioning error:', provError.message);
          // If conflict on email or phone (code 23505), fetch that profile
          if (provError.code === '23505') {
            const { data: dupP } = await supabaseDb.supabase
              .from('profiles')
              .select('id, auth_user_id, name, email, phone, village, block, district, role')
              .or(`email.eq.${safeEmail},phone.eq.${safePhone}`)
              .limit(1)
              .maybeSingle();
            if (dupP) {
              return dupP;
            }
          }
        }
      }
    } catch (err) {
      console.error('[Animal] Profile resolution exception:', err.message);
    }
  }

  // 6. If user already has valid UUID id and name (from authenticated session), preserve it
  const isUUID = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  if (isUUID && user.name) {
    return {
      id: userId,
      auth_user_id: authUserId || userId,
      name: user.name,
      email: user.email || '',
      village: user.village || '',
      block: user.block || '',
      district: user.district || 'Pune',
      role: user.role || 'farmer'
    };
  }

  // 7. Offline / Mock fallback (when live Supabase client is not connected)
  const { MOCK_PROFILES } = require('../config/supabaseClient');
  if (email && MOCK_PROFILES && MOCK_PROFILES[email]) {
    const mp = MOCK_PROFILES[email];
    return {
      id: mp.id,
      auth_user_id: authUserId || mp.id,
      name: mp.name,
      email: mp.email,
      village: mp.village || user.village || '',
      block: mp.block || user.block || '',
      district: mp.district || user.district || 'Pune',
      role: mp.role || 'farmer'
    };
  }

  // 8. Check Mongo User model only for legacy non-UUID MongoDB users
  try {
    const User = require('../models/User');
    const u = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
        ...(authUserId.length === 24 ? [{ _id: authUserId }] : [])
      ]
    }).lean();
    if (u) {
      return {
        id: isUUID ? userId : String(u._id),
        auth_user_id: authUserId || String(u._id),
        name: u.name,
        email: u.email,
        village: u.village || '',
        block: u.block || '',
        district: u.district || 'Pune',
        role: u.role || 'farmer'
      };
    }
  } catch (e) { }

  return null;
}

// @desc    Get all animals (filtered by owner, village, species)
// @route   GET /api/animals
// @access  Private
exports.getAnimals = async (req, res, next) => {
  try {
    const { ownerId, species, village, block, district } = req.query;
    const query = {};

    // Farmers only see their own animals by default
    if (req.user.role === 'farmer') {
      const profile = await resolveFarmerProfile(req.user);
      if (profile && profile.id) {
        query.ownerId = String(profile.id);
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          animals: []
        });
      }
    } else if (ownerId) {
      query.ownerId = String(ownerId);
    }

    if (species) query.species = species;
    if (village) query.village = village;
    if (block) query.block = block;
    if (district) query.district = district;

    const animals = await supabaseDb.animals.find(query);

    res.status(200).json({
      success: true,
      count: animals.length,
      animals
    });
  } catch (error) {
    console.error('[Animal] GET ANIMALS ERROR:', error.message);
    next(error);
  }
};

// @desc    Get single animal profile & case history
// @route   GET /api/animals/:id
// @access  Private
exports.getAnimalById = async (req, res, next) => {
  try {
    const animal = await supabaseDb.animals.findById(req.params.id);

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    // Role-based Ownership Enforcement: Farmers can only view their own animals
    if (req.user && req.user.role === 'farmer') {
      const profile = await resolveFarmerProfile(req.user);
      const farmerId = String(profile?.id || req.user.id || req.user._id || '').trim();
      const farmerEmail = (profile?.email || req.user.email || '').toLowerCase().trim();

      const ownerObj = typeof animal.ownerId === 'object' && animal.ownerId !== null ? animal.ownerId : null;
      const animalOwnerId = String(ownerObj?.id || ownerObj?._id || animal.ownerId || animal.owner_id || '').trim();
      const animalOwnerEmail = (ownerObj?.email || '').toLowerCase().trim();

      const isOwner = (farmerId && animalOwnerId && farmerId === animalOwnerId) ||
                      (farmerEmail && animalOwnerEmail && farmerEmail === animalOwnerEmail);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this animal profile.'
        });
      }
    }

    res.status(200).json({
      success: true,
      animal
    });
  } catch (error) {
    console.error('[Animal] GET ANIMAL BY ID ERROR:', error.message);
    next(error);
  }
};

// @desc    Register a new animal / herd record
// @route   POST /api/animals
// @access  Private
exports.createAnimal = async (req, res, next) => {
  try {
    const {
      tagId,
      name,
      species,
      breed,
      age,
      gender,
      healthStatus,
      milkYieldDaily,
      timeline,
      village,
      block,
      district,
      vaccinationHistory,
      treatmentHistory
    } = req.body;

    if (!species) {
      return res.status(400).json({
        success: false,
        message: 'Species is required.'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    console.log('[Animal] Authenticated user:', {
      id: req.user.id,
      auth_user_id: req.user.auth_user_id,
      email: req.user.email,
      role: req.user.role
    });

    /*
     * Resolve the actual profiles.id.
     * animals.owner_id -> profiles.id (NOT directly -> auth.users.id)
     */
    const profile = await resolveFarmerProfile(req.user);

    if (!profile?.id) {
      console.warn('[Animal] Farmer profile not found for user:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found. Please complete your profile before adding an animal.'
      });
    }

    console.log('[Animal] Resolved farmer profile:', {
      profileId: profile.id,
      auth_user_id: profile.auth_user_id,
      district: profile.district
    });

    /*
     * SECURITY: A farmer can NEVER register an animal under another farmer's profile.
     * Only an admin can explicitly assign animals to another profile.
     */
    const effectiveOwnerId = (req.user.role === 'admin' && req.body.ownerId)
      ? String(req.body.ownerId)
      : String(profile.id);

    /*
     * Generate / normalize tag ID.
     */
    const finalTagId = (
      tagId ||
      `MH-12-P-${Math.floor(1000 + Math.random() * 9000)}`
    ).trim().toUpperCase();

    /*
     * Check duplicate tag using lightweight direct query.
     */
    const existingTag = await supabaseDb.animals.findByTagId(finalTagId);
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: `An animal with Tag ID '${finalTagId}' is already registered.`
      });
    }

    /*
     * Use authenticated user's/profile's actual location without hardcoded bad defaults.
     */
    const finalVillage = (village || profile.village || req.user.village || 'Rural Village').trim();
    const finalBlock = (block || profile.block || req.user.block || finalVillage || 'Rural Block').trim();
    const finalDistrict = (district || profile.district || req.user.district || 'Pune').trim();

    console.log('[Animal] Inserting animal record:', {
      tagId: finalTagId,
      species,
      ownerId: effectiveOwnerId,
      district: finalDistrict,
      village: finalVillage,
      block: finalBlock
    });

    /*
     * Create animal in authoritative Supabase PostgreSQL database.
     */
    const animal = await supabaseDb.animals.create({
      tagId: finalTagId,
      name: name ? name.trim() : finalTagId,
      species,
      breed: breed || 'Indigenous / Mixed',
      age: age ? parseInt(age, 10) : 3,
      gender: gender || 'Female',
      healthStatus: healthStatus || 'Healthy',
      milkYieldDaily:
        milkYieldDaily ||
        (
          species === 'Goat'
            ? '2.0 L'
            : species === 'Cattle' || species === 'Buffalo'
              ? '12.0 L'
              : 'N/A'
        ),
      lastCheckup: new Date().toLocaleDateString('en-GB'),
      ownerId: effectiveOwnerId,
      village: finalVillage,
      block: finalBlock,
      district: finalDistrict,
      vaccinationHistory: vaccinationHistory || [],
      treatmentHistory: treatmentHistory || []
    });

    if (!animal) {
      return res.status(500).json({
        success: false,
        message: 'Animal could not be created.'
      });
    }

    // Insert initial timeline event into Supabase animal_timeline table
    if (supabaseDb.supabase && animal.id) {
      const initialTimeline = (Array.isArray(timeline) && timeline.length > 0)
        ? timeline
        : [
            {
              type: 'Health Check',
              title: 'Animal Registered',
              date: new Date().toLocaleDateString('en-GB'),
              notes: 'Profile added to Livestock Saathi'
            }
          ];

      try {
        const timelineRows = initialTimeline.map(t => ({
          animal_id: animal.id,
          event_type: t.type || 'Health Check',
          title: t.title || 'Animal Registered',
          date: t.date || new Date().toLocaleDateString('en-GB'),
          notes: t.notes || 'Profile added to Livestock Saathi',
          doctor: t.doctor || '',
          status: t.status || '',
          disease: t.disease || ''
        }));
        await supabaseDb.supabase.from('animal_timeline').insert(timelineRows);
        animal.timeline = initialTimeline;
      } catch (te) {
        console.warn('[Animal] Initial timeline creation notice:', te.message);
      }
    }

    // Insert initial vaccinations into Supabase animal_vaccinations table if provided
    const targetAnimId = animal.id || animal._id;
    const initialVacc = (Array.isArray(vaccinationHistory) && vaccinationHistory.length > 0)
      ? vaccinationHistory
      : (Array.isArray(req.body.vaccinations) ? req.body.vaccinations : []);

    if (initialVacc.length > 0 && targetAnimId) {
      for (const v of initialVacc) {
        try {
          await supabaseDb.animalVaccinations.create({
            animal_id: targetAnimId,
            vaccine_name: v.vaccine || v.name || v.vaccineName || 'Routine Vaccine',
            date: v.date ? new Date(v.date) : new Date(),
            next_due: v.nextDue ? new Date(v.nextDue) : null,
            status: v.status || 'Completed',
            dose: v.dose || 'Primary Dose',
            batch_number: v.batchNumber || '',
            administered_by: v.administeredBy || (req.user ? req.user.name : ''),
            camp: v.camp || '',
            notes: v.notes || ''
          });
        } catch (ve) {
          console.warn('[Animal] Initial vaccination creation notice:', ve.message);
        }
      }
      const loadedVacc = await supabaseDb.animalVaccinations.findByAnimalId(targetAnimId);
      animal.vaccinations = loadedVacc;
      animal.vaccinationHistory = loadedVacc;
    } else {
      animal.vaccinations = animal.vaccinations || [];
      animal.vaccinationHistory = animal.vaccinationHistory || [];
    }

    return res.status(201).json({
      success: true,
      message: 'Animal profile registered successfully.',
      animal
    });

  } catch (error) {
    console.error('[Animal] CREATE ERROR:', {
      message: error.message,
      code: error.code,
      details: error.details
    });

    const statusCode = error.statusCode || (error.code === '23505' ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to register animal.'
    });
  }
};

// @desc    Update animal record (details, add vaccination, add treatment, add timeline)
// @route   PATCH /api/animals/:id
// @access  Private
exports.updateAnimal = async (req, res, next) => {
  try {
    const animalId = req.params.id;
    const existing = await supabaseDb.animals.findById(animalId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    // Authorization check: Farmer can only update their own animal
    if (req.user.role === 'farmer') {
      const profile = await resolveFarmerProfile(req.user);
      const existingOwnerId = existing.ownerId?.id || existing.ownerId?._id || existing.ownerId;
      if (profile && existingOwnerId && String(existingOwnerId) !== String(profile.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this animal record.'
        });
      }
    }

    const updates = { ...req.body };
    const targetAnimalId = existing.id || animalId;

    // Handle new child events in Supabase
    if (supabaseDb.supabase) {
      if (req.body.newTimelineEvent && req.body.newTimelineEvent.title) {
        const ne = req.body.newTimelineEvent;
        try {
          await supabaseDb.supabase.from('animal_timeline').insert({
            animal_id: targetAnimalId,
            event_type: ne.type || 'Health Check',
            title: ne.title,
            date: ne.date || new Date().toLocaleDateString('en-GB'),
            doctor: ne.doctor || '',
            notes: ne.notes || '',
            image_url: ne.image || '',
            status: ne.status || '',
            disease: ne.disease || '',
            confidence: ne.confidence ? parseFloat(ne.confidence) : null,
            symptoms: Array.isArray(ne.symptoms) ? ne.symptoms : [],
            advisory: ne.advisory || '',
            temperature: ne.temperature ? parseFloat(ne.temperature) : null,
            duration: ne.duration ? parseFloat(ne.duration) : null
          });
          console.log('[Animal] Logged timeline event for animal:', {
            animalId: targetAnimalId,
            disease: ne.disease,
            status: ne.status
          });
        } catch (e) {
          console.warn('[Animal] Supabase timeline insert notice:', e.message);
        }
      }

      if (req.body.newVaccination) {
        const nv = req.body.newVaccination;
        const vName = nv.vaccine || nv.name || nv.vaccineName;
        if (vName) {
          try {
            await supabaseDb.animalVaccinations.create({
              animal_id: targetAnimalId,
              vaccine_name: vName,
              date: nv.date ? new Date(nv.date) : new Date(),
              next_due: nv.nextDue ? new Date(nv.nextDue) : null,
              status: nv.status || 'Completed',
              dose: nv.dose || 'Primary Dose',
              batch_number: nv.batchNumber || '',
              administered_by: nv.administeredBy || '',
              camp: nv.camp || '',
              notes: nv.notes || ''
            });
          } catch (e) {
            console.warn('[Animal] Supabase vaccination insert notice:', e.message);
          }
        }
      }

      if (req.body.newTreatment && req.body.newTreatment.condition) {
        const nt = req.body.newTreatment;
        try {
          const profile = await resolveFarmerProfile(req.user);
          await supabaseDb.supabase.from('animal_treatments').insert({
            animal_id: targetAnimalId,
            condition: nt.condition,
            treatment: nt.treatment || 'Prescribed medication',
            date: nt.date ? new Date(nt.date) : new Date(),
            vet_id: profile ? profile.id : null
          });
        } catch (e) {
          console.warn('[Animal] Supabase treatment insert notice:', e.message);
        }
      }
    }

    // Format new vaccination event for local object / Mongo
    if (req.body.newVaccination) {
      const nv = req.body.newVaccination;
      const vName = nv.vaccine || nv.name;
      if (vName) {
        const vHistory = existing.vaccinationHistory || [];
        vHistory.push({
          vaccine: vName,
          date: nv.date || new Date(),
          nextDue: nv.nextDue || null,
          dose: nv.dose || 'Primary Dose',
          batchNumber: nv.batchNumber || '',
          administeredBy: nv.administeredBy || '',
          camp: nv.camp || '',
          notes: nv.notes || ''
        });
        updates.vaccinationHistory = vHistory;
      }
    }

    // Format new treatment for local object / Mongo
    if (req.body.newTreatment && req.body.newTreatment.condition) {
      const nt = req.body.newTreatment;
      const tHistory = existing.treatmentHistory || [];
      tHistory.push({
        condition: nt.condition,
        date: nt.date || new Date(),
        treatment: nt.treatment || 'Prescribed medication',
        vetId: String(req.user._id || req.user.id)
      });
      updates.treatmentHistory = tHistory;
    }

    // Format new timeline event for local object / Mongo
    if (req.body.newTimelineEvent && req.body.newTimelineEvent.title) {
      const ne = req.body.newTimelineEvent;
      const timeline = existing.timeline || [];
      timeline.unshift({
        type: ne.type || 'Health Check',
        title: ne.title,
        date: ne.date || new Date().toLocaleDateString('en-GB'),
        doctor: ne.doctor || '',
        notes: ne.notes || '',
        image: ne.image || '',
        status: ne.status || '',
        disease: ne.disease || '',
        confidence: ne.confidence || null,
        symptoms: ne.symptoms || [],
        advisory: ne.advisory || '',
        temperature: ne.temperature || null,
        duration: ne.duration || null
      });
      updates.timeline = timeline;
    }

    // Strip child relations and non-column fields from direct animals table update
    const dbUpdates = { ...updates };
    delete dbUpdates.newTimelineEvent;
    delete dbUpdates.newVaccination;
    delete dbUpdates.newTreatment;
    delete dbUpdates.timeline;
    delete dbUpdates.vaccinationHistory;
    delete dbUpdates.treatmentHistory;
    delete dbUpdates.vaccinations;
    delete dbUpdates.treatments;
    delete dbUpdates.pastReports;

    const updated = await supabaseDb.animals.updateById(existing.id || existing._id, dbUpdates);

    // Reload complete record with embedded vaccinations and timeline
    const reloaded = await supabaseDb.animals.findById(existing.id || existing._id);
    const returnAnimal = reloaded || (updated ? { ...updated } : { ...existing, ...dbUpdates });
    if (updates.timeline && !returnAnimal.timeline) {
      returnAnimal.timeline = updates.timeline;
    }

    res.status(200).json({
      success: true,
      message: 'Animal record updated successfully.',
      animal: returnAnimal
    });
  } catch (error) {
    console.error('[Animal] UPDATE ERROR:', error.message);
    next(error);
  }
};

// @desc    Delete an animal record
// @route   DELETE /api/animals/:id
// @access  Private
exports.deleteAnimal = async (req, res, next) => {
  try {
    const existing = await supabaseDb.animals.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found or could not be deleted.'
      });
    }

    // Authorization check: Farmer can only delete their own animal
    if (req.user.role === 'farmer') {
      const profile = await resolveFarmerProfile(req.user);
      const existingOwnerId = existing.ownerId?.id || existing.ownerId?._id || existing.ownerId;
      if (profile && existingOwnerId && String(existingOwnerId) !== String(profile.id)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this animal record.'
        });
      }
    }

    const success = await supabaseDb.animals.deleteById(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found or could not be deleted.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Animal record deleted successfully.'
    });
  } catch (error) {
    console.error('[Animal] DELETE ERROR:', error.message);
    next(error);
  }
};

exports.resolveFarmerProfile = resolveFarmerProfile;
