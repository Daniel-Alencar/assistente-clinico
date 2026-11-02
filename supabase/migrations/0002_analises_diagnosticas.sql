-- Apoio ao diagnóstico: conversa entre o profissional e o agente de IA.
-- Guardada para auditoria e para o profissional retomar a análise depois.

create table public.analises_diagnosticas (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  -- [{ papel: "usuario" | "assistente", conteudo: text }]; respostas do assistente em JSON
  mensagens jsonb not null default '[]'::jsonb,
  -- Dados do paciente enviados à IA (idade, evoluções). Nunca inclui nome ou documentos.
  contexto text not null default '',
  resultado jsonb, -- última análise estruturada
  provedor_ia text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.analises_diagnosticas (paciente_id, criado_em desc);

alter table public.analises_diagnosticas enable row level security;

create policy "dados do profissional" on public.analises_diagnosticas
  for all using (profissional_id = auth.uid()) with check (profissional_id = auth.uid());
