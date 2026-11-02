export function Logo({ tamanho = 32, comNome = true, claro = false }: { tamanho?: number; comNome?: boolean; claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" className={claro ? "fill-white" : "fill-marca"} />
        <path
          d="M7 17h4.5l2.5-6 4 11 2.5-5H25"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={claro ? "stroke-marca" : "stroke-white"}
        />
      </svg>
      {comNome && (
        <span className={`text-lg font-bold tracking-tight ${claro ? "text-white" : "text-stone-900"}`}>
          Assistente Clínico
        </span>
      )}
    </span>
  );
}
