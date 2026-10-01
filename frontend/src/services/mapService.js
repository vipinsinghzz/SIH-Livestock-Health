// Map Service: Provides disease cases, outbreak hotspot polygons, and facilities

export const mapService = {
  getDiseaseHotspots() {
    return [
      {
        id: 'hs-nag-01',
        name: 'Saoner LSD Outbreak Containment Zone',
        center: [21.3833, 78.9167],
        radiusMeters: 5000,
        riskLevel: 'Critical',
        disease: 'Lumpy Skin Disease (LSD)',
        activeCases: 4,
        block: 'Saoner',
        district: 'Nagpur',
        state: 'Maharashtra',
        advice: 'Containment buffer enforced. Animal transport restricted within 5km.'
      },
      {
        id: 'hs-nag-02',
        name: 'Kamptee Surveillance Cluster Zone',
        center: [21.2227, 79.1977],
        radiusMeters: 3500,
        riskLevel: 'High',
        disease: 'Foot and Mouth Disease (FMD)',
        activeCases: 3,
        block: 'Kamptee',
        district: 'Nagpur',
        state: 'Maharashtra',
        advice: 'Ring vaccination active for 2,400 cattle and buffaloes.'
      },
      {
        id: 'hs-nag-03',
        name: 'Hingna Cattle Belt Buffer',
        center: [20.9786, 78.9632],
        radiusMeters: 4000,
        riskLevel: 'Moderate',
        disease: 'Hemorrhagic Septicemia (HS)',
        activeCases: 2,
        block: 'Hingna',
        district: 'Nagpur',
        state: 'Maharashtra',
        advice: 'Vector control fogging and pre-monsoon boosters underway.'
      }
    ];
  },

  getMapFacilities() {
    return [
      {
        id: 'fac-nag-01',
        name: 'Taluka Veterinary Polyclinic, Saoner',
        type: 'Hospital',
        position: [21.3833, 78.9167],
        contact: '+91 7113 222145',
        hours: '24 Hours Emergency',
        status: 'Open'
      },
      {
        id: 'fac-nag-02',
        name: 'Regional Disease Diagnostic Laboratory (RDDL), Nagpur',
        type: 'Laboratory',
        position: [21.1458, 79.0882],
        contact: '+91 712 2553481',
        hours: '09:00 AM - 05:30 PM',
        status: 'Active'
      },
      {
        id: 'fac-nag-03',
        name: 'Kamptee Primary Veterinary Dispensary & Ring Camp',
        type: 'Camp',
        position: [21.2227, 79.1977],
        contact: '1962 (Toll Free)',
        hours: 'Daily 09:30 AM - 04:00 PM',
        status: 'Active'
      },
      {
        id: 'fac-nag-04',
        name: 'Zilla Parishad Veterinary Polyclinic, Civil Lines, Nagpur',
        type: 'Hospital',
        position: [21.152, 79.075],
        contact: '+91 712 2560122',
        hours: '24/7 Casualty Available',
        status: 'Open'
      }
    ];
  }
};

export default mapService;
