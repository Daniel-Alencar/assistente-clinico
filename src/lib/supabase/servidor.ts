import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exigirEnv } from "@/lib/env";

/** Cliente com a sessão do usuário logado (respeita RLS). */
export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    exigirEnv("NEXT_PUBLIC_SUPABASE_URL"),
    exigirEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            cookiesParaGravar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component: a sessão é renovada em outra requisição.
          }
        },
      },
    },
  );
}
