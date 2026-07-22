import React from 'react';

interface SocialTooltipProps {
  variant?: "dark" | "light";
}

export const SocialTooltip: React.FC<SocialTooltipProps> = ({ variant = "dark" }) => {
  return (
    <div className={`flex items-center justify-start py-1 select-none ${variant === "light" ? "variant-light" : "variant-dark"}`}>
      {/* Self-contained styling for tooltip hover and filled animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .social-list {
          display: flex;
          align-items: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .social-item {
          margin-right: 12px;
          position: relative;
        }
        .social-item .tooltip {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          padding: 5px 10px;
          border-radius: 8px;
          opacity: 0;
          visibility: hidden;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          white-space: nowrap;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .social-item:hover .tooltip {
          opacity: 1;
          visibility: visible;
          top: -45px;
        }
        .social-item a {
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: #8C7A5A; /* hive-text-muted */
          background-color: #25211B; /* dark matching footer */
          border: 1px solid rgba(240, 228, 200, 0.15); /* hive-border style border */
          transition: all 0.3s ease-in-out;
        }
        .social-item a:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          color: #ffffff;
          transform: translateY(-2px);
          border-color: transparent;
        }
        .social-item a svg {
          position: relative;
          z-index: 2;
          width: 16px;
          height: 16px;
          transition: transform 0.3s ease-in-out;
        }
        .social-item a:hover svg {
          transform: scale(1.15);
        }
        .social-item a .filled-layer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0;
          transition: all 0.3s ease-in-out;
          z-index: 1;
        }
        .social-item a:hover .filled-layer {
          height: 100%;
        }

        /* Platform Color Specifics */
        .social-item a[data-social="linkedin"] .filled-layer,
        .social-item a[data-social="linkedin"] ~ .tooltip {
          background-color: #0077b5;
        }
        .social-item a[data-social="instagram"] .filled-layer,
        .social-item a[data-social="instagram"] ~ .tooltip {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
        }
        .social-item a[data-social="youtube"] .filled-layer,
        .social-item a[data-social="youtube"] ~ .tooltip {
          background-color: #ff0000;
        }
        .social-item a[data-social="reddit"] .filled-layer,
        .social-item a[data-social="reddit"] ~ .tooltip {
          background-color: #ff4500;
        }
        .social-item a[data-social="whatsapp"] .filled-layer,
        .social-item a[data-social="whatsapp"] ~ .tooltip {
          background-color: #25d366;
        }

        /* Option A: Light theme defaults with transparent backgrounds, gold borders, and dark grey icons */
        .variant-light .social-item a {
          background-color: transparent;
          border-color: #F0E4C8;
          color: #1A1200;
        }
        
        /* Light variant hover overrides */
        .variant-light .social-item a:hover {
          color: #ffffff;
          border-color: transparent;
        }
      `}} />

      <ul className="social-list">
        {/* LinkedIn */}
        <li className="social-item">
          <a href="https://www.linkedin.com/company/hivenow-in/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" data-social="linkedin">
            <div className="filled-layer" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
            </svg>
          </a>
          <div className="tooltip">LinkedIn</div>
        </li>

        {/* Instagram */}
        <li className="social-item">
          <a href="https://www.instagram.com/hivenow.in?igsh=MWV5cWhiZjVvNnZycg==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" data-social="instagram">
            <div className="filled-layer" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"/>
            </svg>
          </a>
          <div className="tooltip">Instagram</div>
        </li>

        {/* YouTube */}
        <li className="social-item">
          <a href="#" aria-label="YouTube" data-social="youtube">
            <div className="filled-layer" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z"/>
            </svg>
          </a>
          <div className="tooltip">YouTube</div>
        </li>

        {/* WhatsApp */}
        <li className="social-item">
          <a href="https://wa.me/917356019103" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" data-social="whatsapp">
            <div className="filled-layer" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.622-4.902c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
            </svg>
          </a>
          <div className="tooltip">WhatsApp</div>
        </li>

        {/* Reddit */}
        <li className="social-item">
          <a href="#" aria-label="Reddit" data-social="reddit">
            <div className="filled-layer" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.167 8a.417.417 0 1 1-.834 0 .417.417 0 0 1 .834 0zm5.666 0a.417.417 0 1 1-.833 0 .417.417 0 0 1 .833 0z"/>
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.828-1.165c-.385 0-.728.15-1 .393-.99-.687-2.325-1.127-3.804-1.17l.807-2.54 2.61.569c.012.348.299.623.649.623.358 0 .647-.289.647-.648a.648.648 0 0 0-.648-.647c-.329 0-.6.244-.643.558l-2.729-.596a.324.324 0 0 0-.386.223L7.33 4.86c-1.527.027-2.907.47-3.922 1.17-.279-.26-.656-.418-1.071-.418a1.442 1.442 0 0 0-1.44 1.44c0 .487.244.919.615 1.186-.04.152-.06.31-.06.47 0 2.228 2.583 4.042 5.762 4.042 3.18 0 5.762-1.814 5.762-4.042 0-.162-.022-.319-.064-.474.362-.266.6-.692.6-1.182 0-.795-.646-1.44-1.44-1.44z"/>
            </svg>
          </a>
          <div className="tooltip">Reddit</div>
        </li>
      </ul>
    </div>
  );
}

export default SocialTooltip;
