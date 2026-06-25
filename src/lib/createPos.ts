import { supabase } from './supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-pos`

export async function createPos(payload: {
  pos_name: string
  admin_name: string
  admin_phone: string
  admin_password: string
}) {
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