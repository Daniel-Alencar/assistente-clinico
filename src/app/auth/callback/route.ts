import { NextResponse, type NextRequest } from "next/server";
import { concluirLinkEmail } from "@/lib/supabase/link-email";

// Destino do link de confirmação de cadastro enviado por e-mail.
export async function GET(req: NextRequest) {
  const destino = (await concluirLinkEmail(req)) ? "/agenda" : "/login?erro=link";
  return NextResponse.redirect(new URL(destino, req.url));
}
