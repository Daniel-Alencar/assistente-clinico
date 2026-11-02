import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { gerarAnaliseDiagnostica } from "@/lib/ia/diagnostico";
import { respostaErroIa } from "@/lib/ia/erros-http";
import type { Mensagem } from "@/lib/ia/tipos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const Entrada = z.object({
  pacienteId: z.uuid(),
  analiseId: z.uuid().optional(),
  mensagem: z.string().trim().min(10, "Descreva o caso com um pouco mais de detalhe").max(10_000),
  usarEvolucoes: z.boolean().optional(),
});

const MAX_RELATOS = 10;

function idade(dataNascimento: string | null): string {
  if (!dataNascimento) return "não informada";
  const nascimento = new Date(`${dataNascimento}T12:00:00Z`);
  const hoje = new Date();
  let anos = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const aindaNaoFezAniversario =
    hoje.getUTCMonth() < nascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === nascimento.getUTCMonth() && hoje.getUTCDate() < nascimento.getUTCDate());
  if (aindaNaoFezAniversario) anos--;
  return `${anos} anos`;
}

/**
 * Apoio ao diagnóstico: o profissional relata o caso e o agente devolve hipóteses,
 * diferenciais, riscos e perguntas. Enviar `analiseId` continua a mesma conversa.
 */
export async function POST(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const entrada = Entrada.safeParse(await req.json());
  if (!entrada.success) {
    return NextResponse.json({ erro: z.prettifyError(entrada.error) }, { status: 400 });
  }
  const { pacienteId, analiseId, mensagem, usarEvolucoes } = entrada.data;

  const [{ data: paciente }, { data: profissional }] = await Promise.all([
    supabase.from("pacientes").select("id, data_nascimento").eq("id", pacienteId).maybeSingle(),
    supabase.from("profissionais").select("profissao").eq("id", user.id).single(),
  ]);
  if (!paciente) return NextResponse.json({ erro: "Paciente não encontrado" }, { status: 404 });

  let historico: Mensagem[] = [];
  let contexto: string;

  if (analiseId) {
    const { data: analise } = await supabase
      .from("analises_diagnosticas")
      .select("mensagens, contexto")
      .eq("id", analiseId)
      .eq("paciente_id", pacienteId)
      .maybeSingle();
    if (!analise) return NextResponse.json({ erro: "Análise não encontrada" }, { status: 404 });
    historico = analise.mensagens as Mensagem[];
    contexto = analise.contexto;
    if (historico.filter((m) => m.papel === "usuario").length >= MAX_RELATOS) {
      return NextResponse.json(
        { erro: "Esta análise atingiu o limite de mensagens. Comece uma nova análise." },
        { status: 400 },
      );
    }
  } else {
    // Minimização de dados (LGPD): a IA recebe idade e evoluções, nunca nome ou documentos.
    const linhas = [`- Idade: ${idade(paciente.data_nascimento)}`];
    if (usarEvolucoes) {
      const { data: evolucoes } = await supabase
        .from("evolucoes")
        .select("criado_em, conteudo")
        .eq("paciente_id", pacienteId)
        .order("criado_em", { ascending: false })
        .limit(5);
      for (const e of (evolucoes ?? []).reverse()) {
        const c = e.conteudo as { resumo?: string; alertas?: string[] };
        const alertas = c.alertas?.length ? ` Alertas: ${c.alertas.join("; ")}.` : "";
        linhas.push(`- Evolução de ${new Date(e.criado_em).toLocaleDateString("pt-BR")}: ${c.resumo ?? ""}${alertas}`);
      }
    }
    contexto = linhas.join("\n");
  }

  const conversa: Mensagem[] = [...historico, { papel: "usuario", conteudo: mensagem }];

  try {
    const resultado = await gerarAnaliseDiagnostica({
      profissao: profissional?.profissao ?? "outro",
      contextoPaciente: contexto,
      conversa,
    });
    const mensagens: Mensagem[] = [...conversa, { papel: "assistente", conteudo: JSON.stringify(resultado) }];
    const dados = {
      mensagens,
      resultado,
      provedor_ia: process.env.IA_PROVIDER ?? "anthropic",
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = analiseId
      ? await supabase.from("analises_diagnosticas").update(dados).eq("id", analiseId).select("id").single()
      : await supabase
          .from("analises_diagnosticas")
          .insert({ ...dados, profissional_id: user.id, paciente_id: pacienteId, contexto })
          .select("id")
          .single();
    if (error) throw error;

    return NextResponse.json({ analiseId: data.id, resultado, mensagens });
  } catch (erro) {
    return respostaErroIa(erro, "gerar a análise");
  }
}
