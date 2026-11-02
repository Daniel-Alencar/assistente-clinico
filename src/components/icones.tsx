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
