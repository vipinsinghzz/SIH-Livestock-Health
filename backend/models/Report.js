const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      default: null
    },
    herdId: {
      type: String,
      default: null
    },
    species: {
      type: String,
      required: true,
      enum: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'],
      default: 'Cattle'
    },
    symptoms: [
      {
        type: String,
        trim: true
      }
    ],
    mortalityCount: {
      type: Number,
      default: 0,
      min: 0
    },
    affectedCount: {
      type: Number,
      default: 1,
      min: 1
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      village: { type: String, required: true },
      block: { type: String, required: true },
      district: { type: String, required: true, default: 'Pune' }
    },
    photos: [
      {
        type: String // URL or base64 data string
      }
    ],
    status: {
      type: String,
      enum: ['Reported', 'Triaged', 'Field Verified', 'Escalated', 'Contained', 'Closed'],
      default: 'Reported'
    },
    reporterContact: {
      phone: String,
      name: String
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Geospatial and filter index
reportSchema.index({ 'location.lat': 1, 'location.lng': 1 });
reportSchema.index({ 'location.district': 1, 'location.block': 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
