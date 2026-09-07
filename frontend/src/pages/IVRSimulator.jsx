import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import {
  PhoneCall,
  Mic,
  Volume2,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  Play
} from 'lucide-react';

const PRESET_CALLS = [
  {
    title: 'FMD Call (Baramati)',
    caller: '+919822099881',
    block: 'Baramati',
    species: 'Cattle',
    mortality: '0',
    transcript: 'Hello, my cow has big blisters inside mouth and heavy drooling saliva. She is limping badly and has high fever.'
  },
  {
    title: 'HS Critical Call (Khed)',
    caller: '+919822099882',
    block: 'Khed',
    species: 'Cattle',
    mortality: '1',
    transcript: 'Emergency! One cow died suddenly this morning and another has severe throat swelling and is gasping for breath.'
  },
  {
    title: 'LSD Lumpy Skin Call (Shirur)',
    caller: '+919822099883',
    block: 'Shirur',
    species: 'Buffalo',
    mortality: '0',
    transcript: 'My buffalo has developed hard skin nodules and lumps all over her body and legs with high fever.'
  },
  {
    title: 'Hindi Voice Call (Baramati)',
    caller: '+919822099884',
    block: 'Baramati',
    species: 'Cattle',
    mortality: '0',
    transcript: 'नमस्ते, गाय के मुंह में छाले हैं और बहुत लार टपक रही है। चलने में लंगड़ा रही है।'
  }
];

export default function IVRSimulator() {
  const [caller, setCaller] = useState('+919822099881');
  const [block, setBlock] = useState('Baramati');
  const [species, setSpecies] = useState('Cattle');
  const [mortality, setMortality] = useState('0');
  const [transcript, setTranscript] = useState(PRESET_CALLS[0].transcript);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSimulateCall = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/ivr/webhook', {
        From: caller,
        CallSid: `CA_${Date.now()}`,
        SpeechResult: transcript,
        Species: species,
        Block: block,
        Mortality: mortality
      });

      setResult(res.data);
    } catch (err) {
      console.error('IVR simulation error:', err);
      setError(err.response?.data?.message || 'Failed to execute IVR webhook.');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setCaller(preset.caller);
    setBlock(preset.block);
    setSpecies(preset.species);
    setMortality(preset.mortality);
    setTranscript(preset.transcript);
    setResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-12">
      <div className="border-b border-stone-200 pb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
          <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
          <span>टेलीफोनी हेल्पलाइन एवं आईवीआर वेबहुक परीक्षण • Rural Telephony Hotline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          वॉयस हेल्पलाइन व आईवीआर सिम्युलेटर
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ग्रामीण किसानों द्वारा सामान्य कीपैड फोन या हेल्पलाइन पर की गई कॉल का अनुकरण (Exotel / Twilio संगत)। सिस्टम आवाज को तुरंत पाठ में बदलता है, भौगोलिक केस बनाता है और एआई ट्राइएज चलाता है।
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          सिम्युलेटेड वॉयस कॉल परिदृश्य चुनें (Select Preset Scenario):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_CALLS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-3 rounded-2xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition space-y-1 group"
            >
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 group-hover:text-emerald-800">
                <Play className="w-3 h-3 text-emerald-700" />
                {preset.title}
              </div>
              <p className="text-[11px] text-slate-500 truncate">{preset.transcript}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Form & Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-3">
            <Smartphone className="w-4 h-4 text-emerald-700" />
            इनबाउंड कॉल पैरामीटर (Call Parameters)
          </h2>

          <form onSubmit={handleSimulateCall} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">किसान का फोन नंबर (From Phone)</label>
              <input
                type="tel"
                required
                value={caller}
                onChange={(e) => setCaller(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono bg-stone-50 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">पशु प्रजाति</label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 font-medium"
                >
                  <option value="Cattle">गाय (Cattle)</option>
                  <option value="Buffalo">भैंस (Buffalo)</option>
                  <option value="Goat">बकरी (Goat)</option>
                  <option value="Poultry">मुर्गी (Poultry)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ब्लॉक / तहसील</label>
                <select
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 font-medium"
                >
                  <option value="Baramati">Baramati</option>
                  <option value="Shirur">Shirur</option>
                  <option value="Khed">Khed</option>
                  <option value="Haveli">Haveli</option>
                  <option value="Indapur">Indapur</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">मृत्यु संख्या</label>
                <input
                  type="number"
                  min="0"
                  value={mortality}
                  onChange={(e) => setMortality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-red-500" />
                ट्रांस्क्राइब्ड ऑडियो वक्तव्य (Transcribed Speech)
              </label>
              <textarea
                rows={4}
                required
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="किसान द्वारा फोन पर बताया गया लक्षण..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 text-xs bg-stone-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{loading ? 'इनबाउंड कॉल प्रोसेस और AI ट्राइएज जारी...' : 'कॉल सिम्युलेट करें (Simulate Call)'}</span>
            </button>
          </form>
        </div>

        {/* Output */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col justify-center">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center text-slate-400 py-12 space-y-2">
              <PhoneCall className="w-10 h-10 mx-auto opacity-30 animate-pulse" />
              <p className="text-xs font-medium">
                Click "Simulate Inbound Voice Call" to test automated voice intake and live AI triage.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                वॉयस स्ट्रीम का लिप्यंतरण एवं एआई ट्राइएज इंजन से मिलान जारी...
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in duration-300 text-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">केस आईडी (Case Generated):</span>
                  <div className="text-base font-black font-mono text-slate-900">{result.caseId}</div>
                </div>
                <RiskBadge riskLevel={result.triageResult?.riskLevel} showAiTag={true} size="sm" />
              </div>

              {result.triageResult?.outbreakFlag && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>वॉयस रिपोर्ट के आधार पर प्रकोप क्लस्टर अलर्ट जारी!</span>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="font-bold text-slate-600">पहचाने गए लक्षण (Extracted Symptoms):</span>
                <div className="flex flex-wrap gap-1">
                  {(result.parsedSymptoms || []).map((s, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-slate-700">संदिग्ध रोग (Suspected Pathogen):</span>
                <div className="font-black text-slate-900 text-sm">
                  {result.triageResult?.suspectedDiseases?.[0]?.name}
                </div>
                <p className="text-slate-600 mt-1">
                  <span className="font-semibold text-slate-800">कदम:</span> {result.triageResult?.recommendedAction}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  to={`/reports/${result.report?._id}`}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <span>केस रिकॉर्ड खोलें (Open Case)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
