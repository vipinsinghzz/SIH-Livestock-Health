const mongoose = require('mongoose');

const triageResultSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      unique: true
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      required: true,
      default: 'Low'
    },
    suspectedDiseases: [
      {
        name: { type: String, required: true },
        confidenceScore: { type: Number, required: true }, // e.g. 0.85 (85%)
        rationale: { type: String }
      }
    ],
    recommendedAction: {
      type: String,
      required: true
    },
    immediateFirstAid: [
      { type: String }
    ],
    outbreakFlag: {
      type: Boolean,
      default: false
    },
    clusterDetails: {
      matchedCasesCount: { type: Number, default: 0 },
      timeWindowDays: { type: Number, default: 14 },
      block: String
    },
    explanation: {
      type: String,
      required: true
    },
    visualScore: {
      type: Number,
      default: null
    },
    modelVersion: {
      type: String,
      default: 'lsd_model.keras (EfficientNetB0)'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TriageResult', triageResultSchema);
