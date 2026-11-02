import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  EvolucaoRecusadaError,
  IaIndisponivelError,
  IaNaoConfiguradaError,
  type EntradaProvedor,
} from "../tipos";

export async function gerarComAnthropic<T>(
  esquema: z.ZodType<T>,
  { sistema, mensagens, esforco = "medium" }: EntradaProvedor,
): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY) throw new IaNaoConfiguradaError("ANTHROPIC_API_KEY ausente");

  try {
    const resposta = await new Anthropic().beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // se o modelo recusar, a API refaz a chamada em um modelo alternativo
      output_config: { effort: esforco, format: betaZodOutputFormat(esquema) },
      system: sistema,
      messages: mensagens.map((m) => ({
        role: m.papel === "usuario" ? ("user" as const) : ("assistant" as const),
        content: m.conteudo,
      })),
    });

    if (resposta.stop_reason === "refusal") {
      throw new EvolucaoRecusadaError(
        resposta.stop_details?.explanation ?? "O modelo recusou responder a esta solicitação.",
      );
    }
    if (!resposta.parsed_output) {
      throw new Error(`Resposta da IA fora do formato (stop_reason: ${resposta.stop_reason}).`);
    }
    return resposta.parsed_output as T;
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) throw new IaNaoConfiguradaError("Chave da Anthropic inválida");
    if (erro instanceof Anthropic.RateLimitError || erro instanceof Anthropic.InternalServerError) {
      throw new IaIndisponivelError("Anthropic indisponível no momento");
    }
    throw erro;
  }
}
