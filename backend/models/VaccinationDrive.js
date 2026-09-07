const mongoose = require('mongoose');

const vaccinationDriveSchema = new mongoose.Schema(
  {
    vaccine: {
      type: String,
      required: true,
      enum: ['FMD (Foot and Mouth Disease)', 'Lumpy Skin Disease (LSD)', 'Haemorrhagic Septicaemia (HS)', 'Blackleg (BQ)', 'Brucellosis', 'PPR (Goat Plague)', 'Rabies', 'Avian Influenza']
    },
    targetSpecies: {
      type: String,
      default: 'Cattle & Buffalo'
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
    targetCount: {
      type: Number,
      required: true,
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
      enum: ['Scheduled', 'Active', 'Completed'],
      default: 'Active'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccinationDrive', vaccinationDriveSchema);
