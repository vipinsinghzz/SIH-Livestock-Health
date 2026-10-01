/**
-- =====================================================================================
-- PASHUCARE – AI-POWERED LIVESTOCK HEALTH & EARLY WARNING PLATFORM
-- SIH 2026 Problem Statement 128
-- Phase 6: Unified Realtime Event Hub & Notification Dispatcher
-- File: backend/services/realtimeHub.js
-- =====================================================================================
*/

const notificationService = require('./notificationService');
const supabaseDb = require('./supabaseDb');
const { fuzzCoordinates } = require('./gisService');
const { supabase } = require('../config/supabaseClient');

class RealtimeHub {
  /**
   * Sanitizes case payloads for realtime broadcasts:
   * - Strips sensitive scan image URLs (protects private clinical images)
   * - Fuzzes coordinates for farmer/public roles to prevent precision leaks
   */
  sanitizePayload(caseData, recipientRole = 'farmer') {
    if (!caseData) return {};

    const clean = {
      id: caseData.id || caseData._id?.toString(),
      caseId: caseData.caseId || caseData.case_id,
      disease: caseData.disease,
      species: caseData.species,
      risk: caseData.risk,
      status: caseData.status,
      district: caseData.districtId || caseData.district || 'Nagpur',
      block: caseData.block || caseData.farmerLocation?.block || '',
      affectedCount: caseData.affectedCount || 1,
      confidence: caseData.confidence,
      updatedAt: caseData.updatedAt || new Date().toISOString()
    };

    // Sensitive image URLs are NEVER broadcast via realtime
    // Only reference IDs and sanitized status are emitted

    // Coordinate protection: Only officers and vets see exact coordinates
    const exactLat = caseData.coordinates?.lat || caseData.latitude;
    const exactLng = caseData.coordinates?.lng || caseData.longitude;

    if (exactLat && exactLng) {
      if (recipientRole === 'officer' || recipientRole === 'admin' || recipientRole === 'veterinarian') {
        clean.coordinates = { lat: exactLat, lng: exactLng };
      } else {
        // Fuzz coordinates to ~1.5km village level for farmer/public privacy
        clean.coordinates = fuzzCoordinates(exactLat, exactLng, 1.5);
      }
    }

    return clean;
  }

  /**
   * Dispatches an event through Supabase Realtime channel broadcast and SSE
   */
  async broadcastEvent(channelName, eventType, payload) {
    // 1. Supabase Realtime broadcast (if client is active)
    if (supabase) {
      try {
        const channel = supabase.channel(channelName);
        await channel.send({
          type: 'broadcast',
          event: eventType,
          payload
        });
      } catch (e) {
        // Continue to SSE fallback
      }
    }

    return true;
  }

  /**
   * 1. CASE CREATED / NEW REFERRAL ALERT
   */
  async notifyCaseCreated(caseDoc, matchingVets = []) {
    const sanitizedVet = this.sanitizePayload(caseDoc, 'veterinarian');
    const sanitizedOfficer = this.sanitizePayload(caseDoc, 'officer');
    const targetDistrict = (caseDoc.districtId || 'Nagpur').trim();

    // Broadcast to district vets via SSE
    notificationService.broadcastToDistrictVets(targetDistrict, 'NEW_CASE_ALERT', sanitizedVet);

    // Broadcast to Supabase Realtime channel
    await this.broadcastEvent(`district:${targetDistrict}`, 'NEW_CASE_ALERT', sanitizedVet);
    await this.broadcastEvent('officer:surveillance', 'NEW_CASE_ALERT', sanitizedOfficer);
  }

  /**
   * 2. CASE STATUS UPDATE
   */
  async notifyCaseStatusUpdated(caseDoc, updatedBy, oldStatus, newStatus) {
    const farmerId = String(caseDoc.farmerId || caseDoc.farmerContact?._id || '');
    const targetDistrict = (caseDoc.districtId || 'Nagpur').trim();

    const payload = {
      caseId: caseDoc.id || caseDoc._id?.toString(),
      caseNumber: caseDoc.caseId,
      oldStatus,
      newStatus,
      disease: caseDoc.disease,
      district: targetDistrict,
      updatedBy: updatedBy?.name || 'Treating Veterinarian',
      updatedAt: new Date().toISOString()
    };

    // 1. Notify the farmer directly
    if (farmerId) {
      notificationService.sendToUser(farmerId, 'CASE_STATUS_UPDATE', payload);
      await this.broadcastEvent(`user:${farmerId}`, 'CASE_STATUS_UPDATE', payload);

      // Create persistent notification for farmer
      try {
        await supabaseDb.notifications.create({
          recipientId: farmerId,
          caseId: caseDoc.id || caseDoc._id?.toString(),
          caseNumber: caseDoc.caseId,
          type: 'CASE_STATUS_UPDATE',
          title: `Case Update: ${caseDoc.disease}`,
          message: `Your case ${caseDoc.caseId} status changed to ${newStatus}. ${updatedBy ? 'Updated by Dr. ' + updatedBy.name : ''}`,
          district: targetDistrict,
          status: 'QUEUED',
          metadata: payload
        });
      } catch (e) {}
    }

    // 2. Notify district vets and officer surveillance
    notificationService.broadcastToDistrictVets(targetDistrict, 'CASE_STATUS_UPDATE', payload);
    await this.broadcastEvent(`district:${targetDistrict}`, 'CASE_STATUS_UPDATE', payload);
    await this.broadcastEvent('officer:surveillance', 'CASE_STATUS_UPDATE', payload);
  }

