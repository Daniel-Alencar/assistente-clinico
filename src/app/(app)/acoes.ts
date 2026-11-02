"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dataParaIso, lerCsv } from "@/lib/dominio/csv";
import { horarioLocalParaUtc, normalizarTelefone, reaisParaNumero } from "@/lib/dominio/formatacao";
import { normalizarChavePix, type TipoChavePix } from "@/lib/dominio/pix";
import { VERSAO_TERMOS } from "@/lib/dominio/termos";
import { bloqueioDeEscrita, usuarioAtual, type ClienteSupabase } from "@/lib/servidor";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type EstadoForm = { erro?: string; ok?: boolean; mensagem?: string };

const Uuid = z.uuid();

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

/** Valor opcional em reais: vazio -> null; inválido -> undefined. */
function valorOpcional(form: FormData, campo: string): number | null | undefined {
  const bruto = texto(form, campo);
  if (!bruto) return null;
  return reaisParaNumero(bruto) ?? undefined;
}

// ---------------------------------------------------------------- Perfil

const FUSOS = [
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Manaus",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Noronha",
];

/** `destino`: para onde ir depois de salvar (cadastro inicial) ou null (edição do perfil). */
export async function salvarPerfil(destino: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();

  const nome = texto(form, "nome");
  const profissao = texto(form, "profissao");
  const fuso = texto(form, "fuso_horario") || "America/Sao_Paulo";
  const valorSessao = valorOpcional(form, "valor_sessao_padrao");
  const telefoneDigitado = texto(form, "telefone");
  const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;
  const cpf = texto(form, "cpf").replace(/\D/g, "");
  const tipoChave = texto(form, "tipo_chave_pix") as TipoChavePix;
  const chaveDigitada = texto(form, "chave_pix");
  const chavePix = chaveDigitada ? normalizarChavePix(tipoChave, chaveDigitada) : null;

  if (!nome || nome.length > 100) return { erro: "Informe seu nome." };
  if (!["psicologo", "medico", "outro"].includes(profissao)) return { erro: "Escolha a profissão." };
  if (!FUSOS.includes(fuso)) return { erro: "Fuso horário inválido." };
  if (valorSessao === undefined) return { erro: "Valor da sessão inválido. Use o formato 150,00." };
  if (telefoneDigitado && !telefone) return { erro: "Telefone inválido. Use DDD + número." };
  if (cpf && cpf.length !== 11) return { erro: "CPF deve ter 11 dígitos." };
  if (chaveDigitada && !chavePix) return { erro: "Chave Pix inválida para o tipo escolhido." };

  const dados: Record<string, unknown> = {
    id: user.id,
    nome,
    profissao,
    registro_conselho: texto(form, "registro_conselho") || null,
    telefone,
    valor_sessao_padrao: valorSessao,
    fuso_horario: fuso,
    cpf: cpf || null,
    tipo_chave_pix: chavePix ? tipoChave : null,
    chave_pix: chavePix,
  };

  // Cadastro inicial: aceite dos termos é obrigatório e fica registrado (data e versão).
  if (destino) {
    if (form.get("aceite_termos") !== "on") return { erro: "Para continuar, aceite os Termos de Uso e a Política de Privacidade." };
    dados.termos_aceitos_em = new Date().toISOString();
    dados.termos_versao = VERSAO_TERMOS;
  }

  const { error } = await supabase.from("profissionais").upsert(dados);
  if (error) return { erro: "Não foi possível salvar o perfil." };

  revalidatePath("/", "layout");
  if (destino) redirect(destino);
  return { ok: true };
}

// ---------------------------------------------------------------- Pacientes

