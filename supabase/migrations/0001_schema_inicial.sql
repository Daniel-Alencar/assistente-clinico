-- Schema inicial do Assistente Clínico.
-- Cada profissional só enxerga os próprios dados (RLS por auth.uid()).
-- Webhooks e cron usam a service role, que ignora RLS.

create extension if not exists "pgcrypto";

-- Profissional = usuário autenticado (1:1 com auth.users)
create table public.profissionais (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  profissao text not null check (profissao in ('psicologo', 'medico', 'outro')),
  registro_conselho text,           -- CRP / CRM
  telefone text,
  valor_sessao_padrao numeric(10, 2),
  fuso_horario text not null default 'America/Sao_Paulo',
  criado_em timestamptz not null default now()
);

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  nome text not null,
  telefone_whatsapp text,           -- formato E.164 sem "+", ex: 5511999998888
  email text,
  cpf text,
  data_nascimento date,
  aceita_whatsapp boolean not null default false, -- consentimento explícito (LGPD)
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index on public.pacientes (profissional_id);
create index on public.pacientes (telefone_whatsapp);

create type public.status_consulta as enum (
  'agendada', 'confirmada', 'cancelada', 'realizada', 'falta'
);

create table public.consultas (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  inicio timestamptz not null,
  duracao_min integer not null default 50,
  modalidade text not null default 'presencial' check (modalidade in ('presencial', 'online')),
  status public.status_consulta not null default 'agendada',
  valor numeric(10, 2),
  lembrete_enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.consultas (profissional_id, inicio);
create index on public.consultas (inicio) where lembrete_enviado_em is null;

-- Evolução / registro de sessão (dado sensível)
create table public.evolucoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  consulta_id uuid references public.consultas (id) on delete set null,
  transcricao text,                 -- ditado do profissional, não a sessão gravada
  conteudo jsonb not null,          -- evolução estruturada gerada pela IA
  revisada boolean not null default false, -- só vale como prontuário após revisão humana
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.evolucoes (paciente_id, criado_em desc);

create type public.status_cobranca as enum (
  'pendente', 'paga', 'cancelada', 'expirada', 'estornada'
);

create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  consulta_id uuid references public.consultas (id) on delete set null,
  valor numeric(10, 2) not null,
  status public.status_cobranca not null default 'pendente',
  mp_payment_id text unique,
  pix_copia_e_cola text,
  pix_qr_base64 text,
  pago_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.cobrancas (profissional_id, status);

-- Log de mensagens de WhatsApp (auditoria e custo)
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid references public.profissionais (id) on delete cascade,
  paciente_id uuid references public.pacientes (id) on delete set null,
  direcao text not null check (direcao in ('saida', 'entrada')),
  tipo text not null,               -- lembrete, recibo, resposta...
  provedor text not null,
  provedor_message_id text,
  conteudo text,
  criado_em timestamptz not null default now()
);
create index on public.mensagens (profissional_id, criado_em desc);

-- RLS
alter table public.profissionais enable row level security;
alter table public.pacientes enable row level security;
alter table public.consultas enable row level security;
alter table public.evolucoes enable row level security;
alter table public.cobrancas enable row level security;
alter table public.mensagens enable row level security;

create policy "proprio perfil" on public.profissionais
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "dados do profissional" on public.pacientes
  for all using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dados do profissional" on public.consultas
  for all using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dados do profissional" on public.evolucoes
  for all using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "dados do profissional" on public.cobrancas
  for all using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
create policy "leitura do profissional" on public.mensagens
  for select using (profissional_id = auth.uid());
