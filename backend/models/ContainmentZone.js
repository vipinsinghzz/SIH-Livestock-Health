const mongoose = require('mongoose');

const containmentZoneSchema = new mongoose.Schema(
  {
    zoneId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiseaseCase',
      default: null,
      index: true
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null
    },
    disease: {
      type: String,
      required: [true, 'Disease name is required for containment zone declaration'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true
    },
    block: {
      type: String,
      default: '',
      trim: true
    },
    village: {
      type: String,
      default: '',
      trim: true
    },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    radiusKm: {
      type: Number,
      default: 5.0,
      min: 0.5,
      max: 50.0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONTAINED', 'LIFTED'],
      default: 'ACTIVE',
      index: true
    },
    enforcedRules: [
      {
        type: String,
        trim: true
      }
    ],
    createdByVetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    creatorName: {
      type: String,
      default: ''
    },
    ringVaccinationDriveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccinationDrive',
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    containedAt: {
      type: Date,
      default: null
    },
    liftedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

containmentZoneSchema.index({ district: 1, status: 1 });
containmentZoneSchema.index({ 'center.lat': 1, 'center.lng': 1 });

module.exports = mongoose.model('ContainmentZone', containmentZoneSchema);
