/**
 * Supabase PostgreSQL Database Repository & Data Access Layer
 * File: backend/services/supabaseDb.js
 * 
 * Centralizes all PostgreSQL operations for PashuCare, mapping directly
 * to the 18-table schema defined in supabase/schema.sql.
 * 
 * Features:
 * - Direct PostgREST execution via Supabase Client
 * - Relational joins preventing N+1 queries
 * - Transparent snake_case <-> camelCase transformations preserving API contracts
 * - Graceful fallback to Mongoose models during transition period
 */

const { supabase, isLiveSupabase, MOCK_PROFILES } = require('../config/supabaseClient');
const crypto = require('crypto');

// In-memory animal store for offline/test mode (when live Supabase is offline)
const OFFLINE_ANIMALS = [];
const OFFLINE_VACCINATIONS = [];

// Mongoose Models for fallback during transition
const User = require('../models/User');
const Animal = require('../models/Animal');
const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');
const DiseaseCase = require('../models/DiseaseCase');
const ContainmentZone = require('../models/ContainmentZone');
const VaccinationDrive = require('../models/VaccinationDrive');
const LabReferral = require('../models/LabReferral');
const Advisory = require('../models/Advisory');
const Notification = require('../models/Notification');
const ScanImage = require('../models/ScanImage');

const mongoose = require('mongoose');

// Utility: convert snake_case object keys to camelCase
function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj._bsontype || typeof obj.toHexString === 'function') return obj.toString();
  if (obj instanceof Date || obj instanceof RegExp) return obj;

  const newObj = {};
  for (const key of Object.keys(obj)) {
    let camelKey = key;
    if (key === '_id') {
      camelKey = '_id';
    } else {
      camelKey = key.replace(/([a-zA-Z0-9])_([a-z])/g, (_, p1, letter) => p1 + letter.toUpperCase());
    }
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !(val instanceof Date) && !val._bsontype && typeof val.toHexString !== 'function') {
      newObj[camelKey] = toCamel(val);
    } else if (val && (val._bsontype || typeof val.toHexString === 'function')) {
      newObj[camelKey] = val.toString();
    } else {
      newObj[camelKey] = val;
    }
  }

  // Ensure both .id and ._id are present and compatible strings
  if (newObj.id && !newObj._id) {
    newObj._id = String(newObj.id);
  } else if (newObj._id && !newObj.id) {
    newObj.id = String(newObj._id);
  }

  return newObj;
}

// Utility: convert camelCase object keys to snake_case for PostgreSQL
function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj._bsontype || typeof obj.toHexString === 'function') return obj.toString();
  if (obj instanceof Date || obj instanceof RegExp) return obj;

  const newObj = {};
  for (const key of Object.keys(obj)) {
    if (key === '_id') {
      if (!newObj.id) newObj.id = String(obj[key]);
      continue; // Use id in Postgres
    }
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const val = obj[key];
    newObj[snakeKey] = val !== null && typeof val === 'object' && !(val instanceof Date) && !val._bsontype && typeof val.toHexString !== 'function' ? toSnake(val) : val;
  }
  return newObj;
}

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ============================================================================
// VACCINATION NORMALIZATION & HONEST DATE-BASED STATUS SEMANTICS (Phase 6.3)
// ============================================================================
/**
 * Computes authoritative semantic vaccination status from stored dates and record status.
 *
 * Semantic Rules:
 * 1. "Overdue":
 *    - Next booster/renewal date (nextDue) is in the past (nextDue < now).
 *    - Or scheduled appointment date is in the past without completion record (date < now).
 *    - Or stored status is explicitly 'Overdue'.
 * 2. "Due Soon":
 *    - Next booster/renewal date is within the next 30 days (now <= nextDue <= now + 30 days).
 *    - Or scheduled appointment date is within the next 30 days (now <= date <= now + 30 days).
 * 3. "Upcoming":
 *    - Next booster/renewal date is more than 30 days in the future (nextDue > now + 30 days).
 *    - Or scheduled appointment is more than 30 days in the future (date > now + 30 days).
 *    - Note: Per Phase 6.3 rules, a vaccination scheduled far in the future is NOT marked "Due Soon".
 * 4. "Scheduled":
 *    - Stored status is 'Scheduled' (when no specific date-window classification overrides).
 * 5. "Completed":
 *    - Stored status is 'Completed' or 'Administered' and no nextDue is overdue/due soon.
 *    - Default state for past administered doses.
 */
function computeVaccinationStatus(record) {
  if (!record) return 'Completed';

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const rawStatus = (record.status || '').trim();

  // 1. Check nextDue booster date
  const nextDueDateStr = record.nextDue || record.next_due;
  if (nextDueDateStr) {
    const nextTime = new Date(nextDueDateStr).getTime();
    if (!isNaN(nextTime)) {
      if (nextTime < now) {
        return 'Overdue';
      }
      if (nextTime <= now + thirtyDaysMs) {
        return 'Due Soon';
      }
      // If nextDue is > 30 days away, and this record was already administered
      if (rawStatus.toLowerCase() === 'completed' || rawStatus.toLowerCase() === 'administered') {
        return 'Completed';
      }
      return 'Upcoming';
    }
  }

  // 2. Check Scheduled camp/appointment date
  if (rawStatus.toLowerCase() === 'scheduled') {
    const schedDateStr = record.date;
    if (schedDateStr) {
      const schedTime = new Date(schedDateStr).getTime();
      if (!isNaN(schedTime)) {
        if (schedTime < now) {
          return 'Overdue'; // Missed scheduled camp
        }
        if (schedTime <= now + thirtyDaysMs) {
          return 'Due Soon'; // Scheduled within 30 days
        }
        return 'Upcoming'; // Scheduled far in future (> 30 days)
      }
    }
    return 'Scheduled';
  }

  if (rawStatus.toLowerCase() === 'overdue') {
    return 'Overdue';
  }

  if (rawStatus.toLowerCase() === 'completed' || rawStatus.toLowerCase() === 'administered') {
    return 'Completed';
  }

  return rawStatus || 'Completed';
}

function normalizeVaccination(v) {
  if (!v) return null;
  const camelV = toCamel(v);
  const vName = camelV.vaccineName || camelV.name || camelV.vaccine || 'Routine Vaccination';
  const computed = computeVaccinationStatus(camelV);

  return {
    id: camelV.id || camelV._id || crypto.randomUUID(),
    animalId: camelV.animalId || camelV.animal_id || '',
    name: vName,
    vaccine: vName,
    vaccineName: vName,
    date: camelV.date ? new Date(camelV.date).toISOString() : new Date().toISOString(),
    nextDue: camelV.nextDue ? new Date(camelV.nextDue).toISOString() : null,
    status: camelV.status || 'Completed',
    computedStatus: computed,
    dose: camelV.dose || 'Primary Dose',
    batchNumber: camelV.batchNumber || '',
    administeredBy: camelV.administeredBy || '',
    camp: camelV.camp || '',
    notes: camelV.notes || '',
    createdAt: camelV.createdAt || camelV.created_at || new Date().toISOString()
  };
}

// ============================================================================
// 1. PROFILES / USERS REPOSITORY
// ============================================================================
const profiles = {
  async findById(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }
    // Fallback to Mongo
    try {
      const u = await User.findById(id).select('-passwordHash').lean();
      if (u) return toCamel(u);
    } catch (e) { }
    return null;
  },

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    if (MOCK_PROFILES[cleanEmail]) return MOCK_PROFILES[cleanEmail];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const u = await User.findOne({ email: cleanEmail }).select('-passwordHash').lean();
      if (u) return toCamel(u);
    } catch (e) { }
    return null;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase.from('profiles').select('*');
        if (filter.role) q = q.eq('role', filter.role);
        if (filter.district) q = q.ilike('district', `%${filter.district}%`);
        if (filter.isAvailable !== undefined) q = q.eq('is_available', filter.isAvailable);
        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const query = {};
      if (filter.role) query.role = filter.role;
      if (filter.district) query.district = new RegExp(filter.district, 'i');
      if (filter.isAvailable !== undefined) query.isAvailable = filter.isAvailable;
      const list = await User.find(query).select('-passwordHash').lean();
      return toCamel(list);
    } catch (e) {
      return [];
    }
  },

  async updateById(id, updates) {
    const snakeUpdates = toSnake(updates);
    delete snakeUpdates.id;
    delete snakeUpdates._id;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(snakeUpdates)
          .eq('id', id)
          .select()
          .single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const u = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
      return toCamel(u);
    } catch (e) {
      return null;
    }
  }
};

