import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

export function getSupabaseAdmin() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage is not configured");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function uploadDocumentBuffer(path: string, file: File) {
  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, buffer, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function createSignedDocumentUrl(path: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 15);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}
