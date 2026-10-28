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
  startingPrice: string;
  basePrice?: number;
  image: string;
  description: string;
  isCatalogDemo?: boolean;
}

export const DestinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSearchCriteria } = useTravelBooking();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
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
      if (data.success && Array.isArray(data.destinations)) {
        setDestinations(data.destinations);
        if (data.disclaimer) {
          setDisclaimer(data.disclaimer);
        }
      } else {
        throw new Error(data.error || 'Invalid catalog response format');
      }
    } catch (err: any) {
      console.warn('[CATALOG] Failed to fetch live destinations:', err.message);
      setError(err.message || 'Unable to connect to travel catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleExplore = (destinationName: string) => {
    // Map common destination names to airport format if needed, or pass clean name
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

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="destinations" />

      <main className="flex-1 w-full site-container py-8 text-left">
        {/* Breadcrumb */}
        <div className="text-xs text-[#6b7775] mb-2 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span>›</span>
          <span className="text-[#0d3d3a] font-medium">Destinations</span>
        </div>

        {/* Title Header */}
        <div className="pb-6 border-b border-[#e3ded4]">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0d3d3a] tracking-tight">
            Where to next?
          </h1>
          <p className="text-sm sm:text-base text-[#5c6967] mt-1 max-w-2xl">
            Hand-picked places across India and beyond, with the best time to go and
            flights from your city.
          </p>
        </div>

        {/* Category Filter Pills (Page 4) */}
        <div className="py-4 border-b border-[#e3ded4] flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#0d6b63] text-white'
                  : 'bg-white border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FEATURED THIS SEASON BANNER (Page 4) */}
        <div className="my-8 rounded-2xl overflow-hidden border border-[#e3ded4] bg-white shadow-sm grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-7 h-64 md:h-auto overflow-hidden relative">
            <img
              src="https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80"
              alt="Kashmir featured season"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-md text-xs font-bold text-[#0d3d3a] uppercase tracking-wider shadow-sm">
              Featured this season
            </div>
          </div>

          <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-center space-y-4">
            <div>
              <span className="text-xs font-bold text-[#0d6b63] uppercase tracking-wide">
                Kashmir
              </span>
              <h2 className="text-2xl font-bold text-[#0d3d3a] tracking-tight mt-1">
                Valley of Lakes & Meadows
              </h2>
              <p className="text-xs sm:text-sm text-[#5c6967] mt-2 leading-relaxed">
                Crisp autumn air, golden chinar leaves and tranquil shikaras on Dal Lake.
                Experience peaceful snow-lined peaks and valley warmth.
              </p>
            </div>

            <div className="pt-2 border-t border-[#f0ebe1] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#889593] block">Fares starting at</span>
                <span className="text-lg font-bold text-[#0d3d3a]">₹ 4,899</span>
              </div>
              <button
                onClick={() => handleExplore('Kashmir')}
                className="bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d] transition-colors shadow-sm"
              >
                Search flights →
              </button>
            </div>
          </div>
        </div>

        {/* Demo Disclaimer Banner */}
        <div className="mb-6 py-2.5 px-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs text-[#065f46] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#059669]">info</span>
            <span className="font-medium">{disclaimer}</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-[#047857] uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded">
            Verified AWS DynamoDB Catalog
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-xs sm:text-sm text-[#991b1b] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#dc2626]">error</span>
              <span>Failed to load destinations: {error}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm animate-pulse flex flex-col">
                <div className="h-44 bg-[#e5e0d8]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#e5e0d8] rounded w-3/4" />
                  <div className="h-3 bg-[#e5e0d8] rounded w-full" />
                  <div className="h-3 bg-[#e5e0d8] rounded w-5/6" />
                  <div className="pt-2 border-t border-[#f0ebe1] flex justify-between">
                    <div className="h-3 bg-[#e5e0d8] rounded w-1/3" />
                    <div className="h-3 bg-[#e5e0d8] rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Result State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#e3ded4] p-8">
            <span className="material-symbols-outlined text-4xl text-[#889593]">explore_off</span>
            <h3 className="text-lg font-bold text-[#0d3d3a] mt-2">No destinations found</h3>
            <p className="text-xs sm:text-sm text-[#5c6967] mt-1">
              No places currently match the selected category &quot;{selectedCategory}&quot;.
            </p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="mt-4 bg-[#0d6b63] text-white px-4 py-2 rounded-md text-xs font-semibold hover:bg-[#0a534d]"
            >
              Show all destinations
            </button>
          </div>
        )}

        {/* Destinations Grid (Page 4) */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="group bg-white rounded-xl border border-[#e3ded4] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col cursor-pointer"
                onClick={() => handleExplore(d.name)}
              >
                <div className="h-44 overflow-hidden relative">
                  <img
                    src={d.image}
                    alt={d.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-0.5 rounded-md text-xs font-bold text-[#0d3d3a] shadow-sm">
                    From {d.startingPrice}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#0d3d3a] text-base group-hover:text-[#0d6b63] transition-colors">
                        {d.name}
                      </h3>
                      <span className="text-[11px] text-[#6b7775]">{d.tags}</span>
                    </div>
                    <p className="text-xs text-[#5c6967] mt-1.5 line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#f0ebe1] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#889593]">
                      Best: {d.bestTime}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExplore(d.name);
                      }}
                      className="text-[#0d6b63] font-semibold hover:underline"
                    >
                      Explore →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};
