import React, { useState } from 'react';
import { X, FlaskConical, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

const SAMPLE_TYPES = [
  'Blood / Serum',
  'Nasal / Oral Swab',
  'Vesicular Fluid',
  'Skin Lesion / Scab',
  'Milk Sample',
  'Tissue Sample',
  'Fecal Sample',
  'Other'
];

const LAB_OPTIONS = [
  'District Disease Diagnostic Laboratory (DDDL), Pune',
  'Western Regional Disease Diagnostic Laboratory (WRDDL), Pune',
  'State Veterinary Diagnostic Institute, Aundh, Pune',
  'ICAR-National Institute of High Security Animal Diseases (NIHSAD)'
];

const STATUS_STEPS = ['Collected', 'In Transit', 'Received', 'Result Pending', 'Result Confirmed'];

export default function LabReferralModal({ reportId, existingReferral, onClose, onUpdated }) {
  const [sampleType, setSampleType] = useState(existingReferral?.sampleType || 'Blood / Serum');
  const [referredLab, setReferredLab] = useState(
    existingReferral?.referredLab || 'District Disease Diagnostic Laboratory (DDDL), Pune'
  );
  const [status, setStatus] = useState(existingReferral?.status || 'Collected');
  const [confirmedDisease, setConfirmedDisease] = useState(
    existingReferral?.resultSummary?.confirmedDisease || ''
  );
  const [notes, setNotes] = useState(existingReferral?.resultSummary?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingReferral) {
        // Update existing referral
        await api.patch(`/lab-referrals/${existingReferral._id}`, {
          status,
          confirmedDisease,
          notes
        });
      } else {
        // Create new referral
        await api.post('/lab-referrals', {
          reportId,
          sampleType,
          referredLab,
          notes
        });
      }

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit lab referral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {existingReferral ? 'Update Diagnostic Lab Referral' : 'Initiate Sample Collection & Lab Referral'}
              </h3>
              <p className="text-xs text-slate-500">Diagnostic chain-of-custody tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Pipeline Progress */}
        <div className="py-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
            {STATUS_STEPS.map((s, i) => {
              const isPastOrCurrent = STATUS_STEPS.indexOf(status) >= i;
              return (
                <span key={s} className={isPastOrCurrent ? 'text-indigo-700 font-extrabold' : ''}>
                  {s}
                </span>
              );
            })}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-indigo-600 h-2 transition-all duration-300"
              style={{
                width: `${((STATUS_STEPS.indexOf(status) + 1) / STATUS_STEPS.length) * 100}%`
              }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!existingReferral && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnostic Sample Type</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {SAMPLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Laboratory</label>
                <select
                  value={referredLab}
                  onChange={(e) => setReferredLab(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {LAB_OPTIONS.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {existingReferral && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Update Pipeline Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {STATUS_STEPS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}

          {status === 'Result Confirmed' && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <label className="block font-bold text-emerald-900">
                Confirmed Pathogen / Disease Result
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Foot and Mouth Disease (Type O PCR Positive)"
                value={confirmedDisease}
                onChange={(e) => setConfirmedDisease(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Clinical / Laboratory Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sampling conditions, temperature, transit ice pack status, or diagnostic notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
            >
              {loading ? 'Submitting...' : existingReferral ? 'Update Referral' : 'Log Sample & Refer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
