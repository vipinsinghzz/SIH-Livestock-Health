/**
 * Veterinary Controller for Livestock Saathi
 * File: backend/controllers/veterinaryController.js
 * 
 * Implements "Nearby Veterinary Help" using Supabase public.profiles (role: 'veterinarian').
 * Supports:
 * - GPS latitude/longitude proximity calculation (Haversine formula & PostGIS)
 * - Filtering of ACTIVE & AVAILABLE veterinarians
 * - Top 3 nearest veterinarians sorted ascending (nearest -> farthest)
 * - District-based fallback when GPS is unavailable
 * - Specialization and emergency filtering
 */

const supabaseDb = require('../services/supabaseDb');
const User = require('../models/User');

// Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to escape regex special characters
function escapeRegex(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// District centroids lookup for fallback distance calculations
const DISTRICT_CENTROIDS = {
  'Ahmednagar': { lat: 19.0952, lng: 74.7496 },
  'Akola': { lat: 20.7002, lng: 77.0082 },
  'Amravati': { lat: 20.9320, lng: 77.7523 },
  'Chhatrapati Sambhajinagar': { lat: 19.8762, lng: 75.3433 },
  'Aurangabad': { lat: 19.8762, lng: 75.3433 },
  'Beed': { lat: 18.9891, lng: 75.7601 },
  'Bhandara': { lat: 21.1667, lng: 79.6500 },
  'Buldhana': { lat: 20.5292, lng: 76.1843 },
  'Chandrapur': { lat: 19.9615, lng: 79.2961 },
  'Dhule': { lat: 20.9042, lng: 74.7749 },
  'Gadchiroli': { lat: 20.1809, lng: 80.0018 },
  'Gondia': { lat: 21.4598, lng: 80.1961 },
  'Hingoli': { lat: 19.7173, lng: 77.1471 },
  'Jalgaon': { lat: 21.0077, lng: 75.5626 },
  'Jalna': { lat: 19.8347, lng: 75.8816 },
  'Kolhapur': { lat: 16.7050, lng: 74.2433 },
  'Latur': { lat: 18.4088, lng: 76.5604 },
  'Mumbai City': { lat: 18.9388, lng: 72.8354 },
  'Mumbai Suburban': { lat: 19.0760, lng: 72.8777 },
  'Nagpur': { lat: 21.1458, lng: 79.0882 },
  'Nanded': { lat: 19.1383, lng: 77.3210 },
  'Nandurbar': { lat: 21.3734, lng: 74.2404 },
  'Nashik': { lat: 19.9975, lng: 73.7898 },
  'Dharashiv': { lat: 18.1861, lng: 76.0419 },
  'Osmanabad': { lat: 18.1861, lng: 76.0419 },
  'Palghar': { lat: 19.6967, lng: 72.7699 },
  'Parbhani': { lat: 19.2612, lng: 76.7767 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Raigad': { lat: 18.5158, lng: 73.1822 },
  'Ratnagiri': { lat: 16.9902, lng: 73.3120 },
  'Sangli': { lat: 16.8524, lng: 74.5815 },
  'Satara': { lat: 17.6805, lng: 73.9920 },
  'Sindhudurg': { lat: 16.1158, lng: 73.6871 },
  'Solapur': { lat: 17.6599, lng: 75.9064 },
  'Thane': { lat: 19.2183, lng: 72.9781 },
  'Wardha': { lat: 20.7453, lng: 78.6022 },
  'Washim': { lat: 20.1118, lng: 77.1352 },
  'Yavatmal': { lat: 20.3888, lng: 78.1204 }
};

/**
 * @desc    Get nearby veterinarians based on GPS coords or district fallback
 * @route   GET /api/veterinarians/nearby
 * @access  Public / Authenticated
 */
exports.getNearbyVeterinarians = async (req, res) => {
  try {
    const {
      lat,
      lng,
      district,
      search,
      specialization,
      category,
      emergencyOnly,
      limit = 10
    } = req.query;

    const hasCoordinates =
      lat !== undefined &&
      lng !== undefined &&
      !isNaN(parseFloat(lat)) &&
      !isNaN(parseFloat(lng)) &&
      parseFloat(lat) !== 0 &&
      parseFloat(lng) !== 0;

    const userLat = hasCoordinates ? parseFloat(lat) : null;
    const userLng = hasCoordinates ? parseFloat(lng) : null;

    let refLat = userLat;
    let refLng = userLng;
    let distanceSource = 'GPS';

    if (!hasCoordinates) {
      distanceSource = 'DISTRICT_FALLBACK';
      if (district && DISTRICT_CENTROIDS[district]) {
        refLat = DISTRICT_CENTROIDS[district].lat;
        refLng = DISTRICT_CENTROIDS[district].lng;
      } else if (req.user && req.user.district && DISTRICT_CENTROIDS[req.user.district]) {
        refLat = DISTRICT_CENTROIDS[req.user.district].lat;
        refLng = DISTRICT_CENTROIDS[req.user.district].lng;
      } else {
        refLat = 18.5204; // Pune centroid
        refLng = 73.8567;
      }
    }

    // Module 5: Query Supabase public.profiles for veterinarians
    let vets = await supabaseDb.veterinarians.findNearby(refLat, refLng, district);

    // Apply filtering
    if (emergencyOnly === 'true' || emergencyOnly === true) {
      vets = vets.filter(v => v.emergencyAvailable === true);
    }
    if (specialization && specialization !== 'All') {
      const specLower = specialization.toLowerCase();
      vets = vets.filter(v => (v.specialization || '').toLowerCase().includes(specLower));
    }
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      vets = vets.filter(v =>
        (v.name || '').toLowerCase().includes(s) ||
        (v.district || '').toLowerCase().includes(s) ||
        (v.block || '').toLowerCase().includes(s) ||
        (v.clinicName || '').toLowerCase().includes(s)
      );
    }

    const nearestVets = vets.slice(0, 3);
    const paginatedVets = vets.slice(0, parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: paginatedVets.length,
      totalAvailable: vets.length,
      searchMetadata: {
        hasGpsLocation: hasCoordinates,
        distanceSource,
        userCoordinates: hasCoordinates ? { lat: userLat, lng: userLng } : null,
        referenceCoordinates: { lat: refLat, lng: refLng },
        district: district || (req.user && req.user.district) || null
      },
      nearestVets,
      veterinarians: paginatedVets
    });
  } catch (error) {
    console.error('Error fetching nearby veterinarians:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve nearby veterinarians',
      error: error.message
    });
  }
};

