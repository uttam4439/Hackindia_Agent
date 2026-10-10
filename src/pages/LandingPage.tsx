import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransportIllustration, TransportMode } from '../components/common/TransportIllustration';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<TransportMode>('flights');

  const modeData = {
    flights: {
      fromIcon: 'flight_takeoff',
      toIcon: 'flight_land',
      fromCity: 'Delhi',
      fromCode: 'DEL',
      toCity: 'Mumbai',
      toCode: 'BOM',
    },
    trains: {
      fromIcon: 'train',
      toIcon: 'directions_railway',
      fromCity: 'New Delhi',
      fromCode: 'NDLS',
      toCity: 'Mumbai Central',
      toCode: 'MMCT',
    },
    buses: {
      fromIcon: 'directions_bus',
      toIcon: 'directions_bus',
      fromCity: 'Delhi ISBT',
      fromCode: 'ISBT',
      toCity: 'Mumbai Borivali',
      toCode: 'BVI',
    },
  };

  const [fromCity, setFromCity] = useState(modeData.flights.fromCity);
  const [toCity, setToCity] = useState(modeData.flights.toCity);
  const [journeyDate, setJourneyDate] = useState('28 Oct, 2025');
  const [activeSection, setActiveSection] = useState<'how-it-works' | 'features' | 'refund-engine' | 'get-started'>('get-started');

  const handleModeChange = (mode: TransportMode) => {
    setSelectedMode(mode);
    setFromCity(modeData[mode].fromCity);
    setToCity(modeData[mode].toCity);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      const sections = [
        { id: 'get-started', offset: document.getElementById('get-started')?.offsetTop || 0 },
        { id: 'how-it-works', offset: document.getElementById('how-it-works')?.offsetTop || 0 },
        { id: 'features', offset: document.getElementById('features')?.offsetTop || 0 },
        { id: 'refund-engine', offset: document.getElementById('refund-engine')?.offsetTop || 0 },
      ];

      const sortedSections = [...sections].sort((a, b) => b.offset - a.offset);
      for (const section of sortedSections) {
        if (scrollPosition >= section.offset - 60) {
          setActiveSection(section.id as any);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.replace('#', '');
      const el = document.getElementById(sectionId);
      if (el) {
        setTimeout(() => {
          const headerOffset = 80;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = Math.max(0, elementPosition + window.scrollY - headerOffset);
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
          setActiveSection(sectionId as any);
        }, 50);
      }
    }
  }, []);

  const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    if (sectionId === 'get-started') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      setActiveSection('get-started');
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = Math.max(0, elementPosition + window.scrollY - headerOffset);
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(sectionId as any);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/overview');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-space-md lg:px-margin flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-space-md">
            <div
              className="flex items-center gap-space-sm cursor-pointer"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container font-bold shadow-xs">
                <span className="material-symbols-outlined text-[22px]">smart_toy</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                Agent Travel
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-space-xs p-1 rounded-full bg-surface-container-low border border-surface-container">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className={`px-4 py-2 transition-all rounded-full text-xs cursor-pointer ${
                activeSection === 'how-it-works'
                  ? 'text-on-surface font-semibold bg-surface-container-high shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
              }`}
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className={`px-4 py-2 transition-all rounded-full text-xs cursor-pointer ${
                activeSection === 'features'
                  ? 'text-on-surface font-semibold bg-surface-container-high shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
              }`}
            >
              Features
            </a>
            <a
              href="#refund-engine"
              onClick={(e) => scrollToSection(e, 'refund-engine')}
              className={`px-4 py-2 transition-all rounded-full text-xs cursor-pointer ${
                activeSection === 'refund-engine'
                  ? 'text-on-surface font-semibold bg-surface-container-high shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
              }`}
            >
              Refund Engine
            </a>
          </nav>

          {/* Get Started CTA */}
          <div className="flex items-center gap-space-md">
            <button
              onClick={(e) => scrollToSection(e, 'get-started')}
              className={`inline-flex items-center justify-center px-5 py-2.5 rounded-full font-label-md text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                activeSection === 'get-started'
                  ? 'bg-primary-container text-on-primary-container ring-2 ring-primary/30 font-bold'
                  : 'bg-primary-container text-on-primary-container hover:brightness-105 active:scale-95'
              }`}
            >
              Get Started
            </button>
            <div
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-xs hover:scale-105 transition-transform"
              title="Open Dashboard"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pt-20 bg-surface">
        <div className="flex flex-col w-full">
          {/* Top Ambient Glow Layer */}
          <div className="relative w-full overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary-container/20 via-secondary-container/10 to-transparent blur-3xl pointer-events-none rounded-full"></div>

            {/* Section 1: Hero & Real-time Booking / Trip Query Engine */}
            <section id="get-started" className="relative max-w-7xl mx-auto px-space-md lg:px-margin pt-space-xl pb-space-2xl flex flex-col items-center text-center scroll-mt-20">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-surface-container-highest text-on-surface-variant font-label-sm text-xs font-medium mb-3">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                <span>AI-Assisted Autonomous Travel Disruption Arbitration</span>
              </div>

              {/* Hero Headline */}
              <h1 className="font-display-lg text-3xl sm:text-4xl lg:text-display-lg text-on-surface tracking-tight mt-space-sm max-w-4xl font-extrabold leading-tight">
                Your Travel Refund,{' '}
                <span className="bg-gradient-to-r from-on-surface via-primary to-secondary bg-clip-text text-transparent">
                  Simplified by AI.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-body-lg text-base sm:text-lg text-tertiary mt-space-sm max-w-2xl text-balance">
                Get refunds for cancelled or disrupted travel bookings with help from AI. We check your booking,
                cancellation details, and refund policy to recommend the right refund action.
              </p>

              {/* Central Trip Search / Claim Dispatch Console */}
              <form
                onSubmit={handleSearch}
                className="w-full max-w-4xl mt-space-xl bg-surface-container-lowest rounded-3xl md:rounded-full p-3 shadow-xl border border-surface-container-high transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-space-sm pl-4 pr-1.5 py-1">
                  {/* From Field */}
                  <div className="flex items-center gap-3 w-full md:w-3/12 text-left">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">
                        {modeData[selectedMode].fromIcon}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[11px] text-tertiary uppercase tracking-wider">From</span>
                      <div className="flex items-center gap-1.5 font-headline-sm text-sm sm:text-headline-sm text-on-surface truncate">
                        <input
                          type="text"
                          value={fromCity}
                          onChange={(e) => setFromCity(e.target.value)}
                          className="font-semibold bg-transparent focus:outline-none w-28 text-on-surface"
                        />
                        <span className="text-tertiary text-xs font-mono font-normal">
                          [{modeData[selectedMode].fromCode}]
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-8 bg-surface-container-highest"></div>

                  {/* To Field */}
                  <div className="flex items-center gap-3 w-full md:w-3/12 text-left pl-0 md:pl-2">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">
                        {modeData[selectedMode].toIcon}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[11px] text-tertiary uppercase tracking-wider">To</span>
                      <div className="flex items-center gap-1.5 font-headline-sm text-sm sm:text-headline-sm text-on-surface truncate">
                        <input
                          type="text"
                          value={toCity}
                          onChange={(e) => setToCity(e.target.value)}
                          className="font-semibold bg-transparent focus:outline-none w-28 text-on-surface"
                        />
                        <span className="text-tertiary text-xs font-mono font-normal">
                          [{modeData[selectedMode].toCode}]
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-8 bg-surface-container-highest"></div>

                  {/* Journey Date */}
                  <div className="flex items-center gap-3 w-full md:w-3/12 text-left pl-0 md:pl-2">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-secondary">
                      <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[11px] text-tertiary uppercase tracking-wider">Journey Date</span>
                      <input
                        type="text"
                        value={journeyDate}
                        onChange={(e) => setJourneyDate(e.target.value)}
                        className="font-headline-sm text-sm sm:text-headline-sm text-on-surface font-semibold bg-transparent focus:outline-none truncate"
                      />
                    </div>
                  </div>

                  {/* Search Trips Button */}
                  <button
                    type="submit"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-sm sm:text-headline-sm font-bold shadow-md hover:brightness-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Search Trips</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </div>
              </form>

              {/* Mode Selector Pills (Flights, Trains, Buses) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md w-full max-w-4xl mt-space-lg">
                <div
                  onClick={() => handleModeChange('flights')}
                  className={`p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md text-left flex items-center gap-space-md cursor-pointer transition-all border ${
                    selectedMode === 'flights' ? 'border-primary-container ring-2 ring-primary-container/20' : 'border-surface-container'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Flights</span>
                    <p className="font-body-sm text-xs text-tertiary mt-0.5">Cancelled or delayed flights</p>
                  </div>
                </div>

                <div
                  onClick={() => handleModeChange('trains')}
                  className={`p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md text-left flex items-center gap-space-md cursor-pointer transition-all border ${
                    selectedMode === 'trains' ? 'border-secondary-container ring-2 ring-secondary-container/20' : 'border-surface-container'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[24px]">train</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Trains</span>
                    <p className="font-body-sm text-xs text-tertiary mt-0.5">Automated refund processing</p>
                  </div>
                </div>

                <div
                  onClick={() => handleModeChange('buses')}
                  className={`p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md text-left flex items-center gap-space-md cursor-pointer transition-all border ${
                    selectedMode === 'buses' ? 'border-on-surface-variant ring-2 ring-on-surface-variant/20' : 'border-surface-container'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                    <span className="material-symbols-outlined text-[24px]">directions_bus</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Buses</span>
                    <p className="font-body-sm text-xs text-tertiary mt-0.5">Quick route & ticket refunds</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Transport Illustration */}
              <div className="w-full max-w-4xl mt-space-lg transition-all duration-300">
                <TransportIllustration mode={selectedMode} />
              </div>

              {/* Live Carrier Auditing Strip */}
              <div className="mt-space-xl flex flex-wrap items-center justify-center gap-x-space-lg gap-y-2 text-tertiary font-label-md text-sm">
                <span className="flex items-center gap-1.5 text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                  Trusted coverage across 450+ airlines, rail networks, and bus operators worldwide
                </span>
              </div>
            </section>
          </div>

          {/* Section 2: How Agent Travel Works (Simple 3-Step Section) */}
          <section id="how-it-works" className="w-full bg-surface-container-low py-space-2xl scroll-mt-20">
            <div className="max-w-7xl mx-auto px-space-md lg:px-margin flex flex-col gap-space-xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm text-left">
                <div className="flex flex-col gap-1 max-w-xl">
                  <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold">
                    Effortless Resolution
                  </span>
                  <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-display-lg text-on-surface tracking-tight font-bold">
                    How Agent Travel Works
                  </h2>
                  <p className="font-body-lg text-sm sm:text-base text-tertiary">
                    Turning painful carrier dispute forms into a seamless, autonomous financial turnaround.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg text-left">
                <div className="p-space-xl rounded-3xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md border border-surface-container">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[32px]">travel_explore</span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-sm text-[11px] text-tertiary uppercase font-bold tracking-wider">
                      Step 01
                    </span>
                    <h3 className="font-headline-md text-headline-sm font-bold text-on-surface">Book your trip</h3>
                    <p className="font-body-md text-xs sm:text-sm text-tertiary">
                      Search and book flights, trains, or buses directly, or simply paste an existing booking reference (PNR / e-ticket).
                    </p>
                  </div>
                </div>

                <div className="p-space-xl rounded-3xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md border border-surface-container">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[32px]">report_problem</span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-sm text-[11px] text-tertiary uppercase font-bold tracking-wider">
                      Step 02
                    </span>
                    <h3 className="font-headline-md text-headline-sm font-bold text-on-surface">Request a refund</h3>
                    <p className="font-body-md text-xs sm:text-sm text-tertiary">
                      With one click, flag any cancellation, delay, schedule alteration, or disrupted itinerary for instant auditing.
                    </p>
                  </div>
                </div>

                <div className="p-space-xl rounded-3xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md border border-surface-container">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[32px]">auto_fix_high</span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <span className="font-label-sm text-[11px] text-tertiary uppercase font-bold tracking-wider">
                      Step 03
                    </span>
                    <h3 className="font-headline-md text-headline-sm font-bold text-on-surface">AI investigates & recommends</h3>
                    <p className="font-body-md text-xs sm:text-sm text-tertiary">
                      Our neural engine audits operator tariffs, compiles claim evidence, and executes your full refund payout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: The AI Refund Flow Architecture (4-stage Pipeline) */}
          <section id="features" className="max-w-7xl mx-auto px-space-md lg:px-margin py-space-2xl w-full scroll-mt-20">
            <div className="text-center max-w-3xl mx-auto mb-space-2xl flex flex-col gap-space-xs">
              <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold">
                Autonomous Protocol
              </span>
              <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-display-lg text-on-surface tracking-tight font-bold">
                The AI Refund Flow Architecture
              </h2>
              <p className="font-body-lg text-sm sm:text-base text-tertiary">
                An end-to-end automated pipeline connecting passenger itineraries directly to statutory compensation payouts.
              </p>
            </div>

            {/* 4 Step Pipeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md relative text-left">
              {/* Step 1 */}
              <div className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all flex flex-col justify-between border border-surface-container">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm font-bold text-on-surface">
                      01
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Booking Sync</h3>
                  <p className="font-body-md text-xs sm:text-sm text-tertiary mt-space-xs">
                    Trip search query, e-ticket forward, or instant booking reference lookup.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md flex items-center gap-2 text-primary font-label-md text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  <span>Zero-friction sync</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all flex flex-col justify-between border border-surface-container">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      02
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">AI Investigation</h3>
                  <p className="font-body-md text-xs sm:text-sm text-tertiary mt-space-xs">
                    Deep scan of operator schedule logs, flight radar, and passenger rights regulations.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md flex items-center gap-2 text-primary font-label-md text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                  <span>Automated Policy Check</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all flex flex-col justify-between border border-surface-container">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      03
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Dossier Generation</h3>
                  <p className="font-body-md text-xs sm:text-sm text-tertiary mt-space-xs">
                    Assembly of tickets, delay metrics, and undisputed claim documents.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md flex items-center gap-2 text-secondary font-label-md text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">folder_special</span>
                  <span>Verified Dossier</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all flex flex-col justify-between border border-surface-container">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                      04
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">Refund Decision</h3>
                  <p className="font-body-md text-xs sm:text-sm text-tertiary mt-space-xs">
                    Precise settlement calculation and direct transmission to operator portals.
                  </p>
                </div>
                <div className="mt-space-lg pt-space-md flex items-center gap-2 text-primary font-label-md text-xs font-semibold">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>Fast Restitution</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Visual Preview of AI Refund Investigation (Obsidian Deep Card) */}
          <section id="refund-engine" className="w-full bg-surface-container-low py-space-2xl scroll-mt-20">
            <div className="max-w-7xl mx-auto px-space-md lg:px-margin flex flex-col gap-space-lg">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
                <div className="flex flex-col gap-1 max-w-2xl text-left">
                  <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold">
                    Real-time Audit Engine
                  </span>
                  <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-display-lg text-on-surface tracking-tight font-bold">
                    AI Refund Investigation System
                  </h2>
                  <p className="font-body-md text-sm sm:text-body-md text-tertiary">
                    Automated verification and policy checking parsing active disruption claims.
                  </p>
                </div>
              </div>

              {/* Main High-Contrast Obsidian Glass Panel */}
              <div className="w-full rounded-3xl bg-inverse-surface text-inverse-on-surface p-space-lg lg:p-space-xl shadow-2xl relative overflow-hidden border border-white/10">
                {/* Ambient Iridescent Spheres behind console */}
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none"></div>

                <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
                  {/* Left Console Panel */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-space-md text-left">
                    {/* Flight Pill Header */}
                    <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-md rounded-2xl bg-surface-container-highest/10 backdrop-blur-md border border-white/5">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary-fixed flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                          AI
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                              Flight AI-805
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 font-label-sm text-[11px] font-bold tracking-wider">
                              CANCELLED
                            </span>
                          </div>
                          <span className="font-body-sm text-xs text-tertiary-fixed-dim">
                            Delhi (DEL) → Mumbai (BOM)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-label-sm text-[11px] text-tertiary-fixed-dim">Disruption Notice</span>
                        <span className="font-body-sm text-xs text-white font-medium">Under 24h Threshold</span>
                      </div>
                    </div>

                    {/* Disruption & Regulation Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                      <div className="p-space-md rounded-2xl bg-white/[0.04] backdrop-blur-sm flex flex-col gap-2 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-[11px] text-tertiary-fixed-dim uppercase tracking-wider font-semibold">
                            Disruption Audit
                          </span>
                          <span className="material-symbols-outlined text-primary-fixed text-[18px]">verified</span>
                        </div>
                        <span className="font-headline-sm text-base font-bold text-white">Clear Conditions</span>
                        <p className="font-body-sm text-xs text-tertiary-fixed-dim">
                          Weather defense verified clear; carrier operational liability established.
                        </p>
                      </div>

                      <div className="p-space-md rounded-2xl bg-white/[0.04] backdrop-blur-sm flex flex-col gap-2 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-[11px] text-tertiary-fixed-dim uppercase tracking-wider font-semibold">
                            Regulation Rule
                          </span>
                          <span className="material-symbols-outlined text-primary-fixed text-[18px]">gavel</span>
                        </div>
                        <span className="font-headline-sm text-base font-bold text-white">DGCA CAR Sec 3</span>
                        <p className="font-body-sm text-xs text-tertiary-fixed-dim">
                          Mandates 100% full ticket refund without cancellation penalty.
                        </p>
                      </div>
                    </div>

                    {/* Verified Status Bar */}
                    <div className="p-space-md rounded-2xl bg-white/[0.04] flex items-center justify-between text-tertiary-fixed-dim border border-white/5">
                      <div className="flex items-center gap-2 text-primary-fixed font-medium text-xs sm:text-sm">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Passenger ticket and payment receipts verified</span>
                      </div>
                      <span className="font-label-sm text-xs text-tertiary-fixed-dim font-mono">Dossier Ready</span>
                    </div>
                  </div>

                  {/* Right Verdict Panel */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-space-lg rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl gap-space-md border border-white/10 text-left">
                    <div className="flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-xs uppercase tracking-widest text-primary-fixed font-bold">
                          Investigation Verdict
                        </span>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/20 text-primary-fixed font-code-sm text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                          <span>99.4% Confidence</span>
                        </div>
                      </div>

                      <div className="flex flex-col mt-space-sm">
                        <span className="font-body-sm text-xs text-tertiary-fixed-dim">Verified Restitution Payable:</span>
                        <div className="font-display-lg text-3xl sm:text-display-lg font-bold text-white tracking-tight flex items-baseline gap-2">
                          <span>₹9,450</span>
                          <span className="font-headline-sm text-sm text-tertiary-fixed font-normal">($120 USD)</span>
                        </div>
                        <span className="font-label-sm text-xs text-primary-fixed font-medium mt-1">
                          Includes full unused ticket refund & statutory tax relief
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 mt-space-md pt-space-xs">
                        <div className="flex items-center gap-2.5 text-inverse-on-surface font-body-sm text-xs sm:text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary-container/20 text-primary-fixed flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                          <span>Flight cancellation confirmed</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-inverse-on-surface font-body-sm text-xs sm:text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary-container/20 text-primary-fixed flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                          <span>Eligible for full fare refund</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-inverse-on-surface font-body-sm text-xs sm:text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary-container/20 text-primary-fixed flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </span>
                          <span>Ready for direct bank transfer</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/refund-investigations/AT-9842')}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white text-on-surface font-headline-sm text-sm font-semibold hover:bg-surface-container-high transition-all shadow-md cursor-pointer mt-4"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                      <span>Inspect Refund Details</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: High-Impact Call To Action Banner */}
          <section className="max-w-7xl mx-auto px-space-md lg:px-margin py-space-2xl w-full">
            <div className="w-full rounded-3xl bg-inverse-surface text-inverse-on-surface p-space-xl md:p-space-2xl relative overflow-hidden flex flex-col items-center text-center shadow-xl border border-white/10">
              {/* Ambient Lighting */}
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary-container/20 to-transparent blur-3xl pointer-events-none rounded-full"></div>

              <div className="relative z-10 flex flex-col items-center max-w-3xl gap-space-md">
                <span className="px-4 py-1.5 rounded-full bg-white/10 text-primary-fixed font-label-sm text-xs font-bold uppercase tracking-wider">
                  Instant Zero-Risk Investigation
                </span>
                <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-display-lg text-white tracking-tight font-bold">
                  Have a travel refund issue? <br className="hidden sm:block" />
                  <span className="text-primary-fixed">Let our AI investigate it.</span>
                </h2>
                <p className="font-body-lg text-sm sm:text-base text-tertiary-fixed-dim max-w-xl">
                  No hidden fees. Zero paperwork. Get an instant, mathematically verified refund verdict in under 60 seconds.
                </p>

                {/* CTA Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-space-md mt-space-sm w-full sm:w-auto">
                  <button
                    onClick={() => navigate('/refund-investigations/AT-9842')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary-container text-on-primary-container font-headline-sm text-sm sm:text-headline-sm font-bold shadow-lg hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                    <span>Start Free AI Refund Check</span>
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/10 text-white font-headline-sm text-sm sm:text-headline-sm font-semibold hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    <span>Explore Refund Engine</span>
                  </button>
                </div>

                {/* Metric micro-strip */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-space-lg text-tertiary-fixed-dim font-label-sm text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">check_circle</span>
                    99.2% Claim Resolution Rate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">check_circle</span>
                    Direct Regulatory Enforcement
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px]">check_circle</span>
                    No Recovery, No Fee
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high mt-auto">
        <div className="max-w-7xl mx-auto px-space-md lg:px-margin py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg text-left">
          <div className="flex flex-col gap-space-xs">
            <div
              className="flex items-center gap-space-sm cursor-pointer"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/');
              }}
            >
              <div className="w-6 h-6 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs">
                AT
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Agent Travel</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-md mt-1">
              Autonomous flight disruption resolution and regulatory financial restitution engine. Real-time aviation telemetry parsed through automated claim compliance algorithms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-md lg:gap-space-lg text-xs">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Features
            </a>
            <a
              href="#refund-engine"
              onClick={(e) => scrollToSection(e, 'refund-engine')}
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Refund Engine
            </a>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Refund Console
            </button>
            <span className="text-outline cursor-default">Regulatory Frameworks</span>
            <span className="text-outline cursor-default">Privacy Policy</span>
          </div>
        </div>

        <div className="border-t border-surface-container-low">
          <div className="max-w-7xl mx-auto px-space-md lg:px-margin py-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-[11px] text-tertiary">
            <span>© 2026 Agent Travel Technologies Inc. All rights reserved.</span>
            <span>Disclaimers: Flight claim compensation is subject to jurisdiction protocols including EC 261/2004, UK 261, and DGCA CAR provisions.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
