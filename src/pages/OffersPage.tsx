import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';

type OfferCategory = 'All Offers' | 'Flights' | 'Hotels' | 'Holidays' | 'Trains & Bus' | 'Bank Offers';

interface OfferItem {
  id: string;
  category: OfferCategory;
  serviceTag: string;
  title: string;
  validTill?: string;
  code?: string;
  description: string;
}

export const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<OfferCategory>('All Offers');
  const [copyStatus, setCopyStatus] = useState<{ code: string; copied: boolean } | null>(null);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [subscribeError, setSubscribeError] = useState(false);
  const copyFeedbackTimer = useRef<number | null>(null);

  const categories: OfferCategory[] = [
    'All Offers',
    'Flights',
    'Hotels',
    'Holidays',
    'Trains & Bus',
    'Bank Offers',
  ];

  // The application does not currently expose an authoritative offers feed.
  const offers: OfferItem[] = [];

  useEffect(() => () => {
    if (copyFeedbackTimer.current !== null) {
      window.clearTimeout(copyFeedbackTimer.current);
    }
  }, []);

  const showCopyStatus = (status: { code: string; copied: boolean }) => {
    if (copyFeedbackTimer.current !== null) {
      window.clearTimeout(copyFeedbackTimer.current);
    }
    setCopyStatus(status);
    copyFeedbackTimer.current = window.setTimeout(() => setCopyStatus(null), 3000);
  };

  const handleCopy = async (code: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard access is unavailable in this browser.');
      }
      await navigator.clipboard.writeText(code);
      showCopyStatus({ code, copied: true });
    } catch {
      showCopyStatus({ code, copied: false });
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError(true);
  };

  const filtered = offers.filter(
    (o) => activeCategory === 'All Offers' || o.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-[#f7f4ed] flex flex-col font-sans text-[#192524] antialiased">
      <SiteHeader activeTab="offers" />

      {copyStatus && (
        <div
          role={copyStatus.copied ? 'status' : 'alert'}
          className={`fixed top-20 right-4 sm:right-6 z-50 max-w-[calc(100%-2rem)] p-4 rounded-xl text-white font-semibold shadow-xl flex items-center gap-2 text-sm animate-fade-in ${
            copyStatus.copied ? 'bg-[#0d6b63]' : 'bg-[#8f342d]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {copyStatus.copied ? 'content_copy' : 'error'}
          </span>
          <span>
            {copyStatus.copied
              ? `Promo code ${copyStatus.code} copied to clipboard.`
              : `Couldn't copy ${copyStatus.code}. Please try again.`}
          </span>
        </div>
      )}

      <main className="flex-1 w-full site-container py-8 sm:py-10 text-left">
        <nav aria-label="Breadcrumb" className="text-xs text-[#6b7775] mb-3 flex items-center gap-1.5">
          <Link to="/" className="hover:text-[#0d3d3a]">Home</Link>
          <span aria-hidden="true">›</span>
          <span className="text-[#0d3d3a] font-medium" aria-current="page">Offers</span>
        </nav>

        <div className="pb-7 sm:pb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#0d3d3a] tracking-tight">
            Travel deals & offers
          </h1>
          <p className="text-sm sm:text-base text-[#5c6967] mt-3 max-w-2xl leading-relaxed">
            Handpicked offers on flights, hotels, trains, buses, and holiday packages. Find eligible discounts and apply them at checkout.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter offers by category"
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              type="button"
              aria-pressed={activeCategory === cat}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d6b63] ${
                activeCategory === cat
                  ? 'bg-[#0d6b63] text-white'
                  : 'bg-[#fbf9f4] border border-[#e3ded4] text-[#42504e] hover:bg-[#eae4d8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <section
          aria-labelledby="featured-offer-heading"
          className="my-7 sm:my-8 rounded-2xl overflow-hidden bg-[#0d3d3a] text-white shadow-sm p-6 sm:p-8 lg:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-3 max-w-3xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#d0dfd3] bg-white/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">lightbulb</span>
              Travel inspiration · Promotional
            </span>
            <h2 id="featured-offer-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
              Your next memorable journey starts here
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Explore destinations and plan a trip that feels like yours. There are no verified featured discounts available right now.
            </p>
          </div>

          <button
            onClick={() => navigate('/flights')}
            type="button"
            className="shrink-0 bg-white text-[#0d3d3a] font-bold text-sm px-5 py-3 rounded-lg hover:bg-[#f7f4ed] transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Explore flights <span aria-hidden="true">→</span>
          </button>
        </section>

        <section aria-label="Available offers" className="py-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[#0d3d3a]">
              {activeCategory === 'All Offers' ? 'Available offers' : `${activeCategory} offers`}
            </h2>
            <span className="text-xs text-[#6b7775]">{filtered.length} offers</span>
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d6d0c4] bg-white/70 px-5 py-10 sm:px-8 sm:py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-[#0d6b63]" aria-hidden="true">local_offer</span>
              <h3 className="mt-3 text-base font-bold text-[#0d3d3a]">
                {activeCategory === 'All Offers' ? 'No verified offers available yet' : `No ${activeCategory.toLowerCase()} offers available yet`}
              </h3>
              <p className="mt-2 mx-auto max-w-xl text-sm leading-relaxed text-[#5c6967]">
                Offer listings are not connected to a verified offers feed yet. Promo codes, discounts, and validity dates will appear here once they can be confirmed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-[#e3ded4] p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#c5d8d2] transition-all flex flex-col justify-between min-h-56"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0d6b63] block">
                      {offer.serviceTag}
                    </span>
                    <h3 className="text-base font-bold text-[#0d3d3a]">{offer.title}</h3>
                    {offer.validTill && <p className="text-xs text-[#6b7775]">Valid until {offer.validTill}</p>}
                    <p className="text-sm text-[#5c6967] pt-1 leading-relaxed">{offer.description}</p>
                  </div>

                  {offer.code && (
                    <div className="pt-4 mt-4 border-t border-[#f0ebe1] flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold px-3 py-2 rounded-lg bg-[#f3eee5] text-[#0d3d3a] border border-[#e3ded4]">
                        {offer.code}
                      </span>

                      <button
                        onClick={() => offer.code && void handleCopy(offer.code)}
                        type="button"
                        className="border border-[#0d6b63] text-[#0d6b63] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#e8f2f0] transition-colors flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d6b63]"
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">content_copy</span>
                        {copyStatus?.code === offer.code && copyStatus.copied ? 'Copied!' : 'Copy code'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="refund-offer-heading" className="my-9 sm:my-10 bg-[#f0ebe1] rounded-2xl border border-[#e3ded4] p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <h2 id="refund-offer-heading" className="text-base font-bold text-[#0d3d3a]">
              Booked with an offer?
            </h2>
            <p className="text-sm text-[#5c6967] leading-relaxed">
              If your booking is cancelled or disrupted, Agent Travel helps you check refund eligibility, understand applicable policies, and track your claim.
            </p>
          </div>
          <Link
            to="/refunds"
            className="shrink-0 bg-[#0d6b63] text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-[#0a534d] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d6b63]"
          >
            Check Refund Eligibility <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section aria-labelledby="newsletter-heading" className="my-8 bg-white rounded-2xl border border-[#e3ded4] p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-sm space-y-3">
          <h2 id="newsletter-heading" className="text-xl font-bold text-[#0d3d3a]">
            Get the latest travel deals
          </h2>
          <p className="text-sm text-[#6b7775]">
            Subscribe for new offers and travel inspiration. No spam.
          </p>
          <p className="text-xs text-[#6b7775]">
            Newsletter sign-ups are not available yet. Your email will not be sent or stored.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email address"
              value={subscribedEmail}
              onChange={(e) => {
                setSubscribedEmail(e.target.value);
                setSubscribeError(false);
              }}
              className="min-w-0 flex-1 border border-[#e3ded4] rounded-lg px-3.5 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6b63]"
            />
            <button
              type="submit"
              className="bg-[#0d6b63] text-white text-sm font-semibold px-5 py-3 rounded-lg hover:bg-[#0a534d] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d6b63]"
            >
              Subscribe
            </button>
          </form>
          {subscribeError && (
            <p role="alert" className="text-sm text-[#8f342d]">
              We couldn&apos;t subscribe you because a newsletter service is not connected. Your email hasn&apos;t been submitted or saved.
            </p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
