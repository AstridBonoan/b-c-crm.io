import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { LeadsPage } from '@/features/leads/LeadsPage'
import { PipelinePage } from '@/features/pipeline/PipelinePage'
import { DealsPage } from '@/features/deals/DealsPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { AppLayout } from '@/layouts/AppLayout'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholderPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="companies" element={<Navigate to="/clients" replace />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="customers" element={<CustomersPage />} />
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
    </ThemeProvider>
  )
}
