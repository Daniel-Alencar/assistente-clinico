import "server-only";
import { NextResponse } from "next/server";
import { EvolucaoRecusadaError, IaIndisponivelError, IaNaoConfiguradaError } from "./tipos";

/** Converte erros da camada de IA em respostas HTTP com mensagem clara para a tela. */
export function respostaErroIa(erro: unknown, acao: string) {
  if (erro instanceof EvolucaoRecusadaError) {
    return NextResponse.json({ erro: erro.message }, { status: 422 });
  }
  if (erro instanceof IaNaoConfiguradaError) {
    console.error("IA não configurada", erro);
    return NextResponse.json(
      { erro: "Serviço de IA não configurado. Verifique IA_PROVIDER e a chave do provedor." },
      { status: 503 },
    );
  }
  if (erro instanceof IaIndisponivelError) {
    console.warn(erro.message);
    return NextResponse.json(
      { erro: "O serviço de IA está sobrecarregado. Tente de novo em instantes." },
      { status: 503 },
    );
  }
  console.error(`Falha ao ${acao}`, erro);
  return NextResponse.json({ erro: `Falha ao ${acao}` }, { status: 500 });
}
