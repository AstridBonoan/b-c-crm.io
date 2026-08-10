import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/useAuth'
import { useSearchQuery } from '@/hooks/useSearchQuery'
import { DocumentForm } from '@/features/documents/DocumentForm'
import {
  deleteDocument,
  getDocumentDownloadUrl,
  listClientOptions,
  listDocuments,
  updateDocumentMeta,
  uploadDocument,
  type DocumentWithRelations,
} from '@/features/documents/api'
import {
  formatBytes,
  formatDocumentTime,
  type DocumentMetaValues,
} from '@/features/documents/schemas'
import type { Client, DocumentRecord } from '@/types/database'

function relatedLabel(doc: DocumentWithRelations): string {
  if (doc.clients?.name) return doc.clients.name
  if (doc.projects?.name) return doc.projects.name
  if (doc.deals?.name) return doc.deals.name
  if (doc.contacts) return `${doc.contacts.first_name} ${doc.contacts.last_name}`
  if (doc.leads) return doc.leads.service_interested || doc.leads.source || 'Lead'
  if (doc.customers) return `Customer (${doc.customers.status})`
  return '—'
}

export function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([])
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useSearchQuery()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<DocumentWithRelations | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    const data = await listClientOptions()
    setClients(data)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listDocuments({ search })
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
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

  const totals = useMemo(() => {
    const bytes = documents.reduce((sum, doc) => sum + (doc.size_bytes ?? 0), 0)
    return { count: documents.length, bytes }
  }, [documents])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (doc: DocumentRecord) => {
    setEditing(doc)
    setFormError(null)
    setEditorOpen(true)
  }

  const handleUpload = async (values: DocumentMetaValues, file: File) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await uploadDocument(values, file, user?.id)
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: DocumentMetaValues) => {
    if (!editing) return
    setSubmitting(true)
    setFormError(null)
    try {
      await updateDocumentMeta(editing.id, values)
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (doc: DocumentWithRelations) => {
    setDownloadBusyId(doc.id)
    setError(null)
    try {
      const url = await getDocumentDownloadUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create download link')
    } finally {
      setDownloadBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteDocument(deleting)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Internal files stored privately in Supabase Storage."
        actions={<Button onClick={openCreate}>Upload document</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Files
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{totals.count}</p>
        </Panel>
        <Panel className="px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
            Storage used
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatBytes(totals.bytes)}</p>
        </Panel>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or mime type…"
          className="input-field rounded-md lg:max-w-sm"
        />
      </div>

      {error ? (
        <p className="mb-4 border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Panel className="px-4 py-10 text-center text-sm text-ink-muted">
          Loading documents…
        </Panel>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload proposals, contracts, or briefs and link them to a client or project."
          action={<Button onClick={openCreate}>Upload document</Button>}
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-[11px] tracking-[0.1em] text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold">Related</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{doc.name}</p>
                    <p className="text-xs text-ink-muted">{doc.mime_type ?? 'Unknown type'}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatBytes(doc.size_bytes)}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{relatedLabel(doc)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                    {formatDocumentTime(doc.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={downloadBusyId === doc.id}
                        onClick={() => void handleDownload(doc)}
                      >
                        {downloadBusyId === doc.id ? 'Opening…' : 'Download'}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(doc)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        onClick={() => setDeleting(doc)}
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
        title={editing ? 'Edit document' : 'Upload document'}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
            setEditing(null)
          }
        }}
      >
        <DocumentForm
          key={editing?.id ?? 'new'}
          initial={editing}
          clients={clients}
          submitting={submitting}
          formError={formError}
          onUpload={handleUpload}
          onUpdate={handleUpdate}
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
        title="Delete document"
        message={`Delete “${deleting?.name ?? 'this file'}”? The file will be removed from storage.`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
