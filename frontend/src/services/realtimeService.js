/**
 * Supabase Realtime Service for Frontend
 * File: frontend/src/services/realtimeService.js
 * 
 * Manages WebSocket subscriptions for live disease surveillance & notifications:
 * - Authenticated WebSocket subscriptions via Supabase client
 * - Channel registry preventing duplicate subscriptions
 * - Automatic reconnection with exponential backoff
 * - Clean unmount / unsubscribe handlers to prevent memory leaks
 * - Graceful fallback to SSE stream / polling if WebSockets are unavailable
 */

import { supabase, isLiveSupabase } from '../config/supabaseClient';
import caseService from './caseService';

class RealtimeService {
  constructor() {
    // Map of active channels: channelName -> supabase channel instance
    this.channels = new Map();
    this.listeners = new Map(); // channelName -> Set of callback functions
    this.reconnectAttempts = new Map(); // channelName -> attempt count
  }

  /**
   * Subscribe to live district referral cases and disease updates
   * 
   * @param {string} district - District identifier (e.g. 'Pune')
   * @param {Function} onEvent - Callback when event received: { type, ...data }
   * @returns {Function} Cleanup function to unsubscribe on component unmount
   */
  subscribeToDistrictCases(district, onEvent) {
    const cleanDistrict = (district || 'Pune').trim();
    const channelName = `district:${cleanDistrict}`;

    // Register callback
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName).add(onEvent);

    // If channel already active, return cleanup function
    if (this.channels.has(channelName)) {
      return () => this.unsubscribeListener(channelName, onEvent);
    }

    // 1. Try Supabase Realtime WebSocket channel
    if (isLiveSupabase && supabase && typeof supabase.channel === 'function') {
      try {
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: '*' }, (payload) => {
            const callbacks = this.listeners.get(channelName);
            if (callbacks) {
              callbacks.forEach(cb => {
                try { cb({ type: payload.event, ...payload.payload }); } catch (e) {}
              });
            }
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              this.reconnectAttempts.set(channelName, 0);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              this.handleChannelError(channelName, cleanDistrict);
            }
          });

        this.channels.set(channelName, channel);
      } catch (err) {
        // Fall back to SSE stream below
      }
    }

    // 2. Secondary / Resilient Fallback: Connect via Server-Sent Events (SSE)
    const sseCleanup = caseService.streamReferralEvents(
      (event) => {
        const callbacks = this.listeners.get(channelName);
        if (callbacks) {
          callbacks.forEach(cb => {
            try { cb(event); } catch (e) {}
          });
        }
      },
      (err) => {
        // Non-blocking
      }
    );

    // Return idempotent cleanup function
    return () => {
      this.unsubscribeListener(channelName, onEvent);
      if (typeof sseCleanup === 'function') sseCleanup();
    };
  }

  /**
   * Subscribe to personal notifications for the current authenticated user
   */
  subscribeToUserNotifications(userId, onNotification) {
    if (!userId) return () => {};
    const channelName = `user:${userId}`;

    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName).add(onNotification);

    if (this.channels.has(channelName)) {
      return () => this.unsubscribeListener(channelName, onNotification);
    }

    if (isLiveSupabase && supabase && typeof supabase.channel === 'function') {
      try {
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: '*' }, (payload) => {
            const callbacks = this.listeners.get(channelName);
            if (callbacks) {
              callbacks.forEach(cb => {
                try { cb({ type: payload.event, ...payload.payload }); } catch (e) {}
              });
            }
          })
          .subscribe();

        this.channels.set(channelName, channel);
      } catch (e) {}
    }

    return () => this.unsubscribeListener(channelName, onNotification);
  }

  /**
   * Subscribe to officer surveillance stream (statewide / district alerts)
   */
  subscribeToOfficerSurveillance(onEvent) {
    const channelName = 'officer:surveillance';

    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName).add(onEvent);

    if (this.channels.has(channelName)) {
      return () => this.unsubscribeListener(channelName, onEvent);
    }

    if (isLiveSupabase && supabase && typeof supabase.channel === 'function') {
      try {
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: '*' }, (payload) => {
            const callbacks = this.listeners.get(channelName);
            if (callbacks) {
              callbacks.forEach(cb => {
                try { cb({ type: payload.event, ...payload.payload }); } catch (e) {}
              });
            }
          })
          .subscribe();

        this.channels.set(channelName, channel);
      } catch (e) {}
    }

    return () => this.unsubscribeListener(channelName, onEvent);
  }

  /**
   * Removes a specific listener and cleans up the channel when no listeners remain
   */
  unsubscribeListener(channelName, callback) {
    const callbacks = this.listeners.get(channelName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(channelName);
        const channel = this.channels.get(channelName);
        if (channel) {
          try {
            if (typeof channel.unsubscribe === 'function') {
              channel.unsubscribe();
            }
          } catch (e) {}
          this.channels.delete(channelName);
        }
      }
    }
  }

  /**
   * Handles channel reconnection with exponential backoff
   */
  handleChannelError(channelName, district) {
    const attempts = (this.reconnectAttempts.get(channelName) || 0) + 1;
    this.reconnectAttempts.set(channelName, attempts);

    if (attempts <= 5) {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      setTimeout(() => {
        const existing = this.channels.get(channelName);
        if (existing && typeof existing.unsubscribe === 'function') {
          try { existing.unsubscribe(); } catch (e) {}
        }
        this.channels.delete(channelName);

        // Reconnect if listeners still exist
        if (this.listeners.has(channelName) && this.listeners.get(channelName).size > 0) {
          const callbacks = Array.from(this.listeners.get(channelName));
          callbacks.forEach(cb => this.subscribeToDistrictCases(district, cb));
        }
      }, delay);
    }
  }
}

export default new RealtimeService();