// ============================================================================
// 2. ANIMALS REPOSITORY
// ============================================================================
const animals = {
  async findByTagId(tagId) {
    if (!tagId) return null;
    const cleanTag = String(tagId).trim().toUpperCase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('animals')
          .select('id, tag_id, name, owner_id')
          .eq('tag_id', cleanTag)
          .maybeSingle();

        if (error) {
          console.error('[SupabaseDb] animals.findByTagId error:', error.message);
        } else if (data) {
          return toCamel(data);
        }
      } catch (e) {
        console.error('[SupabaseDb] animals.findByTagId exception:', e.message);
      }
    }

    // Check OFFLINE_ANIMALS if offline
    if (!isLiveSupabase) {
      const offlineMatch = OFFLINE_ANIMALS.find(a => (a.tagId || a.tag_id) === cleanTag);
      if (offlineMatch) return toCamel(offlineMatch);
    }

    // Fallback to Mongoose if offline and connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await Animal.findOne({ tagId: cleanTag }).select('tagId name ownerId').lean();
        if (doc) return toCamel(doc);
      } catch (e) { }
    }

    return null;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase
          .from('animals')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter.tagId) q = q.eq('tag_id', filter.tagId);
        if (filter.ownerId) q = q.eq('owner_id', filter.ownerId);
        if (filter.species) q = q.eq('species', filter.species);
        if (filter.village) q = q.ilike('village', `%${filter.village}%`);
        if (filter.block) q = q.ilike('block', `%${filter.block}%`);
        if (filter.district) q = q.ilike('district', `%${filter.district}%`);

        const { data, error } = await q;

        if (error) {
          console.error('[SupabaseDb] animals.find Supabase error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        } else if (data) {
          console.log('[SupabaseDb] animals.find Supabase success count:', data.length);
          if (data.length > 0) {
            try {
              const animalIds = data.map((a) => a.id).filter(Boolean);
              if (animalIds.length > 0) {
                // Batch-query timelines and vaccinations concurrently in O(1) roundtrips (Zero N+1)
                const [timelineRes, vaccRes] = await Promise.all([
                  supabase
                    .from('animal_timeline')
                    .select('*')
                    .in('animal_id', animalIds)
                    .order('created_at', { ascending: false }),
                  supabase
                    .from('animal_vaccinations')
                    .select('*')
                    .in('animal_id', animalIds)
                    .order('date', { ascending: false })
                ]);

                const timelineMap = new Map();
                if (timelineRes && timelineRes.data) {
                  timelineRes.data.forEach((t) => {
                    if (!timelineMap.has(t.animal_id)) timelineMap.set(t.animal_id, []);
                    timelineMap.get(t.animal_id).push(toCamel(t));
                  });
                }

                const vaccMap = new Map();
                if (vaccRes && vaccRes.data) {
                  vaccRes.data.forEach((v) => {
                    if (!vaccMap.has(v.animal_id)) vaccMap.set(v.animal_id, []);
                    vaccMap.get(v.animal_id).push(normalizeVaccination(v));
                  });
                }

                return data.map((a) => {
                  const camelA = toCamel(a);
                  const tList = timelineMap.get(a.id) || [];
                  const vList = vaccMap.get(a.id) || [];
                  camelA.timeline = tList;
                  camelA.vaccinations = vList;
                  camelA.vaccinationHistory = vList;
                  const diag = tList.find((e) => e.disease);
                  if (diag) {
                    camelA.disease = diag.disease;
                    camelA.lastDiagnosis = diag.disease;
                  }
                  return camelA;
                });
              }
            } catch (te) {
              console.warn('[SupabaseDb] Batch timeline/vaccination fetch notice:', te.message);
            }
          }
          return toCamel(data).map(a => ({
            ...a,
            timeline: a.timeline || [],
            vaccinations: a.vaccinations || [],
            vaccinationHistory: a.vaccinationHistory || []
          }));
        }
      } catch (e) {
        console.error('[SupabaseDb] animals.find exception:', e.message);
        throw e;
      }
    }

    // Check OFFLINE_ANIMALS in offline/test mode
    if (!isLiveSupabase && OFFLINE_ANIMALS.length > 0) {
      let matches = OFFLINE_ANIMALS;
      if (filter.tagId) matches = matches.filter(a => (a.tagId || a.tag_id) === filter.tagId);
      if (filter.ownerId) {
        matches = matches.filter(a => {
          const oId = typeof a.ownerId === 'object' ? (a.ownerId?.id || a.ownerId?._id) : (a.ownerId || a.owner_id);
          return String(oId) === String(filter.ownerId);
        });
      }
      if (filter.species) matches = matches.filter(a => a.species === filter.species);
      if (filter.village) matches = matches.filter(a => (a.village || '').toLowerCase().includes(filter.village.toLowerCase()));
      if (matches.length > 0) {
        return matches.map((a) => {
          const camelA = toCamel(a);
          const animalId = String(camelA.id || camelA._id);
          const offlineVaccs = OFFLINE_VACCINATIONS.filter(v => String(v.animalId || v.animal_id) === animalId);
          const combined = [...(camelA.vaccinations || []), ...offlineVaccs];
          const seen = new Set();
          const uniqueVacc = [];
          for (const rawV of combined) {
            const v = normalizeVaccination(rawV);
            const vKey = v.id || `${v.vaccine}-${v.date}`;
            if (!seen.has(vKey)) {
              seen.add(vKey);
              uniqueVacc.push(v);
            }
          }
          camelA.vaccinations = uniqueVacc;
          camelA.vaccinationHistory = uniqueVacc;
          camelA.timeline = camelA.timeline || [];
          return camelA;
        });
      }
    }

    // Fallback to Mongoose if Supabase is offline and connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = {};
        if (filter.tagId) query.tagId = filter.tagId;
        if (filter.ownerId) {
          if (mongoose.Types.ObjectId.isValid(filter.ownerId)) {
            query.ownerId = filter.ownerId;
          } else {
            const u = await User.findOne({ email: 'farmer@pashurakshak.in' }).catch(() => null);
            if (u) query.ownerId = u._id;
          }
        }
        if (filter.species) query.species = filter.species;
        if (filter.village) query.village = new RegExp(filter.village, 'i');
        if (filter.block) query.block = new RegExp(filter.block, 'i');
        if (filter.district) query.district = new RegExp(filter.district, 'i');

        const res = await Animal.find(query)
          .populate('ownerId', 'name phone email village block district')
          .sort({ createdAt: -1 })
          .lean();
        return (res || []).map((doc) => {
          const camelDoc = toCamel(doc);
          const rawVacc = (camelDoc.vaccinations && camelDoc.vaccinations.length > 0)
            ? camelDoc.vaccinations
            : (camelDoc.vaccinationHistory || []);
          const normVacc = rawVacc.map(normalizeVaccination);
          camelDoc.vaccinations = normVacc;
          camelDoc.vaccinationHistory = normVacc;
          camelDoc.timeline = camelDoc.timeline || [];
          return camelDoc;
        });
      } catch (e) {
        return [];
      }
    }
    return [];
  },

  async findById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    if (supabase) {
      try {
        let q = supabase.from('animals').select('*');
        if (isUUID) {
          q = q.eq('id', cleanId);
        } else {
          q = q.eq('tag_id', cleanId.toUpperCase());
        }

        const { data: animalData, error: animalError } = await q.maybeSingle();

        if (animalError) {
          console.error('[SupabaseDb] animals.findById error:', animalError.message);
        }

        if (animalData && !animalError) {
          const res = toCamel(animalData);

          // Safely resolve owner profile
          if (animalData.owner_id) {
            try {
              const { data: ownerData } = await supabase
                .from('profiles')
                .select('id, name, phone, email, village, block, district')
                .eq('id', animalData.owner_id)
                .maybeSingle();
              if (ownerData) res.ownerId = toCamel(ownerData);
            } catch (oe) { }
          }

          // Safely load timeline
          try {
            const { data: timelineData } = await supabase
              .from('animal_timeline')
              .select('*')
              .eq('animal_id', id)
              .order('created_at', { ascending: false });
            res.timeline = toCamel(timelineData || []);
          } catch (te) { res.timeline = []; }

          // Safely load vaccinations
          try {
            const { data: vaccData } = await supabase
              .from('animal_vaccinations')
              .select('*')
              .eq('animal_id', id)
              .order('date', { ascending: false });
            const normalizedVacc = (vaccData || []).map(normalizeVaccination);
            res.vaccinations = normalizedVacc;
            res.vaccinationHistory = normalizedVacc;
          } catch (ve) { res.vaccinations = []; res.vaccinationHistory = []; }

          // Safely load treatments
          try {
            const { data: treatData } = await supabase
              .from('animal_treatments')
              .select('*')
              .eq('animal_id', id)
              .order('date', { ascending: false });
            res.treatments = toCamel(treatData || []);
            res.treatmentHistory = toCamel(treatData || []);
          } catch (tre) { res.treatments = []; res.treatmentHistory = []; }

          // Safely query linked past reports in PostgreSQL
          try {
            const { data: pastReports } = await supabase
              .from('reports')
              .select('*')
              .eq('animal_id', id)
              .order('created_at', { ascending: false });
            res.pastReports = toCamel(pastReports || []);
          } catch (re) { res.pastReports = []; }

          return res;
        }

        // Authoritative Supabase returned definitive not-found for this UUID
        if (!animalError && !animalData && isUUID) {
          return null;
        }
      } catch (e) {
        console.error('[SupabaseDb] animals.findById exception:', e.message);
      }
    }

    // Fallback to OFFLINE_ANIMALS if offline
    if (!isLiveSupabase && OFFLINE_ANIMALS.length > 0) {
      const offlineMatch = OFFLINE_ANIMALS.find(a => a.id === id || a._id === id || (a.tagId || a.tag_id) === cleanId || (a.tagId || a.tag_id) === cleanId.toUpperCase());
      if (offlineMatch) {
        const camelA = toCamel(offlineMatch);
        const animalId = String(camelA.id || camelA._id);
        const offlineVaccs = OFFLINE_VACCINATIONS.filter(v => String(v.animalId || v.animal_id) === animalId);
        const combined = [...(camelA.vaccinations || []), ...offlineVaccs];
        const seen = new Set();
        const uniqueVacc = [];
        for (const rawV of combined) {
          const v = normalizeVaccination(rawV);
          const vKey = v.id || `${v.vaccine}-${v.date}`;
          if (!seen.has(vKey)) {
            seen.add(vKey);
            uniqueVacc.push(v);
          }
        }
        camelA.vaccinations = uniqueVacc;
        camelA.vaccinationHistory = uniqueVacc;
        camelA.timeline = camelA.timeline || [];
        return camelA;
      }
    }

    // Fallback to Mongoose only if actively connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const animal = await Animal.findById(id)
          .populate('ownerId', 'name phone email village block district')
          .lean();
        if (!animal) return null;
        const pastReports = await Report.find({ animalId: animal._id }).sort({ createdAt: -1 }).lean();
        const rawVacc = (animal.vaccinations && animal.vaccinations.length > 0)
          ? animal.vaccinations
          : (animal.vaccinationHistory || []);
        const normVacc = rawVacc.map(normalizeVaccination);
        return toCamel({
          ...animal,
          vaccinations: normVacc,
          vaccinationHistory: normVacc,
          pastReports
        });
      } catch (e) {
        return null;
      }
    }

    return null;
  },

  async create(data) {
    let createdAnimal = null;

    if (supabase) {
      try {
        const snakeData = toSnake(data);

        // Normalize enums for PostgreSQL
        const VALID_SPECIES = ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'];
        let normSpecies = 'Cattle';
        if (snakeData.species) {
          const match = VALID_SPECIES.find(s => s.toLowerCase() === String(snakeData.species).trim().toLowerCase());
          normSpecies = match || 'Cattle';
        }

        const VALID_GENDER = ['Female', 'Male'];
        let normGender = 'Female';
        if (snakeData.gender) {
          const match = VALID_GENDER.find(g => g.toLowerCase() === String(snakeData.gender).trim().toLowerCase());
          normGender = match || 'Female';
        }

        const VALID_HEALTH = ['Healthy', 'Needs Attention', 'Critical', 'Recovered'];
        let normHealth = 'Healthy';
        if (snakeData.health_status) {
          const match = VALID_HEALTH.find(h => h.toLowerCase() === String(snakeData.health_status).trim().toLowerCase());
          normHealth = match || 'Healthy';
        }

        const insertPayload = {
          tag_id: snakeData.tag_id,
          name: snakeData.name || '',
          species: normSpecies,
          breed: snakeData.breed || 'Indigenous / Mixed',
          age: snakeData.age !== undefined && snakeData.age !== null ? parseInt(snakeData.age, 10) : 3,
          gender: normGender,
          health_status: normHealth,
          milk_yield_daily: snakeData.milk_yield_daily || '12.0 L',
          last_checkup: snakeData.last_checkup || new Date().toLocaleDateString('en-GB'),
          owner_id: snakeData.owner_id,
          village: (snakeData.village || '').trim(),
          block: (snakeData.block || '').trim(),
          district: (snakeData.district && String(snakeData.district).trim()) ? String(snakeData.district).trim() : 'Nagpur'
        };

        const { data: inserted, error } = await supabase
          .from('animals')
          .insert(insertPayload)
          .select('*')
          .single();

        if (error) {
          console.error('[SupabaseDb] animals.create Supabase error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            owner_id: insertPayload.owner_id,
            tag_id: insertPayload.tag_id
          });
          const dbErr = new Error(error.message || 'Failed to insert animal into database');
          dbErr.code = error.code;
          dbErr.details = error.details;
          throw dbErr;
        }

        if (inserted) {
          createdAnimal = toCamel(inserted);
          console.log('[SupabaseDb] animals.create Supabase success:', {
            id: inserted.id,
            tag_id: inserted.tag_id,
            owner_id: inserted.owner_id
          });
        }
      } catch (err) {
        console.error('[SupabaseDb] animals.create caught error:', err.message);
        throw err;
      }
    }

    // Dual-write to MongoDB during transition (non-blocking, only if Mongo available and connected)
    if (createdAnimal && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const mongoData = { ...data };
        mongoData.village = (mongoData.village || createdAnimal.village || 'Rural Village').trim();
        mongoData.block = (mongoData.block || createdAnimal.block || mongoData.village || 'Rural Block').trim();
        mongoData.district = (mongoData.district || createdAnimal.district || 'Nagpur').trim();
        if (!mongoose.Types.ObjectId.isValid(mongoData.ownerId)) {
          const u = await User.findOne({ email: 'farmer@pashurakshak.in' });
          if (u) mongoData.ownerId = u._id;
        }
        await Animal.create(mongoData);
      } catch (e) {
        console.warn('[SupabaseDb] Animal dual-write Mongoose notice:', e.message);
      }
    } else if (!supabase) {
      // Offline / Mongo-only mode fallback
      // 1. First record into OFFLINE_ANIMALS memory cache so offline testing always works cleanly
      const fallbackId = (data._id || data.id || crypto.randomUUID()).toString();
      const offlineRecord = {
        ...toCamel(data),
        id: fallbackId,
        _id: fallbackId,
        ownerId: data.ownerId,
        owner_id: data.ownerId,
        village: (data.village || '').trim() || 'Rural Village',
        block: (data.block || data.village || '').trim() || 'Rural Block',
        district: (data.district || '').trim() || 'Nagpur',
        createdAt: new Date().toISOString()
      };
      OFFLINE_ANIMALS.push(offlineRecord);
      createdAnimal = offlineRecord;

      // 2. Also attempt Mongoose create if Mongo is connected
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          const mongoData = { ...data };
          mongoData.village = (mongoData.village || 'Rural Village').trim();
          mongoData.block = (mongoData.block || mongoData.village || 'Rural Block').trim();
          mongoData.district = (mongoData.district || 'Nagpur').trim();
          if (!mongoose.Types.ObjectId.isValid(mongoData.ownerId)) {
            const u = await User.findOne({ email: 'farmer@pashurakshak.in' }).catch(() => null);
            mongoData.ownerId = u ? u._id : new mongoose.Types.ObjectId();
          }
          const doc = await Animal.create(mongoData);
          const populated = await Animal.findById(doc._id).populate('ownerId', 'name phone email village block district').lean();
          if (populated) {
            createdAnimal = {
              ...toCamel(populated),
              id: fallbackId,
              _id: fallbackId,
              ownerId: data.ownerId,
              owner_id: data.ownerId
            };
          }
        } catch (e) {
          console.warn('[SupabaseDb] Optional offline Mongoose create notice:', e.message);
        }
      }
    }

    if (!createdAnimal) {
      throw new Error('Animal could not be created in the database.');
    }

    return createdAnimal;
  },

  async updateById(id, updates) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    if (supabase) {
      try {
        const rawSnake = toSnake(updates);
        delete rawSnake.id;
        delete rawSnake._id;

        // Whitelist valid animal table columns to avoid PostgreSQL non-existent column errors
        const VALID_COLUMNS = new Set([
          'tag_id', 'name', 'species', 'breed', 'age', 'gender',
          'health_status', 'milk_yield_daily', 'last_checkup',
          'owner_id', 'village', 'block', 'district', 'updated_at'
        ]);

        const snakeUpdates = {};
        for (const [k, v] of Object.entries(rawSnake)) {
          if (VALID_COLUMNS.has(k) && v !== undefined) {
            snakeUpdates[k] = v;
          }
        }
        snakeUpdates.updated_at = new Date().toISOString();

        let q = supabase.from('animals').update(snakeUpdates);
        if (isUUID) {
          q = q.eq('id', cleanId);
        } else {
          q = q.eq('tag_id', cleanId.toUpperCase());
        }

        const { data, error } = await q.select('*').maybeSingle();

        if (error) {
          console.error('[SupabaseDb] animals.updateById error:', error.message);
          throw error;
        }
        if (data) return toCamel(data);
      } catch (e) {
        console.error('[SupabaseDb] animals.updateById exception:', e.message);
        if (isLiveSupabase) throw e;
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await Animal.findByIdAndUpdate(id, updates, { new: true })
          .populate('ownerId', 'name phone email village block district')
          .lean();
        return toCamel(doc);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  async deleteById(id) {
    if (supabase) {
      try {
        const { error } = await supabase.from('animals').delete().eq('id', id);
        if (error) {
          console.error('[SupabaseDb] animals.deleteById error:', error.message);
          throw error;
        }
        return true;
      } catch (e) {
        console.error('[SupabaseDb] animals.deleteById exception:', e.message);
        if (isLiveSupabase) throw e;
      }
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        await Animal.findByIdAndDelete(id);
        return true;
      } catch (e) {
        return false;
      }
    }
    return true;
  }
};

