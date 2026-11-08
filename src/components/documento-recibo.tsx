import { textosRecibo, type DadosRecibo } from "@/lib/dominio/recibos";

/** O recibo em si, igual na página do profissional e no link enviado ao paciente. */
export function DocumentoRecibo({ recibo }: { recibo: DadosRecibo }) {
  const t = textosRecibo(recibo);
  return (
    <article className="rounded-2xl border border-stone-300 bg-white p-10 print:rounded-none print:border-0 print:p-0">
      <header className="flex items-start justify-between border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RECIBO</h1>
          <p className="mt-1 text-sm text-stone-500">Nº {t.numero}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums">{t.valor}</p>
      </header>

      <p className="mt-8 leading-8 text-stone-800">
        Recebi de <strong>{recibo.paciente?.nome ?? "—"}</strong>
        {t.cpfPaciente && <>, CPF {t.cpfPaciente}</>}, a importância de <strong>{t.valor}</strong> ({t.valorExtenso}),
        referente a {t.referente}
        {t.forma && <>, paga via {t.forma}</>}.
      </p>

      <p className="mt-8 text-stone-800">{t.data}.</p>

      <footer className="mt-20 flex flex-col items-center text-center">
        <div className="w-72 border-t border-stone-400" />
        <p className="mt-2 font-semibold">{recibo.profissional.nome}</p>
        <p className="text-sm text-stone-600">{t.cargo}</p>
        {t.cpfProfissional && <p className="text-sm text-stone-600">CPF {t.cpfProfissional}</p>}
      </footer>
    </article>
  );
}
