// Regional Alert and Health Notification Service

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-01',
    type: 'alert',
    riskLevel: 'Moderate',
    titleHi: 'क्षेत्रीय पशु रोग चेतावनी',
    titleEn: 'Regional Disease Alert',
    messageHi: 'आपके क्षेत्र (बारामती / सीहोर) में खुरपका-मुंहपका (FMD) के कुछ नए मामले पाए गए हैं। पशुओं को चारागाह में अकेले न भेजें।',
    messageEn: 'Few cases of Foot and Mouth Disease (FMD) detected in nearby blocks. Avoid sharing common grazing pastures.',
    date: 'आज, 10:30 AM',
    unread: true
  },
  {
    id: 'notif-02',
    type: 'vaccination',
    riskLevel: 'Low',
    titleHi: 'आगामी टीकाकरण शिविर',
    titleEn: 'Upcoming Vaccination Camp',
    messageHi: 'आगामी मंगलवार को ग्राम पंचायत प्रांगण में निःशुल्क गलघोंटू (HS) टीकाकरण शिविर लगेगा।',
    messageEn: 'Free Haemorrhagic Septicaemia (HS) vaccination drive on Tuesday at the Panchayat Bhavan.',
    date: 'कल, 04:15 PM',
    unread: true
  },
  {
    id: 'notif-03',
    type: 'weather',
    riskLevel: 'Moderate',
    titleHi: 'मौसम एवं लू से सुरक्षा सलाह',
    titleEn: 'Heat Stress Advisory',
    messageHi: 'दोपहर में तापमान 34°C पार जाने की संभावना है। पशुओं को दोपहर 12 से 3 बजे तक छाया में रखें।',
    messageEn: 'Temperature expected to cross 34°C this afternoon. Keep animals shaded with fresh drinking water.',
    date: '2 दिन पहले',
    unread: false
  }
];

export const notificationService = {
  getNotifications() {
    try {
      const saved = localStorage.getItem('user_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch (e) {
      return INITIAL_NOTIFICATIONS;
    }
  },

  markAllAsRead() {
    const notifs = this.getNotifications().map(n => ({ ...n, unread: false }));
    localStorage.setItem('user_notifications', JSON.stringify(notifs));
    return notifs;
  },

  getUnreadCount() {
    return this.getNotifications().filter(n => n.unread).length;
  }
};

export default notificationService;