/** `pacienteId`: null cria um paciente novo; um id edita o existente. */
export async function salvarPaciente(pacienteId: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };
  if (pacienteId && !Uuid.safeParse(pacienteId).success) return { erro: "Paciente inválido." };

  const nome = texto(form, "nome");
  const telefoneDigitado = texto(form, "telefone_whatsapp");
  const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;
  const email = texto(form, "email").toLowerCase();
  const cpf = texto(form, "cpf").replace(/\D/g, "");
  const dataNascimento = texto(form, "data_nascimento");
  const aceitaWhatsapp = form.get("aceita_whatsapp") === "on";

  if (!nome || nome.length > 120) return { erro: "Informe o nome do paciente." };
  if (telefoneDigitado && !telefone) return { erro: "WhatsApp inválido. Use DDD + número." };
  if (email && !z.email().safeParse(email).success) return { erro: "E-mail inválido." };
  if (cpf && cpf.length !== 11) return { erro: "CPF deve ter 11 dígitos." };
  if (dataNascimento && !z.iso.date().safeParse(dataNascimento).success) {
    return { erro: "Data de nascimento inválida." };
  }
  if (aceitaWhatsapp && !telefone) {
    return { erro: "Para enviar lembretes, informe o WhatsApp do paciente." };
  }

  const dados: Record<string, unknown> = {
    nome,
    telefone_whatsapp: telefone,
    email: email || null,
    cpf: cpf || null,
    data_nascimento: dataNascimento || null,
    aceita_whatsapp: aceitaWhatsapp,
  };

  // Registro do consentimento (LGPD): quando foi dado e por qual meio.
  const { data: anterior } = pacienteId
    ? await supabase.from("pacientes").select("aceita_whatsapp").eq("id", pacienteId).maybeSingle()
    : { data: null };
  if (aceitaWhatsapp && !anterior?.aceita_whatsapp) {
    dados.whatsapp_consentimento_em = new Date().toISOString();
    dados.whatsapp_consentimento_origem = "informado_pelo_profissional";
    dados.whatsapp_descadastrado_em = null;
  } else if (!aceitaWhatsapp && anterior?.aceita_whatsapp) {
    dados.whatsapp_descadastrado_em = new Date().toISOString();
  }

  if (pacienteId) {
    const { error } = await supabase.from("pacientes").update(dados).eq("id", pacienteId);
    if (error) return { erro: "Não foi possível salvar o paciente." };
    revalidatePath("/pacientes");
    revalidatePath(`/pacientes/${pacienteId}`);
    return { ok: true };
  }

  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...dados, profissional_id: user.id })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível cadastrar o paciente." };

  revalidatePath("/pacientes");
  redirect(`/pacientes/${data.id}`);
}

