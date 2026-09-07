// Map Service: Provides disease cases, outbreak hotspot polygons, and facilities

export const mapService = {
  getDiseaseHotspots() {
    return [
      {
        id: 'hs-01',
        name: 'Baramati Outbreak Buffer Zone',
        center: [18.1517, 74.5772],
        radiusMeters: 5000,
        riskLevel: 'Critical',
        disease: 'Foot and Mouth Disease (FMD)',
        activeCases: 4,
        block: 'Baramati',
        district: 'Pune',
        state: 'Maharashtra',
        advice: 'Containment buffer enforced. Animal transport restricted within 5km.'
      },
      {
        id: 'hs-02',
        name: 'Khed Cluster Zone',
        center: [18.8473, 73.9082],
        radiusMeters: 3500,
        riskLevel: 'High',
        disease: 'Haemorrhagic Septicaemia (HS)',
        activeCases: 2,
        block: 'Khed',
        district: 'Pune',
        state: 'Maharashtra',
        advice: 'Ring vaccination active for 1,200 cattle.'
      },
      {
        id: 'hs-03',
        name: 'Sehore Cattle Belt',
        center: [23.2033, 77.0844],
        radiusMeters: 4000,
        riskLevel: 'Moderate',
        disease: 'Lumpy Skin Disease (LSD)',
        activeCases: 3,
        block: 'Sehore',
        district: 'Sehore',
        state: 'Madhya Pradesh',
        advice: 'Mosquito/vector control fogging underway.'
      }
    ];
  },

  getMapFacilities() {
    return [
      {
        id: 'fac-01',
        name: 'Government Veterinary Polyclinic',
        type: 'Hospital',
        position: [18.158, 74.582],
        contact: '+91 2112 222145',
        hours: '24 Hours Emergency',
        status: 'Open'
      },
      {
        id: 'fac-02',
        name: 'District Disease Investigation Lab (DDIL)',
        type: 'Laboratory',
        position: [18.5204, 73.8567],
        contact: '+91 20 2553 4811',
        hours: '09:00 AM - 05:30 PM',
        status: 'Active'
      },
      {
        id: 'fac-03',
        name: 'Village Animal Health & Vaccination Camp',
        type: 'Camp',
        position: [18.142, 74.561],
        contact: '1962 (Toll Free)',
        hours: 'Every Tuesday & Friday',
        status: 'Active'
      },
      {
        id: 'fac-04',
        name: 'Sehore District Veterinary Hospital',
        type: 'Hospital',
        position: [23.2045, 77.0862],
        contact: '+91 7562 224310',
        hours: '24/7 Casualty Available',
        status: 'Open'
      }
    ];
  }
};

export default mapService;
