// Geocoding Service for Automatic Indian District Identification
// Resolves GPS coordinates (lat, lng) to administrative { district, state, block, village }

const geoCache = new Map();

class GeocodingService {
  /**
   * Cleans raw district strings from OpenStreetMap / Nominatim (e.g., "Nagpur District" -> "Nagpur")
   */
  cleanDistrictName(rawDistrict = '') {
    if (!rawDistrict) return '';
    return rawDistrict
      .replace(/\s+district/gi, '')
      .replace(/\s+division/gi, '')
      .replace(/\s+circle/gi, '')
      .trim();
  }

  /**
   * Reverse geocodes coordinates (lat, lng) anywhere in India using OpenStreetMap Nominatim
   */
  async reverseGeocode(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }

    const roundedLat = parseFloat(lat.toFixed(3));
    const roundedLng = parseFloat(lng.toFixed(3));
    const cacheKey = `geo_${roundedLat}_${roundedLng}`;

    const cached = geoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.data;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=10&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LivestockSaathi-PS128/1.0 (contact@pashurakshak.gov.in)',
          'Accept-Language': 'en'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Nominatim returned status ${response.status}`);
      }

      const data = await response.json();
      const addr = data.address || {};

      const district = this.cleanDistrictName(
        addr.state_district ||
        addr.district ||
        addr.county ||
        addr.city ||
        addr.subdistrict ||
        ''
      );

      const state = addr.state || 'Maharashtra';
      const block = addr.county || addr.subdistrict || district;
      const village = addr.village || addr.town || addr.suburb || addr.neighbourhood || addr.hamlet || 'Rural Area';

      const result = {
        district,
        state,
        block,
        village,
        lat: roundedLat,
        lng: roundedLng,
        displayName: data.display_name || `${district}, ${state}`
      };

      geoCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (err) {
      console.warn('[GeocodingService] Reverse geocoding fallback:', err.message);

      // Coordinate proximity resolution for key Indian agricultural districts
      let fallbackDist = null;
      let fallbackState = 'Maharashtra';

      if (roundedLat >= 20.5 && roundedLat <= 21.8 && roundedLng >= 78.5 && roundedLng <= 80.0) {
        fallbackDist = 'Nagpur';
      } else if (roundedLat >= 17.8 && roundedLat <= 19.3 && roundedLng >= 73.3 && roundedLng <= 75.2) {
        fallbackDist = 'Pune';
      } else if (roundedLat >= 19.5 && roundedLat <= 20.9 && roundedLng >= 73.2 && roundedLng <= 74.9) {
        fallbackDist = 'Nashik';
      } else if (roundedLat >= 17.2 && roundedLat <= 18.2 && roundedLng >= 73.6 && roundedLng <= 74.8) {
        fallbackDist = 'Satara';
      } else if (roundedLat >= 17.1 && roundedLat <= 18.3 && roundedLng >= 74.9 && roundedLng <= 76.4) {
        fallbackDist = 'Solapur';
      } else if (roundedLat >= 20.4 && roundedLat <= 21.8 && roundedLng >= 76.6 && roundedLng <= 78.4) {
        fallbackDist = 'Amravati';
      } else if (roundedLat >= 26.5 && roundedLat <= 27.5 && roundedLng >= 75.2 && roundedLng <= 76.4) {
        fallbackDist = 'Jaipur';
        fallbackState = 'Rajasthan';
      }

      if (fallbackDist) {
        return {
          district: fallbackDist,
          state: fallbackState,
          block: fallbackDist,
          village: 'Rural Sector',
          lat: roundedLat,
          lng: roundedLng,
          displayName: `${fallbackDist}, ${fallbackState}`
        };
      }

      return null;
    }
  }

  /**
   * Resolves district and state by combining coordinates and user profile details.
   */
  async resolveLocation({ lat = null, lng = null, district = '', state = '', block = '', village = '' } = {}) {
    // 1. Prioritize GPS coordinates reverse geocoding if provided
    if (lat && lng && lat !== 0 && lng !== 0) {
      const geoResult = await this.reverseGeocode(parseFloat(lat), parseFloat(lng));
      if (geoResult && geoResult.district) {
        return {
          district: geoResult.district,
          state: geoResult.state || state || 'Maharashtra',
          block: block || geoResult.block,
          village: village || geoResult.village,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          source: 'gps_reverse_geocoded'
        };
      }
    }

    // 2. Fall back to profile district & state
    const cleanDist = this.cleanDistrictName(district);
    return {
      district: cleanDist,
      state: state || 'Maharashtra',
      block: block || cleanDist,
      village: village || 'Rural Sector',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      source: cleanDist ? 'user_profile' : 'unknown'
    };
  }
}

module.exports = new GeocodingService();