export async function alterarAtivoPaciente(pacienteId: string, ativo: boolean) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(pacienteId).success || (await bloqueioDeEscrita(supabase, user.id))) return;
  await supabase.from("pacientes").update({ ativo }).eq("id", pacienteId);
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${pacienteId}`);
}

/** Importa pacientes de CSV (colunas: nome, telefone, email, cpf, data_nascimento). */
export async function importarPacientes(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha um arquivo CSV." };
  if (arquivo.size > 2_000_000) return { erro: "Arquivo muito grande (máximo 2 MB)." };

  const linhas = lerCsv(await arquivo.text());
  if (!linhas.length) return { erro: "O arquivo está vazio ou sem cabeçalho." };
  if (linhas.length > 2000) return { erro: "Importe no máximo 2.000 pacientes por vez." };
  if (!("nome" in linhas[0])) return { erro: 'A planilha precisa de uma coluna "nome".' };

  const validos: Record<string, unknown>[] = [];
  const problemas: string[] = [];
  linhas.forEach((l, i) => {
    const nome = l.nome?.trim();
    if (!nome) return;
    const telefoneBruto = l.telefone || l.whatsapp || l.celular || "";
    const telefone = telefoneBruto ? normalizarTelefone(telefoneBruto) : null;
    const cpf = (l.cpf ?? "").replace(/\D/g, "");
    const nascimento = l.data_nascimento || l.nascimento || "";
    const email = (l.email || l["e-mail"] || "").toLowerCase();
    if (telefoneBruto && !telefone) problemas.push(`linha ${i + 2}: telefone inválido (ignorado)`);
    validos.push({
      profissional_id: user.id,
      nome: nome.slice(0, 120),
      telefone_whatsapp: telefone,
      email: email && z.email().safeParse(email).success ? email : null,
      cpf: cpf.length === 11 ? cpf : null,
      data_nascimento: nascimento ? dataParaIso(nascimento) : null,
      // Consentimento de WhatsApp nunca é importado: precisa ser colhido de cada paciente.
      aceita_whatsapp: false,
    });
  });
  if (!validos.length) return { erro: "Nenhuma linha com nome encontrada." };

  const { error } = await supabase.from("pacientes").insert(validos);
  if (error) return { erro: "Não foi possível importar. Confira o formato do arquivo." };

  revalidatePath("/pacientes");
  const aviso = problemas.length ? ` Avisos: ${problemas.slice(0, 5).join("; ")}${problemas.length > 5 ? "…" : ""}.` : "";
  return { ok: true, mensagem: `${validos.length} pacientes importados.${aviso}` };
}

// ---------------------------------------------------------------- Consultas

const MODALIDADES = ["presencial", "online"];
const STATUS = ["agendada", "confirmada", "cancelada", "realizada", "falta"] as const;
const SEMANA = 7 * 24 * 3_600_000;

type DadosHorario = { inicio: Date; duracao: number; modalidade: string; valor: number | null; fuso: string };

/** Valida data, hora, duração, modalidade e valor do formulário de consulta. */
async function lerHorario(supabase: ClienteSupabase, profissionalId: string, form: FormData): Promise<DadosHorario | string> {
  const duracao = Number(texto(form, "duracao_min") || 50);
  const modalidade = texto(form, "modalidade");
  const valor = valorOpcional(form, "valor");
  if (!Number.isInteger(duracao) || duracao < 10 || duracao > 240) return "Duração deve ficar entre 10 e 240 minutos.";
  if (!MODALIDADES.includes(modalidade)) return "Modalidade inválida.";
  if (valor === undefined) return "Valor inválido. Use o formato 150,00.";

  const { data: profissional } = await supabase.from("profissionais").select("fuso_horario").eq("id", profissionalId).single();
  const fuso = profissional?.fuso_horario ?? "America/Sao_Paulo";
  const inicio = horarioLocalParaUtc(texto(form, "data"), texto(form, "hora"), fuso);
  if (!inicio) return "Informe data e hora.";
  if (inicio.getTime() < Date.now() - 24 * 3_600_000) return "Não é possível agendar com mais de 1 dia no passado.";
  return { inicio, duracao, modalidade, valor, fuso };
}

export async function criarConsulta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };

  const pacienteId = texto(form, "paciente_id");
  const repetirSemanas = Number(texto(form, "repetir_semanas") || 0);
  if (!Uuid.safeParse(pacienteId).success) return { erro: "Escolha o paciente." };
  if (![0, 4, 8, 12].includes(repetirSemanas)) return { erro: "Repetição inválida." };

  const horario = await lerHorario(supabase, user.id, form);
  if (typeof horario === "string") return { erro: horario };

  // Sessão semanal: a primeira + N repetições no mesmo dia e horário, ligadas por serie_id.
  const inicios = Array.from({ length: repetirSemanas + 1 }, (_, i) => new Date(horario.inicio.getTime() + i * SEMANA));
  const conflito = await primeiroConflito(supabase, inicios, horario.duracao, horario.fuso);
  if (conflito) return { erro: `Conflito de horário com outra consulta em ${conflito}.` };

  const serieId = repetirSemanas > 0 ? crypto.randomUUID() : null;
  const { error } = await supabase.from("consultas").insert(
    inicios.map((i) => ({
      profissional_id: user.id,
      paciente_id: pacienteId,
      inicio: i.toISOString(),
      duracao_min: horario.duracao,
      modalidade: horario.modalidade,
      valor: horario.valor,
      serie_id: serieId,
    })),
  );
  if (error) return { erro: "Não foi possível agendar." };

  revalidatePath("/agenda");
  revalidatePath(`/pacientes/${pacienteId}`);
  return { ok: true };
}

/** Remarca ou altera uma consulta. Mudar o horário zera o lembrete para ele ser reenviado. */
export async function editarConsulta(consultaId: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return { erro: bloqueio };
  if (!Uuid.safeParse(consultaId).success) return { erro: "Consulta inválida." };

  const { data: atual } = await supabase.from("consultas").select("inicio, paciente_id").eq("id", consultaId).maybeSingle();
  if (!atual) return { erro: "Consulta não encontrada." };

  const horario = await lerHorario(supabase, user.id, form);
  if (typeof horario === "string") return { erro: horario };

  const conflito = await primeiroConflito(supabase, [horario.inicio], horario.duracao, horario.fuso, consultaId);
  if (conflito) return { erro: `Conflito de horário com outra consulta em ${conflito}.` };

  const mudouHorario = new Date(atual.inicio).getTime() !== horario.inicio.getTime();
  const { error } = await supabase
    .from("consultas")
    .update({
      inicio: horario.inicio.toISOString(),
      duracao_min: horario.duracao,
      modalidade: horario.modalidade,
      valor: horario.valor,
      ...(mudouHorario ? { lembrete_enviado_em: null, status: "agendada" } : {}),
    })
    .eq("id", consultaId);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/agenda");
  revalidatePath(`/pacientes/${atual.paciente_id}`);
  return { ok: true, mensagem: mudouHorario ? "Consulta remarcada. O lembrete será reenviado." : "Consulta atualizada." };
}

/** Exclui consulta agendada por engano. Consultas realizadas ou com falta fazem parte do histórico e não são apagadas. */
export async function excluirConsulta(consultaId: string) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(consultaId).success || (await bloqueioDeEscrita(supabase, user.id))) return;
  await supabase.from("consultas").delete().eq("id", consultaId).in("status", ["agendada", "confirmada", "cancelada"]);
  revalidatePath("/agenda");
  redirect("/agenda");
}

/** Cancela esta consulta e as próximas da mesma série semanal. */
export async function cancelarSerie(consultaId: string) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(consultaId).success || (await bloqueioDeEscrita(supabase, user.id))) return;
  const { data: consulta } = await supabase.from("consultas").select("serie_id, inicio").eq("id", consultaId).maybeSingle();
  if (!consulta?.serie_id) return;
  await supabase
    .from("consultas")
    .update({ status: "cancelada" })
    .eq("serie_id", consulta.serie_id)
    .gte("inicio", consulta.inicio)
    .in("status", ["agendada", "confirmada"]);
  revalidatePath("/agenda");
  redirect("/agenda");
}

/** Retorna a data (dd/mm hh:mm) da primeira consulta ativa que se sobrepõe, ou null. */
async function primeiroConflito(
  supabase: ClienteSupabase,
  inicios: Date[],
  duracaoMin: number,
  fusoHorario: string,
  ignorarId?: string,
): Promise<string | null> {
  const MAX_DURACAO = 240 * 60_000;
  const primeiro = inicios[0].getTime();
  const ultimo = inicios[inicios.length - 1].getTime() + duracaoMin * 60_000;

  const { data: existentes } = await supabase
    .from("consultas")
    .select("id, inicio, duracao_min")
    .in("status", ["agendada", "confirmada"])
    .gte("inicio", new Date(primeiro - MAX_DURACAO).toISOString())
    .lt("inicio", new Date(ultimo).toISOString());

  for (const novo of inicios) {
    const novoFim = novo.getTime() + duracaoMin * 60_000;
    for (const c of existentes ?? []) {
      if (c.id === ignorarId) continue;
      const ini = new Date(c.inicio).getTime();
      const fim = ini + c.duracao_min * 60_000;
      if (novo.getTime() < fim && ini < novoFim) {
        return new Date(c.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: fusoHorario });
      }
    }
  }
  return null;
}

export async function alterarStatusConsulta(consultaId: string, status: (typeof STATUS)[number]) {
  const { supabase, user } = await usuarioAtual();
  if (!Uuid.safeParse(consultaId).success || !STATUS.includes(status)) return;
  if (await bloqueioDeEscrita(supabase, user.id)) return;
  await supabase.from("consultas").update({ status }).eq("id", consultaId);
  revalidatePath("/agenda");
}

// ---------------------------------------------------------------- Sessão

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
