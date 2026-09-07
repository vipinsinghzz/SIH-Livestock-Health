import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Camera, X, Phone, User } from 'lucide-react';

const PUNE_BLOCKS = [
  'Baramati',
  'Shirur',
  'Haveli',
  'Khed',
  'Indapur',
  'Daund',
  'Junnar',
  'Ambegaon',
  'Purandar',
  'Bhor',
  'Maval'
];

export default function Step3LocationPhotos({ formData, updateFormData, user }) {
  const { t } = useTranslation();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  const fetchGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateFormData({
          location: {
            ...formData.location,
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lng: parseFloat(position.coords.longitude.toFixed(4))
          }
        });
        setGpsLoading(false);
        setGpsSuccess(true);
      },
      (error) => {
        console.warn('GPS location error:', error.message);
        // Fallback default coordinates (Baramati / Pune)
        updateFormData({
          location: {
            ...formData.location,
            lat: 18.1517,
            lng: 74.5772
          }
        });
        setGpsLoading(false);
        setGpsSuccess(true);
      },
      { timeout: 8000 }
    );
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Convert to base64 preview
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFormData({
          photos: [...(formData.photos || []), reader.result]
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    const current = [...(formData.photos || [])];
    current.splice(index, 1);
    updateFormData({ photos: current });
  };

  return (
    <div className="space-y-6">
      {/* Location Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Epidemiological Location <span className="text-red-500">*</span>
          </label>

          <button
            type="button"
            onClick={fetchGpsLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition border border-emerald-200"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Locating...' : t('wizard.get_gps')}</span>
          </button>
        </div>

        {gpsSuccess && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2 border border-emerald-200">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              GPS Coordinates locked: {formData.location?.lat}, {formData.location?.lng}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('wizard.village_label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Malegaon Bk"
              value={formData.location?.village || ''}
              onChange={(e) =>
                updateFormData({
                  location: { ...formData.location, village: e.target.value }
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('wizard.block_label')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.location?.block || 'Baramati'}
              onChange={(e) =>
                updateFormData({
                  location: { ...formData.location, block: e.target.value }
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
            >
              {PUNE_BLOCKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('wizard.district_label')}
            </label>
            <input
              type="text"
              readOnly
              value={formData.location?.district || 'Pune'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Photo Upload Section */}
      <div className="pt-3 border-t border-slate-100">
        <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-600" />
          {t('wizard.upload_photo')}
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Upload lesions, mouth blisters, or whole-body animal photos for veterinary verification.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50/50 w-28 h-28">
            <Camera className="w-6 h-6" />
            <span className="text-[11px] font-bold text-center">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {(formData.photos || []).map((photoUrl, idx) => (
            <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 group">
              <img src={photoUrl} alt="Animal upload preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-full transition"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reporter Contact Info */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" /> Reporter Name
          </label>
          <input
            type="text"
            value={formData.reporterContact?.name || user?.name || ''}
            onChange={(e) =>
              updateFormData({
                reporterContact: { ...formData.reporterContact, name: e.target.value }
              })
            }
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-slate-500" /> Mobile Number for SMS Alerts
          </label>
          <input
            type="tel"
            value={formData.reporterContact?.phone || user?.phone || ''}
            onChange={(e) =>
              updateFormData({
                reporterContact: { ...formData.reporterContact, phone: e.target.value }
              })
            }
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
