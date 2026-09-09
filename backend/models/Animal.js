const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
  {
    tagId: {
      type: String,
      required: [true, 'Tag ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    species: {
      type: String,
      required: [true, 'Species is required'],
      enum: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'],
      default: 'Cattle'
    },
    breed: {
      type: String,
      default: 'Indigenous / Mixed'
    },
    age: {
      type: Number, // In months or years, default years
      default: 3
    },
    gender: {
      type: String,
      enum: ['Female', 'Male'],
      default: 'Female'
    },
    healthStatus: {
      type: String,
      enum: ['Healthy', 'Needs Attention', 'Critical'],
      default: 'Healthy'
    },
    milkYieldDaily: {
      type: String,
      default: '12.0 L'
    },
    lastCheckup: {
      type: String,
      default: () => new Date().toLocaleDateString('en-GB')
    },
    timeline: [
      {
        type: { type: String, default: 'Health Check' },
        title: { type: String, required: true },
        date: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
        doctor: { type: String, default: '' },
        notes: { type: String, default: '' },
        image: { type: String, default: '' },
        status: { type: String, default: '' },
        disease: { type: String, default: '' },
        confidence: { type: Number, default: null },
        symptoms: [{ type: String }],
        advisory: { type: String, default: '' },
        temperature: { type: Number, default: null },
        duration: { type: Number, default: null }
      }
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    village: {
      type: String,
      required: true
    },
    block: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true,
      default: 'Pune'
    },
    vaccinationHistory: [
      {
        vaccine: { type: String, required: true },
        date: { type: Date, default: Date.now },
        nextDue: { type: Date },
        dose: { type: String, default: 'Primary Dose' },
        batchNumber: { type: String, default: '' },
        administeredBy: { type: String, default: '' },
        camp: { type: String, default: '' },
        notes: { type: String, default: '' }
      }
    ],
    treatmentHistory: [
      {
        condition: { type: String, required: true },
        date: { type: Date, default: Date.now },
        treatment: { type: String, required: true },
        vetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Animal', animalSchema);
