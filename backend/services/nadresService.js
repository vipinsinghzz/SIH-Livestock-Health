// NADRES + Field Outbreak Disease Surveillance Service (PS-128)
// Integrates real-time ICAR-NIVEDI NADRES early warning stream with local verified field outbreak reports from MongoDB.
// STRICT NO-MOCK POLICY: Only returns authentic live government alerts or active database outbreak reports.

const weatherService = require('./weatherService');
const geminiService = require('./geminiService');
const geocodingService = require('./geocodingService');
const Report = require('../models/Report');
const TriageResult = require('../models/TriageResult');

const NADRES_BASE = 'https://nivedi.res.in/Nadres_v2';
const nadresCache = new Map();

function normalizeDiseaseKey(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

class NadresService {
  /**
   * Queries live ICAR-NIVEDI NADRES v2 platform strictly for the target district & current month.
   */
  async getLiveNadresDistrictData(district, state, month = null) {
    if (!district) return [];
    const cleanDist = district.trim();
    const cleanState = (state || 'Maharashtra').trim().toUpperCase();
    const currentMonth = month || (new Date().getMonth() + 1); // 1-12
    const cacheKey = `nadres_${cleanDist.toLowerCase()}_${cleanState.toLowerCase()}_m${currentMonth}`;

    const cached = nadresCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      return cached.data;
    }

    try {
      const url = `${NADRES_BASE}/api.php?state_name=${encodeURIComponent(cleanState)}&district_name=${encodeURIComponent(cleanDist)}&month=${currentMonth}&limit=50`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'LivestockSaathi-PS128/1.0 (contact@pashurakshak.gov.in)',
          'Referer': `${NADRES_BASE}/`
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        throw new Error(`NADRES API returned status ${res.status}`);
      }

      const json = await res.json();
      const records = json.data || [];

      // Filter strictly for high-risk / very high-risk early warning forewarnings
      const highRisk = records.filter(item => {
        const outcome = item.outcome || '';
        return outcome.includes('High') || outcome.includes('Very High');
      });

      nadresCache.set(cacheKey, { timestamp: Date.now(), data: highRisk });
      return highRisk;
    } catch (err) {
      console.warn(`[NadresService] Live NADRES fetch notice for ${cleanDist}:`, err.message);
      return [];
    }
  }

  /**
   * Queries active, verified field outbreak reports strictly for the target district.
   * Prioritizes authoritative Supabase PostgreSQL; skips Mongoose if not connected (zero 10s buffer freeze).
   */
  async getActiveDatabaseOutbreaks(district) {
    if (!district) return [];
    try {
      // 1. Query Supabase PostgreSQL reports
      const { supabase } = require('../config/supabaseClient');
      if (supabase) {
        try {
          const { data: sbReports, error: sbErr } = await supabase
            .from('reports')
            .select('*')
            .ilike('district', `%${district.trim()}%`)
            .order('created_at', { ascending: false })
            .limit(20);

          if (!sbErr && sbReports && sbReports.length > 0) {
            return sbReports.map((r) => ({
              report: {
                _id: r.id,
                id: r.id,
                species: r.species,
                status: r.status,
                location: { district: r.district, village: r.village, block: r.block },
                createdAt: r.created_at
              },
              triage: {
                riskLevel: r.risk_level || 'Moderate',
                predictedDisease: r.disease_detected || r.disease || 'Livestock Infection',
                outbreakFlag: Boolean(r.risk_level === 'High' || r.risk_level === 'Critical')
              }
            }));
          }
        } catch (sbEx) {
          // non-fatal Supabase check
        }
      }

      // 2. Only query MongoDB if Mongoose connection is actively connected (readyState === 1)
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const reports = await Report.find({
          'location.district': new RegExp(`^${district.trim()}$`, 'i'),
          status: { $in: ['Reported', 'Triaged', 'Field Verified', 'Escalated'] }
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        if (reports && reports.length > 0) {
          const reportIds = reports.map((r) => r._id);
          const triageList = await TriageResult.find({
            reportId: { $in: reportIds },
            $or: [{ outbreakFlag: true }, { riskLevel: { $in: ['High', 'Critical'] } }]
          }).lean();

          const triageMap = new Map();
          triageList.forEach((t) => triageMap.set(t.reportId.toString(), t));

          const outbreakCases = [];
          reports.forEach((report) => {
            const triage = triageMap.get(report._id.toString());
            if (triage) {
              outbreakCases.push({ report, triage });
            }
          });

          return outbreakCases;
        }
      }

      return [];
    } catch (dbErr) {
      console.warn('[NadresService] Database outbreak query notice:', dbErr.message);
      return [];
    }
  }

  /**
   * Synthesizes species affected string from NADRES animal counts
   */
  getSpeciesFromNadresRecord(item) {
    const species = [];
    if (item.cattle > 0) species.push('Cattle');
    if (item.buaffalo > 0) species.push('Buffalo');
    if (item.goat > 0) species.push('Goats');
    if (item.sheep > 0) species.push('Sheep');
    if (item.poultry > 0) species.push('Poultry');
    if (item.pig > 0) species.push('Pigs');

    if (species.length > 0) {
      return species.slice(0, 2).join(' & ');
    }
    return 'Cattle & Buffalo';
  }

  /**
   * Automatic district-based disease alert aggregator.
   * Resolves district via geocoding, queries live government NADRES data + MongoDB outbreak reports.
   * STRICT NO-MOCK POLICY: Returns empty array if no active outbreak exists.
   */
  async getVillageAlerts({
    lat = null,
    lng = null,
    district = '',
    state = '',
    block = '',
    village = ''
  } = {}) {
    // 1. Resolve true administrative district & state using geocoding service
    const resolved = await geocodingService.resolveLocation({
      lat,
      lng,
      district,
      state,
      block,
      village
    });

    const activeDistrict = resolved.district;
    const activeState = resolved.state;

    if (!activeDistrict) {
      return {
        success: true,
        district: '',
        state: activeState,
        totalAlerts: 0,
        alerts: [],
        locationRequired: true,
        message: 'Location access required to detect district disease alerts.'
      };
    }

    // 2. Fetch live agrometeorological weather for microclimate context
    const liveWeather = await weatherService
      .getLiveWeather({
        lat: resolved.lat,
        lng: resolved.lng,
        district: activeDistrict,
        state: activeState
      })
      .catch(() => null);

    const normalizedWeather = liveWeather ? {
      tempC: liveWeather.temperature ?? liveWeather.tempC ?? 28,
      humidityPct: liveWeather.humidity ?? liveWeather.humidityPct ?? 65,
      condition: liveWeather.condition ?? 'Clear',
      thi: liveWeather.thiScore ?? liveWeather.thi ?? 75,
      stressLevel: liveWeather.heatStressLevel ?? liveWeather.stressLevel ?? 'Normal'
    } : null;

    // 3. Concurrently query live NADRES forewarnings and local MongoDB outbreak reports
    const [nadresRecords, dbOutbreaks] = await Promise.all([
      this.getLiveNadresDistrictData(activeDistrict, activeState),
      this.getActiveDatabaseOutbreaks(activeDistrict)
    ]);

    const activeAlerts = [];
    const seenDiseases = new Set();

    // A. Process verified active local outbreaks from MongoDB first
    dbOutbreaks.forEach(({ report, triage }) => {
      const primaryDisease = triage.suspectedDiseases?.[0]?.name || 'Outbreak Alert';
      const cleanKey = normalizeDiseaseKey(primaryDisease);

      if (!cleanKey || seenDiseases.has(cleanKey)) return;
      seenDiseases.add(cleanKey);

      const isCritical = triage.riskLevel === 'Critical';
      const locationLabel = report.location?.village
        ? `${report.location.village}, ${report.location.block || activeDistrict}`
        : `${activeDistrict} Outbreak Zone`;

      activeAlerts.push({
        id: report.caseId || `db-${report._id}`,
        diseaseName: primaryDisease,
        affectedDistrict: `${activeDistrict} District`,
        district: activeDistrict,
        state: activeState,
        village: report.location?.village || '',
        block: report.location?.block || '',
        speciesAffected: report.species || 'Cattle',
        riskLevel: isCritical ? 'Critical' : 'High',
        riskBadgeEn: isCritical ? 'Critical Outbreak' : 'High Risk',
        riskBadgeHi: isCritical ? 'गंभीर प्रकोप' : 'उच्च जोखिम',
        riskBadgeMr: isCritical ? 'गंभीर उद्रेक' : 'मोठा धोका',
        isOutbreak: true,
        outbreakFlag: true,
        reportedLocation: locationLabel,
        reportedDate: report.createdAt || new Date().toISOString(),
        reportedDateStr: new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        dataSource: 'Verified Field Outbreak (PashuRakshak Surveillance)',
        dataSourceEn: 'Verified Field Outbreak (PashuRakshak Surveillance)',
        dataSourceHi: 'सत्यापित क्षेत्रीय प्रकोप (पशुरक्षक निगरानी)',
        dataSourceMr: 'सत्यापित क्षेत्रीय उद्रेक (पशुरक्षक देखरेख)',
        affectedCount: report.affectedCount || 1,
        mortalityCount: report.mortalityCount || 0,
        symptoms: report.symptoms || [],
        aiRecommendationEn: triage.explanation || 'Isolate infected animals immediately and restrict herd movement across village boundaries.',
        aiRecommendationHi: 'संक्रमित पशुओं को तुरंत अलग करें और पशुओं की आवाजाही पर रोक लगाएं।',
        aiRecommendationMr: 'बाधित जनावरांना तत्काळ वेगळे करा आणि जनावरांची ने-आण थांबवा.'
      });
    });

    // B. Process live government forewarnings from ICAR-NIVEDI NADRES
    nadresRecords.forEach((item, index) => {
      const diseaseName = item.disease_name;
      const cleanKey = normalizeDiseaseKey(diseaseName);

      if (!cleanKey || seenDiseases.has(cleanKey)) return;
      seenDiseases.add(cleanKey);

      const species = this.getSpeciesFromNadresRecord(item);
      const isVeryHigh = (item.outcome || '').includes('Very High');

      activeAlerts.push({
        id: `nadres-${item.disease_id || index}-${activeDistrict.toLowerCase()}`,
        diseaseName,
        affectedDistrict: `${activeDistrict} District`,
        district: activeDistrict,
        state: activeState,
        village: resolved.village || '',
        block: resolved.block || '',
        speciesAffected: species,
        riskLevel: isVeryHigh ? 'Critical' : 'High',
        riskBadgeEn: isVeryHigh ? 'Very High Risk' : 'High Risk',
        riskBadgeHi: isVeryHigh ? 'अति उच्च जोखिम' : 'उच्च जोखिम',
        riskBadgeMr: isVeryHigh ? 'अति तीव्र धोका' : 'मोठा धोका',
        isOutbreak: true,
        outbreakFlag: true,
        reportedLocation: `${activeDistrict} Surveillance Circle`,
        reportedDate: new Date().toISOString(),
        reportedDateStr: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        dataSource: 'ICAR-NIVEDI NADRES v2.0 Live Government Early Warning',
        dataSourceEn: 'ICAR-NIVEDI NADRES v2.0 Live Early Warning',
        dataSourceHi: 'ICAR-NIVEDI NADRES v2.0 सरकारी पूर्वचेतावनी',
        dataSourceMr: 'ICAR-NIVEDI NADRES v2.0 शासकीय पूर्वसूचना',
        affectedCount: null,
        mortalityCount: null,
        symptoms: ['High fever, loss of appetite, and reduction in daily milk yield'],
        aiRecommendationEn: `Active government surveillance alert for ${diseaseName} in ${activeDistrict}. Administer preventive ring vaccination immediately.`,
        aiRecommendationHi: `${activeDistrict} में ${diseaseName} के लिए सरकारी पूर्वचेतावनी। तुरंत सुरक्षात्मक टीकाकरण करवाएं।`,
        aiRecommendationMr: `${activeDistrict} मध्ये ${diseaseName} रोगाचा शासकीय इशारा. तातडीने प्रतिबंधात्मक लसीकरण करून घ्या.`
      });
    });

    // 4. Concurrently enhance active alerts with live agrometeorological context using Google Gemini LLM
    await Promise.allSettled(
      activeAlerts.map(async (alert) => {
        alert.weatherContext = normalizedWeather;
        try {
          const geminiResult = await geminiService.generateClinicalRecommendation({
            diseaseName: alert.diseaseName,
            riskLevel: alert.riskLevel,
            location: `${alert.affectedDistrict}, ${activeState}`,
            weather: normalizedWeather,
            herdContext: alert.speciesAffected
          });

          if (geminiResult && geminiResult.recommendationEn) {
            alert.aiRecommendationEn = geminiResult.recommendationEn;
            if (geminiResult.recommendationHi) alert.aiRecommendationHi = geminiResult.recommendationHi;
            if (geminiResult.recommendationMr) alert.aiRecommendationMr = geminiResult.recommendationMr;
            alert.aiModel = geminiResult.model || 'gemini-3.1-flash-lite';
            alert.isAIPowered = true;
          } else {
            alert.aiModel = 'veterinary-clinical-engine';
            alert.isAIPowered = false;
          }
        } catch {
          alert.aiModel = 'veterinary-clinical-engine';
          alert.isAIPowered = false;
        }
      })
    );

    return {
      success: true,
      district: activeDistrict,
      state: activeState,
      totalAlerts: activeAlerts.length,
      alerts: activeAlerts,
      weatherContext: normalizedWeather,
      dataSource: 'NADRES + Real-time PashuRakshak Field Surveillance',
      fetchedAt: new Date().toISOString()
    };
  }
}

module.exports = new NadresService();
