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
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-3 select-none font-sans ${className}`}>
      <div className={`relative flex items-center justify-center ${dimensions[size]}`}>
        {/* Soft Golden Ambient Glow */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />

        {/* Rotating Outer Hexagon Stroke */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2.5s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon 
            points="50,6 88,28 88,72 50,94 12,72 12,28" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeDasharray="160"
            strokeDashoffset="45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Inner Static Soft Hexagon */}
        <svg 
          className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] text-amber-300/40"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon 
            points="50,6 88,28 88,72 50,94 12,72 12,28" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {message && (
        <span className="mt-2.5 text-xs font-semibold text-slate-700 tracking-wide">
          {message}
        </span>
      )}
    </div>
  );
};

export default BeeLoader;
