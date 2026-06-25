import { supabase } from './supabase'

// Upload un fichier logo vers le bucket "logos" et retourne son URL publique
export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const fileName = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('logos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
  return data.publicUrl
}