import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { NoteForm } from '@/features/notes/NoteForm'
import {
  createNote,
  deleteNote,
  listClientOptions,
  listNotes,
  updateNote,
  type NoteWithRelations,
} from '@/features/notes/api'
import {
  formatNoteTime,
  previewBody,
  type NoteFormValues,
} from '@/features/notes/schemas'
import type { Client, Note } from '@/types/database'

function relatedLabel(note: NoteWithRelations): string {
  const parts: string[] = []
  if (note.clients?.name) parts.push(note.clients.name)
  if (note.contacts) {
    parts.push(`${note.contacts.first_name} ${note.contacts.last_name}`)
  }
  if (note.leads) {
    parts.push(note.leads.service_interested || note.leads.source || 'Lead')
  }
  if (note.deals?.name) parts.push(note.deals.name)
  if (note.customers) parts.push('Legacy customer link')
  if (note.projects?.name) parts.push(note.projects.name)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function NotesPage() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<NoteWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listNotes({ search })
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [search])

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

  const total = useMemo(() => notes.length, [notes])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (note: Note) => {
    setEditing(note)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleSubmit = async (values: NoteFormValues) => {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateNote(editing.id, values)
      } else {
        await createNote(values, user?.id)
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteNote(deleting.id)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Internal notes attached to clients and related CRM records."
        actions={<Button onClick={openCreate}>Add note</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Notes
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{total}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Tip
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Attach notes to a client, then optionally a contact, lead, deal, or project.
          </p>
        </Panel>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes…"
          className="input-field rounded-md lg:max-w-sm"
        />
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">Loading notes…</Panel>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="Capture context the team should remember — preferences, next steps, or caveats."
          action={<Button onClick={openCreate}>Add note</Button>}
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Panel key={note.id} className="px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-ink">{previewBody(note.body, 280)}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {relatedLabel(note)} · Updated {formatNoteTime(note.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(note)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setDeleting(note)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        title={editing ? 'Edit note' : 'Add note'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <NoteForm
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
        title="Delete note"
        message="Delete this note? This cannot be undone."
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
