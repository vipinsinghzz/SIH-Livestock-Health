const mongoose = require('mongoose');

const labReferralSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true
    },
    sampleType: {
      type: String,
      required: [true, 'Sample type is required'],
      enum: [
        'Blood / Serum',
        'Nasal / Oral Swab',
        'Vesicular Fluid',
        'Skin Lesion / Scab',
        'Milk Sample',
        'Tissue Sample',
        'Fecal Sample',
        'Other'
      ],
      default: 'Blood / Serum'
    },
    collectionDate: {
      type: Date,
      default: Date.now
    },
    referredLab: {
      type: String,
      required: [true, 'Referred lab name is required'],
      default: 'District Disease Diagnostic Laboratory (DDDL), Pune'
    },
    status: {
      type: String,
      enum: ['Collected', 'In Transit', 'Received', 'Result Pending', 'Result Confirmed'],
      default: 'Collected'
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resultSummary: {
      confirmedDisease: String,
      notes: String,
      confirmedDate: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabReferral', labReferralSchema);
