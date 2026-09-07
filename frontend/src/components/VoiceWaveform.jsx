import React from 'react';

export default function VoiceWaveform({ isActive = false, barCount = 18, color = 'bg-emerald-500' }) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 px-4 py-2 bg-emerald-950/20 backdrop-blur-sm rounded-full border border-emerald-500/30">
      {bars.map((i) => {
        // Varying heights for realistic waveform
        const heights = [20, 45, 75, 100, 60, 30, 85, 95, 40, 70, 90, 50, 35, 80, 65, 40, 25, 15];
        const baseHeight = heights[i % heights.length];
        const animationDelay = `${(i * 0.08).toFixed(2)}s`;
        const animationDuration = `${0.6 + (i % 4) * 0.15}s`;

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all ${color} ${
              isActive ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: isActive ? `${baseHeight}%` : '20%',
              animationDelay,
              animationDuration
            }}
          />
        );
      })}
    </div>
  );
}