// ============================================================================
// 2.1 ANIMAL VACCINATIONS REPOSITORY (Phase 6.3)
// ============================================================================
const animalVaccinations = {
  async findByAnimalId(animalId) {
    if (!animalId) return [];
    const cleanId = String(animalId).trim();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('animal_vaccinations')
          .select('*')
          .eq('animal_id', cleanId)
          .order('date', { ascending: false });
        if (!error && data) {
          return data.map(normalizeVaccination);
        }
      } catch (e) {
        console.warn('[SupabaseDb] animalVaccinations.findByAnimalId error:', e.message);
      }
    }

    const offlineMatches = OFFLINE_VACCINATIONS.filter(v => String(v.animalId || v.animal_id) === cleanId);
    return offlineMatches.map(normalizeVaccination);
  },

  async findByAnimalIds(animalIds = []) {
    if (!Array.isArray(animalIds) || animalIds.length === 0) return [];
    const cleanIds = animalIds.map(id => String(id).trim()).filter(Boolean);
    if (cleanIds.length === 0) return [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('animal_vaccinations')
          .select('*')
          .in('animal_id', cleanIds)
          .order('date', { ascending: false });
        if (!error && data) {
          return data.map(normalizeVaccination);
        }
      } catch (e) {
        console.warn('[SupabaseDb] animalVaccinations.findByAnimalIds error:', e.message);
      }
    }

    const idSet = new Set(cleanIds);
    const offlineMatches = OFFLINE_VACCINATIONS.filter(v => idSet.has(String(v.animalId || v.animal_id)));
    return offlineMatches.map(normalizeVaccination);
  },

  async create(data) {
    const snake = toSnake(data);
    const vName = snake.vaccine_name || snake.name || snake.vaccine || 'Routine Vaccination';
    const cleanAnimId = String(snake.animal_id || data.animalId || '').trim();

    const insertPayload = {
      animal_id: cleanAnimId,
      vaccine_name: vName,
      date: snake.date ? new Date(snake.date).toISOString() : new Date().toISOString(),
      next_due: snake.next_due ? new Date(snake.next_due).toISOString() : null,
      status: snake.status || 'Completed',
      dose: snake.dose || 'Primary Dose',
      batch_number: snake.batch_number || '',
      administered_by: snake.administered_by || '',
      camp: snake.camp || '',
      notes: snake.notes || ''
    };

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('animal_vaccinations')
          .insert(insertPayload)
          .select('*')
          .single();
        if (!error && inserted) {
          return normalizeVaccination(inserted);
        }
        if (error) {
          console.warn('[SupabaseDb] animalVaccinations.create Supabase warning:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] animalVaccinations.create exception:', e.message);
      }
    }

    // Save into offline store for resilient/offline test environments
    const offlineItem = {
      ...toCamel(insertPayload),
      id: crypto.randomUUID(),
      animalId: cleanAnimId,
      createdAt: new Date().toISOString()
    };
    OFFLINE_VACCINATIONS.push(offlineItem);

    // Also attach to matching OFFLINE_ANIMALS if present
    const targetAnim = OFFLINE_ANIMALS.find(a => String(a.id || a._id) === cleanAnimId);
    if (targetAnim) {
      if (!targetAnim.vaccinations) targetAnim.vaccinations = [];
      if (!targetAnim.vaccinationHistory) targetAnim.vaccinationHistory = [];
      targetAnim.vaccinations.unshift(offlineItem);
      targetAnim.vaccinationHistory.unshift(offlineItem);
    }

    return normalizeVaccination(offlineItem);
  }
};

// ============================================================================
// 3. REPORTS REPOSITORY
// ============================================================================
const reports = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('reports')
          .insert({
            case_id: snake.case_id,
            reporter_id: snake.reporter_id,
            animal_id: snake.animal_id || null,
            species: snake.species || 'Cattle',
            symptoms: snake.symptoms || [],
            temperature: snake.temperature || 0,
            duration: snake.duration || 0,
            mortality_count: snake.mortality_count || 0,
            affected_count: snake.affected_count || 1,
            village: snake.location?.village || snake.village || '',
            block: snake.location?.block || snake.block || '',
            district: snake.location?.district || snake.district || 'Nagpur',
            latitude: snake.location?.lat || snake.latitude || 0,
            longitude: snake.location?.lng || snake.longitude || 0,
            photos: snake.photos || [],
            notes: snake.notes || '',
            status: snake.status || 'Reported'
          })
          .select(`*, reporter:profiles!reports_reporter_id_fkey(name, phone)`)
          .single();

        if (inserted && !error) {
          created = toCamel(inserted);
        }
      } catch (e) { }
    }

    try {
      const mongoData = { ...data };
      if (mongoData.animalId && !mongoose.Types.ObjectId.isValid(mongoData.animalId)) {
        delete mongoData.animalId;
      }
      if (mongoData.reporterId && !mongoose.Types.ObjectId.isValid(mongoData.reporterId)) {
        const u = await User.findOne({ email: 'farmer@pashurakshak.in' });
        if (u) mongoData.reporterId = u._id;
      }
      const doc = await Report.create(mongoData);
      const populated = await Report.findById(doc._id).populate('reporterId', 'name phone').lean();
      if (!created) created = toCamel(populated);
    } catch (e) {
      console.warn('[SupabaseDb] Report create Mongoose notice:', e.message);
    }

    if (!created) {
      const fallbackId = (data._id || data.id || `rep-${Date.now()}`).toString();
      created = {
        ...toCamel(data),
        id: fallbackId,
        _id: fallbackId,
        status: data.status || 'Reported'
      };
    }

    return created;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reports_reporter_id_fkey(name, phone)
          `)
          .order('created_at', { ascending: false });

        if (filter.reporterId) q = q.eq('reporter_id', filter.reporterId);
        if (filter.species) q = q.eq('species', filter.species);
        if (filter.status) q = q.eq('status', filter.status);
        if (filter.district) q = q.ilike('district', `%${filter.district}%`);

        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const query = {};
      if (filter.reporterId) query.reporterId = filter.reporterId;
      if (filter.species) query.species = filter.species;
      if (filter.status) query.status = filter.status;
      if (filter.district) query['location.district'] = new RegExp(filter.district, 'i');

      const docs = await Report.find(query).populate('reporterId', 'name phone').sort({ createdAt: -1 }).lean();
      return toCamel(docs);
    } catch (e) {
      return [];
    }
  },

  async findById(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reports_reporter_id_fkey(name, phone)
          `)
          .eq('id', id)
          .single();

        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const doc = await Report.findById(id).populate('reporterId', 'name phone').lean();
      return doc ? toCamel(doc) : null;
    } catch (e) {
      return null;
    }
  },

  async updateById(id, updates) {
    if (supabase) {
      try {
        const snake = toSnake(updates);
        delete snake.id;
        delete snake._id;
        const { data, error } = await supabase
          .from('reports')
          .update(snake)
          .eq('id', id)
          .select()
          .single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const doc = await Report.findByIdAndUpdate(id, updates, { new: true }).lean();
      return toCamel(doc);
    } catch (e) {
      return null;
    }
  }
};

