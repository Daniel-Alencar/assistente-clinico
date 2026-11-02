import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  EvolucaoRecusadaError,
  IaIndisponivelError,
  IaNaoConfiguradaError,
  type EntradaProvedor,
} from "../tipos";

/**
 * A camada gratuita do Gemini às vezes responde "alta demanda" (503) para um modelo
 * e funciona em outro, então tentamos uma lista em ordem.
 * Atenção: na camada gratuita o Google pode usar os dados enviados para treinar modelos.
 * Use apenas dados fictícios nela; com pacientes reais, use a camada paga.
 */
const MODELOS_RESERVA = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

export async function gerarComGemini<T>(
  esquema: z.ZodType<T>,
  { sistema, mensagens }: EntradaProvedor,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new IaNaoConfiguradaError("GEMINI_API_KEY ausente");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 60_000, retryOptions: { attempts: 1 } },
  });
  const modelos = [...new Set([process.env.GEMINI_MODEL, ...MODELOS_RESERVA].filter(Boolean))] as string[];

  let ultimoErro: unknown;
  for (const model of modelos) {
    try {
      const resposta = await ai.models.generateContent({
        model,
        contents: mensagens.map((m) => ({
          role: m.papel === "usuario" ? "user" : "model",
          parts: [{ text: m.conteudo }],
        })),
        config: {
          systemInstruction: sistema,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(esquema),
        },
      });

      if (resposta.promptFeedback?.blockReason || !resposta.text) {
        throw new EvolucaoRecusadaError(
          "O Gemini bloqueou ou não gerou a resposta. Revise o texto e tente novamente.",
        );
      }
      const resultado = esquema.safeParse(JSON.parse(resposta.text));
      if (!resultado.success) throw new Error(`Gemini (${model}) devolveu resposta fora do formato.`);
      return resultado.data;
    } catch (erro) {
      if (erro instanceof ApiError) {
        const chaveInvalida = erro.status === 400 && /api key/i.test(erro.message);
        if (chaveInvalida || erro.status === 401 || erro.status === 403) {
          throw new IaNaoConfiguradaError(`Chave do Gemini inválida ou sem permissão: ${erro.message}`);
        }
        if (erro.status === 404 || erro.status === 429 || erro.status >= 500) {
          console.warn(`Gemini ${model} indisponível (${erro.status}), tentando o próximo modelo.`);
          ultimoErro = erro;
          continue;
        }
      }
      throw erro;
    }
  }
  throw new IaIndisponivelError(`Todos os modelos do Gemini estão indisponíveis: ${String(ultimoErro)}`);
}
