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
    const { tagId, species, breed, age, ownerId, village, block, district, vaccinationHistory, treatmentHistory } = req.body;

    if (!tagId || !species) {
      return res.status(400).json({
        success: false,
        message: 'Tag ID and species are required.'
      });
    }

    const existingTag = await Animal.findOne({ tagId: tagId.toUpperCase() });
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: `An animal with Tag ID '${tagId.toUpperCase()}' is already registered.`
      });
    }

    const animal = await Animal.create({
      tagId: tagId.toUpperCase(),
      species,
      breed: breed || 'Indigenous / Mixed',
      age: age ? parseInt(age, 10) : 3,
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

// @desc    Update animal record (details, add vaccination, add treatment)
// @route   PATCH /api/animals/:id
// @access  Private
exports.updateAnimal = async (req, res, next) => {
  try {
    const { breed, age, village, block, newVaccination, newTreatment } = req.body;

    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found.'
      });
    }

    if (breed) animal.breed = breed;
    if (age) animal.age = parseInt(age, 10);
    if (village) animal.village = village;
    if (block) animal.block = block;

    if (newVaccination && newVaccination.vaccine) {
      animal.vaccinationHistory.push({
        vaccine: newVaccination.vaccine,
        date: newVaccination.date || new Date(),
        nextDue: newVaccination.nextDue || null
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