// ============================================================================
// 4. AI TRIAGE RESULTS REPOSITORY
// ============================================================================
const triageResults = {
  async create(data) {
    let created = null;

    const diseaseName = data.predictedDisease || (Array.isArray(data.suspectedDiseases) && data.suspectedDiseases[0]?.name) || 'Lumpy Skin Disease (लम्पी त्वचा रोग)';
    const confidence = typeof data.confidence === 'number' ? (data.confidence > 1 ? data.confidence / 100 : data.confidence) : 0.85;
    const suspectedList = (Array.isArray(data.suspectedDiseases) && data.suspectedDiseases.length > 0)
      ? data.suspectedDiseases.map(d => typeof d === 'string' ? { name: d, confidenceScore: confidence, rationale: 'Clinical signs match' } : d)
      : [{ name: diseaseName, confidenceScore: confidence, rationale: 'Clinical rule analysis' }];

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('triage_results')
          .insert({
            report_id: snake.report_id,
            predicted_disease: diseaseName,
            confidence: data.confidence || 85,
            confidence_level: data.confidenceLevel || 'High',
            risk_level: data.riskLevel || 'High',
            recommended_action: data.recommendedAction || 'Veterinary examination recommended.',
            immediate_first_aid: data.immediateFirstAid || [],
            outbreak_flag: !!data.outbreakFlag,
            cluster_details: data.clusterDetails || {},
            explanation: data.explanation || 'Automated multi-factor clinical rule analysis.',
            visual_score: data.visualScore || null,
            model_version: data.modelVersion || 'lsd_model.keras (EfficientNetB0)'
          })
          .select()
          .single();

        if (inserted && !error) created = toCamel(inserted);
      } catch (e) { }
    }

    try {
      let mongoReportId = data.reportId;
      if (!mongoose.Types.ObjectId.isValid(mongoReportId)) {
        mongoReportId = new mongoose.Types.ObjectId();
      }
      const mongoTriageData = {
        reportId: mongoReportId,
        riskLevel: data.riskLevel || 'High',
        suspectedDiseases: suspectedList,
        recommendedAction: data.recommendedAction || 'Veterinary examination recommended.',
        immediateFirstAid: data.immediateFirstAid || [
          'Isolate animal in dry, clean shed.',
          'Provide clean water and fresh green fodder.'
        ],
        outbreakFlag: !!data.outbreakFlag,
        clusterDetails: data.clusterDetails || {},
        explanation: data.explanation || 'Automated multi-factor clinical rule analysis based on observed symptoms.',
        visualScore: data.visualScore || null,
        modelVersion: data.modelVersion || 'lsd_model.keras (EfficientNetB0)'
      };

      const doc = await TriageResult.create(mongoTriageData);
      if (!created) created = toCamel(doc.toObject ? doc.toObject() : doc);
      if (created && !created.predictedDisease) created.predictedDisease = diseaseName;
    } catch (e) {
      console.warn('[SupabaseDb] TriageResult Mongoose notice:', e.message);
    }

    if (!created) {
      const fallbackId = `trg-${Date.now()}`;
      created = {
        id: fallbackId,
        _id: fallbackId,
        reportId: data.reportId,
        predictedDisease: diseaseName,
        suspectedDiseases: suspectedList,
        confidence: data.confidence || 85,
        confidenceLevel: data.confidenceLevel || 'High',
        riskLevel: data.riskLevel || 'High',
        recommendedAction: data.recommendedAction || 'Veterinary examination recommended.',
        immediateFirstAid: data.immediateFirstAid || [
          'Isolate animal in dry, clean shed.',
          'Provide clean water and fresh green fodder.'
        ],
        outbreakFlag: !!data.outbreakFlag,
        clusterDetails: data.clusterDetails || {},
        explanation: data.explanation || 'Automated multi-factor clinical rule analysis based on observed symptoms.',
        visualScore: data.visualScore || null,
        modelVersion: data.modelVersion || 'lsd_model.keras (EfficientNetB0)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    return created;
  },

  async findOneByReportId(reportId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('triage_results')
          .select('*')
          .eq('report_id', reportId)
          .single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const doc = await TriageResult.findOne({ reportId }).lean();
      return doc ? toCamel(doc) : null;
    } catch (e) {
      return null;
    }
  }
};

