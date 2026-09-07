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
    id: 'SMP-2026-091',
    animalTag: 'IN-MP-2024-8842',
    animalName: 'Gauri (Buffalo)',
    suspectedDisease: 'Mastitis (Sub-clinical / Acute)',
    sampleType: 'Quarter Milk Sample (Aseptic)',
    collectionDate: '2026-09-03',
    collectorName: 'Dr. Suresh Patil (Para-vet)',
    referralLab: 'District Disease Investigation Lab, Pune',
    status: 'Testing',
    urgency: 'High',
    testRequested: 'Bacterial Culture & Antibiogram Sensitivity',
    interimResult: 'Gram-positive cocci in clusters observed on primary smear. Broth incubation underway.',
    finalResult: null,
    notes: 'Right hind quarter swollen, somatic cell count > 400,000 cells/ml.'
  },
  {
    id: 'SMP-2026-088',
    animalTag: 'IN-MH-2024-1029',
    animalName: 'Ramesh Bull (Cattle)',
    suspectedDisease: 'Foot and Mouth Disease (FMD)',
    sampleType: 'Epithelial Tissue & Vesicular Fluid',
    collectionDate: '2026-09-01',
    collectorName: 'Dr. Ananya Deshmukh',
    referralLab: 'Regional Disease Diagnostic Lab (RDDL), Aundh',
    status: 'Result Available',
    urgency: 'Critical',
    testRequested: 'Multiplex RT-PCR for FMDV Serotypes (O, A, Asia-1)',
    interimResult: 'Positive for FMDV Serotype O.',
    finalResult: 'CONFIRMED: Foot and Mouth Disease Virus Type O detected via RT-PCR. Ring vaccination triggered.',
    notes: 'Quarantine established within 5km radius of village Malegaon.'
  },
  {
    id: 'SMP-2026-094',
    animalTag: 'IN-MP-2024-4190',
    animalName: 'Shyamu (Goat)',
    suspectedDisease: 'PPR (Goat Plague)',
    sampleType: 'Ocular / Nasal Swab & Whole Blood',
    collectionDate: '2026-09-05',
    collectorName: 'Dr. Vikramaditya Sharma',
    referralLab: 'Central Veterinary Laboratory',
    status: 'In Transit',
    urgency: 'Moderate',
    testRequested: 'c-ELISA for PPRV Antibodies & Antigen Detection',
    interimResult: 'Sample packaged in cold chain (ice pack 4°C). Consignment dispatched via speed courier.',
    finalResult: null,
    notes: 'Persistent diarrhea and mucosal erosions in 3 goats in flock.'
  }
];

export const laboratoryService = {
  getSamples() {
    try {
      const saved = localStorage.getItem('lab_samples_data');
      return saved ? JSON.parse(saved) : INITIAL_LAB_SAMPLES;
    } catch (e) {
      return INITIAL_LAB_SAMPLES;
    }
  },

  createSample(sampleData) {
    const samples = this.getSamples();
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

  updateSampleStatus(id, newStatus, optionalResult = null) {
    const samples = this.getSamples();
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
