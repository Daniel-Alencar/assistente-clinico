import "server-only";
import type { z } from "zod";
import { gerarComAnthropic } from "./provedores/anthropic";
import { gerarComGemini } from "./provedores/gemini";
import { IaNaoConfiguradaError, type EntradaProvedor } from "./tipos";

/** Gera uma resposta no formato do esquema, com o provedor escolhido em IA_PROVIDER. */
export function gerarEstruturado<T>(esquema: z.ZodType<T>, entrada: EntradaProvedor): Promise<T> {
  switch (process.env.IA_PROVIDER ?? "anthropic") {
    case "gemini":
      return gerarComGemini(esquema, entrada);
    case "anthropic":
      return gerarComAnthropic(esquema, entrada);
    default:
      throw new IaNaoConfiguradaError(`IA_PROVIDER inválido: ${process.env.IA_PROVIDER}`);
  }
}