// ============================================================================
// 5. VET REFERRALS & NEARBY VETERINARIANS REPOSITORY
// ============================================================================
const veterinarians = {
  async findNearby(lat, lng, district, maxDistanceKm = 50) {
    let vets = [];

    if (supabase) {
      try {
        let q = supabase
          .from('profiles')
          .select('id, name, phone, email, clinic_name, specialization, village, block, district, state, latitude, longitude, availability, is_available, emergency_available, is_active, rating, experience, registration_no')
          .eq('role', 'veterinarian')
          .eq('is_active', true);

        const { data, error } = await q;
        if (data && !error && data.length > 0) {
          vets = data.map(v => {
            const distance = lat && lng && v.latitude && v.longitude
              ? haversineDistance(lat, lng, v.latitude, v.longitude)
              : 0;

            const addressParts = [
              v.clinic_name,
              v.village,
              v.block,
              v.district,
              v.state
            ].filter(p => p && String(p).trim().length > 0);

            const address = addressParts.join(', ') || `${v.district || 'Nagpur'}, ${v.state || 'Maharashtra'}`;

            return {
              id: String(v.id || v._id),
              _id: String(v.id || v._id),
              name: v.name || 'Veterinarian',
              clinicName: v.clinic_name || 'Veterinary Clinic',
              specialization: v.specialization || 'General Veterinary Physician',
              phone: v.phone || '',
              email: v.email || '',
              address,
              village: v.village || '',
              block: v.block || '',
              district: v.district || '',
              state: v.state || 'Maharashtra',
              latitude: typeof v.latitude === 'number' ? v.latitude : parseFloat(v.latitude || 0),
              longitude: typeof v.longitude === 'number' ? v.longitude : parseFloat(v.longitude || 0),
              availability: v.availability || (v.is_available === false ? 'OFF DUTY' : 'AVAILABLE'),
              isAvailable: v.is_available !== false,
              emergencyAvailable: v.emergency_available !== false,
              isActive: v.is_active !== false,
              isDirectoryVisible: true,
              distanceKm: parseFloat(distance.toFixed(1)),
              rating: v.rating ? parseFloat(v.rating) : 4.8,
              experience: v.experience || 6,
              registrationNo: v.registration_no || ''
            };
          });

          if (lat && lng) {
            vets.sort((a, b) => a.distanceKm - b.distanceKm);
          }
          return vets;
        }
      } catch (e) { }
    }

    // Fallback to Mongoose
    try {
      const query = {
        role: 'veterinarian',
        isActive: { $ne: false }
      };
      if (district) {
        query.district = new RegExp(district, 'i');
      }

      let docs = await User.find(query).select('-passwordHash -password_hash').lean();

      if ((!docs || docs.length === 0) && Object.values(MOCK_PROFILES).length > 0) {
        docs = Object.values(MOCK_PROFILES).filter(p => p.role === 'veterinarian');
      }

      return docs.map(v => {
        const distance = lat && lng && v.location?.lat && v.location?.lng
          ? haversineDistance(lat, lng, v.location.lat, v.location.lng)
          : (lat && lng && v.latitude && v.longitude ? haversineDistance(lat, lng, v.latitude, v.longitude) : 2.5);

        const addressParts = [
          v.clinicName || v.clinic_name,
          v.village,
          v.block,
          v.district,
          v.state
        ].filter(p => p && String(p).trim().length > 0);

        return {
          id: String(v.id || v._id),
          _id: String(v.id || v._id),
          name: v.name || 'Veterinarian',
          clinicName: v.clinicName || v.clinic_name || 'Veterinary Clinic',
          specialization: v.specialization || 'General Veterinary Physician',
          phone: v.phone || '',
          email: v.email || '',
          address: addressParts.join(', ') || `${v.village || ''}, ${v.district || 'Nagpur'}, ${v.state || 'Maharashtra'}`,
          village: v.village || '',
          block: v.block || '',
          district: v.district || '',
          state: v.state || 'Maharashtra',
          latitude: v.location?.lat || v.latitude || 0,
          longitude: v.location?.lng || v.longitude || 0,
          availability: v.availability || (v.isAvailable === false ? 'OFF DUTY' : 'AVAILABLE'),
          isAvailable: v.isAvailable !== false,
          emergencyAvailable: true,
          isActive: true,
          isDirectoryVisible: true,
          distanceKm: parseFloat(distance.toFixed(1)),
          rating: v.rating || 4.8,
          experience: v.experience || 6,
          registrationNo: v.registrationNo || v.registration_no || ''
        };
      }).sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (e) {
      return [];
    }
  },

  async findByDistrict(district) {
    if (supabase) {
      try {
        let q = supabase
          .from('profiles')
          .select('id, name, phone, email, district, block, role, registration_no, department, clinic_name, is_available')
          .in('role', ['veterinarian', 'field_worker', 'officer'])
          .eq('is_active', true);

        if (district && String(district).trim()) {
          const cleanDistrict = String(district).trim();
          q = q.or(`district.ilike.%${cleanDistrict}%,district.eq.All`);
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return data.map(toCamel);
        }

        // If district has no matches, query active veterinarians state-wide as fallback
        const { data: allVets, error: allErr } = await supabase
          .from('profiles')
          .select('id, name, phone, email, district, block, role, registration_no, department, clinic_name, is_available')
          .in('role', ['veterinarian', 'field_worker', 'officer'])
          .eq('is_active', true);

        if (!allErr && allVets && allVets.length > 0) {
          return allVets.map(toCamel);
        }
      } catch (e) {
        console.warn('[SupabaseDb] veterinarians.findByDistrict notice:', e.message);
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = {
          role: { $in: ['field_worker', 'veterinarian', 'officer'] },
          isActive: { $ne: false }
        };
        if (district) {
          query.district = new RegExp(String(district).trim(), 'i');
        }
        const docs = await User.find(query).select('_id name phone email district block role registrationNo department').lean();
        if (docs && docs.length > 0) return docs.map(toCamel);
      } catch (e) { }
    }

    return [];
  }
};

// ============================================================================
// 6. DISEASE CASE TRACKING REPOSITORY
// ============================================================================
const diseaseCases = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const insertPayload = {
          case_id: snake.case_id,
          farmer_id: snake.farmer_id,
          animal_id: snake.animal_id || null,
          animal_name: snake.animal_name || '',
          species: snake.species || 'Cattle',
          image_url: snake.image_url || snake.image || '',
          disease: snake.disease || 'Suspected Disease',
          confidence: snake.confidence || 85,
          risk: snake.risk || 'High',
          district_id: snake.district_id || snake.district || 'Nagpur',
          state: snake.state || 'Maharashtra',
          latitude: typeof snake.latitude === 'number' ? snake.latitude : (parseFloat(snake.latitude) || 21.1458),
          longitude: typeof snake.longitude === 'number' ? snake.longitude : (parseFloat(snake.longitude) || 79.0882),
          farmer_location: snake.farmer_location || {},
          farmer_contact: snake.farmer_contact || {},
          symptoms: Array.isArray(snake.symptoms) ? snake.symptoms : (snake.symptoms ? [snake.symptoms] : []),
          temperature: parseFloat(snake.temperature || 0),
          duration: parseFloat(snake.duration || 0),
          affected_count: parseInt(snake.affected_count || 1, 10),
          notes: snake.notes || '',
          clinical_diagnosis: snake.clinical_diagnosis || '',
          investigation_notes: snake.investigation_notes || '',
          status: snake.status || 'New',
          assigned_vet_id: snake.assigned_vet_id || null
        };

        const { data: inserted, error } = await supabase
          .from('disease_cases')
          .insert(insertPayload)
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department),
            animal:animals(id, tag_id, name, species, breed)
          `)
          .single();

        if (error) {
          console.error('[SupabaseDb] diseaseCases.create DB error:', error.message);
          throw new Error(error.message);
        }

        if (inserted) {
          const timelineNotes = data.timelineNotes || `Referral case initiated following AI detection (${insertPayload.disease} - ${insertPayload.confidence}% confidence).`;
          try {
            await supabase.from('case_timeline').insert({
              case_id: inserted.id,
              status: inserted.status,
              updated_by: inserted.farmer_id,
              updater_name: inserted.farmer?.name || 'Farmer',
              notes: timelineNotes
            });
          } catch (timeErr) {
            console.warn('[SupabaseDb] case_timeline insert notice:', timeErr.message);
          }

          const { data: timelineData } = await supabase
            .from('case_timeline')
            .select('*')
            .eq('case_id', inserted.id)
            .order('created_at', { ascending: false });

          created = {
            ...toCamel(inserted),
            timeline: timelineData ? timelineData.map(toCamel) : []
          };
          return created;
        }
      } catch (e) {
        console.error('[SupabaseDb] diseaseCases.create exception:', e.message);
        throw e;
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await DiseaseCase.create(data);
        const populated = await DiseaseCase.findById(doc._id)
          .populate('farmerId', 'name phone email district village')
          .populate('assignedVetId', 'name phone clinicName')
          .populate('animalId', 'tagId name species breed')
          .lean();
        return toCamel(populated);
      } catch (e) {
        throw e;
      }
    }

    throw new Error('No database connection available to create disease case.');
  },

  async findActiveByAnimalOrFarmer({ animalId, farmerId, disease }) {
    if (supabase) {
      try {
        const activeStatuses = ['New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT'];
        let q = supabase
          .from('disease_cases')
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department),
            animal:animals(id, tag_id, name, species, breed),
            timeline:case_timeline(*)
          `)
          .in('status', activeStatuses)
          .order('created_at', { ascending: false });

        // BUG FIX (Phase 3A): When animalId is present, ALSO filter by disease.
        // Previously, only animal_id was checked, causing an unrelated active case
        // (e.g. existing FMD case) to block creation of a new referral for a different
        // condition on the same animal. Now we match on both animal + disease.
        if (animalId && disease) {
          q = q.eq('animal_id', animalId).eq('disease', disease);
        } else if (animalId) {
          q = q.eq('animal_id', animalId);
        } else if (farmerId && disease) {
          q = q.eq('farmer_id', farmerId).eq('disease', disease);
        } else if (farmerId) {
          q = q.eq('farmer_id', farmerId);
        }

        const { data, error } = await q.limit(1);
        if (!error && data && data.length > 0) {
          return toCamel(data[0]);
        }
      } catch (e) {
        console.warn('[SupabaseDb] diseaseCases.findActiveByAnimalOrFarmer notice:', e.message);
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = { status: { $in: ['New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT'] } };
        // BUG FIX (Phase 3A): match both animalId + disease together
        if (animalId && disease) { query.animalId = animalId; query.disease = disease; }
        else if (animalId) query.animalId = animalId;
        else if (farmerId && disease) { query.farmerId = farmerId; query.disease = disease; }
        else if (farmerId) query.farmerId = farmerId;

        const doc = await DiseaseCase.findOne(query)
          .populate('farmerId', 'name phone email district village')
          .populate('assignedVetId', 'name phone clinicName')
          .populate('animalId', 'tagId name species breed')
          .lean();
        return doc ? toCamel(doc) : null;
      } catch (e) { }
    }

    return null;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase
          .from('disease_cases')
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department),
            animal:animals(id, tag_id, name, species, breed),
            timeline:case_timeline(*)
          `)
          .order('created_at', { ascending: false });

        if (filter.farmerId) {
          q = q.eq('farmer_id', filter.farmerId);
        }
        if (filter.assignedVetId) {
          q = q.eq('assigned_vet_id', filter.assignedVetId);
        }
        if (filter.status) {
          if (Array.isArray(filter.status)) {
            q = q.in('status', filter.status);
          } else {
            q = q.eq('status', filter.status);
          }
        }
        if (filter.districtId) {
          q = q.ilike('district_id', `%${filter.districtId}%`);
        }
        if (filter.disease) {
          q = q.ilike('disease', `%${filter.disease}%`);
        }
        if (filter.orCondition) {
          q = q.or(filter.orCondition);
        }
        if (filter.limit) {
          q = q.limit(parseInt(filter.limit, 10));
        }

        const { data, error } = await q;
        if (data && !error) return data.map(toCamel);
        if (error) {
          console.error('[SupabaseDb] diseaseCases.find error:', error.message);
        }
      } catch (e) {
        console.error('[SupabaseDb] diseaseCases.find exception:', e.message);
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = {};
        if (filter.farmerId) query.farmerId = filter.farmerId;
        if (filter.assignedVetId) query.assignedVetId = filter.assignedVetId;
        if (filter.status) {
          query.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status;
        }
        if (filter.districtId) query.districtId = new RegExp(filter.districtId, 'i');
        if (filter.disease) query.disease = new RegExp(filter.disease, 'i');

        const docs = await DiseaseCase.find(query)
          .populate('farmerId', 'name phone email district village')
          .populate('assignedVetId', 'name phone clinicName')
          .populate('animalId', 'tagId name species breed')
          .sort({ createdAt: -1 })
          .limit(parseInt(filter.limit || 100, 10))
          .lean();
        return docs.map(toCamel);
      } catch (e) {
        return [];
      }
    }

    return [];
  },

  async findById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    if (supabase) {
      try {
        let q = supabase
          .from('disease_cases')
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department),
            animal:animals(id, tag_id, name, species, breed),
            timeline:case_timeline(*)
          `);

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        if (isUuid) {
          q = q.or(`id.eq.${cleanId},case_id.eq.${cleanId}`);
        } else {
          q = q.eq('case_id', cleanId);
        }

        const { data, error } = await q.maybeSingle();
        if (data && !error) {
          const caseObj = toCamel(data);
          if (data.animal_id) {
            try {
              const { data: treatRows } = await supabase
                .from('animal_treatments')
                .select('*, vet:profiles!animal_treatments_vet_id_fkey(name, phone, clinic_name)')
                .eq('animal_id', data.animal_id)
                .order('date', { ascending: false });
              if (treatRows) caseObj.treatments = treatRows.map(toCamel);
            } catch (tErr) {}
          }
          return caseObj;
        }
        if (error) {
          console.warn('[SupabaseDb] diseaseCases.findById error:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] diseaseCases.findById exception:', e.message);
      }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = cleanId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanId } : { caseId: cleanId };
        const doc = await DiseaseCase.findOne(query)
          .populate('farmerId', 'name phone email district village')
          .populate('assignedVetId', 'name phone clinicName')
          .populate('animalId', 'tagId name species breed')
          .lean();
        return doc ? toCamel(doc) : null;
      } catch (e) {
        return null;
      }
    }

    return null;
  },

  async claimCase(caseId, vetId, vetName) {
    if (!caseId || !vetId) return null;
    const cleanCaseId = String(caseId).trim();
    let result = null;

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCaseId);
        let q = supabase
          .from('disease_cases')
          .update({
            assigned_vet_id: vetId,
            status: 'Investigating',
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('status', ['New', 'OPEN'])
          .is('assigned_vet_id', null);

        if (isUuid) {
          q = q.or(`id.eq.${cleanCaseId},case_id.eq.${cleanCaseId}`);
        } else {
          q = q.eq('case_id', cleanCaseId);
        }

        const { data, error } = await q
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department)
          `)
          .single();

        if (data && !error) {
          await supabase.from('case_timeline').insert({
            case_id: data.id,
            status: 'Investigating',
            updated_by: vetId,
            updater_name: vetName || 'Veterinarian',
            notes: `Case claimed by Dr. ${vetName || 'Veterinarian'}. Scheduled for immediate clinical examination.`
          });
          result = toCamel(data);
        }
      } catch (e) {
        console.warn('[SupabaseDb] diseaseCases.claimCase exception:', e.message);
      }
    }

    if (!result && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = cleanCaseId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanCaseId } : { caseId: cleanCaseId };
        const updated = await DiseaseCase.findOneAndUpdate(
          {
            ...query,
            status: { $in: ['New', 'OPEN'] },
            assignedVetId: null
          },
          {
            $set: {
              assignedVetId: vetId,
              status: 'ACCEPTED',
              acceptedAt: new Date()
            },
            $push: {
              timeline: {
                status: 'ACCEPTED',
                updatedBy: vetId,
                updaterName: vetName,
                notes: `Case claimed by Dr. ${vetName}.`
              }
            }
          },
          { new: true }
        ).lean();
        if (updated) result = toCamel(updated);
      } catch (e) { }
    }

    return result;
  },

  async updateStatus(id, newStatus, notes, updaterId, updaterName, extraFields = {}) {
    if (!id || !newStatus) return null;
    const cleanId = String(id).trim();
    let result = null;

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        const updatePayload = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        if (extraFields.clinicalDiagnosis !== undefined) {
          updatePayload.clinical_diagnosis = extraFields.clinicalDiagnosis;
        }
        if (extraFields.investigationNotes !== undefined) {
          updatePayload.investigation_notes = extraFields.investigationNotes;
        }
        if (extraFields.treatmentNotes !== undefined) {
          updatePayload.treatment_notes = extraFields.treatmentNotes;
        }
        if (extraFields.prescription !== undefined) {
          updatePayload.prescription = extraFields.prescription;
        }
        if (extraFields.affectedCount !== undefined) {
          updatePayload.affected_count = parseInt(extraFields.affectedCount, 10) || 1;
        }
        if (extraFields.containmentZoneId !== undefined) {
          updatePayload.containment_zone_id = extraFields.containmentZoneId;
        }
        if (extraFields.ringVaccinationDriveId !== undefined) {
          updatePayload.ring_vaccination_drive_id = extraFields.ringVaccinationDriveId;
        }

        const nowIso = new Date().toISOString();
        if (newStatus === 'Investigating' || newStatus === 'ACCEPTED') {
          updatePayload.accepted_at = nowIso;
        }
        if (newStatus === 'Confirmed') {
          updatePayload.confirmed_at = nowIso;
        }
        if (newStatus === 'Containment' || newStatus === 'IN_TREATMENT') {
          updatePayload.containment_started_at = nowIso;
        }
        if (newStatus === 'Resolved' || newStatus === 'RESOLVED') {
          updatePayload.resolved_at = nowIso;
        }
        if (extraFields.treatmentNotes || extraFields.prescription) {
          updatePayload.treatment_started_at = nowIso;
        }

        let q = supabase
          .from('disease_cases')
          .update(updatePayload);

        if (isUuid) {
          q = q.or(`id.eq.${cleanId},case_id.eq.${cleanId}`);
        } else {
          q = q.eq('case_id', cleanId);
        }

        const { data, error } = await q
          .select(`
            *,
            farmer:profiles!disease_cases_farmer_id_fkey(id, name, phone, email, district, village),
            assignedVet:profiles!disease_cases_assigned_vet_id_fkey(id, name, phone, clinic_name, department),
            animal:animals(id, tag_id, name, species, breed)
          `)
          .single();

        if (data && !error) {
          await supabase.from('case_timeline').insert({
            case_id: data.id,
            status: newStatus,
            updated_by: updaterId || null,
            updater_name: updaterName || 'Veterinary Official',
            notes: notes || `Case transitioned to ${newStatus}`
          });
          result = toCamel(data);
        }
      } catch (e) {
        console.warn('[SupabaseDb] diseaseCases.updateStatus exception:', e.message);
      }
    }

    if (!result && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = cleanId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanId } : { caseId: cleanId };
        const setFields = { status: newStatus };
        if (extraFields.clinicalDiagnosis !== undefined) setFields.clinicalDiagnosis = extraFields.clinicalDiagnosis;
        if (extraFields.investigationNotes !== undefined) setFields.investigationNotes = extraFields.investigationNotes;
        if (extraFields.treatmentNotes !== undefined) setFields.treatmentNotes = extraFields.treatmentNotes;
        if (extraFields.prescription !== undefined) setFields.prescription = extraFields.prescription;
        if (extraFields.affectedCount !== undefined) setFields.affectedCount = extraFields.affectedCount;

        const updated = await DiseaseCase.findOneAndUpdate(
          query,
          {
            $set: setFields,
            $push: {
              timeline: {
                status: newStatus,
                updatedBy: updaterId,
                updaterName: updaterName,
                notes: notes || `Case updated to ${newStatus}`
              }
            }
          },
          { new: true }
        ).lean();
        if (updated) result = toCamel(updated);
      } catch (e) { }
    }

    return result;
  }
};

// ============================================================================
// 6.1 CASE NOTIFIED VETERINARIANS AUDIT REPOSITORY
// ============================================================================
const caseNotifiedVets = {
  async createBatch(records = []) {
    if (!Array.isArray(records) || records.length === 0) return [];

    if (supabase) {
      try {
        const snakeRecords = records.map(r => {
          const snake = toSnake(r);
          return {
            case_id: snake.case_id,
            vet_id: snake.vet_id,
            name: snake.name || '',
            phone: snake.phone || '',
            delivery_status: snake.delivery_status || 'SENT',
            channel: snake.channel || 'SSE',
            error: snake.error || null,
            notified_at: snake.notified_at || new Date().toISOString()
          };
        });

        const { data, error } = await supabase
          .from('case_notified_vets')
          .insert(snakeRecords)
          .select();

        if (!error && data) {
          return data.map(toCamel);
        }
        if (error) {
          console.warn('[SupabaseDb] caseNotifiedVets.createBatch notice:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] caseNotifiedVets.createBatch exception:', e.message);
      }
    }
    return records;
  },

  async findByCaseId(caseId) {
    if (!caseId) return [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('case_notified_vets')
          .select('*, vet:profiles!case_notified_vets_vet_id_fkey(name, phone, clinic_name, district)')
          .eq('case_id', caseId)
          .order('notified_at', { ascending: false });

        if (!error && data) return data.map(toCamel);
      } catch (e) { }
    }
    return [];
  }
};

// ============================================================================
// 6.2 ANIMAL TREATMENTS (PRESCRIPTIONS & CLINICAL INTERVENTIONS) REPOSITORY
// ============================================================================
const animalTreatments = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('animal_treatments')
          .insert({
            animal_id: snake.animal_id,
            condition: snake.condition || snake.disease || 'Clinical Intervention',
            treatment: snake.treatment || snake.treatment_notes || snake.prescription || 'Prescribed clinical treatment',
            date: snake.date || new Date().toISOString(),
            vet_id: snake.vet_id || null
          })
          .select('*, vet:profiles!animal_treatments_vet_id_fkey(name, phone, clinic_name, district)')
          .single();

        if (inserted && !error) {
          created = toCamel(inserted);
        } else if (error) {
          console.warn('[SupabaseDb] animalTreatments.create error:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] animalTreatments.create exception:', e.message);
      }
    }

    return created;
  },

  async findByAnimalId(animalId) {
    if (!animalId) return [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('animal_treatments')
          .select('*, vet:profiles!animal_treatments_vet_id_fkey(name, phone, clinic_name, district)')
          .eq('animal_id', animalId)
          .order('date', { ascending: false });

        if (data && !error) return data.map(toCamel);
      } catch (e) { }
    }

    return [];
  }
};

// ============================================================================
// 7. LABORATORY WORKFLOW REPOSITORY
// ============================================================================
const labReferrals = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('lab_referrals')
          .insert({
            report_id: snake.report_id,
            sample_type: snake.sample_type || 'Blood / Serum',
            collection_date: snake.collection_date || new Date().toISOString(),
            referred_lab: snake.referred_lab || 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
            status: snake.status || 'Collected',
            collected_by: snake.collected_by || null,
            result_summary: snake.result_summary || {}
          })
          .select('*, report:reports(*), collector:profiles!lab_referrals_collected_by_fkey(name, phone, role)')
          .single();
        if (inserted && !error) created = toCamel(inserted);
        else if (error) console.warn('[SupabaseDb] labReferrals.create error:', error.message);
      } catch (e) {
        console.warn('[SupabaseDb] labReferrals.create exception:', e.message);
      }
    }

    if (!created && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await LabReferral.create(data);
        if (doc) created = toCamel(doc.toObject ? doc.toObject() : doc);
      } catch (e) { }
    }

    return created;
  },

  async findById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('lab_referrals')
          .select('*, report:reports(*), collector:profiles!lab_referrals_collected_by_fkey(name, phone, role)')
          .eq('id', cleanId)
          .maybeSingle();

        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await LabReferral.findById(cleanId).populate('reportId').lean();
        if (doc) return toCamel(doc);
      } catch (e) { }
    }

    return null;
  },

  async updateById(id, data) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const snake = toSnake(data);
    let updated = null;

    if (supabase) {
      try {
        const updatePayload = {
          updated_at: new Date().toISOString()
        };
        if (snake.status !== undefined) updatePayload.status = snake.status;
        if (snake.result_summary !== undefined) updatePayload.result_summary = snake.result_summary;
        if (snake.referred_lab !== undefined) updatePayload.referred_lab = snake.referred_lab;
        if (snake.sample_type !== undefined) updatePayload.sample_type = snake.sample_type;

        const { data: row, error } = await supabase
          .from('lab_referrals')
          .update(updatePayload)
          .eq('id', cleanId)
          .select('*, report:reports(*), collector:profiles!lab_referrals_collected_by_fkey(name, phone, role)')
          .single();

        if (row && !error) updated = toCamel(row);
        if (error) console.warn('[SupabaseDb] labReferrals.updateById notice:', error.message);
      } catch (e) {
        console.warn('[SupabaseDb] labReferrals.updateById exception:', e.message);
      }
    }

    if (!updated && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await LabReferral.findByIdAndUpdate(cleanId, data, { new: true }).populate('reportId').lean();
        if (doc) updated = toCamel(doc);
      } catch (e) { }
    }

    return updated;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase
          .from('lab_referrals')
          .select('*, report:reports(*), collector:profiles!lab_referrals_collected_by_fkey(name, phone, role)')
          .order('created_at', { ascending: false });
        if (filter.status) q = q.eq('status', filter.status);
        if (filter.sampleType) q = q.eq('sample_type', filter.sampleType);
        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const docs = await LabReferral.find(filter).populate('reportId').sort({ createdAt: -1 }).lean();
        return toCamel(docs);
      } catch (e) {
        return [];
      }
    }

    return [];
  }
};

// ============================================================================
// 8. ADVISORIES REPOSITORY
// ============================================================================
const advisories = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('advisories')
          .insert({
            report_id: snake.report_id || null,
            title_en: snake.title_en || snake.title || '',
            title_hi: snake.title_hi || '',
            message_en: snake.message_en || snake.message || '',
            message_hi: snake.message_hi || '',
            severity: snake.severity || 'Moderate',
            disease: snake.disease || 'General Health',
            target_village: snake.target_village || 'All',
            target_block: snake.target_block || 'All',
            target_district: snake.target_district || 'Nagpur',
            issued_by: snake.issued_by || 'District Animal Husbandry Department, Nagpur'
          })
          .select()
          .single();
        if (inserted && !error) created = toCamel(inserted);
      } catch (e) { }
    }

    try {
      const doc = await Advisory.create(data);
      if (!created) created = toCamel(doc.toObject ? doc.toObject() : doc);
    } catch (e) { }

    return created;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase.from('advisories').select('*').order('created_at', { ascending: false });
        if (filter.targetDistrict) q = q.eq('target_district', filter.targetDistrict);
        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const docs = await Advisory.find(filter).sort({ createdAt: -1 }).lean();
      return toCamel(docs);
    } catch (e) {
      return [];
    }
  }
};

// ============================================================================
// 9. VACCINATION DRIVES & CAMP REGISTRATIONS REPOSITORIES
// ============================================================================
const MOCK_VACCINATION_DRIVES = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    campId: 'RING-CAMP-2026-NAG-SAO-01',
    state: 'Maharashtra',
    district: 'Nagpur',
    block: 'Saoner',
    village: 'Saoner Town',
    venue: 'Taluka Veterinary Polyclinic, Saoner',
    latitude: 21.3833,
    longitude: 78.9167,
    vaccine: 'Lumpy Skin Disease (Neethling strain)',
    vaccineFullName: 'Lumpy Skin Disease Live Attenuated Homologous Vaccine',
    targetSpecies: 'Cattle & Buffalo',
    campDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    startDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    startTime: '08:30 AM',
    endTime: '05:00 PM',
    cost: 'Free (Emergency Outbreak Ring)',
    isFree: true,
    organizingHospital: 'District Veterinary Outbreak Response Unit, Nagpur',
    assignedOfficer: 'Dr. Ananya Deshmukh',
    assignedOfficerId: '00000000-0000-0000-0000-000000000002',
    contactNumber: '1962',
    capacity: 350,
    bookedSlots: 65,
    remainingSlots: 285,
    targetCount: 350,
    coveredCount: 65,
    status: 'Upcoming',
    notes: 'Emergency 5km ring vaccination protocol triggered for active LSD containment in Saoner block.'
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    campId: 'CAMP-2026-NAG-KAM-02',
    state: 'Maharashtra',
    district: 'Nagpur',
    block: 'Kamptee',
    village: 'Yerkheda',
    venue: 'Gram Panchayat Veterinary Centre, Yerkheda',
    latitude: 21.2400,
    longitude: 79.2150,
    vaccine: 'FMD Trivalent Inactivated Vaccine',
    vaccineFullName: 'Foot and Mouth Disease Inactivated Oil-Adjuvant Vaccine',
    targetSpecies: 'Cattle, Buffalo, Sheep & Goat',
    campDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    startDate: new Date(Date.now() + 4 * 86400000).toISOString(),
    startTime: '09:00 AM',
    endTime: '04:30 PM',
    cost: 'Free (Govt Drive)',
    isFree: true,
    organizingHospital: 'Kamptee Taluka Veterinary Dispensary',
    assignedOfficer: 'Dr. Rajesh Deshmukh',
    assignedOfficerId: '00000000-0000-0000-0000-000000000012',
    contactNumber: '1962',
    capacity: 300,
    bookedSlots: 92,
    remainingSlots: 208,
    targetCount: 300,
    coveredCount: 92,
    status: 'Upcoming',
    notes: 'Bi-annual FMD mass vaccination drive under National Livestock Mission.'
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    campId: 'CAMP-2026-NAG-HIN-03',
    state: 'Maharashtra',
    district: 'Nagpur',
    block: 'Hingna',
    village: 'Takalghat',
    venue: 'Primary Veterinary Dispensary, Takalghat Main Road',
    latitude: 21.0250,
    longitude: 78.9450,
    vaccine: 'HS + BQ Combined Vaccine',
    vaccineFullName: 'Haemorrhagic Septicaemia & Black Quarter Alum-Precipitated Vaccine',
    targetSpecies: 'Cattle & Buffalo',
    campDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    cost: 'Free (Govt Drive)',
    isFree: true,
    organizingHospital: 'Hingna Veterinary Dispensary',
    assignedOfficer: 'Dr. Vikram Gaikwad',
    assignedOfficerId: '00000000-0000-0000-0000-000000000014',
    contactNumber: '1962',
    capacity: 250,
    bookedSlots: 242,
    remainingSlots: 8,
    targetCount: 250,
    coveredCount: 242,
    status: 'Completed',
    notes: 'Successful pre-monsoon clostridial coverage achieved.'
  }
];

const MOCK_CAMP_REGISTRATIONS = [];

const vaccinationDrives = {
  async create(data) {
    const snake = toSnake(data);
    const drivePayload = {
      camp_id: snake.camp_id || `CAMP-${Date.now()}`,
      state: snake.state || 'Maharashtra',
      district: snake.district || 'Nagpur',
      block: snake.block || '',
      village: snake.village || '',
      venue: snake.venue || `Primary Veterinary Dispensary, ${snake.village || ''}`,
      latitude: parseFloat(snake.latitude || snake.lat || 21.1458),
      longitude: parseFloat(snake.longitude || snake.lng || 79.0882),
      vaccine: snake.vaccine || snake.vaccine_name || 'Standard Livestock Vaccine',
      vaccine_full_name: snake.vaccine_full_name || snake.vaccine || '',
      target_species: snake.target_species || 'Cattle & Buffalo',
      camp_date: snake.camp_date || snake.start_date || new Date().toISOString(),
      start_time: snake.start_time || '09:30 AM',
      end_time: snake.end_time || '04:00 PM',
      cost: snake.cost || 'Free (Govt Drive)',
      is_free: snake.is_free !== false,
      organizing_hospital: snake.organizing_hospital || `Dispensary, ${snake.village || ''}`,
      assigned_officer: snake.assigned_officer || 'Veterinary Officer',
      assigned_officer_id: snake.assigned_officer_id || null,
      contact_number: snake.contact_number || '1962',
      capacity: parseInt(snake.capacity || snake.target_count || 200, 10),
      booked_slots: parseInt(snake.booked_slots || 0, 10),
      remaining_slots: parseInt(snake.remaining_slots || snake.capacity || 200, 10),
      target_count: parseInt(snake.target_count || snake.capacity || 200, 10),
      covered_count: parseInt(snake.covered_count || 0, 10),
      start_date: snake.start_date || snake.camp_date || new Date().toISOString(),
      end_date: snake.end_date || null,
      status: snake.status || 'Upcoming',
      notes: snake.notes || ''
    };

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('vaccination_drives')
          .insert(drivePayload)
          .select()
          .single();
        if (inserted && !error) return toCamel(inserted);
      } catch (e) {
        console.warn('[SupabaseDb] vaccinationDrives.create notice:', e.message);
      }
    }

    const mockDrive = toCamel({
      ...drivePayload,
      id: `20000000-0000-0000-0000-${String(Date.now()).slice(-12)}`
    });
    MOCK_VACCINATION_DRIVES.push(mockDrive);
    return mockDrive;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase.from('vaccination_drives').select('*').order('camp_date', { ascending: true });
        if (filter.state && filter.state !== 'All') q = q.ilike('state', `%${filter.state}%`);
        if (filter.district && filter.district !== 'All') q = q.ilike('district', `%${filter.district}%`);
        if (filter.block && filter.block !== 'All') q = q.ilike('block', `%${filter.block}%`);
        if (filter.status && filter.status !== 'All') {
          const sArr = filter.status.split(',').map(s => s.trim()).filter(Boolean);
          if (sArr.length > 1) q = q.in('status', sArr);
          else if (sArr.length === 1) q = q.eq('status', sArr[0]);
        }
        if (filter.vaccine && filter.vaccine !== 'All') {
          q = q.or(`vaccine.ilike.%${filter.vaccine}%,vaccine_full_name.ilike.%${filter.vaccine}%`);
        }
        if (filter.search && filter.search.trim()) {
          const s = filter.search.trim();
          q = q.or(`village.ilike.%${s}%,block.ilike.%${s}%,district.ilike.%${s}%,venue.ilike.%${s}%,vaccine.ilike.%${s}%,vaccine_full_name.ilike.%${s}%,organizing_hospital.ilike.%${s}%,assigned_officer.ilike.%${s}%,camp_id.ilike.%${s}%`);
        }
        if (filter.limit) {
          q = q.limit(Math.min(parseInt(filter.limit, 10) || 250, 500));
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return toCamel(data);
        }
      } catch (e) {
        console.warn('[SupabaseDb] vaccinationDrives.find notice:', e.message);
      }
    }

    // In-memory filter over canonical mock/seed drives
    let results = [...MOCK_VACCINATION_DRIVES];
    if (filter.state && filter.state !== 'All') {
      results = results.filter(d => (d.state || '').toLowerCase().includes(filter.state.toLowerCase()));
    }
    if (filter.district && filter.district !== 'All') {
      results = results.filter(d => (d.district || '').toLowerCase().includes(filter.district.toLowerCase()));
    }
    if (filter.block && filter.block !== 'All') {
      results = results.filter(d => (d.block || '').toLowerCase().includes(filter.block.toLowerCase()));
    }
    if (filter.status && filter.status !== 'All') {
      const sArr = filter.status.split(',').map(s => s.trim().toLowerCase());
      results = results.filter(d => sArr.includes((d.status || '').toLowerCase()));
    }
    if (filter.vaccine && filter.vaccine !== 'All') {
      results = results.filter(d =>
        (d.vaccine || '').toLowerCase().includes(filter.vaccine.toLowerCase()) ||
        (d.vaccineFullName && d.vaccineFullName.toLowerCase().includes(filter.vaccine.toLowerCase()))
      );
    }
    if (filter.search && filter.search.trim()) {
      const s = filter.search.trim().toLowerCase();
      results = results.filter(d =>
        (d.village || '').toLowerCase().includes(s) ||
        (d.block || '').toLowerCase().includes(s) ||
        (d.district || '').toLowerCase().includes(s) ||
        (d.venue || '').toLowerCase().includes(s) ||
        (d.vaccine || '').toLowerCase().includes(s) ||
        (d.organizingHospital || '').toLowerCase().includes(s) ||
        (d.assignedOfficer || '').toLowerCase().includes(s)
      );
    }
    return toCamel(results);
  },

  async findById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    if (supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let q = supabase.from('vaccination_drives').select('*');
        if (isUUID) {
          q = q.eq('id', cleanId);
        } else {
          q = q.eq('camp_id', cleanId);
        }
        const { data, error } = await q.maybeSingle();
        if (data && !error) return toCamel(data);
      } catch (e) {
        console.warn('[SupabaseDb] vaccinationDrives.findById notice:', e.message);
      }
    }

    const found = MOCK_VACCINATION_DRIVES.find(d => d.id === cleanId || d.campId === cleanId);
    return found ? toCamel(found) : null;
  },

  async update(id, updateData) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const snake = toSnake(updateData);

    if (supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let q = supabase.from('vaccination_drives').update({
          ...snake,
          updated_at: new Date().toISOString()
        });
        if (isUUID) {
          q = q.eq('id', cleanId);
        } else {
          q = q.eq('camp_id', cleanId);
        }
        const { data, error } = await q.select().maybeSingle();
        if (data && !error) return toCamel(data);
      } catch (e) {
        console.warn('[SupabaseDb] vaccinationDrives.update notice:', e.message);
      }
    }

    const idx = MOCK_VACCINATION_DRIVES.findIndex(d => d.id === cleanId || d.campId === cleanId);
    if (idx !== -1) {
      MOCK_VACCINATION_DRIVES[idx] = { ...MOCK_VACCINATION_DRIVES[idx], ...toCamel(updateData) };
      return toCamel(MOCK_VACCINATION_DRIVES[idx]);
    }
    return null;
  }
};

const campRegistrations = {
  async create(data) {
    const snake = toSnake(data);
    const regPayload = {
      drive_id: snake.drive_id,
      farmer_id: snake.farmer_id || null,
      farmer_name: snake.farmer_name || '',
      farmer_phone: snake.farmer_phone || '',
      animal_ids: Array.isArray(snake.animal_ids) ? snake.animal_ids : [],
      animal_count: parseInt(snake.animal_count, 10) || 1,
      token: snake.token || `#CAMP-${Math.floor(1000 + Math.random() * 9000)}`,
      registered_at: snake.registered_at || new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('vaccination_camp_registrations')
          .insert(regPayload)
          .select()
          .single();
        if (inserted && !error) return toCamel(inserted);
      } catch (e) {
        console.warn('[SupabaseDb] campRegistrations.create notice:', e.message);
      }
    }

    const mockReg = toCamel({
      ...regPayload,
      id: `30000000-0000-0000-0000-${String(Date.now()).slice(-12)}`
    });
    MOCK_CAMP_REGISTRATIONS.push(mockReg);
    return mockReg;
  },

  async findByFarmer(farmerId, phone) {
    if (!farmerId && !phone) return [];

    if (supabase) {
      try {
        let q = supabase
          .from('vaccination_camp_registrations')
          .select('*, drive:vaccination_drives(*)')
          .order('registered_at', { ascending: false });

        if (farmerId && phone) {
          q = q.or(`farmer_id.eq.${farmerId},farmer_phone.eq.${phone}`);
        } else if (farmerId) {
          q = q.eq('farmer_id', farmerId);
        } else if (phone) {
          q = q.eq('farmer_phone', phone);
        }

        const { data, error } = await q;
        if (!error && data) return toCamel(data);
      } catch (e) {
        console.warn('[SupabaseDb] campRegistrations.findByFarmer notice:', e.message);
      }
    }

    const matched = MOCK_CAMP_REGISTRATIONS.filter(r =>
      (farmerId && r.farmerId === farmerId) || (phone && r.farmerPhone === phone)
    );
    return matched.map(r => {
      const d = MOCK_VACCINATION_DRIVES.find(drive => drive.id === r.driveId || drive.campId === r.driveId) || {};
      return { ...r, drive: d };
    });
  },

  async findByDriveAndFarmer(driveId, farmerId) {
    if (!driveId || !farmerId) return null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('vaccination_camp_registrations')
          .select('*')
          .eq('drive_id', driveId)
          .eq('farmer_id', farmerId)
          .maybeSingle();
        if (!error && data) return toCamel(data);
      } catch (e) {
        console.warn('[SupabaseDb] campRegistrations.findByDriveAndFarmer notice:', e.message);
      }
    }

    const found = MOCK_CAMP_REGISTRATIONS.find(r => r.driveId === driveId && r.farmerId === farmerId);
    return found ? toCamel(found) : null;
  }
};

