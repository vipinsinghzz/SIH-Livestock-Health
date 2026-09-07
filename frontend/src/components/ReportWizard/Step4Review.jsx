import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import RiskBadge from '../RiskBadge';
import {
  Cpu,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';

export default function Step4Review({
  formData,
  isSubmitting,
  triageResult,
  createdReport,
  onSubmit,
  isOnline
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* If triage result is already produced */}
      {triageResult ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Outbreak Cluster Alert Banner */}
          {triageResult.outbreakFlag && (
            <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg flex items-start gap-3">
              <div className="p-2 bg-red-700/80 rounded-xl">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="font-extrabold text-base uppercase tracking-wider">
                  ⚠️ {t('wizard.outbreak_alert')}
                </div>
                <p className="text-sm text-red-100 mt-1">
                  {triageResult.explanation}
                </p>
              </div>
            </div>
          )}

          {/* AI Triage Card */}
          <div className="p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Case ID: {createdReport?.caseId}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {t('wizard.triage_summary')}
                </h3>
              </div>
              <RiskBadge riskLevel={triageResult.riskLevel} showAiTag={true} size="lg" />
            </div>

            {/* Suspected Diseases & Confidence Scores */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                {t('wizard.top_disease')} &amp; {t('wizard.confidence')}
              </h4>
              <div className="space-y-2.5">
                {(triageResult.suspectedDiseases || []).map((dis, idx) => {
                  const pct = Math.round(dis.confidenceScore * 100);
                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-bold text-slate-900">{dis.name}</span>
                        <span className="font-extrabold text-emerald-700 font-mono text-sm">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-1000 ${
                            pct > 80 ? 'bg-emerald-600' : pct > 50 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommended Action Box */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                {t('wizard.recommended_action')}
              </h4>
              <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                {triageResult.recommendedAction}
              </p>
            </div>

            {/* Rationale / Explanation */}
            <div className="p-3.5 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-200">
              <span className="font-bold text-slate-700">Epidemiological Rationale: </span>
              {triageResult.explanation}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Link
                to="/"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm transition"
              >
                Return to Dashboard
              </Link>
              {createdReport?._id && (
                <Link
                  to={`/reports/${createdReport._id}`}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition"
                >
                  <Eye className="w-4 h-4" /> View Full Case Record
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : isSubmitting ? (
        /* Loading / Scanning Simulation */
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin flex items-center justify-center" />
            <Cpu className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-slate-800">
              {t('wizard.submitting')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Executing simulated multi-pathology matching algorithm with 14-day spatiotemporal cluster analysis...
            </p>
          </div>
        </div>
      ) : (
        /* Review Before Submission */
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
              Case Verification Summary
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Species:</span>
                <p className="font-bold text-slate-900 text-sm">{formData.species}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Tag ID:</span>
                <p className="font-bold text-slate-900 text-sm">{formData.tagId || 'Not Tagged'}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mortality / Affected:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {formData.mortalityCount} Deaths / {formData.affectedCount} Sick
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Location:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {formData.location?.village}, {formData.location?.block} ({formData.location?.district})
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                <p className="font-mono text-slate-700 text-xs">
                  {formData.location?.lat}, {formData.location?.lng}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Attached Photos:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {(formData.photos || []).length} photo(s)
                </p>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium text-xs">Selected Symptoms:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(formData.symptoms || []).map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {formData.notes && (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700">Observations: </span>
                {formData.notes}
              </div>
            )}
          </div>

          {!isOnline && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                Offline Mode Detected: Clicking Submit will queue this report locally in your browser's IndexedDB. It will automatically sync to the server once internet connectivity resumes.
              </span>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onSubmit}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Cpu className="w-5 h-5" />
              <span>{t('wizard.submit_triage')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
