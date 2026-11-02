import { NextResponse, type NextRequest } from "next/server";
import { assinaturaMercadoPagoValida } from "@/lib/pagamentos/mercadopago";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { sincronizarPagamento } from "@/lib/dominio/cobrancas";

export async function POST(req: NextRequest) {
  const corpo = (await req.json()) as { type?: string; data?: { id?: string | number } };
  const dataId = req.nextUrl.searchParams.get("data.id") ?? String(corpo.data?.id ?? "");

  if (
    !dataId ||
    !assinaturaMercadoPagoValida({
      assinatura: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  if (corpo.type === "payment") {
    await sincronizarPagamento(criarClienteAdmin(), dataId);
  }
  return NextResponse.json({ ok: true });
}