// ============================================================================
// 10. CONTAINMENT ZONES REPOSITORY
// ============================================================================
const containmentZones = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);

        // Resolve case_id to UUID if a caseId string was passed
        let resolvedCaseUuid = null;
        if (snake.case_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(snake.case_id).trim());
          if (isUuid) {
            resolvedCaseUuid = String(snake.case_id).trim();
          } else {
            const { data: cRow } = await supabase
              .from('disease_cases')
              .select('id')
              .eq('case_id', String(snake.case_id).trim())
              .maybeSingle();
            if (cRow) resolvedCaseUuid = cRow.id;
          }
        }

        const { data: inserted, error } = await supabase
          .from('containment_zones')
          .insert({
            zone_id: snake.zone_id || `ZONE-${Date.now()}`,
            case_id: resolvedCaseUuid,
            disease: snake.disease || 'General Containment',
            district: snake.district || 'Pune',
            block: snake.block || '',
            village: snake.village || '',
            center_lat: parseFloat(snake.center_lat || snake.latitude || 18.5204),
            center_lng: parseFloat(snake.center_lng || snake.longitude || 73.8567),
            radius_km: parseFloat(snake.radius_km || 5.0),
            status: snake.status || 'ACTIVE',
            enforced_rules: Array.isArray(snake.enforced_rules) ? snake.enforced_rules : [],
            created_by_vet_id: snake.created_by_vet_id || null,
            creator_name: snake.creator_name || ''
          })
          .select()
          .single();

        if (inserted && !error) {
          created = toCamel(inserted);
        } else if (error) {
          console.warn('[SupabaseDb] containmentZones.create notice:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] containmentZones.create exception:', e.message);
      }
    }

    if (!created && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const doc = await ContainmentZone.create(data);
        if (doc) created = toCamel(doc.toObject ? doc.toObject() : doc);
      } catch (e) { }
    }

    return created;
  },

  async findByZoneId(zoneId) {
    if (!zoneId) return null;
    const cleanId = String(zoneId).trim();

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let q = supabase.from('containment_zones').select('*');
        if (isUuid) {
          q = q.or(`id.eq.${cleanId},zone_id.eq.${cleanId}`);
        } else {
          q = q.eq('zone_id', cleanId);
        }
        const { data, error } = await q.maybeSingle();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = cleanId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanId } : { zoneId: cleanId };
        const doc = await ContainmentZone.findOne(query).lean();
        if (doc) return toCamel(doc);
      } catch (e) { }
    }

    return null;
  },

  async updateStatus(zoneId, status, notes) {
    if (!zoneId || !status) return null;
    const cleanId = String(zoneId).trim();
    let updated = null;

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let q = supabase.from('containment_zones').update({
          status: status,
          updated_at: new Date().toISOString()
        });

        if (isUuid) {
          q = q.or(`id.eq.${cleanId},zone_id.eq.${cleanId}`);
        } else {
          q = q.eq('zone_id', cleanId);
        }

        const { data, error } = await q.select().single();
        if (data && !error) updated = toCamel(data);
      } catch (e) { }
    }

    if (!updated && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const query = cleanId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanId } : { zoneId: cleanId };
        const doc = await ContainmentZone.findOneAndUpdate(query, { status }, { new: true }).lean();
        if (doc) updated = toCamel(doc);
      } catch (e) { }
    }

    return updated;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase.from('containment_zones').select('*').order('created_at', { ascending: false });
        if (filter.district) q = q.ilike('district', `%${filter.district}%`);
        if (filter.status) q = q.eq('status', filter.status);
        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const docs = await ContainmentZone.find(filter).sort({ createdAt: -1 }).lean();
        return toCamel(docs);
      } catch (e) { }
    }

    return [];
  }
};

