import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditorPage } from './features/editor';
import { BudgetPage } from './features/budget';
import { LoginPage, RegisterPage } from './features/auth';
import {
  EventsListPage,
  EventDetailPage,
  EventSettingsPage,
  EventCommentsPage,
  EventChecklistPage,
} from './features/events';
import { AdminVenuesPage, AdminAssetsPage, AdminPlannersPage } from './features/admin';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientViewPage } from './features/collaboration/ClientViewPage';
import { HomePage } from './features/home';
import { VenuesPage, VenueDetailPage } from './features/venues';
import { VenueSelectionPage } from './features/venues/VenueSelectionPage';
import { RequirementsFormPage, RequirementsTab } from './features/requirements';
import { InquiryFormPage } from './features/inquiries';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/AppLayout';
import { VenuesLayout } from './components/VenuesLayout';

// Embedded 3D editor for the event detail page
function EmbeddedEditor() {
  return <EditorPage embedded />;
}

function readStoredUserRole(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { role?: string };
    return u?.role ?? null;
  } catch {
    return null;
  }
}

/** /admin — must be logged in as admin */
function RequireAdmin({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (readStoredUserRole() !== 'admin') return <Navigate to="/events" replace />;
  return <>{children}</>;
}

/** /events — admins use /admin only */
function PlannerEventsGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  if (token && readStoredUserRole() === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes - no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Client shared view - no layout */}
        <Route
          path="/view/:token"
          element={
            <ErrorBoundary>
              <ClientViewPage />
            </ErrorBoundary>
          }
        />

        {/* Client requirements form - no auth */}
        <Route path="/requirements/:token" element={<RequirementsFormPage />} />

        {/* Client inquiry form (standalone) - no auth */}
        <Route path="/inquiry/:token" element={<InquiryFormPage />} />

        {/* Client venue selection (standalone) - no auth */}
        <Route path="/select-venue/:token" element={<VenueSelectionPage />} />

        {/* Public pages - no auth required */}
        <Route path="/" element={<HomePage />} />
        <Route path="/venues" element={<VenuesLayout><VenuesPage /></VenuesLayout>} />
        <Route path="/venues/:venueId" element={<VenuesLayout><VenueDetailPage /></VenuesLayout>} />

        {/* Main app - with navbar layout */}
        <Route
          path="/events"
          element={
            <PlannerEventsGuard>
              <AppLayout>
                <EventsListPage />
              </AppLayout>
            </PlannerEventsGuard>
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <PlannerEventsGuard>
              <AppLayout>
                <EventDetailPage />
              </AppLayout>
            </PlannerEventsGuard>
          }
        >
          <Route index element={<EmbeddedEditor />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="comments" element={<EventCommentsPage />} />
          <Route path="checklist" element={<EventChecklistPage />} />
          <Route path="requirements" element={<RequirementsTab />} />
          <Route path="settings" element={<EventSettingsPage />} />
        </Route>

        <Route
          path="/editor/:eventId"
          element={
            <AppLayout>
              <EditorPage />
            </AppLayout>
          }
        />

        {/* Admin routes — dashboard at /admin; legacy CRUD pages preserved */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/venues"
          element={
            <RequireAdmin>
              <AppLayout>
                <AdminVenuesPage />
              </AppLayout>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/assets"
          element={
            <RequireAdmin>
              <AppLayout>
                <AdminAssetsPage />
              </AppLayout>
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/planners"
          element={
            <RequireAdmin>
              <AppLayout>
                <AdminPlannersPage />
              </AppLayout>
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
