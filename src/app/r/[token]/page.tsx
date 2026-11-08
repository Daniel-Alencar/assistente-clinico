import type { Metadata } from "next";
import { DocumentoRecibo } from "@/components/documento-recibo";
import { Logo } from "@/components/logo";
import { validarTokenRecibo } from "@/lib/dominio/link-recibo";
import { carregarRecibo } from "@/lib/dominio/recibos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoImprimir } from "../../recibos/[id]/botao-imprimir";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recibo", robots: { index: false, follow: false } };

/** Recibo aberto pelo paciente, sem login: o acesso vem do link assinado enviado pelo WhatsApp. */
export default async function ReciboDoPaciente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const segredo = process.env.RECIBO_LINK_SECRET;
  const cobrancaId = segredo ? validarTokenRecibo(token, segredo) : null;
  const recibo = cobrancaId ? await carregarRecibo(criarClienteAdmin(), cobrancaId) : null;

  if (!recibo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Logo />
        <h1 className="text-2xl font-bold tracking-tight">Link indisponível</h1>
        <p className="max-w-sm text-stone-600">Este link expirou ou não é válido. Peça um novo recibo ao seu profissional.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:py-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-stone-500">Salve este recibo em PDF: o link expira.</p>
        <BotaoImprimir />
      </div>
      <DocumentoRecibo recibo={recibo} />
    </main>
  );
}
