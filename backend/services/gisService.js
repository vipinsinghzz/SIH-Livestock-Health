/**
-- =====================================================================================
-- LIVESTOCK SAATHI – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Phase 6: PostGIS Spatial Queries & Explainable Outbreak Risk Engine
-- File: backend/services/gisService.js
-- =====================================================================================
*/

const { supabase } = require('../config/supabaseClient');
const DiseaseCase = require('../models/DiseaseCase');
const ContainmentZone = require('../models/ContainmentZone');
const VaccinationDrive = require('../models/VaccinationDrive');
const User = require('../models/User');
const supabaseDb = require('./supabaseDb');

// Earth radius in kilometers for resilient fallback calculations
const EARTH_RADIUS_KM = 6371;

function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 999999;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

// Coordinate fuzzing helper for farmer coordinate privacy (~1.5 km ring)
function fuzzCoordinates(lat, lng, radiusKm = 1.5) {
  if (!lat || !lng) return { lat, lng };
  // 1 degree latitude ~ 111.32 km
  const angle = Math.random() * 2 * Math.PI;
  const distDeg = (0.5 + Math.random() * 0.5) * (radiusKm / 111.32);
  const deltaLat = distDeg * Math.cos(angle);
  const deltaLng = (distDeg * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180);
  return {
    lat: Math.round((lat + deltaLat) * 10000) / 10000,
    lng: Math.round((lng + deltaLng) * 10000) / 10000
  };
}

