const supabaseDb = require('../services/supabaseDb');
const Animal = require('../models/Animal');
const Report = require('../models/Report');

// @desc    Get all animals (filtered by owner, village, species)
// @route   GET /api/animals
// @access  Private
exports.getAnimals = async (req, res, next) => {
  try {
    const { ownerId, species, village, block, district } = req.query;
    const query = {};

    // Farmers only see their own animals by default
    if (req.user.role === 'farmer') {
      query.ownerId = String(req.user._id || req.user.id);
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

    res.status(200).json({
      success: true,
      animal
    });
  } catch (error) {
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
      ownerId,
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

    const finalTagId = (tagId || `MH-12-P-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();

    // Verify tag uniqueness if tagId provided
    if (tagId) {
      const existing = await supabaseDb.animals.find({ tagId: finalTagId });
      if (existing && existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `An animal with Tag ID '${finalTagId}' is already registered.`
        });
      }
    }

    const effectiveOwnerId = ownerId || String(req.user._id || req.user.id);

    const animal = await supabaseDb.animals.create({
      tagId: finalTagId,
      name: name || finalTagId,
      species,
      breed: breed || 'Indigenous / Mixed',
      age: age ? parseInt(age, 10) : 3,
      gender: gender || 'Female',
      healthStatus: healthStatus || 'Healthy',
      milkYieldDaily: milkYieldDaily || (species === 'Goat' ? '2.0 L' : species === 'Cattle' || species === 'Buffalo' ? '12.0 L' : 'N/A'),
      timeline: timeline || [
        {
          type: 'Health Check',
          title: 'Animal Registered',
          date: new Date().toLocaleDateString('en-GB'),
          notes: 'Profile added to Livestock Saathi'
        }
      ],
      ownerId: effectiveOwnerId,
      village: village || req.user.village || 'Baramati Rural',
      block: block || req.user.block || 'Baramati',
      district: district || req.user.district || 'Pune',
      vaccinationHistory: vaccinationHistory || [],
      treatmentHistory: treatmentHistory || []
    });

    res.status(201).json({
      success: true,
      message: 'Animal profile registered successfully.',
      animal
    });
  } catch (error) {
    next(error);
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

    const updates = { ...req.body };

    // Format new vaccination event if present
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

    // Format new treatment if present
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

    // Format new timeline event if present
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
        disease: ne.disease || ''
      });
      updates.timeline = timeline;
    }

    const updated = await supabaseDb.animals.updateById(existing.id || existing._id, updates);

    res.status(200).json({
      success: true,
      message: 'Animal record updated successfully.',
      animal: updated || existing
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an animal record
// @route   DELETE /api/animals/:id
// @access  Private
exports.deleteAnimal = async (req, res, next) => {
  try {
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
    next(error);
  }
};
