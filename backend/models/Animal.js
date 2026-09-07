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
        nextDue: { type: Date }
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
