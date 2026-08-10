import { getSupabaseClient } from '@/lib/supabase'
import type { DealStage } from '@/types/database'
import {
  createDeal,
  deleteDeal,
  listClientOptions,
  updateDeal,
  type DealWithRelations,
} from '@/features/pipeline/api'

export type { DealWithRelations }
export { createDeal, deleteDeal, listClientOptions, updateDeal }

export type DealFilters = {
  search: string
  stage: DealStage | 'all'
  clientId: string | 'all'
}

export async function listDeals(filters: DealFilters): Promise<DealWithRelations[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('deals')
    .select('*, clients(id, name, client_type), contacts(id, first_name, last_name)')
    .order('updated_at', { ascending: false })

  if (filters.stage !== 'all') {
    query = query.eq('stage', filters.stage)
  }

  if (filters.clientId !== 'all') {
    query = query.eq('client_id', filters.clientId)
  }

  const search = filters.search.trim()
  if (search) {
    query = query.or(`name.ilike.%${search}%,service.ilike.%${search}%,notes.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as DealWithRelations[] | null) ?? []
}
