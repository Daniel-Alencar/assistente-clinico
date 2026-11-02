import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarLembretesPendentes } from "@/lib/dominio/lembretes";

// Chamado 1x por dia às 11:00 UTC (8h em Brasília) pelo Vercel Cron (ver vercel.json).
// Plano Hobby só permite cron diário; com Vercel Pro, volte para "0 * * * *" (de hora em hora).
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const resultado = await enviarLembretesPendentes(criarClienteAdmin());
  return NextResponse.json(resultado);
}
