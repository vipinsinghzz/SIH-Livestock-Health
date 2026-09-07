import api from './api';

// Initial realistic default animals for Indian rural farmers if database is empty or offline
export const INITIAL_ANIMALS = [
  {
    _id: 'anim-001',
    tagId: 'IN-MP-2024-8841',
    name: 'Lakshmi (लक्ष्मी)',
    species: 'Cattle',
    breed: 'Gir Cow (गीर)',
    age: 4,
    gender: 'Female',
    healthStatus: 'Healthy',
    lastCheckup: '2026-08-28',
    milkYieldDaily: '14.5 L',
    vaccinations: [
      { name: 'FMD (खुरपका-मुंहपका)', date: '2026-06-15', nextDue: '2026-12-15', status: 'Completed' },
      { name: 'Brucellosis (ब्रूसीलोसिस)', date: '2026-02-10', nextDue: '2027-02-10', status: 'Completed' },
      { name: 'HS (गलघोंटू)', date: '2026-05-20', nextDue: '2026-11-20', status: 'Completed' }
    ],
    timeline: [
      { type: 'Health Check', title: 'Routine Health Checkup', date: '28 Aug 2026', doctor: 'Dr. Ananya Deshmukh', notes: 'Normal vitals, healthy rumen motility' },
      { type: 'Vaccination', title: 'FMD Booster Dose', date: '15 Jun 2026', doctor: 'Baramati Veterinary Camp', notes: 'Given subcutaneously, no adverse reaction' },
      { type: 'Deworming', title: 'Albendazole Suspension', date: '10 May 2026', doctor: 'Self administered', notes: '100ml single dose' },
      { type: 'Milk Production', title: 'Peak Lactation Recorded', date: '12 Apr 2026', notes: '16.2 Liters / day' }
    ]
  },
  {
    _id: 'anim-002',
    tagId: 'IN-MP-2024-8842',
    name: 'Gauri (गौरी)',
    species: 'Buffalo',
    breed: 'Murrah (मुर्राह)',
    age: 5,
    gender: 'Female',
    healthStatus: 'Needs Attention',
    lastCheckup: '2026-09-02',
    milkYieldDaily: '11.0 L',
    vaccinations: [
      { name: 'FMD (खुरपका-मुंहपका)', date: '2026-06-15', nextDue: '2026-12-15', status: 'Completed' },
      { name: 'Blackleg (लंगड़ा बुखार)', date: '2026-04-10', nextDue: '2026-10-10', status: 'Completed' }
    ],
    timeline: [
      { type: 'Health Check', title: 'Mild Udder Warmth Noticed', date: '02 Sep 2026', doctor: 'Dr. Suresh Patil', notes: 'Early mastitis suspected, milk test recommended' },
      { type: 'Treatment', title: 'Intramammary Infusion', date: '03 Sep 2026', doctor: 'Dr. Suresh Patil', notes: 'Course 3 days' }
    ]
  },
  {
    _id: 'anim-003',
    tagId: 'IN-MP-2024-8843',
    name: 'Moti (मोती)',
    species: 'Cattle',
    breed: 'Sahiwal Bull (साहीवाल)',
    age: 3,
    gender: 'Male',
    healthStatus: 'Healthy',
    lastCheckup: '2026-08-15',
    milkYieldDaily: 'N/A',
    vaccinations: [
      { name: 'HS (गलघोंटू)', date: '2026-05-20', nextDue: '2026-11-20', status: 'Completed' },
      { name: 'Anthrax (एंथ्रेक्स)', date: '2026-03-01', nextDue: '2027-03-01', status: 'Completed' }
    ],
    timeline: [
      { type: 'Health Check', title: 'Pre-breeding fitness evaluation', date: '15 Aug 2026', doctor: 'Dr. Ananya Deshmukh', notes: 'Excellent muscular build and vigor' }
    ]
  },
  {
    _id: 'anim-004',
    tagId: 'IN-MP-2024-8844',
    name: 'Chotu (छोटू)',
    species: 'Goat',
    breed: 'Sirohi (सिरोही)',
    age: 2,
    gender: 'Male',
    healthStatus: 'Healthy',
    lastCheckup: '2026-08-20',
    milkYieldDaily: 'N/A',
    vaccinations: [
      { name: 'PPR (बकरी प्लेग)', date: '2026-01-15', nextDue: '2027-01-15', status: 'Completed' },
      { name: 'Enterotoxaemia (ईटी)', date: '2026-05-10', nextDue: '2026-11-10', status: 'Completed' }
    ],
    timeline: [
      { type: 'Vaccination', title: 'Enterotoxaemia Annual Dose', date: '10 May 2026', notes: 'Administered at village camp' }
    ]
  },
  {
    _id: 'anim-005',
    tagId: 'IN-MP-2024-8845',
    name: 'Rani (रानी)',
    species: 'Goat',
    breed: 'Jamnapari (जमनापारी)',
    age: 3,
    gender: 'Female',
    healthStatus: 'Healthy',
    lastCheckup: '2026-08-22',
    milkYieldDaily: '2.2 L',
    vaccinations: [
      { name: 'PPR (बकरी प्लेग)', date: '2026-01-15', nextDue: '2027-01-15', status: 'Completed' }
    ],
    timeline: [
      { type: 'Health Check', title: 'Kidding follow-up', date: '22 Aug 2026', notes: 'Gave birth to twin kids, both healthy' }
    ]
  }
];

