import React from 'react';

export const Loader = () => {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="relative w-[200px] h-[60px] z-10">
        {/* Self-contained styling for bounce animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes bounce-ball {
            0% {
              top: 60px;
              height: 5px;
              border-radius: 50px 50px 25px 25px;
              transform: scaleX(1.7);
            }
            40% {
              height: 20px;
              border-radius: 50%;
              transform: scaleX(1);
            }
            100% {
              top: 0%;
            }
          }
          @keyframes bounce-shadow {
            0% {
              transform: scaleX(1.5);
            }
            40% {
              transform: scaleX(1);
              opacity: .7;
            }
            100% {
              transform: scaleX(.2);
              opacity: .4;
            }
          }
          .bounce-circle {
            animation: bounce-ball .5s alternate infinite ease;
          }
          .bounce-shadow-el {
            animation: bounce-shadow .5s alternate infinite ease;
          }
        `}} />
        
        {/* Bouncing Circles (Using Hive gold theme color) */}
        <div className="bounce-circle absolute w-5 h-5 rounded-full bg-hive-gold left-[15%] origin-center" />
        <div className="bounce-circle absolute w-5 h-5 rounded-full bg-hive-gold left-[45%] origin-center" style={{ animationDelay: '.2s' }} />
        <div className="bounce-circle absolute w-5 h-5 rounded-full bg-hive-gold right-[15%] left-auto origin-center" style={{ animationDelay: '.3s' }} />
        
        {/* Shadows */}
        <div className="bounce-shadow-el absolute w-5 h-[4px] rounded-full bg-black/90 dark:bg-white/40 top-[62px] left-[15%] origin-center z-[-1] blur-[1px]" />
        <div className="bounce-shadow-el absolute w-5 h-[4px] rounded-full bg-black/90 dark:bg-white/40 top-[62px] left-[45%] origin-center z-[-1] blur-[1px]" style={{ animationDelay: '.2s' }} />
        <div className="bounce-shadow-el absolute w-5 h-[4px] rounded-full bg-black/90 dark:bg-white/40 top-[62px] right-[15%] left-auto origin-center z-[-1] blur-[1px]" style={{ animationDelay: '.3s' }} />
      </div>
    </div>
  );
};

export default Loader;
