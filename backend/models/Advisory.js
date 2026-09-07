const mongoose = require('mongoose');

const advisorySchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null
    },
    title: {
      en: { type: String, required: true },
      hi: { type: String, required: true }
    },
    message: {
      en: { type: String, required: true },
      hi: { type: String, required: true }
    },
    severity: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      default: 'Moderate'
    },
    disease: {
      type: String,
      default: 'General Health'
    },
    targetVillage: {
      type: String,
      default: 'All'
    },
    targetBlock: {
      type: String,
      default: 'All'
    },
    targetDistrict: {
      type: String,
      default: 'Pune'
    },
    issuedBy: {
      type: String,
      default: 'District Animal Husbandry Department'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Advisory', advisorySchema);
