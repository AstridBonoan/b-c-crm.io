import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type {
  Client,
  Contact,
  Deal,
  DocumentRecord,
  Lead,
  Project,
} from '@/types/database'
import {
  listContactsForClient,
  listDealsForClient,
  listLeadsForClient,
  listProjectsForClient,
} from '@/features/documents/api'
import {
  uploadDocumentSchema,
  type DocumentMetaValues,
  type UploadDocumentFormValues,
} from '@/features/documents/schemas'
import { Button } from '@/components/ui/Button'

type DocumentFormProps = {
  initial?: DocumentRecord | null
  clients: Pick<Client, 'id' | 'name'>[]
  submitting: boolean
  formError: string | null
  onUpload: (values: DocumentMetaValues, files: File[]) => Promise<void>
  onUpdate: (values: DocumentMetaValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: UploadDocumentFormValues = {
  name: '',
  client_id: '',
  contact_id: '',
  lead_id: '',
  deal_id: '',
  project_id: '',
  fileName: '',
  fileSize: 0,
  fileCount: 0,
}

function toFormValues(doc: DocumentRecord): UploadDocumentFormValues {
  return {
    name: doc.name,
    client_id: doc.client_id ?? '',
    contact_id: doc.contact_id ?? '',
    lead_id: doc.lead_id ?? '',
    deal_id: doc.deal_id ?? '',
    project_id: doc.project_id ?? '',
    fileName: doc.name,
    fileSize: doc.size_bytes ?? 1,
    fileCount: 1,
  }
}

function leadOptionLabel(
  lead: Pick<Lead, 'source' | 'service_interested' | 'status'>,
): string {
  const focus = lead.service_interested || lead.source || 'Lead'
  return `${focus} (${lead.status})`
}

export function DocumentForm({
  initial,
  clients,
  submitting,
  formError,
  onUpload,
  onUpdate,
  onCancel,
}: DocumentFormProps) {
  const isEdit = Boolean(initial)
  const [files, setFiles] = useState<File[]>([])
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [leads, setLeads] = useState<
    Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]
  >([])
  const [deals, setDeals] = useState<Pick<Deal, 'id' | 'name'>[]>([])
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([])
  const [relationError, setRelationError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UploadDocumentFormValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
    setFiles([])
  }, [initial, reset])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setLeads([])
      setDeals([])
      setProjects([])
      setValue('contact_id', '')
      setValue('lead_id', '')
      setValue('deal_id', '')
      setValue('project_id', '')
      return
    }

    let active = true
    Promise.all([
      listContactsForClient(clientId),
      listLeadsForClient(clientId),
      listDealsForClient(clientId),
      listProjectsForClient(clientId),
    ])
      .then(([nextContacts, nextLeads, nextDeals, nextProjects]) => {
        if (!active) return
        setContacts(nextContacts)
        setLeads(nextLeads)
        setDeals(nextDeals)
        setProjects(nextProjects)
        setRelationError(null)

        const sameClient = initial?.client_id === clientId
        const keepOrClear = (
          field: 'contact_id' | 'lead_id' | 'deal_id' | 'project_id',
          preferred: string | null | undefined,
          ids: string[],
        ) => {
          if (preferred && ids.includes(preferred)) {
            setValue(field, preferred)
            return
          }
          setValue(field, '')
        }

        keepOrClear(
          'contact_id',
          sameClient ? initial?.contact_id : undefined,
          nextContacts.map((item) => item.id),
        )
        keepOrClear(
          'lead_id',
          sameClient ? initial?.lead_id : undefined,
          nextLeads.map((item) => item.id),
        )
        keepOrClear(
          'deal_id',
          sameClient ? initial?.deal_id : undefined,
          nextDeals.map((item) => item.id),
        )
        keepOrClear(
          'project_id',
          sameClient ? initial?.project_id : undefined,
          nextProjects.map((item) => item.id),
        )
      })
      .catch((err: unknown) => {
        if (!active) return
        setContacts([])
        setLeads([])
        setDeals([])
        setProjects([])
        setRelationError(err instanceof Error ? err.message : 'Failed to load related records')
      })

    return () => {
      active = false
    }
  }, [clientId, initial, setValue])

  const onValid = async (values: UploadDocumentFormValues) => {
    const meta: DocumentMetaValues = {
      name: values.name,
      client_id: values.client_id,
      contact_id: values.contact_id,
      lead_id: values.lead_id,
      deal_id: values.deal_id,
      project_id: values.project_id,
    }

    if (isEdit) {
      await onUpdate(meta)
      return
    }

    if (files.length === 0) return
    await onUpload(meta, files)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onValid)} noValidate>
      {!isEdit ? (
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-ink">
            Files
          </label>
          <input
            id="file"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
            className="input-field mt-1 rounded-md file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
            onChange={(event) => {
              const next = Array.from(event.target.files ?? [])
              setFiles(next)
              const largest = next.reduce((max, item) => Math.max(max, item.size), 0)
              setValue('fileName', next.map((item) => item.name).join(', '), { shouldValidate: true })
              setValue('fileSize', largest, { shouldValidate: true })
              setValue('fileCount', next.length, { shouldValidate: true })
              const currentName = watch('name')
              if (!currentName?.trim() && next[0]) {
                setValue('name', next[0].name, { shouldValidate: true })
              }
            }}
          />
          {errors.fileName || errors.fileSize || errors.fileCount ? (
            <p className="mt-1 text-xs text-danger">
              {errors.fileName?.message ?? errors.fileSize?.message ?? errors.fileCount?.message}
            </p>
          ) : files.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              {files.map((item) => (
                <li key={`${item.name}-${item.size}-${item.lastModified}`}>{item.name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Select multiple documents or images in one upload. Max 20 MB each. Stored privately in
              Supabase.
            </p>
          )}
        </div>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink">
          Display name
        </label>
        <input id="name" className="input-field mt-1 rounded-md" {...register('name')} />
        {errors.name ? <p className="mt-1 text-xs text-danger">{errors.name.message}</p> : null}
      </div>

      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Related client (optional)
        </label>
        <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
          <option value="">None</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact_id" className="block text-sm font-medium text-ink">
            Contact
          </label>
          <select
            id="contact_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('contact_id')}
          >
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lead_id" className="block text-sm font-medium text-ink">
            Lead
          </label>
          <select
            id="lead_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('lead_id')}
          >
            <option value="">None</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {leadOptionLabel(lead)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
            Deal
          </label>
          <select
            id="deal_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('deal_id')}
          >
            <option value="">None</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="project_id" className="block text-sm font-medium text-ink">
            Project
          </label>
          <select
            id="project_id"
            className="input-field mt-1 rounded-md"
            disabled={!clientId}
            {...register('project_id')}
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {relationError ? <p className="text-xs text-danger">{relationError}</p> : null}

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? isEdit
              ? 'Saving…'
              : files.length > 1
                ? `Uploading ${files.length} files…`
                : 'Uploading…'
            : isEdit
              ? 'Save changes'
              : files.length > 1
                ? `Upload ${files.length} files`
                : 'Upload'}
        </Button>
      </div>
    </form>
  )
}
