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
      query.ownerId = req.user._id;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (species) query.species = species;
    if (village) query.village = new RegExp(village, 'i');
    if (block) query.block = new RegExp(block, 'i');
    if (district) query.district = new RegExp(district, 'i');

    const animals = await Animal.find(query)
      .populate('ownerId', 'name phone email village')
      .sort({ createdAt: -1 })
      .lean();

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
    const animal = await Animal.findById(req.params.id)
      .populate('ownerId', 'name phone email village block district')
      .lean();

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    // Fetch linked past reports for this animal
    const pastReports = await Report.find({ animalId: animal._id }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      animal: {
        ...animal,
        pastReports
      }
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

    const existingTag = await Animal.findOne({ tagId: finalTagId });
    if (existingTag && tagId) {
      return res.status(400).json({
        success: false,
        message: `An animal with Tag ID '${finalTagId}' is already registered.`
      });
    }

    const animal = await Animal.create({
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
      ownerId: ownerId || req.user._id,
      village: village || req.user.village || 'Default Village',
      block: block || req.user.block || 'Default Block',
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
    const {
      name,
      breed,
      age,
      gender,
      healthStatus,
      milkYieldDaily,
      village,
      block,
      newVaccination,
      newTreatment,
      newTimelineEvent
    } = req.body;

    let animal = null;
    const animalId = req.params.id;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(animalId)) {
      animal = await Animal.findById(animalId);
    }
    if (!animal) {
      animal = await Animal.findOne({ tagId: animalId });
    }

    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    if (name) animal.name = name;
    if (breed) animal.breed = breed;
    if (age !== undefined) animal.age = parseInt(age, 10);
    if (gender) animal.gender = gender;
    if (healthStatus) animal.healthStatus = healthStatus;
    if (milkYieldDaily) animal.milkYieldDaily = milkYieldDaily;
    if (village) animal.village = village;
    if (block) animal.block = block;

    if (newVaccination && newVaccination.vaccine) {
      animal.vaccinationHistory.push({
        vaccine: newVaccination.vaccine,
        date: newVaccination.date || new Date(),
        nextDue: newVaccination.nextDue || null,
        dose: newVaccination.dose || 'Primary Dose',
        batchNumber: newVaccination.batchNumber || '',
        administeredBy: newVaccination.administeredBy || '',
        camp: newVaccination.camp || '',
        notes: newVaccination.notes || ''
      });
    }

    if (newTreatment && newTreatment.condition) {
      animal.treatmentHistory.push({
        condition: newTreatment.condition,
        date: newTreatment.date || new Date(),
        treatment: newTreatment.treatment || 'Prescribed medication',
        vetId: req.user._id
      });
    }

    if (newTimelineEvent && newTimelineEvent.title) {
      animal.timeline.unshift({
        type: newTimelineEvent.type || 'Health Check',
        title: newTimelineEvent.title,
        date: newTimelineEvent.date || new Date().toLocaleDateString('en-GB'),
        doctor: newTimelineEvent.doctor || '',
        notes: newTimelineEvent.notes || '',
        image: newTimelineEvent.image || '',
        status: newTimelineEvent.status || '',
        disease: newTimelineEvent.disease || '',
        confidence: newTimelineEvent.confidence || null,
        symptoms: Array.isArray(newTimelineEvent.symptoms) ? newTimelineEvent.symptoms : [],
        advisory: newTimelineEvent.advisory || '',
        temperature: newTimelineEvent.temperature || null,
        duration: newTimelineEvent.duration || null
      });
    }

    await animal.save();

    res.status(200).json({
      success: true,
      message: 'Animal record updated successfully.',
      animal
    });
  } catch (error) {
    next(error);
  }
};
