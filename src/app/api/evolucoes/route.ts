import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { respostaErroIa } from "@/lib/ia/erros-http";
import { gerarEvolucao } from "@/lib/ia/evolucao";
import { bloqueioDeEscrita, registrarAcesso, registrarUsoIa, verificarLimiteIa } from "@/lib/servidor";

const Entrada = z.object({
  pacienteId: z.uuid(),
  consultaId: z.uuid().optional(),
  transcricao: z.string().min(20, "Ditado muito curto").max(20_000),
});

/** Gera um rascunho de evolução a partir do ditado. Fica salvo como não revisado. */
export async function POST(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const bloqueio = (await bloqueioDeEscrita(supabase, user.id)) ?? (await verificarLimiteIa(supabase, user.id));
  if (bloqueio) return NextResponse.json({ erro: bloqueio }, { status: 403 });

  const entrada = Entrada.safeParse(await req.json());
  if (!entrada.success) {
    return NextResponse.json({ erro: z.prettifyError(entrada.error) }, { status: 400 });
  }

  const { data: profissional } = await supabase
    .from("profissionais")
    .select("profissao")
    .eq("id", user.id)
    .single();

  try {
    const conteudo = await gerarEvolucao({
      transcricao: entrada.data.transcricao,
      profissao: profissional?.profissao ?? "outro",
    });

    const { data, error } = await supabase
      .from("evolucoes")
      .insert({
        profissional_id: user.id,
        paciente_id: entrada.data.pacienteId,
        consulta_id: entrada.data.consultaId ?? null,
        transcricao: entrada.data.transcricao,
        conteudo,
      })
      .select("id, conteudo, revisada")
      .single();
    if (error) throw error;

    await registrarUsoIa(supabase, user.id, "evolucao");
    await registrarAcesso(supabase, {
      profissionalId: user.id,
      pacienteId: entrada.data.pacienteId,
      recurso: "evolucao",
      recursoId: data.id,
      acao: "criar",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (erro) {
    return respostaErroIa(erro, "gerar evolução");
  }
}
