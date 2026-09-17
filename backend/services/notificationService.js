// Notification Service & SSE Real-Time Event Hub for PS-128 Referral System
const supabaseDb = require('./supabaseDb');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    // Map of active SSE client connections: clientId -> { res, userId, role, district }
    this.clients = new Map();
    this.clientIdCounter = 1;

    // Periodic heartbeat to keep connections alive across NAT/proxies
    setInterval(() => {
      this.heartbeat();
    }, 25000);
  }

  /**
   * Subscribe an HTTP client to the SSE event stream
   */
  subscribe(req, res, user) {
    const clientId = `client_${this.clientIdCounter++}_${user._id}`;
    const userDistrict = (user.district || '').toLowerCase().trim();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({
      message: 'Connected to Livestock Referral Stream',
      clientId,
      userId: user._id,
      district: user.district,
      role: user.role
    })}\n\n`);

    const clientInfo = {
      id: clientId,
      res,
      userId: user._id.toString(),
      role: user.role,
      district: userDistrict
    };

    this.clients.set(clientId, clientInfo);

    req.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  /**
   * Send heartbeat to keep all active connections alive
   */
  heartbeat() {
    const payload = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Send SSE event to a specific user
   */
  sendToUser(userId, eventName, data) {
    const targetUserId = userId.toString();
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === targetUserId) {
        try {
          client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
          sentCount++;
        } catch (err) {
          this.clients.delete(clientId);
        }
      }
    }
    return sentCount > 0;
  }

  /**
   * Broadcast SSE event to all connected veterinarians in a given district
   */
  broadcastToDistrictVets(district, eventName, data) {
    const targetDistrict = (district || '').toLowerCase().trim();
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      const isVet = ['field_worker', 'veterinarian', 'officer', 'admin'].includes(client.role);
      const isMatchingDistrict = client.role === 'admin' || client.district === targetDistrict;

      if (isVet && isMatchingDistrict) {
        try {
          client.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
          sentCount++;
        } catch (err) {
          this.clients.delete(clientId);
        }
      }
    }
    return sentCount;
  }

  /**
   * Dispatch notifications to all matching district veterinarians and record audit logs
   */
  async notifyDistrictVets(caseDoc, matchingVets = []) {
    const notifiedRecords = [];
    const targetDistrict = (caseDoc.districtId || caseDoc.district || '').trim();
    const caseUuid = String(caseDoc.id || caseDoc._id || '');
    const caseNumber = caseDoc.caseId || caseDoc.case_id || 'CASE-REF';

    const notifBatch = [];
    const auditBatch = [];

    for (const vet of matchingVets) {
      const vetIdStr = String(vet.id || vet._id || '');
      const isOnline = Array.from(this.clients.values()).some((c) => c.userId === vetIdStr);

      const notificationData = {
        recipientId: vetIdStr,
        caseId: caseUuid,
        caseNumber: caseNumber,
        type: 'NEW_CASE_ALERT',
        title: `🚨 New ${caseDoc.risk || 'High'} Risk Referral: ${caseDoc.disease}`,
        message: `Farmer ${caseDoc.farmerContact?.name || caseDoc.farmerName || 'Farmer'} reported suspected ${caseDoc.disease} in ${caseDoc.farmerLocation?.block || targetDistrict}.`,
        district: targetDistrict,
        status: isOnline ? 'DELIVERED' : 'QUEUED',
        metadata: {
          disease: caseDoc.disease,
          risk: caseDoc.risk,
          confidence: caseDoc.confidence,
          animalSpecies: caseDoc.species,
          farmerName: caseDoc.farmerContact?.name || caseDoc.farmerName,
          farmerPhone: caseDoc.farmerContact?.phone || caseDoc.farmerPhone
        }
      };

      notifBatch.push(notificationData);

      const auditRecord = {
        caseId: caseUuid,
        vetId: vetIdStr,
        name: vet.name || 'Veterinarian',
        phone: vet.phone || '',
        notifiedAt: new Date().toISOString(),
        deliveryStatus: isOnline ? 'SENT' : 'PENDING',
        channel: 'SSE'
      };

      auditBatch.push(auditRecord);
      notifiedRecords.push(auditRecord);
    }

    // 1. Batch insert into Supabase notifications & case_notified_vets
    try {
      if (notifBatch.length > 0) {
        await supabaseDb.notifications.createBatch(notifBatch);
      }
      if (auditBatch.length > 0) {
        await supabaseDb.caseNotifiedVets.createBatch(auditBatch);
      }
    } catch (sbErr) {
      console.warn('[NotificationService] Supabase batch notification notice:', sbErr.message);
    }

    // 2. Mongoose fallback (only if connected)
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1 && notifBatch.length > 0) {
        await Notification.insertMany(notifBatch, { ordered: false });
      }
    } catch (mErr) { }

    // 3. Broadcast SSE alert to all active district vet clients
    this.broadcastToDistrictVets(targetDistrict, 'NEW_CASE_ALERT', {
      case: caseDoc,
      timestamp: new Date()
    });

    return notifiedRecords;
  }

  /**
   * Broadcast case claimed or status update event
   */
  notifyCaseUpdate(caseDoc, eventName = 'CASE_UPDATED') {
    // 1. Send update directly to the farmer who owns the case
    if (caseDoc.farmerId) {
      this.sendToUser(caseDoc.farmerId, eventName, {
        case: caseDoc,
        timestamp: new Date()
      });
    }

    // 2. Broadcast to all district vets (so other vets know the case has been claimed/updated)
    this.broadcastToDistrictVets(caseDoc.districtId, eventName, {
      case: caseDoc,
      timestamp: new Date()
    });
  }
}

// Export singleton instance
module.exports = new NotificationService();
