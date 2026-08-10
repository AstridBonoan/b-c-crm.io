import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholderPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route
              path="companies"
              element={
                <ModulePlaceholderPage
                  title="Companies"
                  description="Store business and company information for B&C relationships."
                  branchName="feature/companies"
                />
              }
            />
            <Route
              path="contacts"
              element={
                <ModulePlaceholderPage
                  title="Contacts"
                  description="People belonging to companies."
                  branchName="feature/contacts"
                />
              }
            />
            <Route
              path="leads"
              element={
                <ModulePlaceholderPage
                  title="Leads"
                  description="Track potential customers before conversion."
                  branchName="feature/leads"
                />
              }
            />
            <Route
              path="pipeline"
              element={
                <ModulePlaceholderPage
                  title="Sales Pipeline"
                  description="Kanban-style opportunity stages."
                  branchName="feature/sales-pipeline"
                />
              }
            />
            <Route
              path="customers"
              element={
                <ModulePlaceholderPage
                  title="Customers"
                  description="Converted accounts with projects, deals, and history."
                  branchName="feature/customers"
                />
              }
            />
            <Route
              path="projects"
              element={
                <ModulePlaceholderPage
                  title="Projects"
                  description="Active and completed customer projects."
                  branchName="feature/projects"
                />
              }
            />
            <Route
              path="tasks"
              element={
                <ModulePlaceholderPage
                  title="Tasks"
                  description="Employee follow-ups and work items."
                  branchName="feature/tasks"
                />
              }
            />
            <Route
              path="activities"
              element={
                <ModulePlaceholderPage
                  title="Activities"
                  description="Chronological interaction history."
                  branchName="feature/activities"
                />
              }
            />
            <Route
              path="documents"
              element={
                <ModulePlaceholderPage
                  title="Documents"
                  description="Internal files stored in Supabase Storage."
                  branchName="feature/documents"
                />
              }
            />
            <Route
              path="search"
              element={
                <ModulePlaceholderPage
                  title="Search"
                  description="Global and module-specific search and filtering."
                  branchName="feature/search-filtering"
                />
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