/**
 * @desc    Get veterinarian by ID
 * @route   GET /api/veterinarians/:id
 * @access  Public / Authenticated
 */
exports.getVeterinarianById = async (req, res) => {
  try {
    const vet = await supabaseDb.profiles.findById(req.params.id);

    if (!vet) {
      return res.status(404).json({
        success: false,
        message: 'Veterinarian not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: vet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching veterinarian',
      error: error.message
    });
  }
};

/**
 * @desc    Get list of Maharashtra districts with available vet counts
 * @route   GET /api/veterinarians/districts
 * @access  Public
 */
exports.getDistrictsWithVets = async (req, res) => {
  try {
    const allVets = await supabaseDb.profiles.find({ role: 'veterinarian' });

    const districtMap = {};
    for (const v of allVets) {
      const d = v.district || 'Pune';
      if (!districtMap[d]) {
        districtMap[d] = { vetCount: 0, availableCount: 0 };
      }
      districtMap[d].vetCount++;
      if (v.isAvailable || v.availability === 'AVAILABLE' || v.availability === 'ACTIVE') {
        districtMap[d].availableCount++;
      }
    }

    const districts = Object.keys(districtMap).map(d => ({
      name: d,
      vetCount: districtMap[d].vetCount,
      availableCount: districtMap[d].availableCount,
      coordinates: DISTRICT_CENTROIDS[d] || null
    })).sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      count: districts.length,
      districts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
};