  /**
   * 3. CASE CLAIMED
   */
  async notifyCaseClaimed(caseDoc, vetUser) {
    const targetDistrict = (caseDoc.districtId || 'Nagpur').trim();
    const farmerId = String(caseDoc.farmerId || '');

    const payload = {
      caseId: caseDoc.id || caseDoc._id?.toString(),
      caseNumber: caseDoc.caseId,
      disease: caseDoc.disease,
      assignedVetId: vetUser._id || vetUser.id,
      assignedVetName: vetUser.name,
      assignedVetPhone: vetUser.phone,
      claimedAt: new Date().toISOString()
    };

    // 1. Notify Farmer
    if (farmerId) {
      notificationService.sendToUser(farmerId, 'CASE_CLAIMED', payload);
      await this.broadcastEvent(`user:${farmerId}`, 'CASE_CLAIMED', payload);

      try {
        await supabaseDb.notifications.create({
          recipientId: farmerId,
          caseId: caseDoc.id || caseDoc._id?.toString(),
          caseNumber: caseDoc.caseId,
          type: 'CASE_ASSIGNED',
          title: `Veterinarian Assigned: Dr. ${vetUser.name}`,
          message: `Dr. ${vetUser.name} has claimed your referral case for ${caseDoc.disease} and is initiating clinical triage.`,
          district: targetDistrict,
          status: 'QUEUED',
          metadata: payload
        });
      } catch (e) {}
    }

    // 2. Notify other district vets (removes from their open queues)
    notificationService.broadcastToDistrictVets(targetDistrict, 'CASE_CLAIMED', payload);
    await this.broadcastEvent(`district:${targetDistrict}`, 'CASE_CLAIMED', payload);
  }

  /**
   * 4. OUTBREAK CLUSTER DETECTED
   */
  async notifyOutbreakDetected(clusterInfo, district) {
    const payload = {
      clusterId: clusterInfo.clusterId,
      disease: clusterInfo.disease,
      caseCount: clusterInfo.caseCount,
      totalAffected: clusterInfo.totalAffected,
      riskTier: clusterInfo.riskTier,
      centroidLat: clusterInfo.centroidLat,
      centroidLng: clusterInfo.centroidLng,
      radiusKm: clusterInfo.radiusKm,
      district,
      detectedAt: new Date().toISOString()
    };

    // Broadcast to officers & district vets
    notificationService.broadcastToDistrictVets(district, 'OUTBREAK_CLUSTER_ALERT', payload);
    await this.broadcastEvent(`district:${district}`, 'OUTBREAK_CLUSTER_ALERT', payload);
    await this.broadcastEvent('officer:surveillance', 'OUTBREAK_CLUSTER_ALERT', payload);
  }

  /**
   * 5. CONTAINMENT ZONE CREATED / UPDATED
   */
  async notifyContainmentZone(zoneDoc, action = 'CREATED') {
    const payload = {
      zoneId: zoneDoc.zoneId,
      disease: zoneDoc.disease,
      district: zoneDoc.district,
      radiusKm: zoneDoc.radiusKm,
      status: zoneDoc.status,
      centerLat: zoneDoc.centerLat || zoneDoc.center?.lat,
      centerLng: zoneDoc.centerLng || zoneDoc.center?.lng,
      enforcedRules: zoneDoc.enforcedRules || [],
      action,
      updatedAt: new Date().toISOString()
    };

    const eventName = action === 'CREATED' ? 'CONTAINMENT_ZONE_CREATED' : 'CONTAINMENT_ZONE_UPDATED';
    notificationService.broadcastToDistrictVets(zoneDoc.district, eventName, payload);
    await this.broadcastEvent(`district:${zoneDoc.district}`, eventName, payload);
    await this.broadcastEvent('officer:surveillance', eventName, payload);
  }

  /**
   * 6. RING VACCINATION SCHEDULED
   */
  async notifyRingVaccination(driveDoc) {
    const payload = {
      driveId: driveDoc.driveId,
      disease: driveDoc.disease,
      district: driveDoc.district,
      targetRadiusKm: driveDoc.targetRadiusKm,
      startDate: driveDoc.startDate,
      status: driveDoc.status,
      scheduledAt: new Date().toISOString()
    };

    notificationService.broadcastToDistrictVets(driveDoc.district, 'RING_VACCINATION_SCHEDULED', payload);
    await this.broadcastEvent(`district:${driveDoc.district}`, 'RING_VACCINATION_SCHEDULED', payload);
    await this.broadcastEvent('officer:surveillance', 'RING_VACCINATION_SCHEDULED', payload);
  }
}

module.exports = new RealtimeHub();
