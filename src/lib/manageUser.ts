import { supabase } from './supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`

async function callManageUser(payload: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export const createCashier = (email: string, password: string, full_name: string) =>
  callManageUser({ action: 'create', email, password, full_name })

export const updateCashier = (userId: string, updates: { email?: string; password?: string; full_name?: string }) =>
  callManageUser({ action: 'update', userId, ...updates })

export const deleteCashier = (userId: string) =>
  callManageUser({ action: 'delete', userId })