class GisService {
  /**
   * 1. Query cases within radius & time window using PostGIS ST_DWithin
   */
  async getCasesInRadius(lat, lng, radiusKm = 15.0, days = 30, district = null) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_nearby_cases', {
          p_lat: parseFloat(lat),
          p_lng: parseFloat(lng),
          p_radius_km: parseFloat(radiusKm),
          p_days: parseInt(days, 10),
          p_district: district || null
        });

        if (data && !error) {
          return data.map(item => ({
            id: item.id,
            caseId: item.case_id,
            disease: item.disease,
            species: item.species,
            risk: item.risk,
            status: item.status,
            affectedCount: item.affected_count,
            latitude: item.latitude,
            longitude: item.longitude,
            district: item.district_id,
            village: item.village,
            block: item.block,
            confidence: item.confidence,
            distanceKm: item.distance_km,
            createdAt: item.created_at
          }));
        }
      } catch (err) {
        // Fall back to resilient mode
      }
    }

    // Resilient fallback for local test / offline environments
    try {
      const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      const query = {
        createdAt: { $gte: cutoff }
      };
      if (district) {
        query.districtId = new RegExp(district, 'i');
      }

      const docs = await DiseaseCase.find(query).lean();
      const results = [];

      for (const doc of docs) {
        const cLat = doc.coordinates?.lat || doc.latitude;
        const cLng = doc.coordinates?.lng || doc.longitude;
        if (cLat && cLng) {
          const dist = haversineDistance(parseFloat(lat), parseFloat(lng), parseFloat(cLat), parseFloat(cLng));
          if (dist <= radiusKm) {
            results.push({
              id: doc._id?.toString() || doc.id,
              caseId: doc.caseId,
              disease: doc.disease,
              species: doc.species,
              risk: doc.risk,
              status: doc.status,
              affectedCount: doc.affectedCount || 1,
              latitude: parseFloat(cLat),
              longitude: parseFloat(cLng),
              district: doc.districtId,
              village: doc.farmerLocation?.village || '',
              block: doc.farmerLocation?.block || '',
              confidence: doc.confidence || 85,
              distanceKm: dist,
              createdAt: doc.createdAt
            });
          }
        }
      }

      results.sort((a, b) => a.distanceKm - b.distanceKm);
      return results;
    } catch (e) {
      return [];
    }
  }

  /**
   * 2. Query nearby related cases (same disease or high risk)
   */
  async getNearbyRelatedCases(caseId, disease, lat, lng, radiusKm = 10.0, days = 21) {
    const nearby = await this.getCasesInRadius(lat, lng, radiusKm, days);
    const focalId = String(caseId);

    return nearby.filter(c => {
      if (String(c.id) === focalId || String(c.caseId) === focalId) return false;
      const isSameDisease = disease && c.disease && c.disease.toLowerCase().includes(disease.toLowerCase());
      const isHighRisk = c.risk === 'High' || c.risk === 'Critical';
      return isSameDisease || isHighRisk;
    });
  }

  /**
   * 3. Query spatial outbreak clusters using PostGIS DBSCAN
   */
  async getOutbreakClusters(district = 'Pune', distanceKm = 5.0, minCases = 2) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_spatial_outbreak_clusters', {
          p_district: district,
          p_distance_km: parseFloat(distanceKm),
          p_min_cases: parseInt(minCases, 10)
        });

        if (data && !error && Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            clusterId: item.cluster_id,
            disease: item.disease,
            caseCount: parseInt(item.case_count, 10),
            totalAffected: parseInt(item.total_affected, 10),
            centroidLat: item.centroid_lat,
            centroidLng: item.centroid_lng,
            radiusKm: item.radius_km,
            riskTier: item.risk_tier,
            isOutbreak: item.is_outbreak
          }));
        }
      } catch (err) {}
    }

    // Resilient fallback clustering
    try {
      const activeCases = await DiseaseCase.find({
        districtId: new RegExp(district, 'i'),
        status: { $nin: ['Resolved', 'RESOLVED'] }
      }).lean();

      return this.clusterCases(activeCases, distanceKm, minCases);
    } catch (e) {
      return [];
    }
  }

  /**
   * Spatial proximity clustering algorithm (O(N^2) worst-case with spatial distance)
   */
  clusterCases(casesList = [], distanceKm = 5.0, minCases = 2) {
    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < casesList.length; i++) {
      if (visited.has(i)) continue;
      const c1 = casesList[i];
      const group = [c1];
      visited.add(i);

      const lat1 = c1.coordinates?.lat || c1.latitude;
      const lng1 = c1.coordinates?.lng || c1.longitude;

      for (let j = i + 1; j < casesList.length; j++) {
        if (visited.has(j)) continue;
        const c2 = casesList[j];
        const lat2 = c2.coordinates?.lat || c2.latitude;
        const lng2 = c2.coordinates?.lng || c2.longitude;

        if (lat1 && lng1 && lat2 && lng2) {
          const d = haversineDistance(lat1, lng1, lat2, lng2);
          if (d <= distanceKm && c1.disease === c2.disease) {
            group.push(c2);
            visited.add(j);
          }
        }
      }

      const count = group.length;
      const totalAff = group.reduce((sum, c) => sum + (c.affectedCount || 1), 0);
      const avgLat = group.reduce((sum, c) => sum + (c.coordinates?.lat || c.latitude || 0), 0) / count;
      const avgLng = group.reduce((sum, c) => sum + (c.coordinates?.lng || c.longitude || 0), 0) / count;

      clusters.push({
        clusterId: `CLUSTER-${i + 1}`,
        disease: c1.disease,
        caseCount: count,
        totalAffected: totalAff,
        centroidLat: Math.round(avgLat * 10000) / 10000,
        centroidLng: Math.round(avgLng * 10000) / 10000,
        radiusKm: Math.min(distanceKm, 5.0),
        riskTier: (count >= 3 || totalAff >= 10) ? 'Critical' : (count >= 2 ? 'High' : 'Moderate'),
        isOutbreak: count >= minCases
      });
    }

    return clusters;
  }

  /**
   * 4. Check active containment zone status for given coordinates
   */
  async getContainmentStatus(lat, lng) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_containment_zones_spatial', {
          p_lat: parseFloat(lat),
          p_lng: parseFloat(lng)
        });

        if (data && !error && data.length > 0) {
          const nearest = data[0];
          return {
            insideContainment: data.some(z => z.is_inside === true),
            nearestZone: {
              zoneId: nearest.zone_id,
              disease: nearest.disease,
              district: nearest.district,
              distanceKm: nearest.distance_from_center_km,
              radiusKm: nearest.radius_km,
              isInside: nearest.is_inside,
              status: nearest.status,
              enforcedRules: nearest.enforced_rules || []
            },
            activeZonesCount: data.length
          };
        }
      } catch (e) {}
    }

    // Fallback containment check
    try {
      let activeZones = [];
      try {
        activeZones = await supabaseDb.containmentZones.find({ status: 'ACTIVE' });
      } catch (e) {
        activeZones = await ContainmentZone.find({ status: 'ACTIVE' }).lean();
      }
      let inside = false;
      let closest = null;
      let minDistance = 999999;

      for (const zone of activeZones) {
        const zLat = zone.center?.lat || zone.centerLat;
        const zLng = zone.center?.lng || zone.centerLng;
        if (zLat && zLng) {
          const dist = haversineDistance(parseFloat(lat), parseFloat(lng), parseFloat(zLat), parseFloat(zLng));
          const isInside = dist <= (zone.radiusKm || 5.0);
          if (isInside) inside = true;
          if (dist < minDistance) {
            minDistance = dist;
            closest = {
              zoneId: zone.zoneId,
              disease: zone.disease,
              district: zone.district,
              distanceKm: dist,
              radiusKm: zone.radiusKm || 5.0,
              isInside,
              status: zone.status,
              enforcedRules: zone.enforcedRules || []
            };
          }
        }
      }

      return {
        insideContainment: inside,
        nearestZone: closest,
        activeZonesCount: activeZones.length
      };
    } catch (e) {
      return { insideContainment: false, nearestZone: null, activeZonesCount: 0 };
    }
  }

  /**
   * Helper: Check point in containment zones
   */
  async checkPointInContainmentZones(lat, lng, district = null) {
    const status = await this.getContainmentStatus(lat, lng);
    return {
      insideContainment: status.insideContainment,
      zones: status.nearestZone ? [status.nearestZone] : [],
      minDistanceKm: status.nearestZone ? Math.round(status.nearestZone.distanceKm * 10) / 10 : 999999
    };
  }

  /**
   * 5. Vaccination Coverage Analysis around outbreak epicenter
   * Hardened: Farmers are denied access to regional surveillance aggregates
   */
  async getVaccinationCoverage(lat, lng, radiusKm = 10.0, userRole = null) {
    if (userRole === 'farmer') {
      const err = new Error('Access Denied: Regional vaccination coverage analytics are restricted to veterinary and authorized animal husbandry personnel');
      err.statusCode = 403;
      err.code = '42501';
      throw err;
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_vaccination_coverage_around_point', {
          p_lat: parseFloat(lat),
          p_lng: parseFloat(lng),
          p_radius_km: parseFloat(radiusKm)
        });

        if (data && !error && data.length > 0) {
          const res = data[0];
          return {
            totalAnimals: parseInt(res.total_animals, 10),
            vaccinatedAnimals: parseInt(res.vaccinated_animals, 10),
            coveragePercentage: res.coverage_percentage != null ? parseFloat(res.coverage_percentage) : null,
            nearbyDrivesCount: parseInt(res.nearby_drives_count, 10)
          };
        }
      } catch (e) {}
    }

    // Fallback: Query registered animals from database
    try {
      const Animal = require('../models/Animal');
      const allAnimals = await Animal.find({}).lean();
      let total = 0;
      let vaccinated = 0;

      for (const a of allAnimals) {
        const aLat = a.location?.lat || a.latitude;
        const aLng = a.location?.lng || a.longitude;
        if (aLat && aLng && haversineDistance(parseFloat(lat), parseFloat(lng), aLat, aLng) <= radiusKm) {
          total++;
          if (a.healthStatus === 'Vaccinated' || a.vaccinationStatus === 'Up to Date' || (a.vaccinations && a.vaccinations.length > 0)) {
            vaccinated++;
          }
        }
      }

      const drives = await VaccinationDrive.find({ status: { $in: ['ACTIVE', 'SCHEDULED', 'Active', 'Scheduled'] } }).lean();
      const nearbyDrives = drives.filter(d => {
        const dLat = d.coordinates?.lat || d.latitude;
        const dLng = d.coordinates?.lng || d.longitude;
        return dLat && dLng && haversineDistance(parseFloat(lat), parseFloat(lng), dLat, dLng) <= radiusKm;
      });

      return {
        totalAnimals: total,
        vaccinatedAnimals: vaccinated,
        coveragePercentage: total > 0 ? Math.round((vaccinated / total) * 1000) / 10 : null,
        nearbyDrivesCount: nearbyDrives.length
      };
    } catch (e) {
      return { totalAnimals: 0, vaccinatedAnimals: 0, coveragePercentage: null, nearbyDrivesCount: 0 };
    }
  }

  /**
   * 6. Nearest available veterinarians query
   */
  async getNearestVets(lat, lng, radiusKm = 50.0, limit = 3) {
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_nearby_veterinarians', {
          p_lat: parseFloat(lat),
          p_lng: parseFloat(lng),
          p_radius_km: parseFloat(radiusKm),
          p_limit: parseInt(limit, 10)
        });

        if (data && !error && Array.isArray(data)) {
          return data.map(v => ({
            id: v.id,
            name: v.name,
            phone: v.phone,
            email: v.email,
            district: v.district,
            block: v.block,
            village: v.village,
            clinicName: v.clinic_name,
            specialization: v.specialization,
            rating: v.rating,
            experience: v.experience,
            emergencyAvailable: v.emergency_available,
            distanceKm: v.distance_km
          }));
        }
      } catch (e) {}
    }

    // Fallback vet search
    try {
      const vets = await User.find({ role: 'veterinarian', isActive: true }).lean();
      const withDistance = [];
      for (const v of vets) {
        const vLat = v.location?.lat || v.latitude;
        const vLng = v.location?.lng || v.longitude;
        if (vLat && vLng) {
          const dist = haversineDistance(parseFloat(lat), parseFloat(lng), parseFloat(vLat), parseFloat(vLng));
          if (dist <= radiusKm) {
            withDistance.push({
              id: v._id?.toString() || v.id,
              name: v.name,
              phone: v.phone,
              email: v.email,
              district: v.district,
              block: v.block || '',
              village: v.village || '',
              specialization: v.specialization || 'General Bovine Medicine',
              emergencyAvailable: !!v.emergencyAvailable,
              distanceKm: Math.round(dist * 10) / 10
            });
          }
        }
      }

      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      return withDistance.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * 7. Explainable Outbreak Risk Scoring Engine
   * 
   * Produces an explainable, auditable epidemiological risk calculation
   * adhering to Veterinary Surveillance Guidelines (LOW, MEDIUM, HIGH, CRITICAL).
   */
  calculateOutbreakRisk(caseData = {}, nearbyCases = [], clusterInfo = null, containmentInfo = null, vaccinationInfo = null) {
    let score = 0;
    const factors = [];

    // Factor 1: Nearby Case Proximity Density
    const casesWithin5Km = nearbyCases.filter(c => c.distanceKm <= 5.0);
    const casesWithin15Km = nearbyCases.filter(c => c.distanceKm > 5.0 && c.distanceKm <= 15.0);

    if (casesWithin5Km.length >= 3) {
      score += 30;
      factors.push({
        factor: 'HIGH_PROXIMITY_DENSITY',
        points: 30,
        rationale: `${casesWithin5Km.length} active disease cases detected within critical 5km radius.`
      });
    } else if (casesWithin5Km.length > 0) {
      const pts = casesWithin5Km.length * 10;
      score += pts;
      factors.push({
        factor: 'LOCAL_CASE_PROXIMITY',
        points: pts,
        rationale: `${casesWithin5Km.length} case(s) within 5km of subject animal.`
      });
    }

    if (casesWithin15Km.length > 0) {
      const pts = Math.min(casesWithin15Km.length * 4, 12);
      score += pts;
      factors.push({
        factor: 'REGIONAL_SURVEILLANCE_CASES',
        points: pts,
        rationale: `${casesWithin15Km.length} case(s) in the wider 15km epidemiological buffer.`
      });
    }

    // Factor 2: Diagnostic Status Weight
    const status = (caseData.status || '').toUpperCase();
    if (status === 'CONFIRMED') {
      score += 20;
      factors.push({
        factor: 'CLINICALLY_CONFIRMED_CASE',
        points: 20,
        rationale: 'Veterinarian has verified clinical lesions and confirmed active infection.'
      });
    } else if (status === 'INVESTIGATING' || status === 'IN_TREATMENT') {
      score += 12;
      factors.push({
        factor: 'UNDER_INVESTIGATION',
        points: 12,
        rationale: 'Case is under active clinical investigation by treating veterinarian.'
      });
    } else {
      score += 8;
      factors.push({
        factor: 'AI_TRIAGED_SUSPECTED',
        points: 8,
        rationale: 'Initial automated multimodal AI screening indicates suspected disease.'
      });
    }

    // Factor 3: Transboundary Disease Virulence
    const highRiskDiseases = ['lumpy skin disease', 'anthrax', 'foot and mouth', 'ppr', 'avian influenza'];
    const diseaseName = (caseData.disease || '').toLowerCase();
    const isHighVirulence = highRiskDiseases.some(d => diseaseName.includes(d));

    if (isHighVirulence) {
      score += 18;
      factors.push({
        factor: 'NOTIFIABLE_HIGH_CONTAGION_PATHOGEN',
        points: 18,
        rationale: `${caseData.disease} is a designated notifiable transboundary contagious disease.`
      });
    } else {
      score += 8;
      factors.push({
        factor: 'GENERAL_PATHOGEN_SEVERITY',
        points: 8,
        rationale: `Standard clinical virulence profile for ${caseData.disease || 'suspected condition'}.`
      });
    }

    // Factor 4: Herd Exposure / Affected Count
    const affectedCount = caseData.affectedCount || 1;
    if (affectedCount >= 10) {
      score += 15;
      factors.push({
        factor: 'MASS_HERD_EXPOSURE',
        points: 15,
        rationale: `${affectedCount} animals affected in single holding, presenting significant transmission potential.`
      });
    } else if (affectedCount >= 3) {
      score += 10;
      factors.push({
        factor: 'MULTIPLE_ANIMALS_AFFECTED',
        points: 10,
        rationale: `${affectedCount} animals affected, indicating local in-herd transmission.`
      });
    } else {
      score += 4;
      factors.push({
        factor: 'ISOLATED_ANIMAL',
        points: 4,
        rationale: 'Single animal infected; prompt isolation can prevent transmission.'
      });
    }

    // Factor 5: Containment Perimeter Proximity
    if (containmentInfo && containmentInfo.insideContainment) {
      score += 12;
      factors.push({
        factor: 'INSIDE_ACTIVE_CONTAINMENT_ZONE',
        points: 12,
        rationale: 'Location falls inside an active government biosecurity containment perimeter.'
      });
    } else if (containmentInfo && containmentInfo.nearestZone && containmentInfo.nearestZone.distanceKm <= 5.0) {
      score += 6;
      factors.push({
        factor: 'CONTAINMENT_ZONE_PROXIMITY',
        points: 6,
        rationale: `Adjacent to active containment zone (${containmentInfo.nearestZone.distanceKm} km from perimeter).`
      });
    }

    // Factor 6: Herd Vaccination Shield
    if (vaccinationInfo && vaccinationInfo.coveragePercentage !== null && vaccinationInfo.coveragePercentage !== undefined) {
      if (vaccinationInfo.coveragePercentage < 40.0) {
        score += 10;
        factors.push({
          factor: 'LOW_VACCINATION_SHIELD',
          points: 10,
          rationale: `Sub-optimal local vaccination coverage (${vaccinationInfo.coveragePercentage}%) creates immunological vulnerability.`
        });
      } else if (vaccinationInfo.coveragePercentage >= 80.0) {
        score -= 10;
        factors.push({
          factor: 'HIGH_HERD_IMMUNITY_MITIGATION',
          points: -10,
          rationale: `Strong local herd immunity (${vaccinationInfo.coveragePercentage}% vaccinated) reduces epidemic velocity.`
        });
      }
    } else if (vaccinationInfo && vaccinationInfo.coveragePercentage === null) {
      factors.push({
        factor: 'NO_VACCINATION_DATA',
        points: 0,
        rationale: 'No local animal census or vaccination records available in this radius.'
      });
    }

    // Bound score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, score));

    let riskLevel = 'LOW';
    if (finalScore >= 75) {
      riskLevel = 'CRITICAL';
    } else if (finalScore >= 50) {
      riskLevel = 'HIGH';
    } else if (finalScore >= 25) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      riskScore: finalScore,
      factors,
      containmentRecommendation: {
        recommended: finalScore >= 50,
        suggestedRadiusKm: finalScore >= 75 ? 5.0 : (finalScore >= 50 ? 3.0 : 1.0),
        quarantineAdvised: finalScore >= 50,
        movementRestriction: finalScore >= 50 ? 'Strict: No animal transit within containment zone' : 'Advisory only'
      },
      vaccinationRecommendation: {
        ringVaccinationAdvised: finalScore >= 50,
        targetRadiusKm: finalScore >= 75 ? 10.0 : (finalScore >= 50 ? 5.0 : 0.0),
        priority: finalScore >= 75 ? 'URGENT_EMERGENCY' : (finalScore >= 50 ? 'HIGH' : 'ROUTINE')
      },
      disclaimer: 'AI-assisted epidemiological risk surveillance based on spatial-temporal data. Not a replacement for veterinary diagnostic confirmation.'
    };
  }

  /**
   * 8. Generate containment zone recommendation based on disease epidemiology
   */
  recommendContainmentZone(disease) {
    const d = (disease || '').toLowerCase();
    if (d.includes('foot and mouth') || d.includes('fmd')) {
      return {
        disease: 'Foot and Mouth Disease',
        recommendedRadiusKm: 5.0,
        surveillanceBufferKm: 10.0,
        enforcedRules: [
          'Strict ban on animal movement, livestock transport, and cattle markets',
          'Quarantine of all susceptible cloven-hoofed animals within 5km',
          'Immediate ring vaccination in 5-10km surveillance ring',
          'Disinfection checkpoints at block entry and exit points'
        ],
        estimatedAffectedAreaSqKm: Math.round(Math.PI * 5.0 * 5.0)
      };
    } else if (d.includes('anthrax')) {
      return {
        disease: 'Anthrax',
        recommendedRadiusKm: 3.0,
        surveillanceBufferKm: 7.0,
        enforcedRules: [
          'Immediate deep burial or complete incineration of carcasses (no post-mortem opening)',
          'Strict quarantine of affected premises and grazing grounds',
          'Emergency ring vaccination with spore vaccine',
          'Ban on milk and meat consumption from affected herds'
        ],
        estimatedAffectedAreaSqKm: Math.round(Math.PI * 3.0 * 3.0)
      };
    } else if (d.includes('lumpy') || d.includes('lsd')) {
      return {
        disease: 'Lumpy Skin Disease',
        recommendedRadiusKm: 5.0,
        surveillanceBufferKm: 10.0,
        enforcedRules: [
          'Vector control: Intensive fogging and insecticide spraying for biting flies & mosquitoes',
          'Isolation of animals with skin nodules',
          'Heterologous Goat Pox ring vaccination'
        ],
        estimatedAffectedAreaSqKm: Math.round(Math.PI * 5.0 * 5.0)
      };
    } else {
      return {
        disease: disease || 'General Outbreak',
        recommendedRadiusKm: 3.0,
        surveillanceBufferKm: 6.0,
        enforcedRules: [
          'Precautionary quarantine of affected holdings',
          'Clinical monitoring of adjacent herds'
        ],
        estimatedAffectedAreaSqKm: Math.round(Math.PI * 3.0 * 3.0)
      };
    }
  }

  /**
   * 9. Generate ring vaccination recommendation based on disease & containment radius
   */
  recommendRingVaccination(disease, containmentRadiusKm = 5.0) {
    const d = (disease || '').toLowerCase();
    let vaccine = 'Multivalent Livestock Vaccine';
    let priority = 'HIGH';
    const targetRingKm = Math.round((parseFloat(containmentRadiusKm) * 2.0) * 10) / 10;
    // Estimated livestock density in rural Maharashtra ~ 150 per sq km
    const ringArea = Math.PI * (targetRingKm * targetRingKm - containmentRadiusKm * containmentRadiusKm);
    const estimatedDoses = Math.round(ringArea * 150);

    if (d.includes('foot and mouth') || d.includes('fmd')) {
      vaccine = 'FMD Oil Adjuvant / Quadrivalent Vaccine';
      priority = 'CRITICAL_URGENT';
    } else if (d.includes('anthrax')) {
      vaccine = 'Anthrax Spore Vaccine (Sterne Strain)';
      priority = 'CRITICAL_URGENT';
    } else if (d.includes('lumpy') || d.includes('lsd')) {
      vaccine = 'Goat Pox Vaccine (Uttarkashi Strain)';
      priority = 'HIGH';
    }

    return {
      disease: disease || 'Unknown',
      vaccine,
      targetRingKm,
      innerBufferKm: parseFloat(containmentRadiusKm),
      estimatedDoses: Math.max(500, estimatedDoses),
      priority,
      guidelines: `Deploy emergency vaccination teams in a ring buffer from ${containmentRadiusKm}km to ${targetRingKm}km working inwards.`
    };
  }
}

module.exports = new GisService();
module.exports.fuzzCoordinates = fuzzCoordinates;
