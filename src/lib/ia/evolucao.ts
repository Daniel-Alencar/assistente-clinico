import "server-only";
import { EvolucaoSchema, type Evolucao } from "./esquemas";
import { gerarEstruturado } from "./gerar";

export { EvolucaoRecusadaError, IaIndisponivelError, IaNaoConfiguradaError } from "./tipos";
export type { Evolucao };

const PROMPT_SISTEMA = `Você ajuda profissionais de saúde (psicólogos e médicos) a registrar a evolução clínica de uma sessão.
Você recebe o ditado que o próprio profissional fez após o atendimento e o organiza em uma evolução estruturada, em português do Brasil, com linguagem técnica e objetiva.

Regras:
- Use apenas informações presentes no ditado. Nunca invente sintomas, diagnósticos, falas ou condutas.
- Não sugira diagnósticos nem tratamentos que o profissional não mencionou.
- Se algo estiver ambíguo ou incompleto, registre em "pontos_a_confirmar" em vez de deduzir.
- Qualquer menção a risco (autolesão, ideação suicida, violência, abuso) deve aparecer em "alertas".
- Campos sem informação no ditado devem ficar como string vazia ou lista vazia.`;

export function gerarEvolucao(params: {
  transcricao: string;
  profissao: "psicologo" | "medico" | "outro";
}): Promise<Evolucao> {
  return gerarEstruturado(EvolucaoSchema, {
    sistema: PROMPT_SISTEMA,
    esforco: "medium",
    mensagens: [
      {
        papel: "usuario",
        conteudo: `Profissão: ${params.profissao}\n\nDitado do profissional:\n<ditado>\n${params.transcricao}\n</ditado>`,
      },
    ],
  });
}
