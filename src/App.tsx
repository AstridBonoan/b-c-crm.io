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
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { ActivitiesPage } from '@/features/activities/ActivitiesPage'
import { NotesPage } from '@/features/notes/NotesPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { TeamPage } from '@/features/roles/TeamPage'
import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { AppLayout } from '@/layouts/AppLayout'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="companies" element={<Navigate to="/clients" replace />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
