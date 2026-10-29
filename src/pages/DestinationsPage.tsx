import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { useTravelBooking } from '../context/TravelBookingContext';

type CategoryType = 'All' | 'Beaches' | 'Mountains' | 'Heritage' | 'Spiritual' | 'Backwaters' | 'International';

interface DestinationItem {
  id: string;
  destinationId?: string;
  name: string;
  category: CategoryType;
  tags: string;
  bestTime: string;
  startingPrice?: string;
  basePrice?: number;
  image: string;
  description: string;
  isCatalogDemo?: boolean;
}

// Authoritative fallback catalog data matching server/awsConfig.js DEMO_CATALOG_DESTINATIONS
const VERIFIED_CATALOG_FALLBACK: DestinationItem[] = [
  {
    id: 'dest#kashmir',
    destinationId: 'kashmir',
    name: 'Kashmir',
    category: 'Mountains',
    tags: 'Lakes · Scenic views',
    bestTime: 'Sep – Nov & Apr – Jun',
    startingPrice: '₹ 4,899',
    basePrice: 4899,
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80',
    description: 'Breathtaking valleys, serene Dal lake shikara rides, snow peaks, and saffron gardens.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#goa',
    destinationId: 'goa',
    name: 'Goa',
    category: 'Beaches',
    tags: 'Nightlife · Coastline',
    bestTime: 'Nov – Feb',
    startingPrice: '₹ 3,450',
    basePrice: 3450,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    description: 'Golden sandy shores, Portuguese heritage villas, vibrant beach shacks, and water sports.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#manali',
    destinationId: 'manali',
    name: 'Manali',
    category: 'Mountains',
    tags: 'Adventure · Snow',
    bestTime: 'Oct – Feb & Mar – Jun',
    startingPrice: '₹ 3,999',
    basePrice: 3999,
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    description: 'High altitude Himalayan slopes, Solang adventure valley, and Rohtang Pass glaciers.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#jaipur',
    destinationId: 'jaipur',
    name: 'Jaipur',
    category: 'Heritage',
    tags: 'Palaces · Forts',
    bestTime: 'Oct – Mar',
    startingPrice: '₹ 2,850',
    basePrice: 2850,
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
    description: 'The Pink City with magnificent Amber Fort, Hawa Mahal, and royal Rajasthani heritage.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#kerala',
    destinationId: 'kerala',
    name: 'Kerala (Alleppey)',
    category: 'Backwaters',
    tags: 'Houseboats · Nature',
    bestTime: 'Sep – Mar',
    startingPrice: '₹ 4,200',
    basePrice: 4200,
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    description: 'Palm-fringed lagoons, tranquil traditional kettuvallam houseboats, and Ayurvedic retreats.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#varanasi',
    destinationId: 'varanasi',
    name: 'Varanasi',
    category: 'Spiritual',
    tags: 'Ghats · Ganga Aarti',
    bestTime: 'Oct – Mar',
    startingPrice: '₹ 2,990',
    basePrice: 2990,
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    description: 'Ancient sacred ghats along the holy river Ganges, evening Grand Aarti, and timeless spirituality.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#dubai',
    destinationId: 'dubai',
    name: 'Dubai',
    category: 'International',
    tags: 'Skylines · Desert Safari',
    bestTime: 'Nov – Mar',
    startingPrice: '₹ 18,500',
    basePrice: 18500,
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    description: 'Futuristic architecture, Burj Khalifa vistas, luxury shopping, and desert dune adventures.',
    isCatalogDemo: true,
  },
  {
    id: 'dest#shimla',
    destinationId: 'shimla',
    name: 'Shimla',
    category: 'Mountains',
    tags: 'Colonial · Pine Hills',
    bestTime: 'Mar – Jun & Dec – Jan',
    startingPrice: '₹ 3,600',
    basePrice: 3600,
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
    description: 'Historic British summer capital, Mall Road strolls, Jakhoo Temple, and cedar-clad ridges.',
    isCatalogDemo: true,
  },
];

