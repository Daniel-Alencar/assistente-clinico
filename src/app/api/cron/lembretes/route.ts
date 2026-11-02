import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarLembretesPendentes } from "@/lib/dominio/lembretes";

// Chamado de hora em hora pelo Vercel Cron (ver vercel.json).
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const resultado = await enviarLembretesPendentes(criarClienteAdmin());
  return NextResponse.json(resultado);
}
