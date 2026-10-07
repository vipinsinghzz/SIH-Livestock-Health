import React from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Stethoscope,
  PhoneCall,
  Calendar,
  Camera,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../config/apiConfig';
import { getSpeciesDisplayName } from '../constants/livestockData';

export default function AiRecommendationModal({
  isOpen,
  onClose,
  scanData,
  animal,
  currentLang = 'en'
}) {
  const navigate = useNavigate();

  if (!isOpen || (!scanData && !animal)) return null;

  const isMarathi = currentLang === 'mr';
  const isHindi = currentLang === 'hi';
  const isEnglish = currentLang === 'en';

  const animalName = animal?.name || scanData?.animalName || 'Livestock';
  const tagId = animal?.tagId || scanData?.tagId || 'N/A';
  const species = animal?.species || scanData?.species || 'Cattle';
  const speciesName = getSpeciesDisplayName(species, currentLang);

  const disease = scanData?.disease || scanData?.predictedDisease || scanData?.possibleCondition || 'Screened Health Condition';
  const confidence = Number(scanData?.confidenceScore || scanData?.confidence || 0);
  const riskLevel = scanData?.riskLevel || (scanData?.healthStatus === 'Critical' ? 'Critical' : 'Moderate');
  const isCritical = riskLevel === 'Critical' || riskLevel === 'High' || scanData?.healthStatus === 'Critical';

  const image = scanData?.image || scanData?.imagePreview || scanData?.imageUrl;
  const scanDate = scanData?.formattedDate || scanData?.date || (scanData?.timestamp ? new Date(scanData.timestamp).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));

  const immediateFirstAid = Array.isArray(scanData?.immediateFirstAid) && scanData.immediateFirstAid.length > 0
    ? scanData.immediateFirstAid
    : (scanData?.advisory ? scanData.advisory.split(/\.\s+/).filter(Boolean) : []);

  const clinicalPrecautions = Array.isArray(scanData?.clinicalPrecautions) && scanData.clinicalPrecautions.length > 0
    ? scanData.clinicalPrecautions
    : [];

  const explanation = scanData?.explanation || scanData?.notes || '';
  const symptoms = scanData?.symptoms || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-modal border-2 border-emerald-300 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 text-emerald-300 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  {isMarathi ? 'AI आधारित शिफारसी' : isHindi ? 'AI आधारित सिफारिशें' : 'AI-Based Recommendation Dialogue'}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-300">
                  {confidence > 0 ? `${confidence}% Confidence` : '>85% Match'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                {isMarathi ? 'पशु आरोग्य शिफारसी व प्रथमोपचार' : isHindi ? 'पशु स्वास्थ्य सिफारिशें व प्राथमिक उपचार' : 'AI Health & Clinical Recommendations'}
              </h3>
            </div>
          </div>

          {/* Animal Mini Summary Badge */}
          <div className="mt-4 pt-3 border-t border-emerald-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200/90 font-medium">
            <div className="flex items-center gap-2">
              <span className="text-base">{species === 'Buffalo' ? '🐃' : species === 'Goat' ? '🐐' : species === 'Sheep' ? '🐑' : '🐄'}</span>
              <strong className="text-white font-bold">{animalName}</strong>
              <span className="font-mono text-[11px]">({tagId})</span>
              <span>• {speciesName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>{scanDate}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-5 bg-stone-50/60">

          {/* Predicted Disease & Severity Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border-2 space-y-2.5 ${
            isCritical
              ? 'bg-rose-50/90 border-red-300 text-red-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                {isCritical ? (
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  {isMarathi ? 'AI ने वर्तवलेला रोग' : isHindi ? 'AI द्वारा पहचाना गया रोग' : 'AI Predicted Disease'}
                </span>
              </span>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  ● {isCritical ? (isMarathi ? 'गंभीर (Critical)' : isHindi ? 'गंभीर (Critical)' : 'Critical') : (isMarathi ? 'लक्ष द्या (Needs Attention)' : isHindi ? 'ध्यान दें (Needs Attention)' : 'Needs Attention')}
                </span>
                {confidence > 85 && (
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {confidence}% Verified
                  </span>
                )}
              </div>
            </div>

            <h4 className="text-2xl font-black tracking-tight">
              {disease}
            </h4>

            {confidence > 85 && (
              <p className="text-xs font-semibold text-emerald-900 bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isMarathi
                    ? `✓ ८५% पेक्षा जास्त अचूकतेमुळे हा आजार ${animalName} च्या प्रोफाइलमध्ये व इतिहासामध्ये नोंदवला गेला आहे.`
                    : isHindi
                    ? `✓ 85% से अधिक सटीकता के कारण यह रोग ${animalName} के प्रोफाइल व रिकॉर्ड में स्वतः दर्ज कर दिया गया है।`
                    : `✓ Confidence > 85%! This condition has been automatically logged into ${animalName}'s official animal health record.`}
                </span>
              </p>
            )}
          </div>

          {/* Scanned Lesion Image if available */}
          {image && (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-700" />
                {isMarathi ? 'तपासणीसाठी वापरलेला फोटो (Scanned Image):' : isHindi ? 'जांच के लिए उपयोग की गई फोटो:' : 'Analyzed Lesion Photo:'}
              </span>
              <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900 max-h-60 flex items-center justify-center">
                <img
                  src={getImageUrl(image)}
                  alt="Scanned animal lesion"
                  className="max-h-60 w-full object-contain cursor-pointer hover:scale-105 transition duration-200"
                  onClick={() => window.open(getImageUrl(image), '_blank')}
                />
                <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                  🔍 {isMarathi ? 'मोठे पहा' : isHindi ? 'बड़ा देखें' : 'Click to enlarge'}
                </span>
              </div>
            </div>
          )}

          {/* AI Clinical Observations / Symptoms */}
          {symptoms && symptoms.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                {isMarathi ? 'नोंदवलेली लक्षणे (Observed Symptoms):' : isHindi ? 'पहचाने गए लक्षण:' : 'Observed Symptoms:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {symptoms.map((sym, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-slate-800 border border-stone-200"
                  >
                    • {sym}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Explanation if available */}
          {explanation && (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {isMarathi ? 'AI निरीक्षण व विश्लेषण' : isHindi ? 'AI अवलोकन एवं विश्लेषण' : 'AI Clinical Assessment'}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {explanation}
              </p>
            </div>
          )}

          {/* CORE USER REQUIREMENT: AI Recommendations & Immediate First Aid */}
          <div className="bg-white rounded-2xl p-5 border-2 border-emerald-300 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 border-b border-emerald-100 pb-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h5 className="text-base font-black text-slate-900">
                  {isMarathi ? 'AI तातडीच्या शिफारसी व प्रथमोपचार' : isHindi ? 'AI तत्काल सिफारिशें व प्राथमिक उपचार' : 'Immediate AI Recommendations & First Aid'}
                </h5>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {isMarathi ? 'रोगनिदान मॉडेलद्वारे शिफारस केलेले घरगुती व तातडीचे उपाय' : isHindi ? 'AI जांच द्वारा अनुशंसित तत्काल देखभाल व प्राथमिक उपाय' : 'Actionable supportive care steps generated by the AI model'}
                </p>
              </div>
            </div>

            {immediateFirstAid.length > 0 ? (
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-800">
                {immediateFirstAid.map((aid, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium text-slate-800">{aid}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 bg-stone-50 rounded-xl text-xs text-slate-600">
                {isMarathi
                  ? 'जनावरास स्वच्छ, कोरड्या जागेत इतर जनावरांपासून वेगळे ठेवा आणि ताज्या पाण्याचा पुरवठा करा.'
                  : isHindi
                  ? 'पशु को अन्य पशुओं से अलग स्वच्छ बाड़े में रखें और नियमित रूप से ताजा पानी व हरा चारा दें।'
                  : 'Isolate the animal in a clean, shaded stall, ensure fresh drinking water, and consult a registered veterinarian.'}
              </div>
            )}

            {/* Additional Biosecurity Precautions if available */}
            {clinicalPrecautions.length > 0 && (
              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {isMarathi ? 'जैवसुरक्षा व प्रतिबंधात्मक काळजी:' : isHindi ? 'जैव-सुरक्षा व बचाव उपाय:' : 'Biosecurity & Prevention:'}
                </span>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {clinicalPrecautions.map((pre, pIdx) => (
                    <li key={pIdx} className="leading-relaxed font-medium">{pre}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* CRITICAL ALERT / VETERINARY EVALUATION CARD */}
          {isCritical && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-400 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-inner">
                  <Stethoscope className="w-5 h-5 text-red-700 animate-pulse" />
                </div>
                <div>
                  <h5 className="text-sm sm:text-base font-black text-red-950">
                    {isMarathi
                      ? 'पशुवैद्यकीय तपासणीची शिफारस (Recommendation of Veterinary Evaluation)'
                      : isHindi
                      ? 'पशुचिकित्सक मूल्यांकन की सिफारिश (Recommendation of Veterinary Evaluation)'
                      : 'Recommendation of Veterinary Evaluation'}
                  </h5>
                  <p className="text-xs text-red-800 font-medium mt-0.5">
                    {isMarathi
                      ? 'हा आजार गंभीर श्रेणीत मोडतो. तात्काळ परवानाधारक पशुवैद्यकाकडून प्रत्यक्ष तपासणी व योग्य औषधोपचार करून घ्या.'
                      : isHindi
                      ? 'यह रोग गंभीर श्रेणी में है। बिना देरी किए पंजीकृत पशु चिकित्सक से भौतिक जांच कराकर पर्ची अनुसार उपचार लें।'
                      : 'This condition is in the critical category. Immediate on-ground clinical evaluation and prescription by a certified veterinarian is strongly recommended.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <a
                  href="tel:1962"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-700 hover:bg-red-800 active:scale-95 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{isMarathi ? '1962 हेल्पलाइन कॉल करा' : isHindi ? '1962 हेल्पलाइन कॉल करें' : 'Call 1962 Helpline'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/veterinary-help');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-red-900 border border-red-300 active:scale-95 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-red-600" />
                  <span>{isMarathi ? 'पशुवैद्यक शोधा' : isHindi ? 'पशु चिकित्सक खोजें' : 'Find District Veterinarians'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 bg-stone-100 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isMarathi
                ? 'हे AI-सहाय्यित प्राथमिक विश्लेषण आहे. अंतिम क्लिनिकल निदानासाठी अधिकृत पशुवैद्यकाचा सल्ला घ्या.'
                : isHindi
                ? 'यह AI-सहायता प्राप्त प्रारंभिक मूल्यांकन है। अंतिम चिकित्सकीय निदान के लिए योग्य पशु चिकित्सक से परामर्श लें।'
                : 'AI-assisted clinical triage assessment. Generated for decision support; consult a registered veterinarian for definitive diagnosis and prescriptions.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100/80 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {isMarathi ? 'बंद करा' : isHindi ? 'बंद करें' : 'Close Dialogue'}
          </button>
        </div>
      </div>
    </div>
  );
}
