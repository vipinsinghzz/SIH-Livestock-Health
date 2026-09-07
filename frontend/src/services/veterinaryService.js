// Veterinary Directory & Assistance Service

export const VETERINARY_CENTERS = [
  {
    id: 'vet-01',
    name: 'Dr. Ananya Deshmukh (B.V.Sc & A.H.)',
    category: 'Government Veterinarian',
    facility: 'Block Veterinary Dispensary, Baramati',
    distanceKm: 2.8,
    availability: 'Available Now',
    isEmergency: true,
    services: ['Clinical Triage', 'Emergency Surgeries', 'Vaccination', 'AI Artificial Insemination'],
    phone: '+91 98220 14589',
    rating: 4.9,
    experience: '8 years',
    address: 'Near Kisan Mandi, Station Road, Baramati, Pune - 413102'
  },
  {
    id: 'vet-02',
    name: 'Sehore Government Veterinary Hospital',
    category: 'Government Hospital',
    facility: 'District Animal Husbandry Complex',
    distanceKm: 4.5,
    availability: 'Open 24/7',
    isEmergency: true,
    services: ['24-Hr Emergency Ambulance', 'Ultrasound & X-Ray', 'Minor OT', 'Free Vaccination'],
    phone: '+91 7562 224310',
    rating: 4.8,
    experience: 'Government Facility',
    address: 'Hospital Road, Civil Lines, Sehore, MP - 466001'
  },
  {
    id: 'vet-03',
    name: 'Dr. Vikramaditya Sharma (M.V.Sc - Medicine)',
    category: 'Private Specialist Clinic',
    facility: 'Kisan Pashu Seva Kendra',
    distanceKm: 6.2,
    availability: 'Open until 08:00 PM',
    isEmergency: false,
    services: ['Mastitis Management', 'Blood Pathology', 'Calving Assistance', 'Nutrition Planning'],
    phone: '+91 94251 88920',
    rating: 4.7,
    experience: '12 years',
    address: 'Shop 14, Krishi Upaj Mandi, Sehore, MP'
  },
  {
    id: 'vet-04',
    name: 'Regional Disease Diagnostic Laboratory (RDDL)',
    category: 'Diagnostic Laboratory',
    facility: 'State Veterinary Diagnostics',
    distanceKm: 18.0,
    availability: 'Sample Receiving (08:00 AM - 06:00 PM)',
    isEmergency: false,
    services: ['RT-PCR Disease Confirmation', 'Milk Somatic Cell Count', 'Antibiogram Culture', 'Blood Smear'],
    phone: '+91 20 2553 4811',
    rating: 4.9,
    experience: 'Accredited Reference Lab',
    address: 'Veterinary College Campus, Aundh, Pune - 411007'
  },
  {
    id: 'vet-05',
    name: 'Kisan Mobile Veterinary Unit (1962)',
    category: 'Mobile Camp',
    facility: 'Doorstep Veterinary Service',
    distanceKm: 1.2,
    availability: 'On Call (Dial 1962)',
    isEmergency: true,
    services: ['At-Doorstep Emergency', 'Free Medicines', 'Immediate Triage', 'Vaccination Drive'],
    phone: '1962',
    rating: 5.0,
    experience: 'Govt. Sponsored 100% Free',
    address: 'Operates across all rural blocks and villages'
  }
];

export const veterinaryService = {
  async getNearbyCenters(filters = {}) {
    let result = [...VETERINARY_CENTERS];
    if (filters.category && filters.category !== 'All') {
      result = result.filter(c => c.category.includes(filters.category));
    }
    if (filters.emergencyOnly) {
      result = result.filter(c => c.isEmergency);
    }
    return result;
  },

  async getCenterById(id) {
    return VETERINARY_CENTERS.find(c => c.id === id) || VETERINARY_CENTERS[0];
  }
};

export default veterinaryService;
