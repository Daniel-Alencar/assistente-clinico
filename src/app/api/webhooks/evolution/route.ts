import { NextResponse, type NextRequest } from "next/server";
import { extrairMensagemEvolution } from "@/lib/mensageria/evolution";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { processarResposta } from "@/lib/dominio/respostas";

// Configure na Evolution: <APP_URL>/api/webhooks/evolution?token=<EVOLUTION_API_KEY>
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!process.env.EVOLUTION_API_KEY || token !== process.env.EVOLUTION_API_KEY) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const mensagem = extrairMensagemEvolution(await req.json());
  if (mensagem) await processarResposta(criarClienteAdmin(), mensagem);
  return NextResponse.json({ ok: true });
}
