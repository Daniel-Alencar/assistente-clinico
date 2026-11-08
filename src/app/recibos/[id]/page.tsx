import { notFound } from "next/navigation";
import { DocumentoRecibo } from "@/components/documento-recibo";
import { carregarRecibo } from "@/lib/dominio/recibos";
import { usuarioAtual } from "@/lib/servidor";
import { BotaoImprimir } from "./botao-imprimir";

/** Recibo para imprimir ou salvar em PDF (Ctrl+P). Página fora do menu para sair limpa na impressão. */
export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await usuarioAtual();

  const recibo = await carregarRecibo(supabase, id);
  if (!recibo) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 print:py-0">
      <div className="mb-6 flex justify-end print:hidden">
        <BotaoImprimir />
      </div>
      <DocumentoRecibo recibo={recibo} />
      <p className="mt-6 text-center text-xs text-stone-500 print:hidden">
        Profissionais de saúde pessoa física também devem registrar o recibo no app Receita Saúde.
      </p>
    </main>
  );
}
