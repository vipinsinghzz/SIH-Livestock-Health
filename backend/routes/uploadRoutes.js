const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ScanImage = require('../models/ScanImage');

// @route   POST /api/upload/scan-image
// @desc    Upload and store disease scan image to disk and MongoDB
// @access  Public / Authenticated
router.post('/scan-image', async (req, res, next) => {
  try {
    const { image, animalId, ownerId, disease, riskLevel, confidence, symptoms, temperature, duration } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const scansDir = path.join(__dirname, '..', 'uploads', 'scans');
    if (!fs.existsSync(scansDir)) {
      fs.mkdirSync(scansDir, { recursive: true });
    }

    let fileBuffer;
    let extension = 'jpg';

    if (image.startsWith('data:image')) {
      const matches = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(image.split(',')[1] || image, 'base64');
      }
    } else {
      fileBuffer = Buffer.from(image, 'base64');
    }

    const filename = `scan-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
    const filePath = path.join(scansDir, filename);

    fs.writeFileSync(filePath, fileBuffer);
    const imageUrl = `/uploads/scans/${filename}`;

    // Save metadata in MongoDB ScanImage collection
    let scanRecord = null;
    try {
      scanRecord = await ScanImage.create({
        animalId: animalId || null,
        ownerId: ownerId || null,
        imageUrl,
        disease: disease || 'Lumpy Skin Disease (LSD)',
        riskLevel: riskLevel || 'Moderate',
        confidence: Number(confidence) || 0,
        symptoms: Array.isArray(symptoms) ? symptoms : [],
        temperature: Number(temperature) || 0,
        duration: Number(duration) || 0
      });
    } catch (dbErr) {
      console.warn('Could not save ScanImage to MongoDB (proceeding with file):', dbErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Disease scan image stored successfully',
      imageUrl,
      scanId: scanRecord ? scanRecord._id : null
    });
  } catch (error) {
    console.error('Error uploading scan image:', error);
    next(error);
  }
});

// @route   GET /api/upload/scans
// @desc    Get all scanned images
router.get('/scans', async (req, res, next) => {
  try {
    const { animalId } = req.query;
    const query = {};
    if (animalId) query.animalId = animalId;

    const scans = await ScanImage.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: scans.length, scans });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
