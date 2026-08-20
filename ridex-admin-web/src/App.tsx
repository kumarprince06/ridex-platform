import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Permission } from './auth/permissions';
import { SessionProvider, useSession } from './auth/session';
import { Shell } from './components/Shell';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { AuditPage } from './pages/AuditPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { CasesPage } from './pages/CasesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DriverDetailPage } from './pages/DriverDetailPage';
import { DriversPage } from './pages/DriversPage';
import { FlagsPage } from './pages/FlagsPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { PricingPage } from './pages/PricingPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { RiderDetailPage } from './pages/RiderDetailPage';
import { RidersPage } from './pages/RidersPage';
import { StaffPage } from './pages/StaffPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { TripsPage } from './pages/TripsPage';

/**
 * Routes are guarded as well as hidden. Hiding a nav item stops it being found; the guard stops it
 * being reached by typing the URL, which is the only one of the two that is a security control.
 */
function Require({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useSession();
  return can(permission) ? <>{children}</> : <ForbiddenPage permission={permission} />;
}

function Routed() {
  const { session } = useSession();

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="live" element={<Require permission="OPERATIONS"><LiveMapPage /></Require>} />

        <Route path="riders" element={<RidersPage />} />
        <Route path="riders/:riderId" element={<RiderDetailPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/:driverId" element={<DriverDetailPage />} />
        <Route path="approvals" element={<Require permission="OPERATIONS"><ApprovalsPage /></Require>} />

        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:tripId" element={<TripDetailPage />} />
        <Route path="cases" element={<Require permission="SUPPORT_CASE"><CasesPage /></Require>} />
        <Route path="cases/:caseId" element={<Require permission="SUPPORT_CASE"><CaseDetailPage /></Require>} />

        <Route path="payments" element={<Require permission="FINANCE"><PaymentsPage /></Require>} />
        <Route path="payments/:paymentId" element={<Require permission="FINANCE"><PaymentDetailPage /></Require>} />
        <Route path="payouts" element={<Require permission="FINANCE"><PayoutsPage /></Require>} />

        <Route path="pricing" element={<Require permission="OPERATIONS"><PricingPage /></Require>} />
        <Route path="promotions" element={<Require permission="OPERATIONS"><PromotionsPage /></Require>} />
        <Route path="templates" element={<Require permission="SUPER_ADMIN"><TemplatesPage /></Require>} />
        <Route path="flags" element={<Require permission="SUPER_ADMIN"><FlagsPage /></Require>} />

        <Route path="audit" element={<Require permission="OPERATIONS"><AuditPage /></Require>} />
        <Route path="staff" element={<Require permission="SUPER_ADMIN"><StaffPage /></Require>} />

        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </SessionProvider>
  );
}
