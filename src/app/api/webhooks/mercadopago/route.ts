import { MPNotFoundError } from "mercadopago";
import { NextResponse, type NextRequest } from "next/server";
import { sincronizarAssinatura, sincronizarCobrancaMensal } from "@/lib/dominio/sincronizar-assinatura";
import { assinaturaMercadoPagoValida } from "@/lib/pagamentos/mercadopago";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Notificações das assinaturas da plataforma. Cadastre no painel do Mercado Pago
// os eventos de assinatura e de pagamento recorrente apontando para <APP_URL>/api/webhooks/mercadopago.
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

  try {
    if (corpo.type === "subscription_preapproval") {
      await sincronizarAssinatura(criarClienteAdmin(), dataId);
    } else if (corpo.type === "subscription_authorized_payment") {
      await sincronizarCobrancaMensal(criarClienteAdmin(), dataId);
    }
  } catch (erro) {
    // Id inexistente (ex.: "Simular notificação" do painel): reenviar não resolve. Outros erros voltam a ser tentados.
    if (!(erro instanceof MPNotFoundError)) throw erro;
  }
  return NextResponse.json({ ok: true });
}
