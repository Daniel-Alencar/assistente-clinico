import { NextResponse, type NextRequest } from "next/server";
import { gerarCsv } from "@/lib/dominio/csv";
import { horarioLocalParaUtc } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";

const FORMAS: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência", outro: "Outro" };

/** Pagamentos recebidos no mês, com CPF do paciente: base para o carnê-leão e o Receita Saúde. */
export async function GET(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes") ?? "";
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ erro: "Informe o mês no formato AAAA-MM" }, { status: 400 });

  const { data: perfil } = await supabase.from("profissionais").select("fuso_horario").eq("id", user.id).single();
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";
  const [a, m] = mes.split("-").map(Number);
  const proximo = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  const { data } = await supabase
    .from("cobrancas")
    .select("valor, pago_em, forma_pagamento, descricao, paciente:pacientes(nome, cpf)")
    .eq("status", "paga")
    .gte("pago_em", horarioLocalParaUtc(`${mes}-01`, "00:00", fuso)!.toISOString())
    .lt("pago_em", horarioLocalParaUtc(`${proximo}-01`, "00:00", fuso)!.toISOString())
    .order("pago_em");

  const linhas = (data ?? []).map((c) => {
    const p = c.paciente as unknown as { nome: string; cpf: string | null } | null;
    return [
      new Date(c.pago_em!).toLocaleDateString("pt-BR", { timeZone: fuso }),
      p?.nome ?? "",
      p?.cpf ?? "",
      Number(c.valor).toFixed(2).replace(".", ","),
      c.descricao ?? "",
      c.forma_pagamento ? (FORMAS[c.forma_pagamento] ?? c.forma_pagamento) : "",
    ];
  });
  const total = (data ?? []).reduce((s, c) => s + Number(c.valor), 0);
  linhas.push(["TOTAL", "", "", total.toFixed(2).replace(".", ","), "", ""]);

  const csv = gerarCsv(["Data do pagamento", "Paciente", "CPF do paciente", "Valor (R$)", "Descrição", "Forma de pagamento"], linhas);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recebimentos-${mes}.csv"`,
    },
  });
}
