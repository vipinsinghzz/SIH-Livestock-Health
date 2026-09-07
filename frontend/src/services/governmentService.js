// Government Schemes, Subsidies & Livestock Welfare Service

export const GOVERNMENT_SCHEMES = [
  {
    id: 'sch-01',
    title: 'Pashu Kisan Credit Card (PKCC - पशु किसान क्रेडिट कार्ड)',
    category: 'Concessional Loan',
    ministry: 'Ministry of Fisheries, Animal Husbandry & Dairying',
    subsidyAmount: 'Up to ₹1,60,000 without collateral (4% interest rate)',
    eligibleSpecies: ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Poultry'],
    states: ['All India', 'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Rajasthan'],
    summary: 'Working capital financial support for livestock farmers for fodder, feed, veterinary medicine, and operational expenses.',
    benefits: [
      '₹40,700 loan per cow and ₹60,249 per milch buffalo',
      'Prompt repayment incentive brings effective interest to just 4% per annum',
      'No collateral required up to ₹1.60 Lakh'
    ],
    documentsRequired: ['Aadhaar Card', 'Land Record / Khasra or Animal Tag Certificate', 'Bank Passbook', 'Passport Photo'],
    howToApply: 'Apply at any nationalized bank, cooperative rural bank, or Common Service Center (CSC).'
  },
  {
    id: 'sch-02',
    title: 'Rashtriya Gokul Mission (RGM - राष्ट्रीय गोकुल मिशन)',
    category: 'Breed Improvement & Subsidy',
    ministry: 'Department of Animal Husbandry and Dairying',
    subsidyAmount: 'Up to 50% capital subsidy (up to ₹2 Crore for breed multiplier farms)',
    eligibleSpecies: ['Cattle', 'Buffalo'],
    states: ['All India', 'Madhya Pradesh', 'Maharashtra', 'Gujarat', 'Haryana'],
    summary: 'Development and conservation of indigenous bovine breeds and genetic upgradation using sex-sorted semen.',
    benefits: [
      'Subsidized artificial insemination (AI) at farmer doorstep',
      'Free ear-tagging (12-digit Pashu Aadhaar) under INAPH / Bharat Pashudhan',
      'Financial incentive of ₹50 per calf born through nominated indigenous bull semen'
    ],
    documentsRequired: ['Aadhaar Card', 'Animal Tag ID', 'Bank Account details'],
    howToApply: 'Contact your block veterinary officer or livestock development officer.'
  },
  {
    id: 'sch-03',
    title: 'National Livestock Mission (NLM - राष्ट्रीय पशुधन मिशन)',
    category: 'Capital Subsidy',
    ministry: 'Government of India',
    subsidyAmount: '50% back-ended capital subsidy up to ₹50 Lakh',
    eligibleSpecies: ['Goat', 'Sheep', 'Poultry', 'Pig'],
    states: ['All India', 'Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Bihar'],
    summary: 'Fostering entrepreneurship in small ruminant breeding, poultry farming, and silage/fodder production units.',
    benefits: [
      '50% subsidy for establishing 100+5 or 500+25 goat/sheep breeding units',
      'Subsidy for certified fodder seed production and silage baling machinery',
      'Comprehensive risk mitigation training for rural youth'
    ],
    documentsRequired: ['Detailed Project Report (DPR)', 'Land Ownership / Lease', 'Aadhaar Card', 'Bank Sanction Letter'],
    howToApply: 'Submit application online through the NLM portal (nlm.udyamimitra.in).'
  },
  {
    id: 'sch-04',
    title: 'National Animal Disease Control Programme (NADCP - रोग नियंत्रण कार्यक्रम)',
    category: 'Free Vaccination',
    ministry: 'Government of India (100% Central Funding)',
    subsidyAmount: '100% Free at farmer doorstep',
    eligibleSpecies: ['Cattle', 'Buffalo', 'Goat', 'Sheep'],
    states: ['All India'],
    summary: 'Flagship national program to completely eradicate Foot and Mouth Disease (FMD) and Brucellosis across India.',
    benefits: [
      'Zero fee vaccination for all bovine animals twice a year',
      'Vaccination certificates recorded on Bharat Pashudhan portal',
      'Free ear-tagging and digital health monitoring'
    ],
    documentsRequired: ['No documents required. Animal ear tag must be shown.'],
    howToApply: 'Vaccinators visit villages during semi-annual campaigns; check your local dispensary notice board.'
  },
  {
    id: 'sch-05',
    title: 'Livestock Insurance Scheme (पशुधन बीमा योजना)',
    category: 'Insurance',
    ministry: 'State Animal Husbandry & Central Govt',
    subsidyAmount: '50% to 70% subsidy on premium amount',
    eligibleSpecies: ['Cattle', 'Buffalo'],
    states: ['All India', 'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh'],
    summary: 'Protects livestock owners against sudden financial loss due to accidental death or epidemic outbreaks.',
    benefits: [
      'Covers natural death, diseases, calving complications, lightning, and floods',
      'BPL and SC/ST farmers get 70% premium paid by government',
      'Fast-track claim settlement within 15 days of post-mortem report'
    ],
    documentsRequired: ['Aadhaar Card', 'Animal Health & Valuation Certificate from Vet Doctor', 'Ear Tag Photo'],
    howToApply: 'Visit local veterinary polyclinic to schedule animal valuation and micro-tagging.'
  }
];

export const governmentService = {
  getSchemes(filters = {}) {
    let result = [...GOVERNMENT_SCHEMES];
    if (filters.species && filters.species !== 'All') {
      result = result.filter(s => s.eligibleSpecies.includes(filters.species));
    }
    if (filters.category && filters.category !== 'All') {
      result = result.filter(s => s.category.includes(filters.category));
    }
    return result;
  },

  getSchemeById(id) {
    return GOVERNMENT_SCHEMES.find(s => s.id === id) || GOVERNMENT_SCHEMES[0];
  }
};

export default governmentService;
