import "server-only";
import { createClient } from "@supabase/supabase-js";
import { exigirEnv } from "@/lib/env";

/**
 * Cliente com service role: ignora RLS. Use apenas em webhooks, cron e no link assinado do recibo,
 * sempre filtrando explicitamente por profissional/paciente.
 */
export function criarClienteAdmin() {
  return createClient(
    exigirEnv("NEXT_PUBLIC_SUPABASE_URL"),
    exigirEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
