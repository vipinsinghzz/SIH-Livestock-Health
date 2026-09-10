const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiseaseCase',
      required: true,
      index: true
    },
    caseNumber: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['NEW_CASE_ALERT', 'CASE_CLAIMED', 'CASE_STATUS_UPDATE'],
      default: 'NEW_CASE_ALERT'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['QUEUED', 'DELIVERED', 'FAILED', 'READ'],
      default: 'DELIVERED'
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now
    },
    error: {
      type: String,
      default: ''
    },
    metadata: {
      disease: String,
      risk: String,
      confidence: Number,
      animalSpecies: String,
      farmerName: String,
      farmerPhone: String
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