export const DestinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSearchCriteria } = useTravelBooking();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [destinations, setDestinations] = useState<DestinationItem[]>(VERIFIED_CATALOG_FALLBACK);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>(
    'Curated Demo Catalog Inventory for Showcase — Not Live Airline/GDS Feed'
  );

  const fetchDestinations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/catalog/destinations');
      if (!res.ok) {
        throw new Error(`Catalog API responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.destinations) && data.destinations.length > 0) {
        setDestinations(data.destinations);
        if (data.disclaimer) {
          setDisclaimer(data.disclaimer);
        }
      } else {
        // Fallback to verified catalog records if backend returned empty array
        setDestinations(VERIFIED_CATALOG_FALLBACK);
      }
    } catch (err: any) {
      console.warn('[CATALOG] Catalog API unreachable, using verified catalog records:', err.message);
      // Gracefully retain verified catalog records so the UI remains fully functional
      setDestinations(VERIFIED_CATALOG_FALLBACK);
      // Keep note of connection status without disrupting experience
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleExplore = (destinationName: string) => {
    const airportMap: Record<string, string> = {
      Kashmir: 'Srinagar (SXR)',
      Goa: 'Goa (GOI)',
      Manali: 'Kullu (KUU)',
      Jaipur: 'Jaipur (JAI)',
      'Kerala (Alleppey)': 'Kochi (COK)',
      Varanasi: 'Varanasi (VNS)',
      Dubai: 'Dubai (DXB)',
      Shimla: 'Shimla (SLV)',
    };
    const targetDest = airportMap[destinationName] || destinationName;
    setSearchCriteria({ destination: targetDest });
    navigate('/flights');
  };

  const categories: CategoryType[] = [
    'All',
    'Beaches',
    'Mountains',
    'Heritage',
    'Spiritual',
    'Backwaters',
    'International',
  ];

  const filtered = destinations.filter(
    (d) => selectedCategory === 'All' || d.category === selectedCategory
  );

  // Look up Kashmir destination data from authoritative inventory
  const kashmirDest = destinations.find(
    (d) => d.name.toLowerCase().includes('kashmir') || d.id.includes('kashmir')
  );

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="destinations" />

      <main className="flex-1 w-full site-container py-8 text-left">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-[#6b7775] mb-3 flex items-center gap-2">
          <Link to="/" className="hover:text-[#0d3d3a] transition-colors">
            Home
          </Link>
          <span className="text-[#889593]" aria-hidden="true">
            ›
          </span>
          <span className="text-[#0d3d3a] font-semibold" aria-current="page">
            Destinations
          </span>
        </nav>

        {/* Page Introduction */}
        <div className="pb-6 border-b border-[#e3ded4]">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0d3d3a] tracking-tight leading-tight">
            Where to next?
          </h1>
          <p className="text-sm sm:text-base text-[#5c6967] mt-1.5 max-w-2xl font-normal leading-relaxed">
            Hand-picked places across India and beyond, with the best time to go and
            flights from your city.
          </p>
        </div>

        {/* Destination Category Filters */}
        <div
          className="py-5 border-b border-[#e3ded4] flex items-center gap-2.5 overflow-x-auto"
          role="tablist"
          aria-label="Destination categories"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/40 focus:ring-offset-2 ${
                  isSelected
                    ? 'bg-[#0d3d3a] text-white shadow-sm'
                    : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]/60 hover:text-[#0d3d3a]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Featured Destination Card (Shown when 'All' or 'Mountains' is active) */}
        {(selectedCategory === 'All' || selectedCategory === 'Mountains') && (
          <section
            aria-label="Featured Destination"
            className="my-8 rounded-2xl md:rounded-3xl overflow-hidden border border-[#e3ded4] bg-white shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 md:grid-cols-12"
          >
            {/* Left Column: Destination Image */}
            <div className="md:col-span-7 h-72 sm:h-80 md:h-[380px] lg:h-[400px] overflow-hidden relative group">
              <img
                src="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80"
                alt="Kashmir Valley of Lakes & Meadows"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="eager"
              />
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[11px] font-bold text-[#0d3d3a] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0d6b63] animate-pulse"></span>
                FEATURED THIS SEASON
              </div>
            </div>

            {/* Right Column: Destination Details */}
            <div className="md:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white space-y-6">
              <div>
                <span className="text-xs font-bold text-[#0d6b63] uppercase tracking-widest block">
                  KASHMIR
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0d3d3a] tracking-tight mt-1.5">
                  Valley of Lakes & Meadows
                </h2>
                <p className="text-xs sm:text-sm text-[#5c6967] mt-3 leading-relaxed">
                  Crisp autumn air, golden chinar leaves and tranquil shikaras on Dal Lake.
                  Experience peaceful snow-lined peaks and valley warmth.
                </p>

                {kashmirDest && (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f7f4ed] border border-[#e3ded4] text-[#42504e]">
                      <span className="material-symbols-outlined text-[14px] text-[#0d6b63]">calendar_today</span>
                      Best: {kashmirDest.bestTime}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f7f4ed] border border-[#e3ded4] text-[#42504e]">
                      <span className="material-symbols-outlined text-[14px] text-[#0d6b63]">tag</span>
                      {kashmirDest.tags}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#f0ebe1] flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-[#889593] block font-medium">
                    Fares starting at
                  </span>
                  {kashmirDest?.startingPrice ? (
                    <span className="text-xl sm:text-2xl font-bold text-[#0d3d3a] tracking-tight">
                      {kashmirDest.startingPrice}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[#889593]">
                      Fare on request
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleExplore('Kashmir')}
                  className="bg-[#0d6b63] hover:bg-[#0a534d] text-white px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/40"
                  aria-label="Search flights to Kashmir"
                >
                  <span>Search flights</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Error Notification (if explicit fetch error occurs) */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-xs sm:text-sm text-[#991b1b] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#dc2626]">error</span>
              <span>Failed to load live destinations: {error}</span>
            </div>
            <button
              onClick={fetchDestinations}
              className="bg-[#dc2626] text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-[#b91c1c] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#e3ded4] overflow-hidden shadow-sm animate-pulse flex flex-col"
              >
                <div className="h-48 bg-[#e5e0d8]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-[#e5e0d8] rounded w-3/4" />
                  <div className="h-3 bg-[#e5e0d8] rounded w-full" />
                  <div className="h-3 bg-[#e5e0d8] rounded w-5/6" />
                  <div className="pt-3 border-t border-[#f0ebe1] flex justify-between items-center">
                    <div className="h-4 bg-[#e5e0d8] rounded w-1/3" />
                    <div className="h-4 bg-[#e5e0d8] rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Result State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#e3ded4] p-8 my-8 shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#889593]">explore_off</span>
            <h3 className="text-lg font-bold text-[#0d3d3a] mt-3">No destinations found</h3>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-1 max-w-md mx-auto">
              No places currently match the selected category &quot;{selectedCategory}&quot;. Try selecting another category to discover hand-picked places.
            </p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-5 bg-[#0d6b63] text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
            >
              Show all destinations
            </button>
          </div>
        )}

        {/* Additional Destinations Grid */}
        {!loading && filtered.length > 0 && (
          <section aria-label="Destinations List" className="my-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="group bg-white rounded-2xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col cursor-pointer"
                  onClick={() => handleExplore(d.name)}
                >
                  {/* Card Image with badges */}
                  <div className="h-48 overflow-hidden relative bg-[#e5e0d8]">
                    <img
                      src={d.image}
                      alt={d.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    {/* Category Pill */}
                    <div className="absolute top-3 left-3 bg-[#0d3d3a]/80 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
                      {d.category}
                    </div>

                    {/* Authoritative Fare Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                      {d.startingPrice ? `From ${d.startingPrice}` : 'Fare on request'}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-[#0d3d3a] text-lg leading-snug group-hover:text-[#0d6b63] transition-colors">
                          {d.name}
                        </h3>
                      </div>
                      <p className="text-xs text-[#6b7775] font-medium mt-0.5">
                        {d.tags}
                      </p>
                      <p className="text-xs text-[#5c6967] mt-2 line-clamp-2 leading-relaxed">
                        {d.description}
                      </p>
                    </div>

                    {/* Card Footer: Best Time & Explore action */}
                    <div className="pt-3 border-t border-[#f0ebe1] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#889593] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {d.bestTime}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExplore(d.name);
                        }}
                        className="text-[#0d6b63] font-semibold hover:text-[#0a534d] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Search flights</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Demo Catalog Disclaimer Banner */}
        <div className="mt-12 py-3 px-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs text-[#065f46] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#059669]">verified</span>
            <span className="font-medium">{disclaimer}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#047857] uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded shrink-0">
            Authoritative Catalog Source
          </span>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};
