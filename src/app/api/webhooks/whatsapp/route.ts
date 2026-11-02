import { NextResponse, type NextRequest } from "next/server";
import { assinaturaMetaValida, extrairMensagensMeta } from "@/lib/mensageria/meta-cloud";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { processarResposta } from "@/lib/dominio/respostas";

// Verificação do webhook ao cadastrá-lo no painel da Meta.
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get("hub.challenge"));
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const corpoBruto = await req.text();
  if (!assinaturaMetaValida(corpoBruto, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  const supabase = criarClienteAdmin();
  for (const mensagem of extrairMensagensMeta(JSON.parse(corpoBruto))) {
    await processarResposta(supabase, mensagem);
  }
  // A Meta reenvia se não receber 200 rapidamente.
  return NextResponse.json({ ok: true });
}
