import Link from "next/link";
import { botaoFantasma, botaoPrimario } from "@/components/estilos";
import { IconeMais } from "@/components/icones";
import { CabecalhoPagina } from "@/components/ui";
import { calcularIdade, formatarTelefone } from "@/lib/dominio/formatacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ListaPacientes } from "./lista-pacientes";

type Props = { searchParams: Promise<{ inativos?: string }> };

export default async function Pacientes({ searchParams }: Props) {
  const mostrarInativos = (await searchParams).inativos === "1";
  const supabase = await criarClienteServidor();
  const [{ data: pacientes }, { data: proximas }, { data: perfil }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nome, telefone_whatsapp, aceita_whatsapp, data_nascimento")
      .eq("ativo", !mostrarInativos)
      .order("nome"),
    supabase
      .from("consultas")
      .select("paciente_id, inicio")
      .in("status", ["agendada", "confirmada"])
      .gte("inicio", new Date().toISOString())
      .order("inicio"),
    supabase.from("profissionais").select("fuso_horario").single(),
  ]);
  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";

  const proximaPorPaciente = new Map<string, string>();
  for (const c of proximas ?? []) if (!proximaPorPaciente.has(c.paciente_id)) proximaPorPaciente.set(c.paciente_id, c.inicio);

  const itens = (pacientes ?? []).map((p) => {
    const proxima = proximaPorPaciente.get(p.id);
    return {
      id: p.id,
      nome: p.nome,
      idade: p.data_nascimento ? `${calcularIdade(p.data_nascimento)} anos` : null,
      telefone: p.telefone_whatsapp ? formatarTelefone(p.telefone_whatsapp) : null,
      aceitaWhatsapp: p.aceita_whatsapp,
      proximaConsulta: proxima
        ? new Date(proxima).toLocaleString("pt-BR", { timeZone: fuso, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : null,
    };
  });

  return (
    <>
      <CabecalhoPagina
        titulo={mostrarInativos ? "Pacientes inativos" : "Pacientes"}
        descricao={mostrarInativos ? "Pacientes desativados continuam com o histórico guardado." : "Cadastro, histórico e acompanhamento de cada paciente."}
        acoes={
          <>
            <Link href={mostrarInativos ? "/pacientes" : "/pacientes?inativos=1"} className={botaoFantasma}>
              {mostrarInativos ? "Ver ativos" : "Ver inativos"}
            </Link>
            <Link href="/pacientes/novo" className={botaoPrimario}>
              <IconeMais className="size-4" /> Novo paciente
            </Link>
          </>
        }
      />
      <ListaPacientes pacientes={itens} />
    </>
  );
}
