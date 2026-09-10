import React from 'react';

/**
 * LivestockSaathiEmblem
 * Official Livestock Saathi circular emblem integrating the exact attached artwork:
 * - Circular green foliage outer frame
 * - Cattle and goat silhouettes in deep forest green
 * - Medical veterinary cross (+) in vibrant green
 * - Agriculture leaf/pasture cradle at the base
 */
export function LivestockSaathiEmblem({ size = 44, className = '', imgClassName = '' }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Livestock Saathi Logo"
    >
      <img
        src="/livestock-saathi-logo.png"
        alt="Livestock Saathi"
        width={size}
        height={size}
        className={`w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 hover:scale-105 ${imgClassName}`}
        loading="eager"
      />
    </div>
  );
}

/**
 * KisanSaathiEmblem
 * Dedicated official emblem for Kisan Saathi AI:
 * - Friendly AI veterinary robot with headset
 * - Speech bubble & voice audio waveform
 * - Indian livestock silhouettes (cattle, goat, sheep, buffalo)
 * - Rural farmhouse and pasture cradle
 */
export function KisanSaathiEmblem({ size = 44, className = '', imgClassName = '' }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Kisan Saathi AI"
    >
      <img
        src="/kisan-saathi-logo.png"
        alt="Kisan Saathi AI"
        width={size}
        height={size}
        className={`w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 hover:scale-105 ${imgClassName}`}
        loading="eager"
      />
    </div>
  );
}

/**
 * Full LivestockSaathiLogo component with flexible variants:
 * - 'horizontal' (default, perfect for Navbar & headers)
 * - 'stacked' (ideal for Login, Register, Language Selection)
 * - 'compact' (compact bar display)
 * - 'icon' (pure emblem icon)
 */
export default function LivestockSaathiLogo({
  variant = 'horizontal',
  size = 'md',
  showSubtitle = true,
  showTagline = false,
  tagline = 'स्वस्थ पशु • समृद्ध किसान',
  className = '',
  iconClassName = '',
  textClassName = ''
}) {
  // Size presets
  const sizeMap = {
    xs: { icon: 30, text: 'text-sm font-black', sub: 'text-xs', badge: 'text-xs px-2 py-0.5' },
    sm: { icon: 38, text: 'text-base font-black', sub: 'text-xs sm:text-sm', badge: 'text-xs px-2 py-0.5' },
    md: { icon: 46, text: 'text-lg sm:text-xl font-black', sub: 'text-xs sm:text-sm', badge: 'text-xs px-2.5 py-0.5' },
    lg: { icon: 58, text: 'text-2xl sm:text-3xl font-black', sub: 'text-sm sm:text-base', badge: 'text-xs sm:text-sm px-2.5 py-0.5' },
    xl: { icon: 74, text: 'text-3xl sm:text-4xl font-black', sub: 'text-base sm:text-lg', badge: 'text-sm px-3 py-1' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'icon') {
    return <LivestockSaathiEmblem size={currentSize.icon} className={iconClassName} />;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {/* Emblem */}
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
          <LivestockSaathiEmblem size={currentSize.icon} className={`relative ${iconClassName}`} />
        </div>

        {/* Wordmark */}
        <div className={`mt-3 ${textClassName}`}>
          <div className={`${currentSize.text} tracking-tight text-slate-900 leading-none flex items-center justify-center gap-1.5 whitespace-nowrap`}>
            <span>LIVESTOCK</span>
            <span className="text-emerald-700 bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              SAATHI
            </span>
          </div>

          {/* PS-128 Pill */}
          {showSubtitle && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="h-px w-6 bg-stone-300" />
              <span className={`inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs ${currentSize.badge}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                SIH PS 128
              </span>
              <span className="h-px w-6 bg-stone-300" />
            </div>
          )}

          {/* Tagline */}
          {showTagline && (
            <p className={`mt-1.5 font-bold text-emerald-800 font-indic ${currentSize.sub}`}>
              {tagline}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal lockup (Navbar, Headers)
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Emblem */}
      <div className="relative shrink-0">
        <LivestockSaathiEmblem size={currentSize.icon} className={iconClassName} />
      </div>

      {/* Typography */}
      <div className={`leading-tight ${textClassName}`}>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={`${currentSize.text} tracking-tight text-slate-900 leading-none`}>
            LIVESTOCK{' '}
            <span className="text-emerald-700 bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              SAATHI
            </span>
          </span>

          {showSubtitle && (
            <span className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs ${currentSize.badge}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              PS 128
            </span>
          )}
        </div>

        {showTagline ? (
          <p className={`font-bold text-emerald-800 font-indic mt-1 ${currentSize.sub}`}>
            {tagline}
          </p>
        ) : (
          <p className={`text-slate-500 font-medium tracking-normal mt-0.5 ${currentSize.sub}`}>
            AI Animal Health & Disease Surveillance
          </p>
        )}
      </div>
    </div>
  );
}
