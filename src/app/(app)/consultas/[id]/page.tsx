import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelarSerie, excluirConsulta } from "@/app/(app)/acoes";
import { botaoSecundario, cartao } from "@/components/estilos";
import { CabecalhoPagina, Secao, Selo } from "@/components/ui";
import { utcParaHorarioLocal } from "@/lib/dominio/formatacao";
import { usuarioAtual } from "@/lib/servidor";
import { ROTULO_STATUS, TOM_STATUS, type StatusConsulta } from "../../agenda/status";
import { FormularioEditarConsulta } from "./formulario";

export default async function EditarConsulta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await usuarioAtual();
  const [{ data: consulta }, { data: perfil }] = await Promise.all([
    supabase
      .from("consultas")
      .select("id, inicio, duracao_min, modalidade, valor, status, serie_id, paciente:pacientes(id, nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profissionais").select("fuso_horario").eq("id", user.id).single(),
  ]);
  if (!consulta) notFound();

  const fuso = perfil?.fuso_horario ?? "America/Sao_Paulo";
  const { data, hora } = utcParaHorarioLocal(consulta.inicio, fuso);
  const paciente = consulta.paciente as unknown as { id: string; nome: string } | null;
  const status = consulta.status as StatusConsulta;
  const podeExcluir = ["agendada", "confirmada", "cancelada"].includes(status);
  const serieAtiva = consulta.serie_id && ["agendada", "confirmada"].includes(status);

  return (
    <>
      <CabecalhoPagina
        titulo="Editar consulta"
        descricao={paciente?.nome}
        antes={
          <Link href="/agenda" className="text-sm text-stone-500 hover:text-marca">
            ← Agenda
          </Link>
        }
        acoes={
          <Selo tom={TOM_STATUS[status]} ponto>
            {ROTULO_STATUS[status]}
          </Selo>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cartao} p-6 lg:col-span-2`}>
          <FormularioEditarConsulta
            id={consulta.id}
            data={data}
            hora={hora}
            duracao={consulta.duracao_min}
            modalidade={consulta.modalidade}
            valor={consulta.valor}
          />
          <p className="mt-4 text-xs text-stone-500">Ao mudar data ou hora, a consulta volta a “Agendada” e o lembrete é reenviado.</p>
        </div>
        <aside className="flex flex-col gap-6">
          {(serieAtiva || podeExcluir) && (
            <Secao titulo="Outras ações">
              <div className="flex flex-col items-start gap-3">
                {serieAtiva && (
                  <form action={cancelarSerie.bind(null, consulta.id)}>
                    <button className={botaoSecundario}>Cancelar esta e as próximas da série</button>
                  </form>
                )}
                {podeExcluir && (
                  <form action={excluirConsulta.bind(null, consulta.id)}>
                    <button className={`${botaoSecundario} text-red-700`}>Excluir consulta</button>
                  </form>
                )}
                <p className="text-xs text-stone-500">
                  Consultas realizadas ou com falta fazem parte do histórico e não podem ser excluídas.
                </p>
              </div>
            </Secao>
          )}
        </aside>
      </div>
    </>
  );
}
