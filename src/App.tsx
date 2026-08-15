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
import { MeetingsPage } from '@/features/meetings/MeetingsPage'
import { ProposalsPage } from '@/features/proposals/ProposalsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { FinanceDashboardPage } from '@/features/finance/FinanceDashboardPage'
import { InvoicesPage } from '@/features/finance/InvoicesPage'
import { InvoiceDetailPage } from '@/features/finance/InvoiceDetailPage'
import { PaymentsPage } from '@/features/finance/PaymentsPage'
import { FinanceSettingsPage } from '@/features/finance/FinanceSettingsPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { ActivitiesPage } from '@/features/activities/ActivitiesPage'
import { NotesPage } from '@/features/notes/NotesPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { TeamPage } from '@/features/roles/TeamPage'
import { LeadFinderPage } from '@/features/lead-finder/LeadFinderPage'
import { ProspectDetailPage } from '@/features/lead-finder/ProspectDetailPage'
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
              <Route path="lead-finder" element={<LeadFinderPage />} />
              <Route path="lead-finder/:id" element={<ProspectDetailPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="deals" element={<DealsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="proposals" element={<ProposalsPage />} />
              <Route path="customers" element={<Navigate to="/clients?status=active" replace />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="finance" element={<FinanceDashboardPage />} />
              <Route path="finance/settings" element={<FinanceSettingsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
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
