// Emergency SOS System Service

export const EMERGENCY_STAGES = [
  { key: 'submitted', label: 'Report Submitted', labelHi: 'आपातकालीन रिपोर्ट दर्ज', desc: 'Alert broadcast to block emergency response team.' },
  { key: 'assigned', label: 'Veterinarian Assigned', labelHi: 'पशु चिकित्सक नियुक्त', desc: 'Dr. Ananya Deshmukh assigned to attend.' },
  { key: 'under_review', label: 'Under Review', labelHi: 'चिकित्सकीय समीक्षाधीन', desc: 'Symptoms and photo assessed for critical urgency.' },
  { key: 'contacted', label: 'Doctor Contacted Farmer', labelHi: 'डॉक्टर द्वारा संपर्क', desc: 'Field ambulance dispatched or guidance given via phone.' },
  { key: 'resolved', label: 'Resolved / Treated', labelHi: 'उपचार संपन्न / सुरक्षित', desc: 'Emergency stabilization provided on-site.' }
];

export const emergencyService = {
  createEmergencySOS(data) {
    const sosId = 'SOS-' + Date.now().toString().slice(-6);
    const newAlert = {
      id: sosId,
      animalName: data.animalName || 'Cattle',
      species: data.species || 'Cattle',
      location: data.location || 'Current GPS Location (Sehore)',
      urgency: data.urgency || 'Critical',
      symptoms: data.symptoms || 'Acute distress',
      hasPhoto: Boolean(data.photo),
      hasVoiceNote: Boolean(data.voiceNote),
      statusIndex: 1, // Veterinarian Assigned
      createdAt: new Date().toISOString(),
      assignedDoctor: 'Dr. Ananya Deshmukh (Baramati / Sehore GVD)',
      doctorContact: '+91 98220 14589',
      ambulanceEtaMinutes: 18
    };

    const alerts = this.getAllSOS();
    alerts.unshift(newAlert);
    localStorage.setItem('emergency_sos_alerts', JSON.stringify(alerts));
    return newAlert;
  },

  getAllSOS() {
    try {
      const stored = localStorage.getItem('emergency_sos_alerts');
      return stored ? JSON.parse(stored) : [
        {
          id: 'SOS-841920',
          animalName: 'Lakshmi',
          species: 'Cattle',
          location: 'Village Malegaon, Block Baramati',
          urgency: 'Critical',
          symptoms: 'Bloat, acute respiratory difficulty after grazing',
          statusIndex: 3, // Contacted
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          assignedDoctor: 'Dr. Ananya Deshmukh',
          doctorContact: '+91 98220 14589',
          ambulanceEtaMinutes: 0
        }
      ];
    } catch (e) {
      return [];
    }
  },

  updateSOSStatus(id, newIndex) {
    const alerts = this.getAllSOS();
    const updated = alerts.map(a => a.id === id ? { ...a, statusIndex: newIndex } : a);
    localStorage.setItem('emergency_sos_alerts', JSON.stringify(updated));
    return updated.find(a => a.id === id);
  }
};

export default emergencyService;