// ============================================================================
// 11. OUTBREAK & RISK DATA REPOSITORY
// ============================================================================
const outbreaks = {
  async getClusters(district = 'Nagpur', distanceKm = 5.0, minCases = 2) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_spatial_outbreak_clusters', {
          p_district: district,
          p_distance_km: parseFloat(distanceKm),
          p_min_cases: parseInt(minCases, 10)
        });
        if (data && !error && data.length > 0) return toCamel(data);
      } catch (e) { }
    }

    // Fallback in-memory clustering on active cases
    try {
      const activeCases = await DiseaseCase.find({
        districtId: new RegExp(district, 'i'),
        status: { $in: ['New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT'] }
      }).lean();

      const clusters = [];
      const visited = new Set();

      for (let i = 0; i < activeCases.length; i++) {
        if (visited.has(i)) continue;
        const c1 = activeCases[i];
        const group = [c1];
        visited.add(i);

        for (let j = i + 1; j < activeCases.length; j++) {
          if (visited.has(j)) continue;
          const c2 = activeCases[j];
          if (c1.coordinates && c2.coordinates) {
            const d = haversineDistance(c1.coordinates.lat, c1.coordinates.lng, c2.coordinates.lat, c2.coordinates.lng);
            if (d <= 15.0) {
              group.push(c2);
              visited.add(j);
            }
          }
        }

        if (group.length >= minCases) {
          clusters.push({
            clusterId: `CLUSTER-${c1.districtId}-${i + 1}`,
            disease: c1.disease,
            caseCount: group.length,
            district: c1.districtId,
            centerLat: group.reduce((sum, c) => sum + (c.coordinates?.lat || 0), 0) / group.length,
            centerLng: group.reduce((sum, c) => sum + (c.coordinates?.lng || 0), 0) / group.length,
            riskLevel: group.length >= 5 ? 'Critical' : 'High'
          });
        }
      }
      return clusters;
    } catch (e) {
      return [];
    }
  }
};

