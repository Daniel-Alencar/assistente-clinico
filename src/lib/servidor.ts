import "server-only";
import { redirect } from "next/navigation";
import { MENSAGEM_SOMENTE_LEITURA, podeEscrever, type DadosAssinatura } from "@/lib/dominio/assinatura";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Usuário logado + cliente com RLS. Redireciona para o login se não houver sessão. */
export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Retorna a mensagem de erro se a assinatura não permite gravar, ou null se pode. */
export async function bloqueioDeEscrita(supabase: ClienteSupabase, profissionalId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profissionais")
    .select("assinatura_status, teste_ate")
    .eq("id", profissionalId)
    .single();
  if (!data) return "Perfil não encontrado.";
  return podeEscrever(data as DadosAssinatura) ? null : MENSAGEM_SOMENTE_LEITURA;
}

/** Registra acesso a dado de prontuário (LGPD). Falha no log não interrompe o uso. */
export async function registrarAcesso(
  supabase: ClienteSupabase,
  dados: {
    profissionalId: string;
    pacienteId?: string | null;
    recurso: "evolucao" | "analise_diagnostica" | "paciente" | "exportacao";
    recursoId?: string | null;
    acao: "ver" | "criar" | "editar" | "revisar" | "excluir" | "exportar";
  },
) {
  const { error } = await supabase.from("acessos_prontuario").insert({
    profissional_id: dados.profissionalId,
    paciente_id: dados.pacienteId ?? null,
    recurso: dados.recurso,
    recurso_id: dados.recursoId ?? null,
    acao: dados.acao,
  });
  if (error) console.error("Falha ao registrar acesso ao prontuário", error);
}

const LIMITE_IA_DIARIO = Number(process.env.LIMITE_IA_DIARIO ?? 40);

/** Controla o custo da IA: no máximo LIMITE_IA_DIARIO usos por profissional a cada 24h. */
export async function verificarLimiteIa(supabase: ClienteSupabase, profissionalId: string): Promise<string | null> {
  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await supabase
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("profissional_id", profissionalId)
    .gte("criado_em", desde);
  return (count ?? 0) >= LIMITE_IA_DIARIO
    ? `Limite diário de ${LIMITE_IA_DIARIO} usos da IA atingido. Tente novamente amanhã.`
    : null;
}

export async function registrarUsoIa(supabase: ClienteSupabase, profissionalId: string, tipo: "evolucao" | "diagnostico") {
  await supabase.from("uso_ia").insert({ profissional_id: profissionalId, tipo });
}
