-- Itens do PENDENCIAS.md: assinatura do SaaS, Pix com a chave do profissional,
-- revisão e trava de evoluções, séries de consultas, consentimento de WhatsApp,
-- log de acesso a prontuário e limite de uso de IA.

-- ---------------------------------------------------------------- Profissionais
alter table public.profissionais
  add column cpf text,
  add column tipo_chave_pix text check (tipo_chave_pix in ('cpf_cnpj', 'celular', 'email', 'aleatoria')),
  add column chave_pix text,
  add column termos_aceitos_em timestamptz,
  add column termos_versao text,
  -- Assinatura da plataforma (o profissional paga o SaaS)
  add column assinatura_status text not null default 'teste'
    check (assinatura_status in ('teste', 'ativa', 'inadimplente', 'cancelada')),
  add column teste_ate timestamptz not null default (now() + interval '14 days'),
  add column mp_assinatura_id text unique,
  add column assinatura_atualizada_em timestamptz;

-- O profissional não pode alterar a própria assinatura pelo navegador:
-- esses campos só mudam pelo servidor (service role, via webhook).
create or replace function public.proteger_campos_assinatura()
returns trigger language plpgsql as $$
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Todo cadastro começa em teste, independente do que o navegador enviar.
    new.assinatura_status := 'teste';
    new.teste_ate := now() + interval '14 days';
    new.mp_assinatura_id := null;
  elsif new.assinatura_status is distinct from old.assinatura_status or
        new.teste_ate is distinct from old.teste_ate or
        new.mp_assinatura_id is distinct from old.mp_assinatura_id then
    raise exception 'Campos de assinatura só podem ser alterados pelo sistema';
  end if;
  return new;
end $$;

create trigger proteger_campos_assinatura
  before insert or update on public.profissionais
  for each row execute function public.proteger_campos_assinatura();

-- ---------------------------------------------------------------- Pacientes (consentimento LGPD)
alter table public.pacientes
  add column whatsapp_consentimento_em timestamptz,
  add column whatsapp_consentimento_origem text,
  add column whatsapp_descadastrado_em timestamptz;

update public.pacientes
  set whatsapp_consentimento_em = criado_em, whatsapp_consentimento_origem = 'informado_pelo_profissional'
  where aceita_whatsapp;

-- ---------------------------------------------------------------- Consultas (séries semanais)
alter table public.consultas add column serie_id uuid;
create index on public.consultas (serie_id) where serie_id is not null;

-- ---------------------------------------------------------------- Evoluções (revisão e trava)
alter table public.evolucoes add column revisada_em timestamptz;

-- Prontuário revisado não pode ser alterado nem apagado: correções viram nova evolução.
create or replace function public.travar_evolucao_revisada()
returns trigger language plpgsql as $$
begin
  -- Vale para o profissional; o sistema (service role) ainda pode apagar contas inteiras.
  if old.revisada and auth.role() = 'authenticated' then
    raise exception 'Evolução revisada não pode ser alterada nem excluída';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger travar_evolucao_revisada
  before update or delete on public.evolucoes
  for each row execute function public.travar_evolucao_revisada();

-- ---------------------------------------------------------------- Cobranças (Pix com a chave do profissional)
alter table public.cobrancas
  add column forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro')),
  add column descricao text;

-- ---------------------------------------------------------------- Log de acesso a prontuário
create table public.acessos_prontuario (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  paciente_id uuid references public.pacientes (id) on delete set null,
  recurso text not null,       -- evolucao, analise_diagnostica, paciente, exportacao
  recurso_id uuid,
  acao text not null,          -- ver, criar, editar, revisar, excluir, exportar
  criado_em timestamptz not null default now()
);
create index on public.acessos_prontuario (profissional_id, criado_em desc);
alter table public.acessos_prontuario enable row level security;
create policy "registrar proprio acesso" on public.acessos_prontuario
  for insert with check (profissional_id = auth.uid());
create policy "ver proprio log" on public.acessos_prontuario
  for select using (profissional_id = auth.uid());

-- ---------------------------------------------------------------- Uso de IA (limite diário)
create table public.uso_ia (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  tipo text not null,          -- evolucao, diagnostico
  criado_em timestamptz not null default now()
);
create index on public.uso_ia (profissional_id, criado_em desc);
alter table public.uso_ia enable row level security;
create policy "registrar proprio uso" on public.uso_ia
  for insert with check (profissional_id = auth.uid());
create policy "ver proprio uso" on public.uso_ia
  for select using (profissional_id = auth.uid());
