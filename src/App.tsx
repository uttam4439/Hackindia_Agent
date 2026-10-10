import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InvestigationProvider } from './context/InvestigationContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { BookingsPage } from './pages/BookingsPage';
import { RefundInvestigationsPage } from './pages/RefundInvestigationsPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { HumanReviewPage } from './pages/HumanReviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <InvestigationProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Landing Page (Public standalone view) */}
          <Route path="/" element={<LandingPage />} />

          {/* AppShell Layout for Dashboard & Operations */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/overview" element={<DashboardPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/refund-investigations" element={<RefundInvestigationsPage />} />
            <Route path="/refund-investigations/:id" element={<CaseDetailPage />} />
            <Route path="/reviews" element={<HumanReviewPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </InvestigationProvider>
  );
};
export default App;
