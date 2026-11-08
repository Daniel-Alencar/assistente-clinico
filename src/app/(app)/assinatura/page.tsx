import { cancelarAssinatura, assinar } from "@/app/(app)/acoes-assinatura";
import { botaoPrimario, campo, cartao, rotulo as estiloRotulo } from "@/components/estilos";
import { IconeCheck } from "@/components/icones";
import { CabecalhoPagina, Selo, type Tom } from "@/components/ui";
import { diasRestantesTeste, podeEscrever, PRECO_MENSAL, type DadosAssinatura } from "@/lib/dominio/assinatura";
import { sincronizarAssinatura } from "@/lib/dominio/sincronizar-assinatura";
import { formatarMoeda } from "@/lib/dominio/formatacao";
import { usuarioAtual } from "@/lib/servidor";
import { criarClienteAdmin } from "@/lib/supabase/admin";

type Props = { searchParams: Promise<{ preapproval_id?: string; erro?: string }> };

const ROTULOS: Record<string, [string, Tom]> = {
  teste: ["Período de teste", "azul"],
  ativa: ["Ativa", "verde"],
  inadimplente: ["Pagamento pendente", "ambar"],
  cancelada: ["Cancelada", "neutro"],
};

const ERROS: Record<string, string> = {
  email: "Informe um e-mail válido.",
  cancelar: "Não foi possível cancelar a assinatura agora. Tente novamente em instantes.",
};

const INCLUSO = [
  "Pacientes e agenda ilimitados",
  "Lembretes e confirmações no WhatsApp, sem limite de mensagens",
  "Evolução da sessão com IA",
  "Apoio ao diagnóstico",
  "Cobrança Pix na sua própria conta e recibos",
  "Exportação completa dos seus dados a qualquer momento",
];

export default async function Assinatura({ searchParams }: Props) {
  const { preapproval_id: retorno, erro } = await searchParams;
  const { supabase, user } = await usuarioAtual();

  // Volta do checkout: o Mercado Pago informa o id; sincroniza na hora (o webhook também fará isso).
  if (retorno) {
    try {
      await sincronizarAssinatura(criarClienteAdmin(), retorno, user.id);
    } catch (e) {
      console.error("Falha ao sincronizar assinatura no retorno", e);
    }
  }

  const { data } = await supabase
    .from("profissionais")
    .select("assinatura_status, teste_ate, mp_assinatura_id")
    .eq("id", user.id)
    .single();
  const assinatura = data as (DadosAssinatura & { mp_assinatura_id: string | null }) | null;
  if (!assinatura) return null;

  const [rotulo, tom] = ROTULOS[assinatura.assinatura_status];
  const dias = diasRestantesTeste(assinatura);
  const ativa = assinatura.assinatura_status === "ativa";

  return (
    <>
      <CabecalhoPagina titulo="Assinatura" descricao="Um plano, tudo incluído. Cancele quando quiser: seus dados continuam acessíveis." />

      {erro && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERROS[erro] ?? "Não foi possível iniciar a assinatura agora. Tente novamente em instantes."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${cartao} p-6 lg:col-span-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Plano Consultório</h2>
            <Selo tom={tom} ponto>
              {rotulo}
            </Selo>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight">
            {formatarMoeda(PRECO_MENSAL)}
            <span className="text-base font-normal text-stone-500">/mês</span>
          </p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {INCLUSO.map((item) => (
              <li key={item} className="flex items-start gap-2 text-stone-700">
                <IconeCheck className="mt-0.5 size-4 shrink-0 text-marca" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cartao} flex flex-col gap-4 p-6 lg:col-span-2`}>
          {assinatura.assinatura_status === "teste" && (
            <p className="text-stone-700">
              {dias > 0 ? (
                <>
                  Você tem <strong>{dias} {dias === 1 ? "dia" : "dias"}</strong> de teste grátis.
                </>
              ) : (
                <>Seu período de teste terminou.</>
              )}
            </p>
          )}
          {!podeEscrever(assinatura) && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              O app está em <strong>modo somente leitura</strong>: você vê e exporta tudo, mas não cria nem altera dados até
              assinar.
            </p>
          )}
          {ativa ? (
            <>
              <p className="text-stone-700">Sua assinatura está ativa. Obrigado!</p>
              <form action={cancelarAssinatura}>
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50">Cancelar assinatura</button>
              </form>
            </>
          ) : (
            <form action={assinar} className="flex flex-col gap-3">
              <label className={estiloRotulo}>
                E-mail da sua conta Mercado Pago
                <input name="email" type="email" required defaultValue={user.email} className={campo} />
                <span className="font-normal text-stone-500">Precisa ser o e-mail da conta com que você vai pagar.</span>
              </label>
              <button className={`${botaoPrimario} w-full`}>Assinar com Mercado Pago</button>
            </form>
          )}
          <p className="text-xs text-stone-500">
            Pagamento recorrente processado pelo Mercado Pago (cartão de crédito). Ao cancelar, o app passa a somente
            leitura e seus dados ficam disponíveis para exportação.
          </p>
        </section>
      </div>
    </>
  );
}
