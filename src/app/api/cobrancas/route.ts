import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { CobrancaInvalidaError, cobrarConsulta } from "@/lib/dominio/cobrancas";
import { bloqueioDeEscrita } from "@/lib/servidor";

const Entrada = z.object({ consultaId: z.uuid() });

export async function POST(req: NextRequest) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const bloqueio = await bloqueioDeEscrita(supabase, user.id);
  if (bloqueio) return NextResponse.json({ erro: bloqueio }, { status: 403 });

  const entrada = Entrada.safeParse(await req.json());
  if (!entrada.success) {
    return NextResponse.json({ erro: z.prettifyError(entrada.error) }, { status: 400 });
  }

  try {
    // Cliente do usuário (RLS): só consegue cobrar consultas que são dele.
    const cobranca = await cobrarConsulta(supabase, entrada.data.consultaId);
    return NextResponse.json(cobranca, { status: 201 });
  } catch (erro) {
    if (erro instanceof CobrancaInvalidaError) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }
    console.error("Falha ao criar cobrança", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao criar cobrança" },
      { status: 500 },
    );
  }
}
