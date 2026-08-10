import React from 'react';

export interface BeeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export const BeeLoader: React.FC<BeeLoaderProps> = ({ 
  size = 'md', 
  className = '',
  message 
}) => {
  const dimensions = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const beeSizes = {
    sm: 16,
    md: 22,
    lg: 30
  };

  return (
    <div className={`flex flex-col items-center justify-center p-1 select-none font-sans ${className}`}>
      <style>{`
        @keyframes beeWingFlutter {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50%       { transform: rotate(-28deg) scaleY(0.55); }
        }
        @keyframes beeHoverFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-2.5px) rotate(1.5deg); }
        }
        .anim-bee-wings { animation: beeWingFlutter 0.12s infinite ease-in-out; transform-origin: bottom center; }
        .anim-bee-float { animation: beeHoverFloat 1.8s infinite ease-in-out; }
      `}</style>

      <div className={`relative flex items-center justify-center ${dimensions[size]}`}>
        {/* Ambient Golden Aura */}
        <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-md animate-pulse" />

        {/* Crisp Golden Halo Orbit Ring (Rotating) */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeDasharray="200 70" 
            strokeLinecap="round"
          />
        </svg>

        {/* Flying Micro-Bee Vector */}
        <div className="anim-bee-float absolute z-10 flex items-center justify-center">
          <svg
            width={beeSizes[size]}
            height={beeSizes[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fluttering Wings */}
            <g className="anim-bee-wings">
              <ellipse cx="36" cy="30" rx="13" ry="22" fill="#FEF3C7" fillOpacity="0.9"
                stroke="#F5C22B" strokeWidth="2" transform="rotate(-30 36 30)" />
              <ellipse cx="64" cy="30" rx="13" ry="22" fill="#FEF3C7" fillOpacity="0.9"
                stroke="#F5C22B" strokeWidth="2" transform="rotate(30 64 30)" />
            </g>
            {/* Bee Oval Body */}
            <ellipse cx="50" cy="58" rx="26" ry="32" fill="#F5C22B" />
            {/* Stripes */}
            <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1C1200" />
            <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1C1200" />
            {/* Head */}
            <circle cx="50" cy="32" r="14" fill="#1C1200" />
            {/* Eyes */}
            <circle cx="44" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="56" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="45" cy="30" r="1.5" fill="#1C1200" />
            <circle cx="57" cy="30" r="1.5" fill="#1C1200" />
            {/* Antennae */}
            <path d="M44 20 C40 12, 36 12, 34 14" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M56 20 C60 12, 64 12, 66 14" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            {/* Stinger */}
            <polygon points="50,90 46,84 54,84" fill="#D9A71E" />
          </svg>
        </div>
      </div>

      {message && (
        <span className="mt-2 text-xs font-semibold text-slate-800 tracking-wide">
          {message}
        </span>
      )}
    </div>
  );
};

export default BeeLoader;
