const mongoose = require('mongoose');

const vaccinationDriveSchema = new mongoose.Schema(
  {
    campId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    state: {
      type: String,
      required: true,
      default: 'Maharashtra',
      index: true
    },
    district: {
      type: String,
      required: true,
      default: 'Pune',
      index: true
    },
    block: {
      type: String,
      required: true,
      index: true
    },
    village: {
      type: String,
      required: true
    },
    venue: {
      type: String,
      required: true,
      default: 'Primary Veterinary Dispensary'
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    vaccine: {
      type: String,
      required: true,
      index: true
    },
    vaccineFullName: {
      type: String
    },
    targetSpecies: {
      type: String,
      default: 'Cattle & Buffalo'
    },
    campDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    startTime: {
      type: String,
      default: '09:30 AM'
    },
    endTime: {
      type: String,
      default: '04:00 PM'
    },
    cost: {
      type: String,
      default: 'Free (Govt Drive)'
    },
    isFree: {
      type: Boolean,
      default: true
    },
    organizingHospital: {
      type: String,
      required: true
    },
    assignedOfficer: {
      type: String,
      required: true
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contactNumber: {
      type: String,
      default: '1962'
    },
    capacity: {
      type: Number,
      required: true,
      default: 200,
      min: 1
    },
    bookedSlots: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingSlots: {
      type: Number,
      default: 200,
      min: 0
    },
    // Backward compatibility fields for legacy analytics
    targetCount: {
      type: Number,
      default: 200,
      min: 1
    },
    coveredCount: {
      type: Number,
      default: 0,
      min: 0
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Scheduled', 'Active'],
      default: 'Upcoming',
      index: true
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

// Compound index for fast geo and filter lookups
vaccinationDriveSchema.index({ district: 1, block: 1, status: 1 });
vaccinationDriveSchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });

module.exports = mongoose.model('VaccinationDrive', vaccinationDriveSchema);

