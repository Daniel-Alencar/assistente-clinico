// Esquemas das respostas da IA. Sem dependências de servidor: podem ser usados nas telas.
import { z } from "zod";

export const EvolucaoSchema = z.object({
  resumo: z.string().describe("Síntese da sessão em 2 a 4 frases"),
  temas_abordados: z.array(z.string()),
  intervencoes: z.array(z.string()).describe("Técnicas ou condutas aplicadas pelo profissional"),
  observacoes_clinicas: z.string().describe("Estado, afeto, comportamento observado"),
  plano_proxima_sessao: z.string(),
  alertas: z
    .array(z.string())
    .describe("Sinais de risco mencionados no ditado (ex.: ideação suicida). Vazio se nenhum."),
  pontos_a_confirmar: z
    .array(z.string())
    .describe("Trechos ambíguos que o profissional deve revisar antes de salvar"),
});
export type Evolucao = z.infer<typeof EvolucaoSchema>;

export const DiagnosticoSchema = z.object({
  resumo_clinico: z.string().describe("Síntese do quadro em linguagem técnica, só com o que foi relatado"),
  alertas_risco: z
    .array(z.string())
    .describe("Riscos que exigem atenção imediata (suicídio, autolesão, violência, psicose aguda, risco clínico). Vazio se nenhum."),
  hipoteses: z
    .array(
      z.object({
        nome: z.string(),
        codigo_cid11: z.string().describe("Código CID-11, ex.: 6A70"),
        referencia_dsm5tr: z.string().describe("Nome do transtorno no DSM-5-TR, se aplicável"),
        compatibilidade: z.enum(["alta", "moderada", "baixa"]),
        criterios_presentes: z.array(z.string()),
        criterios_a_investigar: z
          .array(z.string())
          .describe("Critérios ausentes ou ainda não verificados no relato"),
        justificativa: z.string(),
      }),
    )
    .describe("Hipóteses diagnósticas em ordem decrescente de compatibilidade (de 1 a 5)"),
  diferenciais_a_excluir: z
    .array(z.object({ condicao: z.string(), como_excluir: z.string() }))
    .describe("Causas orgânicas, uso de substâncias, efeitos de medicação e outros quadros a descartar"),
  perguntas_para_investigar: z
    .array(z.string())
    .describe("Perguntas objetivas que mais ajudariam a distinguir entre as hipóteses"),
  instrumentos_sugeridos: z
    .array(z.object({ nome: z.string(), finalidade: z.string() }))
    .describe("Escalas ou instrumentos validados no Brasil"),
  limitacoes: z.string().describe("O que falta para uma conclusão mais segura"),
});
export type Diagnostico = z.infer<typeof DiagnosticoSchema>;
