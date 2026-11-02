import { NextResponse, type NextRequest } from "next/server";
import { gerarCsv } from "@/lib/dominio/csv";
import { registrarAcesso } from "@/lib/servidor";
import { criarClienteServidor } from "@/lib/supabase/servidor";

type Linha = Record<string, unknown>;

/** Cada exportação: tabela, colunas consultadas e como transformar cada linha em colunas do CSV. */
const EXPORTACOES: Record<string, { tabela: string; select: string; colunas: string[]; linha: (r: Linha) => unknown[] }> = {
  pacientes: {
    tabela: "pacientes",
    select: "id, nome, telefone_whatsapp, email, cpf, data_nascimento, aceita_whatsapp, whatsapp_consentimento_em, ativo, criado_em",
    colunas: ["id", "nome", "telefone_whatsapp", "email", "cpf", "data_nascimento", "aceita_whatsapp", "consentimento_whatsapp_em", "ativo", "criado_em"],
    linha: (r) => [r.id, r.nome, r.telefone_whatsapp, r.email, r.cpf, r.data_nascimento, r.aceita_whatsapp, r.whatsapp_consentimento_em, r.ativo, r.criado_em],
  },
  consultas: {
    tabela: "consultas",
    select: "id, inicio, duracao_min, modalidade, status, valor, paciente:pacientes(nome)",
    colunas: ["id", "inicio", "duracao_min", "modalidade", "status", "valor", "paciente"],
    linha: (r) => [r.id, r.inicio, r.duracao_min, r.modalidade, r.status, r.valor, (r.paciente as { nome?: string } | null)?.nome],
  },
  evolucoes: {
    tabela: "evolucoes",
    select: "id, criado_em, revisada, revisada_em, transcricao, conteudo, paciente:pacientes(nome)",
    colunas: ["id", "data", "paciente", "revisada", "revisada_em", "resumo", "temas", "intervencoes", "observacoes", "plano", "alertas", "ditado_original"],
    linha: (r) => {
      const c = (r.conteudo ?? {}) as Record<string, string | string[]>;
      const juntar = (v: unknown) => (Array.isArray(v) ? v.join(" | ") : (v as string));
      return [
        r.id, r.criado_em, (r.paciente as { nome?: string } | null)?.nome, r.revisada, r.revisada_em,
        c.resumo, juntar(c.temas_abordados), juntar(c.intervencoes), c.observacoes_clinicas, c.plano_proxima_sessao, juntar(c.alertas), r.transcricao,
      ];
    },
  },
  cobrancas: {
    tabela: "cobrancas",
    select: "id, criado_em, valor, status, pago_em, forma_pagamento, descricao, paciente:pacientes(nome)",
    colunas: ["id", "criado_em", "paciente", "descricao", "valor", "status", "pago_em", "forma_pagamento"],
    linha: (r) => [r.id, r.criado_em, (r.paciente as { nome?: string } | null)?.nome, r.descricao, r.valor, r.status, r.pago_em, r.forma_pagamento],
  },
  analises: {
    tabela: "analises_diagnosticas",
    select: "id, criado_em, resultado, paciente:pacientes(nome)",
    colunas: ["id", "criado_em", "paciente", "hipotese_principal", "resultado_completo_json"],
    linha: (r) => {
      const res = r.resultado as { hipoteses?: { nome: string }[] } | null;
      return [r.id, r.criado_em, (r.paciente as { nome?: string } | null)?.nome, res?.hipoteses?.[0]?.nome, JSON.stringify(r.resultado)];
    },
  },
};

/** Exporta os dados do profissional em CSV (portabilidade: os dados são dele). */
export async function GET(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo") ?? "";
  const exportacao = EXPORTACOES[tipo];
  if (!exportacao) return NextResponse.json({ erro: "Tipo de exportação inválido" }, { status: 400 });

  const { data, error } = await supabase.from(exportacao.tabela).select(exportacao.select).limit(50_000);
  if (error) return NextResponse.json({ erro: "Falha ao exportar" }, { status: 500 });

  await registrarAcesso(supabase, { profissionalId: user.id, recurso: "exportacao", acao: "exportar" });
  const csv = gerarCsv(exportacao.colunas, ((data ?? []) as unknown as Linha[]).map((r) => exportacao.linha(r) as (string | number | null)[]));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assistente-clinico-${tipo}.csv"`,
    },
  });
}
