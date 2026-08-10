import { getSupabaseClient } from '@/lib/supabase'
import type {
  Client,
  Contact,
  Customer,
  Deal,
  DocumentRecord,
  Lead,
  Project,
} from '@/types/database'
import {
  buildStoragePath,
  toNullableUuid,
  type DocumentMetaValues,
} from '@/features/documents/schemas'

export const DOCUMENTS_BUCKET = 'crm-documents'

export type DocumentWithRelations = DocumentRecord & {
  clients: Pick<Client, 'id' | 'name'> | null
  contacts: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
  leads: Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'> | null
  deals: Pick<Deal, 'id' | 'name'> | null
  customers: Pick<Customer, 'id' | 'status'> | null
  projects: Pick<Project, 'id' | 'name'> | null
}

export type DocumentFilters = {
  search: string
}

export async function listClientOptions(): Promise<Pick<Client, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listContactsForClient(
  clientId: string,
): Promise<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('client_id', clientId)
    .order('last_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listLeadsForClient(
  clientId: string,
): Promise<Pick<Lead, 'id' | 'source' | 'service_interested' | 'status'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, source, service_interested, status')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listDealsForClient(
  clientId: string,
): Promise<Pick<Deal, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('deals')
    .select('id, name')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listCustomersForClient(
  clientId: string,
): Promise<Pick<Customer, 'id' | 'status'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('customers')
    .select('id, status')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listProjectsForClient(
  clientId: string,
): Promise<Pick<Project, 'id' | 'name'>[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listDocuments(
  filters: DocumentFilters,
): Promise<DocumentWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('documents')
    .select(
      '*, clients(id, name), contacts(id, first_name, last_name), leads(id, source, service_interested, status), deals(id, name), customers(id, status), projects(id, name)',
    )
    .order('updated_at', { ascending: false })

  const search = filters.search.trim()
  if (search) {
    query = query.or(`name.ilike.%${search}%,mime_type.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as DocumentWithRelations[] | null) ?? []
}

function metaPayload(values: DocumentMetaValues) {
  return {
    name: values.name.trim(),
    client_id: toNullableUuid(values.client_id),
    contact_id: toNullableUuid(values.contact_id),
    lead_id: toNullableUuid(values.lead_id),
    deal_id: toNullableUuid(values.deal_id),
    customer_id: toNullableUuid(values.customer_id),
    project_id: toNullableUuid(values.project_id),
  }
}

export async function uploadDocument(
  values: DocumentMetaValues,
  file: File,
  userId: string | undefined,
): Promise<DocumentRecord> {
  const supabase = getSupabaseClient()
  const storagePath = buildStoragePath(userId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) throw new Error(uploadError.message)

  const meta = metaPayload(values)
  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...meta,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: userId ?? null,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
    throw new Error(error.message)
  }

  return data
}

export async function updateDocumentMeta(
  id: string,
  values: DocumentMetaValues,
): Promise<DocumentRecord> {
  const supabase = getSupabaseClient()
  const meta = metaPayload(values)
  const { data, error } = await supabase
    .from('documents')
    .update(meta)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function deleteDocument(doc: DocumentRecord): Promise<void> {
  const supabase = getSupabaseClient()
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.storage_path])

  if (storageError) throw new Error(storageError.message)

  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw new Error(error.message)
}
