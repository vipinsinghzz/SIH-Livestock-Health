const express = require('express');
const router = express.Router();
const {
  createCase,
  getCases,
  getCaseById,
  claimCase,
  updateCaseStatus,
  retryNotifications,
  getDistrictVets,
  streamCases,
  getSpatialOutbreakClusters,
  getNearbyCases,
  getOutbreakRiskAnalysis,
  createContainmentZone,
  getContainmentZones,
  updateContainmentZoneStatus,
  scheduleRingVaccination,
  getAdvisories
} = require('../controllers/caseController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// SSE stream for real-time referral alerts & status updates
router.get('/stream', streamCases);

// Helper to get active district vets
router.get('/district-vets', getDistrictVets);

// Spatial Outbreak Clusters (<= 5km proximity grouping)
router.get(
  '/clusters',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  getSpatialOutbreakClusters
);

// PostGIS Radius Search
router.get('/nearby', getNearbyCases);

// On-demand Epidemiological Outbreak Risk Analysis Pipeline
router.get(
  '/risk-analysis',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  getOutbreakRiskAnalysis
);

// Dynamic AI Preventive Advisory
router.get('/advisories', getAdvisories);

// Containment Zones
router.route('/containment-zones')
  .post(authorize('field_worker', 'veterinarian', 'officer', 'admin'), createContainmentZone)
  .get(getContainmentZones);

router.patch(
  '/containment-zones/:zoneId/status',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  updateContainmentZoneStatus
);

// Standard Case CRUD & operations
router.route('/')
  .post(createCase)
  .get(getCases);

// Specific Case Routes (Must be after static path segments)
router.route('/:id')
  .get(getCaseById);

// Atomic Case Claim (Only veterinarians & field workers)
router.patch(
  '/:id/claim',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  claimCase
);

// Update Status: New -> Investigating -> Confirmed -> Containment -> Resolved
router.patch(
  '/:id/status',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  updateCaseStatus
);

// Schedule Ring Vaccination for Case
router.post(
  '/:id/schedule-ring-vaccination',
  authorize('field_worker', 'veterinarian', 'officer', 'admin'),
  scheduleRingVaccination
);

// Retry failed notifications
router.post('/:id/retry-notifications', retryNotifications);

module.exports = router;
