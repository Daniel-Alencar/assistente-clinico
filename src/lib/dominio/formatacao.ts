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

export function escaparHtml(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [CENTENAS[c]];
  if (resto < 20) partes.push(UNIDADES[resto]);
  else partes.push([DEZENAS[Math.floor(resto / 10)], UNIDADES[resto % 10]].filter(Boolean).join(" e "));
  return partes.filter(Boolean).join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  // "e" antes do último grupo quando ele é < 100 ou uma centena exata (ex.: "mil e cem", "dois mil e cinquenta").
  if (partes.length > 1 && (resto < 100 || resto % 100 === 0)) {
    const ultimo = partes.pop()!;
    return `${partes.join(", ")} e ${ultimo}`;
  }
  return partes.join(", ");
}

/** 1234.5 -> "mil, duzentos e trinta e quatro reais e cinquenta centavos" (para recibos). */
export function valorPorExtenso(valor: number): string {
  const centavosTotais = Math.round(valor * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const partes: string[] = [];
  // "um milhão de reais", "dois milhões de reais"
  if (reais) partes.push(`${inteiroPorExtenso(reais)} ${reais % 1_000_000 === 0 ? "de " : ""}${reais === 1 ? "real" : "reais"}`);
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ") || "zero reais";
}
