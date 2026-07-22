import React from 'react';

export const BeeLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      <div className="wheel-and-bee">
        {/* Self-contained CSS animations for the Bee and Honeycomb Wheel */}
        <style dangerouslySetInnerHTML={{__html: `
          .wheel-and-bee {
            --dur: 0.8s;
            position: relative;
            width: 10em;
            height: 10em;
            font-size: 14px;
          }

          .wheel,
          .bee,
          .bee div,
          .spoke {
            position: absolute;
          }

          .wheel,
          .spoke {
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }

          .wheel {
            z-index: 2;
            filter: drop-shadow(0 0 8px rgba(240, 194, 67, 0.3));
          }

          .spoke {
            animation: spokeRotate var(--dur) linear infinite;
            z-index: 0;
          }

          .bee {
            animation: beeRun var(--dur) ease-in-out infinite;
            top: 50%;
            left: calc(50% - 3em);
            width: 6em;
            height: 3.5em;
            transform: rotate(4deg) translate(-0.8em, 1.25em); /* Optimized to rest feet exactly on the inner rim */
            transform-origin: 50% 0;
            z-index: 1;
          }

          .bee__body {
            animation: beeBob var(--dur) ease-in-out infinite;
            background: #F0C243; /* Hive gold */
            border-radius: 50% 40% 50% 40% / 45% 45% 55% 55%;
            box-shadow: 0 -0.2em 0 #d4a317 inset, 0 0.2em 0 #fff3d1 inset;
            top: 0.25em;
            left: 1.5em;
            width: 3.6em;
            height: 2.5em;
            transform-origin: 17% 50%;
            transform-style: preserve-3d;
            overflow: hidden;
            position: absolute;
          }

          /* Bee stripes */
          .bee__stripe {
            position: absolute;
            top: 0;
            width: 0.6em;
            height: 100%;
            background: #25211B; /* dark charcoal */
            transform: skewX(-12deg);
          }
          .bee__stripe--1 {
            left: 1.1em;
          }
          .bee__stripe--2 {
            left: 2.1em;
          }

          .bee__head {
            animation: beeHead var(--dur) ease-in-out infinite;
            background: #25211B;
            border-radius: 50%;
            top: 0.35em;
            left: -0.6em;
            width: 1.6em;
            height: 1.6em;
            position: absolute;
            transform-origin: 100% 50%;
          }

          .bee__eye {
            background: #fff;
            border-radius: 50%;
            top: 0.35em;
            left: 0.3em;
            width: 0.55em;
            height: 0.55em;
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .bee__eye::after {
            content: '';
            width: 0.25em;
            height: 0.25em;
            background: #000;
            border-radius: 50%;
            display: block;
          }

          .bee__antenna {
            position: absolute;
            top: -0.35em;
            width: 0.15em;
            height: 0.55em;
            background: #25211B;
            border-radius: 0.05em;
            transform-origin: bottom center;
          }
          .bee__antenna--l {
            left: 0.5em;
            transform: rotate(-20deg);
          }
          .bee__antenna--r {
            left: 0.9em;
            transform: rotate(20deg);
          }

          /* Translucent wings moved outside body to prevent clipping */
          .bee__wing {
            position: absolute;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(240, 228, 200, 0.4);
            border-radius: 50% 50% 10% 50% / 60% 60% 30% 40%;
            width: 1.4em;
            height: 2em;
            top: -0.95em;
            transform-origin: bottom center;
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
          }
          .bee__wing--l {
            left: 2.8em;
            animation: wingFlap 0.06s linear infinite alternate;
            z-index: 2;
          }
          .bee__wing--r {
            left: 3.3em;
            animation: wingFlap 0.06s linear infinite alternate-reverse;
            z-index: -1;
          }

          .bee__sting {
            position: absolute;
            right: -0.1em;
            top: 0.95em;
            width: 0.5em;
            height: 0.5em;
            background: #25211B;
            clip-path: polygon(0 30%, 100% 50%, 0 70%);
            transform: rotate(-8deg);
          }

          /* Bee legs walking cycle */
          .bee__limb {
            position: absolute;
            width: 0.4em;
            height: 1.15em;
            background: #25211B;
            border-radius: 0.15em;
            transform-origin: top center;
            top: 2.25em;
          }
          .bee__limb--fl {
            left: 1.8em;
            animation: legCycleFL var(--dur) linear infinite;
          }
          .bee__limb--fr {
            left: 2.2em;
            animation: legCycleFR var(--dur) linear infinite;
            background: #181511;
            z-index: -2;
          }
          .bee__limb--bl {
            left: 3.2em;
            animation: legCycleBL var(--dur) linear infinite;
          }
          .bee__limb--br {
            left: 3.6em;
            animation: legCycleBR var(--dur) linear infinite;
            background: #181511;
            z-index: -2;
          }

          /* Keyframe Animations */
          @keyframes beeRun {
            from, to {
              transform: rotate(4deg) translate(-0.8em, 1.25em);
            }
            50% {
              transform: rotate(0deg) translate(-0.8em, 1.25em);
            }
          }

          @keyframes beeBob {
            from, 25%, 50%, 75%, to {
              transform: translateY(0);
            }
            12.5%, 37.5%, 62.5%, 87.5% {
              transform: translateY(-0.1em);
            }
          }

          @keyframes beeHead {
            from, 25%, 50%, 75%, to {
              transform: rotate(0deg);
            }
            12.5%, 37.5%, 62.5%, 87.5% {
              transform: rotate(4deg);
            }
          }

          @keyframes wingFlap {
            0% {
              transform: rotate(20deg) skewY(-15deg) scaleY(0.4);
            }
            100% {
              transform: rotate(-50deg) skewY(15deg) scaleY(1.1);
            }
          }

          @keyframes legCycleFL {
            0%, 100% { transform: rotate(35deg); }
            50% { transform: rotate(-35deg); }
          }
          @keyframes legCycleFR {
            0%, 100% { transform: rotate(-35deg); }
            50% { transform: rotate(35deg); }
          }
          @keyframes legCycleBL {
            0%, 100% { transform: rotate(25deg); }
            50% { transform: rotate(-25deg); }
          }
          @keyframes legCycleBR {
            0%, 100% { transform: rotate(-25deg); }
            50% { transform: rotate(25deg); }
          }

          @keyframes spokeRotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(-360deg);
            }
          }
        `}} />
        
        {/* Vector SVG Outer Wheel Rim (Static for leg traction, layered in front) */}
        <div className="wheel">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <circle cx="12" cy="12" r="11" stroke="#F0C243" strokeWidth={0.8} fill="none" />
            <circle cx="12" cy="12" r="10.3" stroke="#F0C243" strokeWidth={0.25} fill="none" className="opacity-50" />
          </svg>
        </div>

        {/* The Honeybee (Layered in middle) */}
        <div className="bee">
          {/* Wings placed outside body to bypass overflow clipping */}
          <div className="bee__wing bee__wing--l" />
          <div className="bee__wing bee__wing--r" />
          
          <div className="bee__body">
            <div className="bee__stripe bee__stripe--1" />
            <div className="bee__stripe bee__stripe--2" />
            <div className="bee__head">
              <div className="bee__eye" />
              <div className="bee__antenna bee__antenna--l" />
              <div className="bee__antenna bee__antenna--r" />
            </div>
            <div className="bee__sting" />
          </div>
          {/* Leg elements */}
          <div className="bee__limb bee__limb--fl" />
          <div className="bee__limb bee__limb--fr" />
          <div className="bee__limb bee__limb--bl" />
          <div className="bee__limb bee__limb--br" />
        </div>

        {/* Vector SVG Geometric Honeycomb Spokes (Layered in back, rotating) */}
        <div className="spoke">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            {/* Hexagon Honeycomb Spoke center */}
            <polygon points="12,8 15.46,10 15.46,14 12,16 8.54,14 8.54,10" stroke="#f0e4c8" strokeWidth={0.55} fill="none" />
            {/* Spoke connectors */}
            <line x1="12" y1="8" x2="12" y2="1.3" stroke="#f0e4c8" strokeWidth={0.55} />
            <line x1="15.46" y1="10" x2="21.13" y2="6.6" stroke="#f0e4c8" strokeWidth={0.55} />
            <line x1="15.46" y1="14" x2="21.13" y2="17.4" stroke="#f0e4c8" strokeWidth={0.55} />
            <line x1="12" y1="16" x2="12" y2="22.7" stroke="#f0e4c8" strokeWidth={0.55} />
            <line x1="8.54" y1="14" x2="2.87" y2="17.4" stroke="#f0e4c8" strokeWidth={0.55} />
            <line x1="8.54" y1="10" x2="2.87" y2="6.6" stroke="#f0e4c8" strokeWidth={0.55} />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default BeeLoader;
