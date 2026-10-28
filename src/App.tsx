import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { InvestigationProvider } from './context/InvestigationContext';
import { TravelBookingProvider } from './context/TravelBookingContext';
import { BookingSummaryModal } from './components/travel/BookingSummaryModal';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Traveller Pages (Mockup Pages 1-10, 13-21)
import { LandingPage } from './pages/LandingPage';
import { FlightsPage } from './pages/FlightsPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { OffersPage } from './pages/OffersPage';
import { BookingsPage } from './pages/BookingsPage';
import { RefundCenterPage } from './pages/RefundCenterPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { HotelsPage } from './pages/HotelsPage';
import { TrainsPage } from './pages/TrainsPage';
import { BusesPage } from './pages/BusesPage';
import { CabsPage } from './pages/CabsPage';
import { HolidaysPage } from './pages/HolidaysPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { TicketPage } from './pages/TicketPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Internal Reviewer Console Pages (Mockup Pages 11 & 12)
import { HumanReviewPage } from './pages/HumanReviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RefundInvestigationsPage } from './pages/RefundInvestigationsPage';
import { DashboardPage } from './pages/DashboardPage';

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <InvestigationProvider>
        <TravelBookingProvider>
          <BrowserRouter>
            <ScrollToTop />
            <BookingSummaryModal />
            <Routes>
              {/* Traveller Public Flow (PDF Mockups: Pages 1-10, 13-21) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/destinations" element={<DestinationsPage />} />
              <Route path="/offers" element={<OffersPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/ticket/:id" element={<TicketPage />} />
              <Route path="/tickets/:id" element={<TicketPage />} />
              <Route path="/refunds" element={<RefundCenterPage />} />
              <Route path="/refunds/:id" element={<CaseDetailPage />} />
              <Route path="/hotels" element={<HotelsPage />} />
              <Route path="/trains" element={<TrainsPage />} />
              <Route path="/buses" element={<BusesPage />} />
              <Route path="/cabs" element={<CabsPage />} />
              <Route path="/holidays" element={<HolidaysPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />

              {/* Internal Reviewer Console (PDF Mockups: Pages 11 & 12 - Protected: Reviewer role required) */}
              <Route
                path="/reviewer"
                element={
                  <ProtectedRoute requireReviewer>
                    <HumanReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer/queue"
                element={
                  <ProtectedRoute requireReviewer>
                    <HumanReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer/cases"
                element={
                  <ProtectedRoute requireReviewer>
                    <RefundInvestigationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer/analytics"
                element={
                  <ProtectedRoute requireReviewer>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer/audit"
                element={
                  <ProtectedRoute requireReviewer>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer/settings"
                element={
                  <ProtectedRoute requireReviewer>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Backwards-compatible routes for internal operations (Protected: Reviewer role required) */}
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute requireReviewer>
                    <HumanReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute requireReviewer>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/refund-investigations"
                element={
                  <ProtectedRoute requireReviewer>
                    <RefundInvestigationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/refund-investigations/:id"
                element={
                  <ProtectedRoute requireReviewer>
                    <CaseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requireReviewer>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/overview"
                element={
                  <ProtectedRoute requireReviewer>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </TravelBookingProvider>
      </InvestigationProvider>
    </LanguageProvider>
  );
};

export default App;
