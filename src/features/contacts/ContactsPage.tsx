import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { ContactForm } from '@/features/contacts/ContactForm'
import {
  createContact,
  deleteContact,
  listClientOptions,
  listContacts,
  updateContact,
  type ContactWithClient,
} from '@/features/contacts/api'
import type { ContactFormValues } from '@/features/contacts/schemas'
import type { Client, Contact } from '@/types/database'

export function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<ContactWithClient[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name' | 'client_type'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState<string | 'all'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ContactWithClient | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listContacts({ search, clientId })
      setContacts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [search, clientId])

  useEffect(() => {
    void loadClients().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    })
  }, [loadClients])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditing(contact)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: ContactFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateContact(editing.id, values)
      } else {
        await createContact(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save contact')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteContact(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="People associated with client organizations or individual accounts."
        actions={<Button onClick={openCreate}>Add contact</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone, title…"
          className="input-field rounded-md sm:max-w-sm"
        />
        <select
          value={clientId}
          onChange={(event) => setClientId(event.target.value as string | 'all')}
          className="input-field rounded-md sm:w-auto"
        >
          <option value="all">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading contacts…</Panel>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description={
            clients.length === 0
              ? 'Add a client first, then create contacts for that account.'
              : 'Add people linked to your clients to track conversations and deals.'
          }
          action={
            clients.length === 0 ? (
              <Link
                to="/clients"
                className="inline-flex items-center justify-center rounded-md bg-btn-primary-bg px-3.5 py-2 text-sm font-medium text-btn-primary-fg hover:bg-btn-primary-hover"
              >
                Go to Clients
              </Link>
            ) : (
              <Button onClick={openCreate}>Add contact</Button>
            )
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{contact.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{contact.job_title ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{contact.email ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{contact.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(contact)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(contact)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Modal
        open={editorOpen}
        title={editing ? 'Edit contact' : 'Add contact'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <ContactForm
          initial={editing}
          clients={clients}
          submitting={submitting}
          formError={formError}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (!submitting) {
              setEditorOpen(false)
              setEditing(null)
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete contact"
        message={`Delete “${deleting ? `${deleting.first_name} ${deleting.last_name}` : 'this contact'}”?`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
