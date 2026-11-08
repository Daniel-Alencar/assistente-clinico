import Link from "next/link";
import { botaoPrimario } from "@/components/estilos";
import { IconeCheck, IconeIA, IconePix, IconeWhatsApp } from "@/components/icones";
import { Logo } from "@/components/logo";

const RECURSOS = [
  {
    icone: IconeWhatsApp,
    titulo: "Lembretes no WhatsApp",
    texto: "O paciente recebe o lembrete na véspera e confirma ou cancela com um toque. A agenda se atualiza sozinha.",
  },
  {
    icone: IconeIA,
    titulo: "Evolução escrita pela IA",
    texto: "Dite um resumo da sessão pelo celular. A IA organiza temas, intervenções e plano. Você só revisa.",
  },
  {
    icone: IconePix,
    titulo: "Cobrança via Pix",
    texto: "Um clique gera o Pix e envia ao paciente. Quando ele paga, você vê na hora e o recibo é enviado.",
  },
];

export default function Inicio() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-marca-fundo via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <Link href="/login" className="text-sm font-semibold text-stone-700 hover:text-marca">
          Entrar
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full bg-marca-clara px-3 py-1 text-sm font-semibold text-marca-escura">
              Para psicólogos e médicos autônomos
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              Seu consultório no piloto automático.
            </h1>
            <p className="max-w-lg text-lg text-stone-600">
              Agenda, lembretes no WhatsApp, evolução com IA e cobrança via Pix em um só lugar. Simples de
              usar, com tudo incluído no plano.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login?modo=criar" className={`${botaoPrimario} px-6 py-3 text-base`}>
                Começar grátis
              </Link>
              <a href="#recursos" className="font-semibold text-stone-700 hover:text-marca">
                Ver recursos →
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
              {["Sem cartão para testar", "Sem limite de mensagens", "Seus dados sempre acessíveis"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconeCheck className="size-4 text-marca" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <PreviaApp />
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Feito para a rotina de quem atende</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <article key={titulo} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-xl bg-marca-fundo text-marca">
                  <Icone className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{titulo}</h3>
                <p className="mt-2 text-stone-600">{texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-marca px-6 py-14 text-center text-white">
            <h2 className="max-w-xl text-3xl font-bold tracking-tight">Um plano. Tudo incluído.</h2>
            <p className="max-w-lg text-marca-clara">
              Sem créditos, sem módulos extras e sem surpresa na fatura. Teste grátis e veja quanto tempo você
              ganha na primeira semana.
            </p>
            <Link
              href="/login?modo=criar"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-marca shadow-sm transition hover:bg-marca-fundo"
            >
              Criar minha conta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} Assistente Clínico · Dados protegidos conforme a LGPD
      </footer>
    </div>
  );
}

/** Ilustração estática do produto (não usa dados reais). */
function PreviaApp() {
  const consultas = [
    { hora: "09:00", nome: "Ana Souza", status: "Confirmada", cor: "bg-blue-100 text-blue-800" },
    { hora: "10:00", nome: "Bruno Lima", status: "Realizada", cor: "bg-green-100 text-green-800" },
    { hora: "11:00", nome: "Carla Mendes", status: "Agendada", cor: "bg-stone-100 text-stone-700" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-marca-clara/50 blur-2xl" />
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold text-marca">Hoje · terça-feira</p>
        <ul className="mt-3 divide-y divide-stone-100">
          {consultas.map((c) => (
            <li key={c.hora} className="flex items-center justify-between py-3">
              <span>
                <span className="font-semibold">{c.hora}</span> · {c.nome}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.cor}`}>{c.status}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-marca-fundo p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-marca">
            <IconeIA className="size-4" /> Evolução gerada
          </p>
          <p className="mt-1.5 text-sm text-stone-700">
            Paciente relata melhora do sono e menor ansiedade antes do trabalho. Trabalhada reestruturação
            cognitiva; plano: registro de pensamentos.
          </p>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg">
        <span className="flex size-7 items-center justify-center rounded-full bg-green-100 text-green-700">
          <IconeWhatsApp className="size-4" />
        </span>
        Ana confirmou pelo WhatsApp
      </div>
    </div>
  );
}
