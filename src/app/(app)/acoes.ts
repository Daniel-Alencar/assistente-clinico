"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  horarioLocalParaUtc,
  normalizarTelefone,
  reaisParaNumero,
} from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type EstadoForm = { erro?: string; ok?: boolean };

const Uuid = z.uuid();

async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

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
export async function salvarPerfil(
  destino: string | null,
  _: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();

  const nome = texto(form, "nome");
  const profissao = texto(form, "profissao");
  const fuso = texto(form, "fuso_horario") || "America/Sao_Paulo";
  const valorSessao = valorOpcional(form, "valor_sessao_padrao");
  const telefoneDigitado = texto(form, "telefone");
  const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;

  if (!nome || nome.length > 100) return { erro: "Informe seu nome." };
  if (!["psicologo", "medico", "outro"].includes(profissao)) return { erro: "Escolha a profissão." };
  if (!FUSOS.includes(fuso)) return { erro: "Fuso horário inválido." };
  if (valorSessao === undefined) return { erro: "Valor da sessão inválido. Use o formato 150,00." };
  if (telefoneDigitado && !telefone) return { erro: "Telefone inválido. Use DDD + número." };

  const { error } = await supabase.from("profissionais").upsert({
    id: user.id,
    nome,
    profissao,
    registro_conselho: texto(form, "registro_conselho") || null,
    telefone,
    valor_sessao_padrao: valorSessao,
    fuso_horario: fuso,
  });
  if (error) return { erro: "Não foi possível salvar o perfil." };

  revalidatePath("/", "layout");
  if (destino) redirect(destino);
  return { ok: true };
}

// ---------------------------------------------------------------- Pacientes

/** `pacienteId`: null cria um paciente novo; um id edita o existente. */
export async function salvarPaciente(
  pacienteId: string | null,
  _: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();
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

  const dados = {
    nome,
    telefone_whatsapp: telefone,
    email: email || null,
    cpf: cpf || null,
    data_nascimento: dataNascimento || null,
    aceita_whatsapp: aceitaWhatsapp,
  };

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
  const { supabase } = await usuarioAtual();
  if (!Uuid.safeParse(pacienteId).success) return;
  await supabase.from("pacientes").update({ ativo }).eq("id", pacienteId);
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${pacienteId}`);
}

// ---------------------------------------------------------------- Consultas

const MODALIDADES = ["presencial", "online"];
const STATUS = ["agendada", "confirmada", "cancelada", "realizada", "falta"] as const;

export async function criarConsulta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, user } = await usuarioAtual();

  const pacienteId = texto(form, "paciente_id");
  const duracao = Number(texto(form, "duracao_min") || 50);
  const modalidade = texto(form, "modalidade");
  const repetirSemanas = Number(texto(form, "repetir_semanas") || 0);
  const valor = valorOpcional(form, "valor");

  if (!Uuid.safeParse(pacienteId).success) return { erro: "Escolha o paciente." };
  if (!Number.isInteger(duracao) || duracao < 10 || duracao > 240) {
    return { erro: "Duração deve ficar entre 10 e 240 minutos." };
  }
  if (!MODALIDADES.includes(modalidade)) return { erro: "Modalidade inválida." };
  if (![0, 4, 8, 12].includes(repetirSemanas)) return { erro: "Repetição inválida." };
  if (valor === undefined) return { erro: "Valor inválido. Use o formato 150,00." };

  const { data: profissional } = await supabase
    .from("profissionais")
    .select("fuso_horario")
    .eq("id", user.id)
    .single();
  const fuso = profissional?.fuso_horario ?? "America/Sao_Paulo";
  const inicio = horarioLocalParaUtc(texto(form, "data"), texto(form, "hora"), fuso);
  if (!inicio) return { erro: "Informe data e hora." };
  if (inicio.getTime() < Date.now() - 24 * 3_600_000) {
    return { erro: "Não é possível agendar com mais de 1 dia no passado." };
  }

  // Sessão semanal: a primeira + N repetições no mesmo dia e horário.
  const SEMANA = 7 * 24 * 3_600_000;
  const inicios = Array.from({ length: repetirSemanas + 1 }, (_, i) => new Date(inicio.getTime() + i * SEMANA));
  const conflito = await primeiroConflito(supabase, inicios, duracao, fuso);
  if (conflito) return { erro: `Conflito de horário com outra consulta em ${conflito}.` };

  const { error } = await supabase.from("consultas").insert(
    inicios.map((i) => ({
      profissional_id: user.id,
      paciente_id: pacienteId,
      inicio: i.toISOString(),
      duracao_min: duracao,
      modalidade,
      valor,
    })),
  );
  if (error) return { erro: "Não foi possível agendar." };

  revalidatePath("/agenda");
  revalidatePath(`/pacientes/${pacienteId}`);
  return { ok: true };
}

/** Retorna a data (dd/mm hh:mm) da primeira consulta ativa que se sobrepõe, ou null. */
async function primeiroConflito(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  inicios: Date[],
  duracaoMin: number,
  fusoHorario: string,
): Promise<string | null> {
  const MAX_DURACAO = 240 * 60_000;
  const primeiro = inicios[0].getTime();
  const ultimo = inicios[inicios.length - 1].getTime() + duracaoMin * 60_000;

  const { data: existentes } = await supabase
    .from("consultas")
    .select("inicio, duracao_min")
    .in("status", ["agendada", "confirmada"])
    .gte("inicio", new Date(primeiro - MAX_DURACAO).toISOString())
    .lt("inicio", new Date(ultimo).toISOString());

  for (const novo of inicios) {
    const novoFim = novo.getTime() + duracaoMin * 60_000;
    for (const c of existentes ?? []) {
      const ini = new Date(c.inicio).getTime();
      const fim = ini + c.duracao_min * 60_000;
      if (novo.getTime() < fim && ini < novoFim) {
        return new Date(c.inicio).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: fusoHorario,
        });
      }
    }
  }
  return null;
}

export async function alterarStatusConsulta(consultaId: string, status: (typeof STATUS)[number]) {
  const { supabase } = await usuarioAtual();
  if (!Uuid.safeParse(consultaId).success || !STATUS.includes(status)) return;
  await supabase.from("consultas").update({ status }).eq("id", consultaId);
  revalidatePath("/agenda");
}

// ---------------------------------------------------------------- Sessão

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
