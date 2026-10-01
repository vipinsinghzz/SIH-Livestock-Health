import api from './api';

// Laboratory Sample Referral and Diagnostic Tracking Service

export const LAB_STATUS_STAGES = [
  'Pending',
  'In Transit',
  'Received',
  'Testing',
  'Result Available'
];

export const INITIAL_LAB_SAMPLES = [
  {
    id: 'SMP-2026-NAG-091',
    animalTag: 'NG-COW-108',
    animalName: 'Gauri (Gaolao Cow)',
    suspectedDisease: 'Lumpy Skin Disease (LSD)',
    sampleType: 'Nodular Skin Biopsy & Scab Crust',
    collectionDate: '2026-09-28',
    collectorName: 'Dr. Amit Deshmukh (Saoner Polyclinic)',
    referralLab: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
    status: 'Testing',
    urgency: 'Critical',
    testRequested: 'Capripoxvirus PCR & Histopathology Confirmation',
    interimResult: 'DNA extracted from circumscribed dermal lesion. Amplification for Capripox P32 gene underway.',
    finalResult: null,
    notes: 'Sample cold-chained at 4°C from Saoner containment perimeter.'
  },
  {
    id: 'SMP-2026-NAG-088',
    animalTag: 'NG-GOAT-202',
    animalName: 'Champi (Berari Goat)',
    suspectedDisease: 'Contagious Ecthyma (Orf)',
    sampleType: 'Scab Scraping & Vesicular Fluid',
    collectionDate: '2026-09-29',
    collectorName: 'Dr. Rajesh Patil',
    referralLab: 'College of Veterinary & Animal Sciences Diagnostic Lab, Nagpur',
    status: 'Result Available',
    urgency: 'High',
    testRequested: 'Parapoxvirus PCR & Negative Staining EM',
    interimResult: 'Parapoxvirus oval virions identified under electron microscopy.',
    finalResult: 'CONFIRMED: Contagious Ecthyma (Orf Virus) positive. Topical antiseptics and isolation advised.',
    notes: 'Lesions around muzzle and oral commissures in Kamptee village herd.'
  },
  {
    id: 'SMP-2026-NAG-094',
    animalTag: 'NG-SHEEP-302',
    animalName: 'Badal (Deccani Sheep)',
    suspectedDisease: 'Peste des Petits Ruminants (PPR)',
    sampleType: 'Ocular / Nasal Swab & Whole Blood (EDTA)',
    collectionDate: '2026-09-30',
    collectorName: 'Dr. Priya Sharma',
    referralLab: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
    status: 'In Transit',
    urgency: 'Critical',
    testRequested: 'c-ELISA for PPRV Antibodies & RT-PCR',
    interimResult: 'Sample packaged in temperature-monitored cooler box (2-8°C). Dispatched via priority transit.',
    finalResult: null,
    notes: 'High fever and mucosal erosions in Ramtek migratory flock.'
  }
];

export const laboratoryService = {
  async getSamples(params = {}) {
    try {
      const res = await api.get('/lab-referrals', { params });
      if (res.data?.success && Array.isArray(res.data.referrals) && res.data.referrals.length > 0) {
        return res.data.referrals.map(r => ({
          id: r.id || r._id,
          animalTag: r.report?.animalId || r.report?.animalTag || 'IN-LS-2026',
          animalName: r.report?.animalName || r.report?.species || 'Livestock',
          suspectedDisease: r.report?.symptoms?.join(', ') || r.resultSummary?.confirmedDisease || 'Suspected Condition',
          sampleType: r.sampleType,
          collectionDate: r.collectionDate ? r.collectionDate.split('T')[0] : '',
          collectorName: r.collector?.name || 'Attending Field Veterinarian',
          referralLab: r.referredLab,
          status: r.status === 'Collected' ? 'Pending' : (r.status === 'Result Confirmed' ? 'Result Available' : r.status),
          urgency: 'High',
          testRequested: 'Diagnostic Screening',
          interimResult: r.resultSummary?.notes || 'Sample processed at regional lab',
          finalResult: r.resultSummary?.confirmedDisease ? `CONFIRMED: ${r.resultSummary.confirmedDisease}` : null,
          notes: r.resultSummary?.notes || ''
        }));
      }
    } catch (e) {
      console.warn('[LaboratoryService] Backend API notice:', e.message);
    }

    try {
      const saved = localStorage.getItem('lab_samples_data');
      return saved ? JSON.parse(saved) : INITIAL_LAB_SAMPLES;
    } catch (e) {
      return INITIAL_LAB_SAMPLES;
    }
  },

  async createSample(sampleData) {
    try {
      const res = await api.post('/lab-referrals', {
        reportId: sampleData.reportId || sampleData.caseId,
        caseId: sampleData.caseId,
        sampleType: sampleData.sampleType,
        referredLab: sampleData.referralLab || sampleData.referredLab,
        notes: sampleData.notes
      });
      if (res.data?.success) {
        return res.data.referral;
      }
    } catch (e) {
      console.warn('[LaboratoryService] createSample backend notice:', e.message);
    }

    const samples = await this.getSamples();
    const newSample = {
      id: 'SMP-2026-' + Math.floor(100 + Math.random() * 900),
      animalTag: sampleData.animalTag || 'IN-LS-2026',
      animalName: sampleData.animalName || 'Cattle',
      suspectedDisease: sampleData.suspectedDisease || 'General Infection',
      sampleType: sampleData.sampleType || 'Blood / Serum',
      collectionDate: new Date().toISOString().split('T')[0],
      collectorName: sampleData.collectorName || 'Attending Field Veterinarian',
      referralLab: sampleData.referralLab || 'District Disease Investigation Lab',
      status: 'Pending',
      urgency: sampleData.urgency || 'Moderate',
      testRequested: sampleData.testRequested || 'Routine Diagnostic Screen',
      interimResult: 'Sample registered. Awaiting transit pickup.',
      finalResult: null,
      notes: sampleData.notes || ''
    };

    samples.unshift(newSample);
    localStorage.setItem('lab_samples_data', JSON.stringify(samples));
    return newSample;
  },

  async updateSampleStatus(id, newStatus, optionalResult = null) {
    try {
      const res = await api.patch(`/lab-referrals/${id}`, {
        status: newStatus === 'Result Available' ? 'Result Confirmed' : newStatus,
        confirmedDisease: optionalResult || undefined,
        notes: optionalResult || undefined
      });
      if (res.data?.success) {
        return res.data.referral;
      }
    } catch (e) {
      console.warn('[LaboratoryService] updateSampleStatus backend notice:', e.message);
    }

    const samples = await this.getSamples();
    const updated = samples.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: newStatus,
          finalResult: optionalResult || s.finalResult,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    localStorage.setItem('lab_samples_data', JSON.stringify(updated));
    return updated.find(s => s.id === id);
  }
};

export default laboratoryService;
