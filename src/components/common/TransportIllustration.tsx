import React from 'react';

export type TransportMode = 'flights' | 'trains' | 'buses';

interface TransportIllustrationProps {
  mode: TransportMode;
  className?: string;
}

export const TransportIllustration: React.FC<TransportIllustrationProps> = ({ mode, className = '' }) => {
  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-surface-container-lowest via-surface-container-low/60 to-surface-container-lowest p-4 sm:p-6 border border-surface-container-high/80 shadow-lg backdrop-blur-sm overflow-hidden transition-all duration-500 ${className}`}
      role="img"
      aria-label={`Selected transport illustration: ${mode}`}
    >
      {/* Background ambient lighting keyed to active transport mode */}
      <div
        className={`absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          mode === 'flights'
            ? 'bg-primary-container/25'
            : mode === 'trains'
            ? 'bg-secondary-container/25'
            : 'bg-tertiary-container/30'
        }`}
      />
      <div
        className={`absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
          mode === 'flights'
            ? 'bg-primary/10'
            : mode === 'trains'
            ? 'bg-secondary/15'
            : 'bg-outline-variant/20'
        }`}
      />

      {/* Mode Header Banner */}
      <div className="relative z-10 flex items-center justify-between pb-3 mb-2 border-b border-surface-container-high/60">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              mode === 'flights'
                ? 'bg-primary-container'
                : mode === 'trains'
                ? 'bg-secondary-container'
                : 'bg-tertiary'
            }`}
          />
          <div className="flex flex-col text-left">
            <span className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              {mode === 'flights' && 'Aviation Telemetry • Scheduled & Charter Flights'}
              {mode === 'trains' && 'Rail Transit Telemetry • High-Speed & Express Networks'}
              {mode === 'buses' && 'Intercity Transit Telemetry • Luxury Coach & State Fleet'}
            </span>
            <span className="font-headline-sm text-sm sm:text-base font-extrabold text-on-surface">
              {mode === 'flights' && 'Autonomous Flight Disruption Arbitration'}
              {mode === 'trains' && 'Rail Delay & TDR Refund Auto-Filing Engine'}
              {mode === 'buses' && 'Bus Schedule Alteration & Ticket Settlement'}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/70 text-on-surface-variant font-code-sm text-xs border border-surface-container-highest">
          <span className="material-symbols-outlined text-[15px] text-primary">verified</span>
          <span>
            {mode === 'flights' && 'Airbus A350 / Boeing 787'}
            {mode === 'trains' && 'Vande Bharat / Rajdhani'}
            {mode === 'buses' && 'Volvo 9600 Multi-Axle'}
          </span>
        </div>
      </div>

      {/* Dynamic Illustration Canvas */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-[170px] sm:min-h-[190px]">
        {mode === 'flights' && (
          <div
            key="flight-illustration"
            className="w-full flex flex-col items-center animate-fade-in transition-all duration-500"
          >
            <svg
              className="w-full max-w-lg h-36 sm:h-44 drop-shadow-md"
              viewBox="0 0 600 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Airplane Gradients */}
                <linearGradient id="plane-body" x1="0%" y1="0%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#f4f6f8" />
                  <stop offset="100%" stopColor="#e2e6eb" />
                </linearGradient>
                <linearGradient id="plane-belly" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d1d7de" />
                  <stop offset="100%" stopColor="#a9b3be" />
                </linearGradient>
                <linearGradient id="plane-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#84cc16" />
                  <stop offset="100%" stopColor="#416900" />
                </linearGradient>
                <linearGradient id="contrail-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity="0" />
                  <stop offset="40%" stopColor="#84cc16" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="contrail-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4648d4" stopOpacity="0" />
                  <stop offset="50%" stopColor="#6063ee" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6063ee" stopOpacity="0.6" />
                </linearGradient>
                <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Radar Rings in Background */}
              <circle cx="360" cy="105" r="95" fill="url(#radar-glow)" />
              <circle cx="360" cy="105" r="85" stroke="#84cc16" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="360" cy="105" r="50" stroke="#84cc16" strokeOpacity="0.15" strokeWidth="1" />
              <line x1="360" y1="10" x2="360" y2="200" stroke="#84cc16" strokeOpacity="0.08" strokeWidth="1" />
              <line x1="265" y1="105" x2="455" y2="105" stroke="#84cc16" strokeOpacity="0.08" strokeWidth="1" />

              {/* Aerodynamic Contrail Streamlines */}
              <path
                d="M 20,158 C 120,154 210,136 312,122"
                stroke="url(#contrail-1)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 50,180 C 150,175 240,152 342,138"
                stroke="url(#contrail-2)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 70,135 C 160,132 230,120 300,108"
                stroke="#84cc16"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />

              {/* Waypoint Beacon Dots */}
              <circle cx="90" cy="155" r="3" fill="#84cc16" opacity="0.6" />
              <circle cx="200" cy="142" r="3" fill="#84cc16" opacity="0.8" />
              <circle cx="310" cy="122" r="4" fill="#84cc16" />

              {/* Airplane Assembly (Ascending ~10 degrees) */}
              <g transform="translate(140, 10) rotate(-7, 280, 100)">
                {/* Port Wing (Behind Fuselage) */}
                <path
                  d="M 255,80 L 165,30 L 195,25 L 305,74 Z"
                  fill="#cdd4dc"
                  stroke="#b0bac6"
                  strokeWidth="1.5"
                />
                {/* Port Wing Winglet */}
                <path d="M 165,30 L 160,18 L 175,23 Z" fill="#84cc16" />

                {/* Left Engine Pod */}
                <ellipse cx="230" cy="56" rx="22" ry="7" fill="#8f9aa6" transform="rotate(-7, 230, 56)" />
                <ellipse cx="245" cy="54" rx="4" ry="7" fill="#4648d4" transform="rotate(-7, 245, 54)" />

                {/* Main Fuselage */}
                <path
                  d="M 120,105 C 145,102 240,94 375,90 C 425,88 455,95 470,103 C 455,114 420,122 365,124 C 230,125 150,118 120,105 Z"
                  fill="url(#plane-body)"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {/* Lower Fuselage Shadow / Belly Tone */}
                <path
                  d="M 125,107 C 160,113 250,124 370,123 C 415,122 448,116 462,108 C 450,117 415,123 365,124 C 230,125 150,118 125,107 Z"
                  fill="url(#plane-belly)"
                />

                {/* Aeroflux Lime Cheatline (Sleek Speed Stripe) */}
                <path
                  d="M 150,107 C 230,104 340,98 440,96 C 455,97 450,100 435,102 C 340,104 230,110 150,110 Z"
                  fill="url(#plane-accent)"
                />

                {/* Passenger Cabin Windows */}
                <g fill="#191c1e" opacity="0.85">
                  <rect x="235" y="99" width="4" height="6" rx="2" />
                  <rect x="245" y="99" width="4" height="6" rx="2" />
                  <rect x="255" y="99" width="4" height="6" rx="2" />
                  <rect x="265" y="99" width="4" height="6" rx="2" />
                  <rect x="275" y="99" width="4" height="6" rx="2" />
                  <rect x="285" y="99" width="4" height="6" rx="2" />
                  <rect x="295" y="98" width="4" height="6" rx="2" />
                  <rect x="305" y="98" width="4" height="6" rx="2" />
                  <rect x="315" y="98" width="4" height="6" rx="2" />
                  <rect x="325" y="98" width="4" height="6" rx="2" />
                  <rect x="335" y="98" width="4" height="6" rx="2" />
                  <rect x="345" y="97" width="4" height="6" rx="2" />
                  <rect x="355" y="97" width="4" height="6" rx="2" />
                  <rect x="365" y="97" width="4" height="6" rx="2" />
                  <rect x="375" y="97" width="4" height="6" rx="2" />
                  <rect x="385" y="96" width="4" height="6" rx="2" />
                  <rect x="395" y="96" width="4" height="6" rx="2" />
                  <rect x="405" y="96" width="4" height="6" rx="2" />
                  <rect x="415" y="96" width="4" height="6" rx="2" />
                </g>

                {/* Flight Deck Cockpit Windshield */}
                <path
                  d="M 445,96 C 455,97 462,100 464,103 L 452,104 C 445,102 443,98 445,96 Z"
                  fill="#191c1e"
                />

                {/* Vertical Tail Fin & Rudder */}
                <path
                  d="M 125,106 L 90,35 C 93,31 104,31 112,34 L 175,101 Z"
                  fill="url(#plane-accent)"
                  stroke="#416900"
                  strokeWidth="1.5"
                />
                <path d="M 98,42 L 105,44 L 140,98 L 132,98 Z" fill="#ffffff" opacity="0.4" />

                {/* Horizontal Tail Stabilizer */}
                <path
                  d="M 110,105 L 85,96 L 96,93 L 138,102 Z"
                  fill="#b9c3ce"
                  stroke="#9aa7b5"
                  strokeWidth="1"
                />

                {/* Starboard Main Wing (Foreground) */}
                <path
                  d="M 270,110 L 225,175 C 228,180 236,180 248,176 L 350,112 Z"
                  fill="url(#plane-body)"
                  stroke="#b0bac6"
                  strokeWidth="1.5"
                />
                {/* Starboard Winglet */}
                <path d="M 225,175 L 220,188 L 235,182 Z" fill="#84cc16" />

                {/* Starboard Engine Turbofan */}
                <g>
                  <ellipse cx="288" cy="138" rx="25" ry="9" fill="url(#plane-body)" stroke="#9aa7b5" strokeWidth="1" />
                  <ellipse cx="304" cy="137" rx="5" ry="8.5" fill="#191c1e" />
                  <ellipse cx="303" cy="137" rx="2" ry="4" fill="#84cc16" />
                  {/* Engine Pylon Mount */}
                  <path d="M 285,124 L 295,124 L 290,132 Z" fill="#717c88" />
                </g>
              </g>

              {/* Live Telemetry Radar Marker */}
              <g transform="translate(460, 40)">
                <rect x="0" y="0" width="112" height="42" rx="10" fill="#191c1e" opacity="0.9" />
                <rect x="0" y="0" width="112" height="42" rx="10" stroke="#84cc16" strokeWidth="1" strokeOpacity="0.5" />
                <circle cx="16" cy="16" r="3.5" fill="#84cc16" />
                <circle cx="16" cy="16" r="7" stroke="#84cc16" strokeWidth="1" opacity="0.5" />
                <text x="27" y="19" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="sans-serif">
                  ALT 38,000 FT
                </text>
                <text x="12" y="33" fill="#84cc16" fontSize="8" fontWeight="600" fontFamily="monospace">
                  AIRBUS A350 • ON TIME
                </text>
              </g>
            </svg>
          </div>
        )}

        {mode === 'trains' && (
          <div
            key="train-illustration"
            className="w-full flex flex-col items-center animate-fade-in transition-all duration-500"
          >
            <svg
              className="w-full max-w-lg h-36 sm:h-44 drop-shadow-md"
              viewBox="0 0 600 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Train Gradients */}
                <linearGradient id="train-body" x1="0%" y1="0%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#eef1f6" />
                  <stop offset="100%" stopColor="#dce2eb" />
                </linearGradient>
                <linearGradient id="train-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4648d4" />
                  <stop offset="100%" stopColor="#6063ee" />
                </linearGradient>
                <linearGradient id="rail-track" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4648d4" stopOpacity="0" />
                  <stop offset="30%" stopColor="#565e74" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#4648d4" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="speed-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6063ee" stopOpacity="0" />
                  <stop offset="100%" stopColor="#6063ee" stopOpacity="0.7" />
                </linearGradient>
                <radialGradient id="headlight-beam" cx="10%" cy="50%" r="90%">
                  <stop offset="0%" stopColor="#6063ee" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#84cc16" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* High-Speed Track Rails */}
              <line x1="20" y1="185" x2="580" y2="185" stroke="url(#rail-track)" strokeWidth="3" />
              <line x1="20" y1="193" x2="580" y2="193" stroke="url(#rail-track)" strokeWidth="2.5" />

              {/* Sleepers / Ties in Rhythmic Motion */}
              <g stroke="#9aa7b5" strokeWidth="2" opacity="0.65">
                <line x1="60" y1="183" x2="60" y2="195" />
                <line x1="110" y1="183" x2="110" y2="195" />
                <line x1="160" y1="183" x2="160" y2="195" />
                <line x1="210" y1="183" x2="210" y2="195" />
                <line x1="260" y1="183" x2="260" y2="195" />
                <line x1="310" y1="183" x2="310" y2="195" />
                <line x1="360" y1="183" x2="360" y2="195" />
                <line x1="410" y1="183" x2="410" y2="195" />
                <line x1="460" y1="183" x2="460" y2="195" />
                <line x1="510" y1="183" x2="510" y2="195" />
                <line x1="560" y1="183" x2="560" y2="195" />
              </g>

              {/* Dynamic Overhead Catenary Electric Wires */}
              <line x1="20" y1="35" x2="580" y2="35" stroke="#4648d4" strokeOpacity="0.18" strokeWidth="1.5" />
              <line x1="20" y1="50" x2="580" y2="50" stroke="#4648d4" strokeOpacity="0.12" strokeWidth="1" />
              <line x1="150" y1="35" x2="150" y2="80" stroke="#4648d4" strokeOpacity="0.2" strokeWidth="1.5" />
              <line x1="420" y1="35" x2="420" y2="80" stroke="#4648d4" strokeOpacity="0.2" strokeWidth="1.5" />

              {/* Horizontal Speed Streams */}
              <path d="M 40,110 L 220,110" stroke="url(#speed-line)" strokeWidth="2" strokeDasharray="16 8" />
              <path d="M 10,135 L 180,135" stroke="url(#speed-line)" strokeWidth="2.5" strokeDasharray="24 12" />
              <path d="M 70,160 L 250,160" stroke="url(#speed-line)" strokeWidth="1.5" strokeDasharray="12 6" />

              {/* Forward Projector Headlight Light Cone */}
              <polygon points="460,158 590,120 590,200 460,168" fill="url(#headlight-beam)" />

              {/* High-Speed Bullet Train Coach Body */}
              {/* Rear Coach / Carriage */}
              <rect x="70" y="88" width="130" height="88" rx="8" fill="url(#train-body)" stroke="#cbd5e1" strokeWidth="1.5" />
              <rect x="70" y="142" width="130" height="14" fill="url(#train-indigo)" />
              <rect x="70" y="94" width="130" height="4" fill="#4648d4" />
              {/* Rear Coach Windows */}
              <g fill="#191c1e" opacity="0.85">
                <rect x="85" y="104" width="22" height="20" rx="3" />
                <rect x="115" y="104" width="22" height="20" rx="3" />
                <rect x="145" y="104" width="22" height="20" rx="3" />
                <rect x="175" y="104" width="18" height="20" rx="3" />
              </g>
              {/* Coach Gangway Bellows */}
              <rect x="198" y="94" width="10" height="78" rx="2" fill="#424936" />

              {/* Lead Engine Locomotive / Bullet Train Aerodynamic Nose */}
              <path
                d="M 205,88 L 380,88 C 430,88 475,115 488,142 C 494,154 485,176 460,176 L 205,176 Z"
                fill="url(#train-body)"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Aerodynamic Indigo Body Swoop Stripe */}
              <path
                d="M 205,142 L 390,142 C 430,142 460,150 480,164 L 468,172 C 445,160 415,156 380,156 L 205,156 Z"
                fill="url(#train-indigo)"
              />
              <path d="M 205,94 L 380,94 C 405,94 425,98 438,104 L 434,108 C 420,102 400,98 380,98 L 205,98 Z" fill="#4648d4" />

              {/* Aerodynamic High-Speed Pantograph (Roof Power Collector) */}
              <path d="M 250,88 L 265,58 L 295,58 L 310,88" stroke="#4648d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="255" y1="58" x2="305" y2="58" stroke="#84cc16" strokeWidth="3" strokeLinecap="round" />
              <line x1="280" y1="58" x2="280" y2="35" stroke="#6063ee" strokeWidth="2" strokeDasharray="2 2" />

              {/* Driver Cab Curved Windshield */}
              <path
                d="M 405,96 C 435,102 460,118 470,135 L 435,135 C 425,124 415,114 395,105 Z"
                fill="#191c1e"
              />
              {/* Windshield Reflection Gloss */}
              <path d="M 415,100 C 435,106 450,116 458,126 L 448,128 C 440,118 428,110 415,104 Z" fill="#6063ee" opacity="0.6" />

              {/* Passenger Windows */}
              <g fill="#191c1e" opacity="0.85">
                <rect x="220" y="104" width="24" height="20" rx="3" />
                <rect x="252" y="104" width="24" height="20" rx="3" />
                <rect x="284" y="104" width="24" height="20" rx="3" />
                <rect x="316" y="104" width="24" height="20" rx="3" />
                <rect x="348" y="104" width="24" height="20" rx="3" />
              </g>

              {/* Under-Chassis Bogies & Steel Wheels */}
              <g fill="#475569">
                <rect x="90" y="174" width="90" height="8" rx="2" />
                <circle cx="110" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="160" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <rect x="230" y="174" width="100" height="8" rx="2" />
                <circle cx="255" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="305" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <rect x="375" y="174" width="90" height="8" rx="2" />
                <circle cx="395" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="445" cy="184" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
              </g>

              {/* Projector LED Headlights */}
              <ellipse cx="468" cy="162" rx="5" ry="4" fill="#ffffff" />
              <ellipse cx="468" cy="162" rx="3" ry="2" fill="#84cc16" />

              {/* Speed Telemetry Badge */}
              <g transform="translate(450, 36)">
                <rect x="0" y="0" width="122" height="42" rx="10" fill="#191c1e" opacity="0.9" />
                <rect x="0" y="0" width="122" height="42" rx="10" stroke="#4648d4" strokeWidth="1" strokeOpacity="0.6" />
                <circle cx="16" cy="16" r="3.5" fill="#6063ee" />
                <circle cx="16" cy="16" r="7" stroke="#6063ee" strokeWidth="1" opacity="0.5" />
                <text x="27" y="19" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="sans-serif">
                  SPEED 160 KM/H
                </text>
                <text x="12" y="33" fill="#6063ee" fontSize="8" fontWeight="600" fontFamily="monospace">
                  VANDE BHARAT • EXPRESS
                </text>
              </g>
            </svg>
          </div>
        )}

        {mode === 'buses' && (
          <div
            key="bus-illustration"
            className="w-full flex flex-col items-center animate-fade-in transition-all duration-500"
          >
            <svg
              className="w-full max-w-lg h-36 sm:h-44 drop-shadow-md"
              viewBox="0 0 600 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Bus Gradients */}
                <linearGradient id="bus-body" x1="0%" y1="0%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f1f3f7" />
                  <stop offset="100%" stopColor="#d9e0ea" />
                </linearGradient>
                <linearGradient id="bus-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#565e74" />
                  <stop offset="50%" stopColor="#41495e" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id="highway-road" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#334155" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#1e293b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#334155" stopOpacity="0.2" />
                </linearGradient>
                <radialGradient id="bus-headlight-glow" cx="0%" cy="50%" r="100%">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#84cc16" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Highway Road Surface */}
              <rect x="30" y="180" width="540" height="24" rx="4" fill="url(#highway-road)" />
              {/* Dashed Road Center Line */}
              <line
                x1="40"
                y1="192"
                x2="560"
                y2="192"
                stroke="#e2e8f0"
                strokeWidth="2.5"
                strokeDasharray="22 14"
                opacity="0.85"
              />

              {/* Highway Perspective Beacon Signals */}
              <line x1="80" y1="160" x2="80" y2="180" stroke="#565e74" strokeOpacity="0.4" strokeWidth="1.5" />
              <line x1="520" y1="160" x2="520" y2="180" stroke="#565e74" strokeOpacity="0.4" strokeWidth="1.5" />
              <circle cx="80" cy="158" r="3" fill="#84cc16" opacity="0.8" />
              <circle cx="520" cy="158" r="3" fill="#84cc16" opacity="0.8" />

              {/* Speed Lines */}
              <path d="M 30,120 L 110,120" stroke="#565e74" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="14 8" />
              <path d="M 20,145 L 90,145" stroke="#565e74" strokeOpacity="0.3" strokeWidth="2.5" strokeDasharray="18 10" />

              {/* Headlight Beam Cone */}
              <polygon points="450,154 580,125 580,195 450,165" fill="url(#bus-headlight-glow)" />

              {/* Modern Multi-Axle Luxury Touring Coach Bus */}
              {/* Main Coach Body Shell */}
              <path
                d="M 120,68 C 120,64 124,60 128,60 L 415,60 C 445,60 460,78 464,115 L 464,166 C 464,170 460,174 456,174 L 126,174 C 122,174 120,170 120,166 Z"
                fill="url(#bus-body)"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Sleek Aerodynamic Roof Fairing & AC Cowling */}
              <path d="M 190,54 L 370,54 C 375,54 378,57 377,60 L 183,60 C 182,57 185,54 190,54 Z" fill="#94a3b8" />
              <rect x="220" y="56" width="120" height="3" fill="#475569" />

              {/* Lower Body Contrast Chassis Stripe */}
              <path
                d="M 120,148 L 462,148 L 460,166 C 460,170 456,174 452,174 L 126,174 C 122,174 120,170 120,166 Z"
                fill="url(#bus-accent)"
              />
              {/* Lime Accent Pin-Stripe */}
              <rect x="120" y="146" width="342" height="3" fill="#84cc16" />

              {/* Front Panoramic Dual-Deck Touring Windshield */}
              <path
                d="M 405,65 L 442,65 C 452,70 456,82 458,110 L 405,110 Z"
                fill="#191c1e"
              />
              {/* Windshield Reflection */}
              <path d="M 425,68 L 444,70 C 448,78 450,92 452,106 L 438,106 Z" fill="#4648d4" opacity="0.35" />

              {/* Upper Deck Passenger Panoramic Windows */}
              <g fill="#191c1e" opacity="0.9">
                <rect x="135" y="72" width="36" height="26" rx="3" />
                <rect x="176" y="72" width="36" height="26" rx="3" />
                <rect x="217" y="72" width="36" height="26" rx="3" />
                <rect x="258" y="72" width="36" height="26" rx="3" />
                <rect x="299" y="72" width="36" height="26" rx="3" />
                <rect x="340" y="72" width="36" height="26" rx="3" />
                <rect x="381" y="72" width="18" height="26" rx="3" />
              </g>

              {/* Lower Deck Passenger Windows */}
              <g fill="#191c1e" opacity="0.85">
                <rect x="135" y="106" width="36" height="28" rx="3" />
                <rect x="176" y="106" width="36" height="28" rx="3" />
                <rect x="217" y="106" width="36" height="28" rx="3" />
                <rect x="258" y="106" width="36" height="28" rx="3" />
                <rect x="299" y="106" width="36" height="28" rx="3" />
                <rect x="340" y="106" width="36" height="28" rx="3" />
              </g>

              {/* Front Aerodynamic Mirror */}
              <path d="M 430,68 C 438,62 445,60 452,60 L 454,72 C 448,72 440,71 435,70 Z" fill="#334155" />

              {/* Wheel Well Arches & Heavy-Duty Wheels */}
              {/* Front Wheel */}
              <circle cx="395" cy="174" r="19" fill="#0f172a" />
              <circle cx="395" cy="174" r="14" fill="#334155" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="395" cy="174" r="6" fill="#84cc16" />

              {/* Rear Dual-Axle Wheels (Multi-Axle Coach) */}
              <circle cx="165" cy="174" r="19" fill="#0f172a" />
              <circle cx="165" cy="174" r="14" fill="#334155" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="165" cy="174" r="6" fill="#64748b" />

              <circle cx="210" cy="174" r="19" fill="#0f172a" />
              <circle cx="210" cy="174" r="14" fill="#334155" stroke="#94a3b8" strokeWidth="2.5" />
              <circle cx="210" cy="174" r="6" fill="#64748b" />

              {/* Dual LED Projector Headlights */}
              <rect x="458" y="148" width="6" height="12" rx="2" fill="#ffffff" />
              <rect x="459" y="150" width="4" height="4" rx="1" fill="#84cc16" />

              {/* Rear Tail Light */}
              <rect x="120" y="148" width="3" height="14" rx="1" fill="#ef4444" />

              {/* Route Destination Digital Matrix Display */}
              <rect x="408" y="116" width="42" height="12" rx="2" fill="#0f172a" stroke="#84cc16" strokeWidth="0.8" />
              <text x="412" y="125" fill="#84cc16" fontSize="6.5" fontWeight="700" fontFamily="monospace">
                EXPRESS
              </text>

              {/* Telemetry Badge */}
              <g transform="translate(445, 36)">
                <rect x="0" y="0" width="126" height="42" rx="10" fill="#191c1e" opacity="0.9" />
                <rect x="0" y="0" width="126" height="42" rx="10" stroke="#565e74" strokeWidth="1" strokeOpacity="0.6" />
                <circle cx="16" cy="16" r="3.5" fill="#84cc16" />
                <circle cx="16" cy="16" r="7" stroke="#84cc16" strokeWidth="1" opacity="0.5" />
                <text x="27" y="19" fill="#ffffff" fontSize="9" fontWeight="700" fontFamily="sans-serif">
                  HIGHWAY ROUTE
                </text>
                <text x="12" y="33" fill="#84cc16" fontSize="8" fontWeight="600" fontFamily="monospace">
                  VOLVO 9600 • GPS ACTIVE
                </text>
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Mode Sub-Feature Ticker */}
      <div className="relative z-10 mt-3 pt-3 border-t border-surface-container-high/50 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant font-label-sm">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[16px] text-primary">
            {mode === 'flights' ? 'flight_takeoff' : mode === 'trains' ? 'train' : 'directions_bus'}
          </span>
          <span>
            {mode === 'flights' && 'Covers DGCA, EC 261/2004, UK 261 & US DOT airline compensation policies'}
            {mode === 'trains' && 'Direct IRCTC TDR filing & sectional controller delay verification'}
            {mode === 'buses' && 'Intercity bus cancellations, breakdown delays & seat rebooking settlements'}
          </span>
        </div>

        <span className="font-code-sm text-[11px] text-tertiary">
          {mode === 'flights' && 'Carrier Engine: Active (Amadeus / Sabre GDS)'}
          {mode === 'trains' && 'Carrier Engine: Active (IRCTC / CRIS Gateway)'}
          {mode === 'buses' && 'Carrier Engine: Active (RedBus / AbhiBus / State RTC)'}
        </span>
      </div>
    </div>
  );
};
