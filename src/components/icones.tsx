// Ícones em SVG inline (traço), no estilo Lucide, para não adicionar dependência.
type Props = { className?: string };

function Icone({ className = "size-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconeAgenda = (p: Props) => (
  <Icone {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icone>
);

export const IconePacientes = (p: Props) => (
  <Icone {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icone>
);

export const IconeEvolucao = (p: Props) => (
  <Icone {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icone>
);

export const IconePerfil = (p: Props) => (
  <Icone {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icone>
);

export const IconeWhatsApp = (p: Props) => (
  <Icone {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Icone>
);

export const IconeIA = (p: Props) => (
  <Icone {...p}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </Icone>
);

export const IconePix = (p: Props) => (
  <Icone {...p}>
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M2 11h20M6 15h4" />
  </Icone>
);

export const IconeCheck = (p: Props) => (
  <Icone {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icone>
);

export const IconeEmail = (p: Props) => (
  <Icone {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </Icone>
);

export const IconeMais = (p: Props) => (
  <Icone {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
);

export const IconeSair = (p: Props) => (
  <Icone {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </Icone>
);

export const IconeVideo = (p: Props) => (
  <Icone {...p}>
    <path d="m16 13 5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Icone>
);

export const IconeLocal = (p: Props) => (
  <Icone {...p}>
    <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icone>
);

export const IconeBusca = (p: Props) => (
  <Icone {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icone>
);

export const IconeReticencias = (p: Props) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </Icone>
);

export const IconeSetaDireita = (p: Props) => (
  <Icone {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Icone>
);

export const IconeDinheiro = (p: Props) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1 1.7 3 2 3 1 3 2-1.3 2-3 2c-1.4 0-2.6-.6-3-1.5M12 6v2M12 16v2" />
  </Icone>
);
