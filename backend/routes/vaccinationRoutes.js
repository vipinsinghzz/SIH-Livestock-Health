const express = require('express');
const router = express.Router();
const {
  getVaccinationDrives,
  getVaccinationDriveById,
  createVaccinationDrive,
  updateVaccinationDrive,
  registerForCamp,
  getMyRegistrations,
  getOfficerKpis,
  getAvailableStaff,
  assignTeam,
  updateCampaignStatus,
  closeCampaign,
  recordVaccinationDose,
  getCoverageAnalytics,
  getActiveOutbreaks,
  createRingCampaign,
  deleteVaccinationDrive
} = require('../controllers/vaccinationController');
const { protect, optionalProtect, authorize } = require('../middleware/auth');

// ============================================================================
// 1. OFFICER SPECIFIC ANALYTICS & COORDINATION (Declared before /:id)
// ============================================================================
// Real-time KPI statistics for Officer Dashboard
router.get('/kpis', protect, authorize('officer', 'admin'), getOfficerKpis);

// Available veterinarians & field workers with real-time availability
router.get('/available-staff', protect, authorize('officer', 'admin'), getAvailableStaff);

// Block & village coverage breakdown with actionable low-coverage priority warnings
router.get('/coverage-analytics', protect, authorize('officer', 'admin'), getCoverageAnalytics);

// Active outbreak cases in district for ring vaccination targeting
router.get('/active-outbreaks', protect, authorize('officer', 'admin'), getActiveOutbreaks);

// Outbreak-driven Ring Vaccination Campaign Establishment
router.post('/ring-campaign', protect, authorize('officer', 'admin'), createRingCampaign);

// ============================================================================
// 2. FARMER CAMP REGISTRATIONS
// ============================================================================
router.get('/my-registrations', protect, getMyRegistrations);

// ============================================================================
// 3. CAMPAIGN DISCOVERY & DETAIL
// ============================================================================
router.get('/', optionalProtect, getVaccinationDrives);
router.get('/:id', optionalProtect, getVaccinationDriveById);

// ============================================================================
// 4. CAMPAIGN CREATION & MANAGEMENT
// ============================================================================
// Standard campaign creation (supports field_worker, veterinarian, officer, admin for compatibility)
router.post('/', protect, authorize('field_worker', 'veterinarian', 'officer', 'admin'), createVaccinationDrive);

// Officer Team Assignment (assigning staff to campaign)
router.post('/:id/assign-team', protect, authorize('officer', 'admin'), assignTeam);

// Officer Campaign Status Lifecycle (Scheduled -> Active/Ongoing -> Completed)
router.patch('/:id/status', protect, authorize('officer', 'admin'), updateCampaignStatus);

// Officer Campaign Closure & Archival
router.post('/:id/close', protect, authorize('officer', 'admin'), closeCampaign);

// Record Administered Vaccination Dose (increments progress & creates animal_vaccinations record)
router.post('/:id/record-vaccination', protect, authorize('officer', 'field_worker', 'veterinarian', 'admin'), recordVaccinationDose);

// Livestock Camp Registration (Farmers & Field Workers)
router.post('/:id/register', optionalProtect, registerForCamp);

// Progress & Status Updates (Authorized Officers & Field Workers)
router.patch('/:id', protect, authorize('field_worker', 'officer', 'admin'), updateVaccinationDrive);

// Delete Campaign (Officer & Admin - for decommissioning & test cleanup)
router.delete('/:id', protect, authorize('officer', 'admin'), deleteVaccinationDrive);

module.exports = router;
