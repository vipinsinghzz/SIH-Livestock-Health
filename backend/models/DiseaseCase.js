const mongoose = require('mongoose');

const diseaseCaseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer ID is required'],
      index: true
    },
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      default: null
    },
    animalName: {
      type: String,
      default: ''
    },
    species: {
      type: String,
      default: 'Cattle'
    },
    image: {
      type: String,
      default: ''
    },
    disease: {
      type: String,
      required: [true, 'Predicted disease is required'],
      trim: true
    },
    confidence: {
      type: Number,
      default: 85,
      min: 0,
      max: 100
    },
    risk: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'High'
    },
    districtId: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true
    },
    state: {
      type: String,
      default: 'Maharashtra'
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    farmerLocation: {
      village: { type: String, default: '' },
      block: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' }
    },
    farmerContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    symptoms: [
      {
        type: String,
        trim: true
      }
    ],
    temperature: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    affectedCount: {
      type: Number,
      default: 1,
      min: 1
    },
    notes: {
      type: String,
      default: ''
    },
    clinicalDiagnosis: {
      type: String,
      default: ''
    },
    investigationNotes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['New', 'Investigating', 'Confirmed', 'Containment', 'Resolved', 'OPEN', 'ACCEPTED', 'IN_TREATMENT'],
      default: 'New',
      index: true
    },
    containmentZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContainmentZone',
      default: null
    },
    ringVaccinationDriveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VaccinationDrive',
      default: null
    },
    assignedVetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    notifiedVets: [
      {
        vetId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        name: String,
        phone: String,
        notifiedAt: {
          type: Date,
          default: Date.now
        },
        deliveryStatus: {
          type: String,
          enum: ['SENT', 'PENDING', 'FAILED'],
          default: 'SENT'
        },
        channel: {
          type: String,
          default: 'SSE'
        },
        error: String
      }
    ],
    acceptedAt: {
      type: Date,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    containmentStartedAt: {
      type: Date,
      default: null
    },
    treatmentStartedAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    treatmentNotes: {
      type: String,
      default: ''
    },
    prescription: {
      type: String,
      default: ''
    },
    timeline: [
      {
        status: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        updaterName: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        notes: String
      }
    ]
  },
  { timestamps: true }
);

// Compound indexes for fast district referral and status queries
diseaseCaseSchema.index({ districtId: 1, status: 1, createdAt: -1 });
diseaseCaseSchema.index({ farmerId: 1, createdAt: -1 });
diseaseCaseSchema.index({ assignedVetId: 1, status: 1 });

module.exports = mongoose.model('DiseaseCase', diseaseCaseSchema);
