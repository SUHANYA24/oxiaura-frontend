import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'
import ProtectedRoute from '@/utils/roleGuard'
import { REVIEW_ROLES, ROLES } from '@/utils/constants'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NotFound from '@/pages/NotFound'
import CustomerList from '@/pages/Customers/CustomerList'
import CustomerForm from '@/pages/Customers/CustomerForm'
import CustomerDetail from '@/pages/Customers/CustomerDetail'
import DocumentUpload from '@/pages/Documents/DocumentUpload'
import FraudReport from '@/pages/Documents/FraudReport'
import AgreementList from '@/pages/Agreements/AgreementList'
import AgreementView from '@/pages/Agreements/AgreementView'
import AgreementVerify from '@/pages/Agreements/AgreementVerify'
import ProposalWorkflow from '@/pages/Proposals/ProposalWorkflow'
import EmployeeList from '@/pages/Employees/EmployeeList'
import KPITracker from '@/pages/Employees/KPITracker'
import UserManagement from '@/pages/Admin/UserManagement'
import Reports from '@/pages/Admin/Reports'
import StyleGuide from '@/pages/StyleGuide'

/**
 * The route table from Section 4 of the spec.
 *
 * Three tiers, in order:
 *   1. public — login and the QR verification landing page, which a scanner
 *      must be able to open with no session at all.
 *   2. authenticated — everything inside AppLayout. The outer ProtectedRoute
 *      handles "signed in?"; nested guards narrow by role.
 *   3. NotFound — outside the layout, since a bad URL can arrive signed out.
 *
 * Route-level code splitting with React.lazy is a Phase 15 concern; the imports
 * stay static until then so the tree is readable while it is being built.
 */
export default function App() {
  return (
    <Routes>
      {/* ------------------------------------------------------------ public */}
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:token" element={<AgreementVerify />} />

      {/* Temporary Phase 1 route — the design system reference. */}
      <Route path="/styleguide" element={<StyleGuide />} />

      {/* --------------------------------------------------- authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="customers">
            <Route index element={<CustomerList />} />
            <Route path="new" element={<CustomerForm />} />
            <Route path=":id" element={<CustomerDetail />} />
          </Route>

          <Route path="documents">
            <Route path="upload" element={<DocumentUpload />} />
            <Route
              path=":id/fraud"
              element={
                <ProtectedRoute allowedRoles={REVIEW_ROLES}>
                  <FraudReport />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="agreements">
            <Route index element={<AgreementList />} />
            <Route path=":id" element={<AgreementView />} />
          </Route>

          {/* Open to every role — the stage actions are gated inside the page. */}
          <Route path="proposals" element={<ProposalWorkflow />} />

          <Route path="employees" element={<ProtectedRoute allowedRoles={REVIEW_ROLES} />}>
            <Route index element={<EmployeeList />} />
            <Route path=":id/kpi" element={<KPITracker />} />
          </Route>

          <Route path="admin">
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={REVIEW_ROLES}>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>
      </Route>

      {/* --------------------------------------------------------- fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
