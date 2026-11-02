// Interpretação das respostas do paciente no WhatsApp. Puro: sem dependências, testável.

export type Intencao = "confirmar" | "cancelar" | "descadastrar" | "desconhecida";

export function interpretarResposta(texto: string): Intencao {
  const t = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  // Descadastro vem primeiro: "parar" ou "sair" nunca devem ser lidos como cancelamento de consulta.
  if (/^(sair|parar|pare|stop|descadastrar|nao quero (mais )?receber)\b/.test(t)) return "descadastrar";
  if (/^(confirm|sim\b|ok\b|1$|vou\b|estarei\b)/.test(t)) return "confirmar";
  if (/^(cancel|nao\b|desmarc|2$)/.test(t)) return "cancelar";
  return "desconhecida";
}
