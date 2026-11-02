export function formatarDataHora(iso: string, fusoHorario: string) {
  const data = new Date(iso);
  return {
    data: new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoHorario,
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }).format(data),
    hora: new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoHorario,
      hour: "2-digit",
      minute: "2-digit",
    }).format(data),
  };
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** "150,00" | "150.5" | "R$ 1.200,00" -> 150 | 150.5 | 1200. Retorna null se inválido. */
export function reaisParaNumero(texto: string): number | null {
  let limpo = texto.trim().replace(/^R\$\s*/i, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Number(limpo);
}

/** "(11) 99999-8888" -> "5511999998888" (E.164 sem "+", formato do WhatsApp). */
export function normalizarTelefone(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return /^55\d{10,11}$/.test(digitos) ? digitos : null;
}

/** "5511999998888" -> "(11) 99999-8888" */
export function formatarTelefone(e164: string): string {
  const m = e164.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** Data/hora digitadas no fuso do profissional -> instante UTC. */
export function horarioLocalParaUtc(data: string, hora: string, fusoHorario: string): Date | null {
  const d = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const h = hora.match(/^(\d{2}):(\d{2})$/);
  if (!d || !h) return null;

  const comoSeFosseUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +h[1], +h[2]);
  return new Date(comoSeFosseUtc - deslocamentoMinutos(fusoHorario, new Date(comoSeFosseUtc)) * 60_000);
}

/** Deslocamento do fuso em minutos (ex.: America/Sao_Paulo -> -180). */
function deslocamentoMinutos(fusoHorario: string, instante: Date): number {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: fusoHorario, timeZoneName: "longOffset" })
    .formatToParts(instante)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = nome?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Instante UTC -> { data: "2026-11-05", hora: "14:30" } no fuso do profissional (para inputs). */
export function utcParaHorarioLocal(iso: string, fusoHorario: string) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: fusoHorario,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

/** Idade em anos completos a partir de "yyyy-mm-dd". */
export function calcularIdade(dataNascimento: string, hoje = new Date()): number {
  const [a, m, d] = dataNascimento.split("-").map(Number);
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade;
}
