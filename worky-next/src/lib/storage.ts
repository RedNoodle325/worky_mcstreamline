import { createClient } from '@supabase/supabase-js'

function getStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  ).storage
}

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await getStorage()
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = getStorage().from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await getStorage().from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await getStorage().from(bucket).remove([path])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
