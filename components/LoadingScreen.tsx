import React from 'react';

interface LoadingScreenProps {
  text?: string;
  subText?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text = "Ascend Academy", subText }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 z-[9999] relative">
      <div className="w-48 h-48 relative mb-4">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
               <linearGradient id="lineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#BF0A30" />
                  <stop offset="100%" stopColor="#FFD700" />
               </linearGradient>
            </defs>
            
            {/* Mountain / Graph Background Opacity */}
            <path 
                d="M 20 180 L 60 120 L 90 140 L 180 30 V 180 H 20 Z" 
                fill="url(#lineGradient)" 
                fillOpacity="0.1"
                className="animate-fade-in"
            />
            
            {/* The Line */}
            <path 
              d="M 20 180 L 60 120 L 90 140 L 180 30" 
              fill="none" 
              stroke="url(#lineGradient)" 
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-path"
            />
            
            {/* Arrow Head */}
            <path 
               d="M 180 30 L 145 30 M 180 30 L 180 65"
               fill="none" 
               stroke="#FFD700" 
               strokeWidth="8"
               strokeLinecap="round"
               strokeLinejoin="round"
               className="animate-draw-arrow"
            />
          </svg>
      </div>

      <div className="text-center">
        <h2 className="text-white font-shrikhand text-5xl tracking-widest uppercase animate-pulse">
            {text}
        </h2>
        {subText && (
            <p className="text-zinc-500 font-shrikhand text-xl uppercase tracking-wide mt-2">
                {subText}
            </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;