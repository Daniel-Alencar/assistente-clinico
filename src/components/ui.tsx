// Componentes visuais compartilhados da área logada.
import { cartao } from "./estilos";

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  antes,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  antes?: React.ReactNode; // ex.: link de voltar
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {antes}
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-[1.75rem]">{titulo}</h1>
        {descricao && <p className="text-stone-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

export function iniciais(nome: string) {
  const partes = nome.replace(/^(dra?\.?|dr\.?)\s+/i, "").trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

const CORES_AVATAR = [
  "bg-teal-100 text-teal-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
];

/** Avatar com iniciais; a cor é estável para o mesmo nome. */
export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" | "lg" }) {
  const cor = CORES_AVATAR[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length];
  const classe = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" }[tamanho];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${cor} ${classe}`}>
      {iniciais(nome)}
    </span>
  );
}

const TONS = {
  neutro: "bg-stone-100 text-stone-600 ring-stone-200",
  marca: "bg-marca-fundo text-marca-escura ring-marca/20",
  azul: "bg-sky-50 text-sky-700 ring-sky-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-700 ring-amber-200",
  vermelho: "bg-red-50 text-red-700 ring-red-200",
};
export type Tom = keyof typeof TONS;

export function Selo({ tom = "neutro", ponto, children }: { tom?: Tom; ponto?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONS[tom]}`}>
      {ponto && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Secao({
  titulo,
  acao,
  children,
  semPadding,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  semPadding?: boolean;
}) {
  return (
    <section className={cartao}>
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <h2 className="font-semibold text-stone-900">{titulo}</h2>
        {acao}
      </div>
      <div className={semPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-stone-500">{children}</p>;
}

export function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: React.ReactNode; detalhe?: string }) {
  return (
    <div className={`${cartao} px-5 py-4`}>
      <p className="text-sm text-stone-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-stone-900">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-stone-500">{detalhe}</p>}
    </div>
  );
}