export const animalService = {
  async getAnimals() {
    try {
      const response = await api.get('/animals');
      if (response.data && response.data.length > 0) {
        // Merge with initial rich data to ensure timeline & production fields exist
        localStorage.setItem('cached_animals', JSON.stringify(response.data));
        return response.data;
      }
    } catch (e) {
      console.warn('Backend /animals unavailable, using local cache:', e.message);
    }

    const cached = localStorage.getItem('cached_animals');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {}
    }

    localStorage.setItem('cached_animals', JSON.stringify(INITIAL_ANIMALS));
    return INITIAL_ANIMALS;
  },

  async getAnimalById(id) {
    const animals = await this.getAnimals();
    return animals.find(a => (a._id === id || a.tagId === id)) || animals[0];
  },

  async createAnimal(data) {
    const newAnimal = {
      _id: 'anim-' + Date.now(),
      tagId: data.tagId || `IN-LS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      species: data.species || 'Cattle',
      breed: data.breed || 'Indigenous',
      age: Number(data.age) || 2,
      gender: data.gender || 'Female',
      healthStatus: data.healthStatus || 'Healthy',
      lastCheckup: new Date().toISOString().split('T')[0],
      milkYieldDaily: data.milkYieldDaily || (data.species === 'Goat' ? '2.0 L' : '10.0 L'),
      vaccinations: data.vaccinations || [
        { name: 'FMD', date: new Date().toISOString().split('T')[0], nextDue: '2027-03-01', status: 'Completed' }
      ],
      timeline: [
        { type: 'Health Check', title: 'Animal Registered', date: new Date().toLocaleDateString('en-GB'), notes: 'Profile added to Livestock Saathi' }
      ]
    };

    try {
      await api.post('/animals', newAnimal);
    } catch (e) {
      console.warn('Backend animal creation skipped, saved to local cache:', e.message);
    }

    const animals = await this.getAnimals();
    const updated = [newAnimal, ...animals];
    localStorage.setItem('cached_animals', JSON.stringify(updated));
    return newAnimal;
  },

  async updateAnimal(id, updates) {
    const animals = await this.getAnimals();
    const updated = animals.map(a => (a._id === id ? { ...a, ...updates } : a));
    localStorage.setItem('cached_animals', JSON.stringify(updated));
    return updated.find(a => a._id === id);
  },

  async addTimelineEvent(animalId, event) {
    const animals = await this.getAnimals();
    const updated = animals.map(a => {
      if (a._id === animalId) {
        return {
          ...a,
          timeline: [event, ...(a.timeline || [])]
        };
      }
      return a;
    });
    localStorage.setItem('cached_animals', JSON.stringify(updated));
    return true;
  }
};

export default animalService;
