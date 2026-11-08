import "server-only";
import type { NextRequest } from "next/server";
import { criarClienteServidor } from "./servidor";

/**
 * Conclui um link enviado por e-mail (confirmação de cadastro ou recuperação de senha).
 * `code` é o formato dos templates padrão do Supabase e só funciona no navegador que pediu o e-mail.
 * `token_hash` é o formato dos nossos templates e funciona em qualquer navegador.
 */
export async function concluirLinkEmail(req: NextRequest): Promise<boolean> {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type");
  const supabase = await criarClienteServidor();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }
  if (tokenHash && (tipo === "email" || tipo === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    return !error;
  }
  return false;
}
