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
    sm: 18,
    md: 24,
    lg: 32
  };

  return (
    <div className={`flex flex-col items-center justify-center p-1 select-none font-sans ${className}`}>
      <style>{`
        @keyframes goldLinePulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.04); }
        }
        @keyframes goldWingGleam {
          0%, 100% { opacity: 0.4; transform: rotate(0deg); }
          50%       { opacity: 0.95; transform: rotate(-8deg); }
        }
        .anim-gold-bee { animation: goldLinePulse 2.2s infinite ease-in-out; }
        .anim-gold-wings { animation: goldWingGleam 0.8s infinite ease-in-out; transform-origin: center center; }
      `}</style>

      <div className={`relative flex items-center justify-center ${dimensions[size]}`}>
        {/* Soft 24k Golden Ambient Glow */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />

        {/* Rotating Outer Halo Orbit Ring */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2.4s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeDasharray="210 60" 
            strokeLinecap="round"
          />
        </svg>

        {/* Concept 2: Single-Stroke 24k Gold Geometric Line-Art Bee */}
        <div className="anim-gold-bee absolute z-10 flex items-center justify-center">
          <svg
            width={beeSizes[size]}
            height={beeSizes[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Symmetrical Geometric Wing Strokes */}
            <g className="anim-gold-wings">
              {/* Left Wing Line-Art */}
              <path d="M42 42 C26 22 10 32 24 52 C32 62 44 48 42 42 Z" 
                stroke="#F5C22B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Right Wing Line-Art */}
              <path d="M58 42 C74 22 90 32 76 52 C68 62 56 48 58 42 Z" 
                stroke="#F5C22B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* Hexagonal Head Contour */}
            <polygon points="50,14 62,22 62,34 50,42 38,34 38,22" 
              stroke="#D9A71E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
            
            {/* Hexagonal Abdomen Contour */}
            <polygon points="50,42 66,54 66,74 50,88 34,74 34,54" 
              stroke="#D9A71E" strokeWidth="3" strokeLinejoin="round" fill="none" />
            
            {/* Geometric Inner Accent Lines (Stripes) */}
            <line x1="37" y1="60" x2="63" y2="60" stroke="#F5C22B" strokeWidth="2" strokeLinecap="round" />
            <line x1="40" y1="70" x2="60" y2="70" stroke="#F5C22B" strokeWidth="2" strokeLinecap="round" />

            {/* Geometric Antennae */}
            <polyline points="44,18 40,10 34,8" stroke="#D9A71E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="56,18 60,10 66,8" stroke="#D9A71E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>

      {message && (
        <span className="mt-2 text-xs font-semibold text-slate-800 tracking-wide font-sans">
          {message}
        </span>
      )}
    </div>
  );
};

export default BeeLoader;
