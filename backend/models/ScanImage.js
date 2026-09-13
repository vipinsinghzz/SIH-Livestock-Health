const mongoose = require('mongoose');

const scanImageSchema = new mongoose.Schema(
  {
    animalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      default: null
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required']
    },
    disease: {
      type: String,
      default: 'Unknown'
    },
    riskLevel: {
      type: String,
      default: 'Moderate'
    },
    confidence: {
      type: Number,
      default: 0
    },
    symptoms: [
      {
        type: String
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
    storagePath: {
      type: String,
      default: ''
    },
    bucketId: {
      type: String,
      default: 'livestock-scans'
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'image/jpeg'
    },
    isPrivate: {
      type: Boolean,
      default: true
    },
    sha256Hash: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ScanImage', scanImageSchema);
