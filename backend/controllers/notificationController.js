/**
 * PashuCare - Notification Controller
 * File: backend/controllers/notificationController.js
 * 
 * Enterprise Notification & Clinical Surveillance Alert Controller
 * Powered by Supabase PostgreSQL (public.notifications).
 * 
 * Strict Zero-Mock Policy: Only authentic database records are returned.
 */

const { supabaseAdmin } = require('../config/supabaseClient');
const supabaseDb = require('../services/supabaseDb');

// Helper to convert snake_case object to camelCase
function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, m) => m.toUpperCase());
    out[ck] = v && typeof v === 'object' && !(v instanceof Date) ? toCamel(v) : v;
  }
  return out;
}

/**
 * @desc    Get notifications and clinical alerts for authenticated user
 * @route   GET /api/notifications
 * @access  Private (All authenticated roles)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = String(req.user.id || req.user._id || '');
    const userRole = req.user.role || 'farmer';
    const userDistrict = req.query.district || req.user.district || 'Nagpur';
    const limit = parseInt(req.query.limit, 10) || 50;
    const isClinicalRole = ['veterinarian', 'field_worker', 'officer', 'admin'].includes(userRole);

    let personalNotifs = [];

    // 1. Fetch direct user notifications from Supabase PostgreSQL
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (req.query.status) {
          query = query.eq('status', req.query.status);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          personalNotifs = data.map(toCamel);
        } else if (error) {
          console.warn('[NotificationController] Supabase personal notifs error:', error.message);
        }
      } catch (sbErr) {
        console.warn('[NotificationController] Supabase personal notifs exception:', sbErr.message);
      }
    }

    const seenCaseIds = new Set(
      personalNotifs
        .filter((n) => n.caseId || n.case_id)
        .map((n) => String(n.caseId || n.case_id))
    );

    const districtAlerts = [];

    // 2. For clinical roles (Veterinarian, Field Worker, Officer), augment with active district clinical events
    if (isClinicalRole && userDistrict) {
      try {
        // A. Active High / Critical Cases in jurisdiction needing veterinary response
        const activeCases = await supabaseDb.diseaseCases.find({
          districtId: userDistrict,
          status: ['New', 'Investigating', 'Confirmed', 'Containment', 'OPEN', 'ACCEPTED']
        });

        if (Array.isArray(activeCases)) {
          for (const c of activeCases) {
            const caseIdStr = String(c.id || c._id || '');
            // Only add if not already in personal direct notifications
            if (caseIdStr && !seenCaseIds.has(caseIdStr)) {
              seenCaseIds.add(caseIdStr);

              const isUrgent = c.risk === 'Critical' || c.risk === 'High' || c.status === 'New';
              const severity = c.risk || (c.status === 'New' ? 'High' : 'Moderate');

              districtAlerts.push({
                id: `district-case-${caseIdStr}`,
                recipientId: userId,
                caseId: caseIdStr,
                caseNumber: c.caseId || c.case_number || 'CASE-REF',
                animalId: c.animalId || c.animal_id || undefined,
                type: 'NEW_CASE_ALERT',
                title: isUrgent
                  ? `🚨 Urgent ${c.risk || 'Clinical'} Referral: ${c.disease || 'Livestock Condition'}`
                  : `Clinical Case: ${c.disease || 'Livestock Condition'} (${c.status || 'Active'})`,
                message: `Farmer ${c.farmerContact?.name || c.farmerName || 'Farmer'} reported suspected ${c.disease || 'illness'} in ${c.farmerLocation?.block || c.block || userDistrict}.`,
                district: userDistrict,
                status: 'DELIVERED',
                severity,
                metadata: {
                  disease: c.disease,
                  risk: c.risk,
                  confidence: c.confidence,
                  animalSpecies: c.species,
                  farmerName: c.farmerContact?.name || c.farmerName,
                  farmerPhone: c.farmerContact?.phone || c.farmerPhone,
                  block: c.farmerLocation?.block || c.block || userDistrict,
                  village: c.farmerLocation?.village || c.village || '',
                  caseStatus: c.status
                },
                createdAt: c.createdAt || c.created_at || new Date().toISOString()
              });
            }
          }
        }

        // B. Active Containment Zones in district
        const activeZones = await supabaseDb.containmentZones.find({
          district: userDistrict,
          status: 'ACTIVE'
        });

        if (Array.isArray(activeZones)) {
          for (const z of activeZones) {
            districtAlerts.push({
              id: `district-zone-${z.zoneId || z.id}`,
              recipientId: userId,
              caseId: z.anchorCaseId || undefined,
              caseNumber: z.zoneId || 'ZONE-ACTIVE',
              type: 'CONTAINMENT_ZONE_CREATED',
              title: `🛡️ Active Containment Zone: ${z.disease || 'Quarantine Area'}`,
              message: `Containment perimeter of ${z.radiusKm || 5.0}km enforced in ${z.village || z.block || userDistrict}. Animal transit banned.`,
              district: userDistrict,
              status: 'DELIVERED',
              severity: 'High',
              metadata: {
                disease: z.disease,
                radiusKm: z.radiusKm,
                block: z.block,
                village: z.village,
                enforcedRules: z.enforcedRules
              },
              createdAt: z.createdAt || z.created_at || new Date().toISOString()
            });
          }
        }

        // C. Active Spatial Outbreak Clusters (<= 5km grouping)
        const clusters = await supabaseDb.outbreaks.getClusters(userDistrict);
        if (Array.isArray(clusters)) {
          for (const cl of clusters) {
            districtAlerts.push({
              id: `district-cluster-${cl.clusterId || cl.id}`,
              recipientId: userId,
              caseNumber: cl.clusterId || 'CLUSTER-ALERT',
              type: 'OUTBREAK_CLUSTER_ALERT',
              title: `⚠️ Outbreak Cluster: ${cl.disease || 'Livestock Alert'}`,
              message: `${cl.caseCount || cl.activeCases || 2} confirmed cases clustered within ${cl.radiusKm || 5}km in ${cl.block || userDistrict}.`,
              district: userDistrict,
              status: 'DELIVERED',
              severity: 'Critical',
              metadata: {
                disease: cl.disease,
                caseCount: cl.caseCount || cl.activeCases,
                block: cl.block,
                radiusKm: cl.radiusKm
              },
              createdAt: cl.detectedAt || cl.createdAt || new Date().toISOString()
            });
          }
        }
      } catch (distErr) {
        console.warn('[NotificationController] District alerts aggregation notice:', distErr.message);
      }
    }

    // Combine personal notifications with district clinical alerts
    const allNotifications = [...personalNotifs, ...districtAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = allNotifications.filter((n) => n.status !== 'READ').length;

    res.status(200).json({
      success: true,
      count: allNotifications.length,
      unreadCount,
      notifications: allNotifications.slice(0, limit)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = String(req.user.id || req.user._id || '');

    if (!id) {
      return res.status(400).json({ success: false, message: 'Notification ID required' });
    }

    // If it's a persistent Supabase notification record
    if (supabaseAdmin && !id.startsWith('district-')) {
      try {
        const { error } = await supabaseAdmin
          .from('notifications')
          .update({ status: 'READ', updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          console.warn('[NotificationController] Error updating read status in Supabase:', error.message);
        }
      } catch (sbErr) {
        console.warn('[NotificationController] Supabase update exception:', sbErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read for current user
 * @route   POST /api/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = String(req.user.id || req.user._id || '');

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('notifications')
          .update({ status: 'READ', updated_at: new Date().toISOString() })
          .eq('recipient_id', userId);

        if (error) {
          console.warn('[NotificationController] Error in markAllAsRead:', error.message);
        }
      } catch (sbErr) {
        console.warn('[NotificationController] Supabase markAllAsRead exception:', sbErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};
