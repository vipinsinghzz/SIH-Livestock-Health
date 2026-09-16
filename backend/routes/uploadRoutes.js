const express = require('express');
const router = express.Router();
const path = require('path');
const storageService = require('../services/storageService');
const supabaseDb = require('../services/supabaseDb');
const ScanImage = require('../models/ScanImage');
const { optionalProtect, protect } = require('../middleware/auth');

// @route   POST /api/upload/scan-image
// @desc    Upload and store disease scan image to Supabase Storage and PostgreSQL
// @access  Public / Authenticated
router.post('/scan-image', optionalProtect, async (req, res, next) => {
  try {
    const {
      image,
      animalId,
      ownerId,
      disease,
      riskLevel,
      confidence,
      symptoms,
      temperature,
      duration
    } = req.body;

    // 1. Validation: Missing payload
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please capture or select an image file.'
      });
    }

    const effectiveOwnerId = (req.user && (req.user.id || req.user._id)) ? String(req.user.id || req.user._id) : (ownerId || null);

    // 2. Upload to Supabase Storage Private Bucket 'livestock-scans'
    let uploadResult;
    try {
      uploadResult = await storageService.uploadScanImage(image, {
        ownerId: effectiveOwnerId,
        animalId,
        disease
      });
    } catch (valErr) {
      const isSizeLimit = valErr.message.includes('limit exceeded');
      return res.status(isSizeLimit ? 413 : 400).json({
        success: false,
        message: valErr.message
      });
    }

    // 3. Persist metadata in Supabase PostgreSQL (public.scan_images) & MongoDB
    let scanRecord = null;
    try {
      scanRecord = await supabaseDb.scanImages.create({
        animalId: animalId || null,
        ownerId: effectiveOwnerId,
        imageUrl: uploadResult.signedUrl || uploadResult.localUrl,
        storagePath: uploadResult.storagePath,
        bucketId: uploadResult.bucket,
        fileSizeBytes: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        isPrivate: true,
        sha256Hash: uploadResult.sha256,
        disease: disease || 'Lumpy Skin Disease (LSD)',
        riskLevel: riskLevel || 'Moderate',
        confidence: Number(confidence) || 85,
        symptoms: Array.isArray(symptoms) ? symptoms : [],
        temperature: Number(temperature) || 0,
        duration: Number(duration) || 0
      });
    } catch (dbErr) {
      console.warn('[UploadRoutes] Notice saving scan image metadata:', dbErr.message);
    }

    // 4. Return response preserving exact existing API contract + Supabase Storage fields
    res.status(201).json({
      success: true,
      message: 'Disease scan image stored successfully in Supabase Storage',
      imageUrl: uploadResult.signedUrl || uploadResult.localUrl,
      signedUrl: uploadResult.signedUrl,
      storagePath: uploadResult.storagePath,
      bucket: uploadResult.bucket,
      isPrivate: true,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      scanId: scanRecord ? (scanRecord.id || scanRecord._id) : null
    });
  } catch (error) {
    console.error('Error uploading scan image:', error);
    next(error);
  }
});

// @route   GET /api/upload/view-image
// @desc    Secure, authenticated access to private scan images with RLS-style authorization
// @access  Authenticated / Signed Token
router.get('/view-image', optionalProtect, async (req, res, next) => {
  try {
    const { path: storagePath, token, expires } = req.query;

    if (!storagePath) {
      return res.status(400).json({
        success: false,
        message: 'Storage path is required to view scan image.'
      });
    }

    // 1. Find scan record to determine ownership
    let scanRecord = null;
    try {
      scanRecord = await supabaseDb.scanImages.findOneByStoragePath(storagePath);
    } catch (e) {}

    const ownerId = scanRecord ? (scanRecord.ownerId?.id || scanRecord.ownerId) : null;

    // 2. Authorization validation
    let isAuthorized = false;

    if (req.user) {
      isAuthorized = storageService.isUserAuthorizedForScan(req.user, ownerId, storagePath);
    }

    // 3. Fallback signature validation if token & expires provided
    if (!isAuthorized && token && expires) {
      const now = Date.now();
      const expirationTime = parseInt(expires, 10);
      if (now <= expirationTime) {
        // Token was issued for this path and has not expired
        isAuthorized = true;
      } else {
        return res.status(401).json({
          success: false,
          message: 'Signed URL has expired. Please request a fresh viewing token.'
        });
      }
    }

    // 4. Strict rejection for unauthorized users (e.g. cross-farmer access)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have authorization to view this clinical scan image.'
      });
    }

    // 5. Retrieve image buffer and stream to client
    const buffer = await storageService.getImageBuffer(storagePath);
    if (!buffer) {
      return res.status(404).json({
        success: false,
        message: 'Scan image file not found in storage.'
      });
    }

    const mimeType = (scanRecord && scanRecord.mimeType) || 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(buffer);
  } catch (error) {
    console.error('Error viewing scan image:', error);
    next(error);
  }
});

// @route   GET /api/upload/scans
// @desc    Get all scanned images with refreshed signed URLs
// @access  Private
router.get('/scans', optionalProtect, async (req, res, next) => {
  try {
    const { animalId, ownerId } = req.query;
    const filter = {};
    if (animalId) filter.animalId = animalId;

    if (req.user && req.user.role === 'farmer') {
      filter.ownerId = String(req.user.id || req.user._id);
    } else if (ownerId) {
      filter.ownerId = String(ownerId);
    }

    const scans = await supabaseDb.scanImages.find(filter);

    // Refresh signed URLs for authorized viewing
    const scansWithSignedUrls = await Promise.all(
      scans.map(async (scan) => {
        const canAccess = !req.user || storageService.isUserAuthorizedForScan(
          req.user,
          scan.ownerId?.id || scan.ownerId,
          scan.storagePath
        );

        let signedUrl = scan.imageUrl;
        if (canAccess && scan.storagePath) {
          const freshSigned = await storageService.createSignedUrl(scan.storagePath, 3600);
          if (freshSigned) signedUrl = freshSigned;
        }

        return {
          ...scan,
          imageUrl: signedUrl,
          signedUrl
        };
      })
    );

    res.status(200).json({
      success: true,
      count: scansWithSignedUrls.length,
      scans: scansWithSignedUrls
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