// ============================================================================
// 12. NOTIFICATIONS REPOSITORY
// ============================================================================
const notifications = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('notifications')
          .insert({
            recipient_id: snake.recipient_id,
            case_id: snake.case_id,
            case_number: snake.case_number || '',
            type: snake.type || 'NEW_CASE_ALERT',
            title: snake.title || 'Notification',
            message: snake.message || '',
            district: snake.district || 'Nagpur',
            status: snake.status || 'DELIVERED',
            metadata: snake.metadata || {}
          })
          .select()
          .single();
        if (inserted && !error) created = toCamel(inserted);
      } catch (e) { }
    }

    try {
      const doc = await Notification.create(data);
      if (!created) created = toCamel(doc.toObject ? doc.toObject() : doc);
    } catch (e) { }

    return created;
  },

  async createBatch(records = []) {
    if (!Array.isArray(records) || records.length === 0) return [];

    if (supabase) {
      try {
        const snakeRecords = records.map(r => {
          const snake = toSnake(r);
          return {
            recipient_id: snake.recipient_id,
            case_id: snake.case_id,
            case_number: snake.case_number || '',
            type: snake.type || 'NEW_CASE_ALERT',
            title: snake.title || 'Notification',
            message: snake.message || '',
            district: snake.district || 'Nagpur',
            status: snake.status || 'DELIVERED',
            metadata: snake.metadata || {}
          };
        });

        const { data, error } = await supabase
          .from('notifications')
          .insert(snakeRecords)
          .select();

        if (!error && data) return data.map(toCamel);
        if (error) {
          console.warn('[SupabaseDb] notifications.createBatch notice:', error.message);
        }
      } catch (e) {
        console.warn('[SupabaseDb] notifications.createBatch exception:', e.message);
      }
    }
    return records;
  },

  async findForUser(userId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false });
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const docs = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).lean();
      return toCamel(docs);
    } catch (e) {
      return [];
    }
  },

  async getByRecipient(userId) {
    return this.findForUser(userId);
  }
};

// ============================================================================
// 13. DASHBOARD ANALYTICS REPOSITORY
// ============================================================================
const dashboard = {
  async getKPIs(district = null) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('view_dashboard_kpis').select('*').single();
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    // Fallback calculations across collections
    try {
      const [totalReports, activeCases, activeZones, upcomingDrives, totalAnimals] = await Promise.all([
        Report.countDocuments({}),
        DiseaseCase.countDocuments({ status: { $in: ['New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED', 'IN_TREATMENT'] } }),
        ContainmentZone.countDocuments({ status: 'ACTIVE' }),
        VaccinationDrive.countDocuments({ status: { $in: ['Upcoming', 'Scheduled', 'Active', 'Ongoing'] } }),
        Animal.countDocuments({})
      ]);

      return {
        totalReports,
        activeCases,
        activeContainmentZones: activeZones,
        upcomingVaccinationDrives: upcomingDrives,
        totalLivestockProtected: totalAnimals
      };
    } catch (e) {
      return {
        totalReports: 0,
        activeCases: 0,
        activeContainmentZones: 0,
        upcomingVaccinationDrives: 0,
        totalLivestockProtected: 0
      };
    }
  }
};

// ============================================================================
// 14. AUDIT LOGS REPOSITORY
// ============================================================================
const auditLogs = {
  async log(action, entityType, entityId, actorId, details = {}) {
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          actor_id: actorId || null,
          details
        });
      } catch (e) { }
    }
  },

  async getByEntity(entityType, entityId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);
        if (!error && data) return data;
      } catch (e) { }
    }
    return [];
  }
};

// ============================================================================
// 15. SCAN IMAGES REPOSITORY (Supabase Storage Metadata)
// ============================================================================
const scanImages = {
  async create(data) {
    let created = null;

    if (supabase) {
      try {
        const snake = toSnake(data);
        const { data: inserted, error } = await supabase
          .from('scan_images')
          .insert({
            animal_id: snake.animal_id || null,
            owner_id: snake.owner_id || null,
            image_url: snake.image_url || '',
            storage_path: snake.storage_path || '',
            bucket_id: snake.bucket_id || 'livestock-scans',
            file_size_bytes: snake.file_size_bytes || 0,
            mime_type: snake.mime_type || 'image/jpeg',
            is_private: snake.is_private !== undefined ? snake.is_private : true,
            sha256_hash: snake.sha256_hash || '',
            disease: snake.disease || 'Unknown',
            risk_level: snake.risk_level || 'Moderate',
            confidence: snake.confidence || 0,
            symptoms: snake.symptoms || [],
            temperature: snake.temperature || 0,
            duration: snake.duration || 0
          })
          .select(`*, owner:profiles!scan_images_owner_id_fkey(name, phone, role)`)
          .single();

        if (inserted && !error) {
          created = toCamel(inserted);
        }
      } catch (e) { }
    }

    // Dual-write to MongoDB during transition
    try {
      const mongoData = { ...data };
      if (mongoData.animalId && !mongoose.Types.ObjectId.isValid(mongoData.animalId)) {
        delete mongoData.animalId;
      }
      if (mongoData.ownerId && !mongoose.Types.ObjectId.isValid(mongoData.ownerId)) {
        const u = await User.findOne({ email: 'farmer@pashurakshak.in' }).catch(() => null);
        if (u) {
          mongoData.ownerId = u._id;
        } else {
          delete mongoData.ownerId;
        }
      }
      const doc = await ScanImage.create(mongoData);
      if (!created) {
        created = toCamel(doc.toObject ? doc.toObject() : doc);
        if (data.ownerId) created.ownerId = data.ownerId;
        if (data.storagePath) created.storagePath = data.storagePath;
      }
    } catch (e) {
      console.warn('[SupabaseDb] ScanImage Mongoose notice:', e.message);
    }

    if (!created) {
      const fallbackId = (data._id || data.id || `scn-${Date.now()}`).toString();
      created = {
        ...toCamel(data),
        id: fallbackId,
        _id: fallbackId
      };
    }

    return created;
  },

  async find(filter = {}) {
    if (supabase) {
      try {
        let q = supabase
          .from('scan_images')
          .select(`*, owner:profiles!scan_images_owner_id_fkey(name, phone, role)`)
          .order('created_at', { ascending: false });

        if (filter.animalId) q = q.eq('animal_id', filter.animalId);
        if (filter.ownerId) q = q.eq('owner_id', filter.ownerId);
        if (filter.storagePath) q = q.eq('storage_path', filter.storagePath);

        const { data, error } = await q;
        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const query = {};
      if (filter.animalId) query.animalId = filter.animalId;
      if (filter.ownerId) {
        if (mongoose.Types.ObjectId.isValid(filter.ownerId)) {
          query.ownerId = filter.ownerId;
        } else {
          const u = await User.findOne({ email: 'farmer@pashurakshak.in' }).catch(() => null);
          if (u) query.ownerId = u._id;
        }
      }
      const docs = await ScanImage.find(query).sort({ createdAt: -1 }).lean();
      return toCamel(docs);
    } catch (e) {
      return [];
    }
  },

  async findById(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('scan_images')
          .select(`*, owner:profiles!scan_images_owner_id_fkey(name, phone, role)`)
          .eq('id', id)
          .single();

        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const doc = await ScanImage.findById(id).lean();
      return doc ? toCamel(doc) : null;
    } catch (e) {
      return null;
    }
  },

  async findOneByStoragePath(storagePath) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('scan_images')
          .select(`*, owner:profiles!scan_images_owner_id_fkey(name, phone, role)`)
          .eq('storage_path', storagePath)
          .single();

        if (data && !error) return toCamel(data);
      } catch (e) { }
    }

    try {
      const doc = await ScanImage.findOne({ imageUrl: new RegExp(storagePath.split('/').pop(), 'i') }).lean();
      return doc ? toCamel(doc) : null;
    } catch (e) {
      return null;
    }
  }
};

module.exports = {
  supabase,
  profiles,
  animals,
  reports,
  triageResults,
  veterinarians,
  diseaseCases,
  caseNotifiedVets,
  animalTreatments,
  labReferrals,
  advisories,
  vaccinationDrives,
  campRegistrations,
  animalVaccinations,
  containmentZones,
  outbreaks,
  notifications,
  dashboard,
  auditLogs,
  scanImages,
  computeVaccinationStatus,
  normalizeVaccination,
  toCamel,
  toSnake
};
