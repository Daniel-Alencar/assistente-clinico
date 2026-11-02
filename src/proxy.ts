import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase a cada requisição (padrão do @supabase/ssr).
 * Sem isso, o token expira após ~1 hora e Server Components não conseguem renová-lo.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return NextResponse.next({ request });

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida o token e, se preciso, renova e grava os cookies novos na resposta.
  await supabase.auth.getUser();
  return resposta;
}

export const config = {
  // Webhooks, cron e arquivos estáticos não precisam de sessão.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
