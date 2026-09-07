import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { voiceService } from '../services/voiceService';
import {
  Bell,
  PlusCircle,
  ShieldAlert,
  Calendar,
  MapPin,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function AdvisoriesPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  // New Advisory Form
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageHi, setMessageHi] = useState('');
  const [severity, setSeverity] = useState('High');
  const [targetBlock, setTargetBlock] = useState('All');

  const fetchAdvisories = async () => {
    try {
      const res = await api.get('/advisories');
      setAdvisories(res.data.advisories || []);
    } catch (err) {
      console.error('Error fetching advisories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisories();
    return () => {
      if (voiceService.isSynthesisSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayVoice = (advId, text) => {
    if (playingId === advId) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    setPlayingId(advId);
    const langCode = voiceService.getLangCode(i18n.language);
    voiceService.speak(text, langCode, () => {
      setPlayingId(null);
    });
  };

  const handleCreateAdvisory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advisories', {
        title: { en: titleEn, hi: titleHi || titleEn },
        message: { en: messageEn, hi: messageHi || messageEn },
        severity,
        targetBlock,
        targetDistrict: 'Pune'
      });
      setModalOpen(false);
      fetchAdvisories();
      setTitleEn('');
      setTitleHi('');
      setMessageEn('');
      setMessageHi('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue advisory.');
    }
  };

  const isHindi = i18n.language.startsWith('hi');
  const isOfficerOrAdmin = ['officer', 'admin', 'field_worker'].includes(user?.role);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            बायोसुरक्षा एवं अलर्ट • Biosecurity Bulletins
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            परामर्श और अलर्ट (Advisories &amp; Alerts)
          </h1>
          <p className="text-xs text-slate-500">
            क्षेत्रीय जैव-सुरक्षा परामर्श, आपातकालीन रोग संगरोध बुलेटिन एवं निवारक दिशानिर्देश
          </p>
        </div>

        {isOfficerOrAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>नया परामर्श जारी करें (Broadcast)</span>
          </button>
        )}
      </div>

      {/* Advisories Feed */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
        </div>
      ) : advisories.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-stone-200 p-8">
          वर्तमान में कोई सक्रिय परामर्श अथवा चेतावनी नहीं है।
        </div>
      ) : (
        <div className="space-y-4">
          {advisories.map((adv) => {
            const isEnglish = i18n.language?.startsWith('en');
            const title = isEnglish ? adv.title?.en || adv.title?.hi : adv.title?.hi || adv.title?.en;
            const message = isEnglish ? adv.message?.en || adv.message?.hi : adv.message?.hi || adv.message?.en;
            const isPlaying = playingId === adv._id;

            return (
              <div
                key={adv._id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3 hover:border-emerald-300 hover:shadow-sm transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" /> {adv.targetBlock} ({adv.targetDistrict || 'Pune'})
                        </span>
                        <span>•</span>
                        <span>{new Date(adv.createdAt).toLocaleDateString(i18n.language || 'en')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Read aloud button */}
                    <button
                      onClick={() => handlePlayVoice(adv._id, `${title}. ${message}`)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isPlaying
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-stone-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800'
                      }`}
                      title={isPlaying ? t('actions.stop', 'Stop') : t('actions.listen', 'Listen')}
                    >
                      {isPlaying ? (
                        <>
                          <VolumeX className="w-4 h-4 animate-pulse" />
                          <span className="text-[11px]">{t('actions.stop', 'Stop')}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-700" />
                          <span className="text-[11px]">{t('actions.listen', 'Listen')}</span>
                        </>
                      )}
                    </button>

                    <RiskBadge riskLevel={adv.severity} size="sm" />
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {message}
                </p>

                {/* Secondary metadata */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>जारीकर्ता: {adv.issuedBy || 'जिला पशुपालन विभाग'}</span>
                  <span className="text-emerald-700 font-semibold">
                    ✓ प्रमाणित सरकारी निर्देश
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Advisory Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">आधिकारिक परामर्श जारी करें</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvisory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">शीर्षक (हिंदी) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. खुरपका-मुंहपका रिंग टीकाकरण सूचना"
                  value={titleHi}
                  onChange={(e) => setTitleHi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">शीर्षक (अंग्रेजी)</label>
                <input
                  type="text"
                  placeholder="e.g. Ring Vaccination Alert: FMD"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">परामर्श संदेश (हिंदी) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="किसानों एवं पशुपालकों के लिए विस्तृत निर्देश..."
                  value={messageHi}
                  onChange={(e) => setMessageHi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">परामर्श संदेश (अंग्रेजी)</label>
                <textarea
                  rows={2}
                  placeholder="Official advisory instructions in English..."
                  value={messageEn}
                  onChange={(e) => setMessageEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">गंभीरता (Severity)</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                  >
                    <option value="Low">सामान्य (Low)</option>
                    <option value="Moderate">मध्यम (Moderate)</option>
                    <option value="High">उच्च (High)</option>
                    <option value="Critical">अति-गंभीर (Critical)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">लक्षित ब्लॉक (Target Block)</label>
                  <select
                    value={targetBlock}
                    onChange={(e) => setTargetBlock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                  >
                    <option value="All">सभी ब्लॉक (All)</option>
                    <option value="Baramati">Baramati</option>
                    <option value="Shirur">Shirur</option>
                    <option value="Haveli">Haveli</option>
                    <option value="Khed">Khed</option>
                    <option value="Indapur">Indapur</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-slate-700 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold"
                >
                  परामर्श प्रसारित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
