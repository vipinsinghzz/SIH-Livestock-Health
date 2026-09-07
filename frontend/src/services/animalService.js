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
  getCacheKey() {
    try {
      const user = JSON.parse(localStorage.getItem('pashurakshak_user') || '{}');
      const uid = user._id || user.id;
      return uid ? `cached_animals_${uid}` : 'cached_animals_guest';
    } catch (e) {
      return 'cached_animals_guest';
    }
  },

  async getAnimals() {
    try {
      const response = await api.get('/animals');
      // Backend returns { success: true, count: N, animals: [...] }
      const animals = response.data?.animals ?? (Array.isArray(response.data) ? response.data : null);
      if (animals !== null) {
        const cacheKey = this.getCacheKey();
        localStorage.setItem(cacheKey, JSON.stringify(animals));
        return animals;
      }
    } catch (e) {
      console.warn('Backend /animals error, falling back to user cache:', e.message);
    }

    const cacheKey = this.getCacheKey();
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {}
    }

    // Guest fallback only if not logged in
    const token = localStorage.getItem('pashurakshak_token');
    if (!token) {
      return INITIAL_ANIMALS;
    }

    return [];
  },

  async getAnimalById(id) {
    const animals = await this.getAnimals();
    return animals.find(a => (a._id === id || a.tagId === id)) || animals[0];
  },

  async createAnimal(data) {
    const payload = {
      tagId: data.tagId || `MH-12-P-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      species: data.species || 'Cattle',
      breed: data.breed || 'Indigenous',
      age: Number(data.age) || 2,
      gender: data.gender || 'Female',
      healthStatus: data.healthStatus || 'Healthy',
      milkYieldDaily: data.milkYieldDaily || (data.species === 'Goat' ? '2.0 L' : '10.0 L'),
      timeline: [
        {
          type: 'Health Check',
          title: 'Animal Registered',
          date: new Date().toLocaleDateString('en-GB'),
          notes: 'Profile added to Livestock Saathi'
        }
      ]
    };

    try {
      const res = await api.post('/animals', payload);
      if (res.data?.animal) {
        const cacheKey = this.getCacheKey();
        const current = await this.getAnimals();
        const updated = [res.data.animal, ...current.filter(a => a._id !== res.data.animal._id)];
        localStorage.setItem(cacheKey, JSON.stringify(updated));
        return res.data.animal;
      }
    } catch (e) {
      console.warn('Backend animal creation error:', e.message);
    }

    const localAnimal = { ...payload, _id: 'anim-' + Date.now() };
    const cacheKey = this.getCacheKey();
    const current = await this.getAnimals();
    const updated = [localAnimal, ...current];
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    return localAnimal;
  },

  async updateAnimal(id, updates) {
    let updatedAnimal = null;
    try {
      const res = await api.patch(`/animals/${id}`, updates);
      if (res.data?.animal) {
        updatedAnimal = res.data.animal;
      }
    } catch (e) {
      console.warn('Backend update animal error:', e.message);
    }

    const animals = await this.getAnimals();
    const updated = animals.map(a => {
      if (a._id === id || a.id === id || a.tagId === id) {
        return updatedAnimal || { ...a, ...updates };
      }
      return a;
    });
    const cacheKey = this.getCacheKey();
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    return updatedAnimal || updated.find(a => (a._id === id || a.id === id || a.tagId === id));
  },

  async addTimelineEvent(animalId, event) {
    let updatedAnimal = null;
    try {
      const res = await api.patch(`/animals/${animalId}`, { newTimelineEvent: event });
      if (res.data?.animal) {
        updatedAnimal = res.data.animal;
      }
    } catch (e) {
      console.warn('Backend add timeline error:', e.message);
    }

    const animals = await this.getAnimals();
    const updated = animals.map(a => {
      if (a._id === animalId || a.id === animalId || a.tagId === animalId) {
        if (updatedAnimal) return updatedAnimal;
        return {
          ...a,
          timeline: [event, ...(a.timeline || [])]
        };
      }
      return a;
    });
    const cacheKey = this.getCacheKey();
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    return updatedAnimal || updated.find(a => (a._id === animalId || a.id === animalId || a.tagId === animalId));
  }
};

export default animalService;
