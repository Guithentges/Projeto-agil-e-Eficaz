-- Supabase RLS Hardening - Vendas Pro
-- Copie este script e rode na interface SQL do Supabase (SQL Editor)

-- 1. Travar as tabelas para garantir RLS (Row-Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MateriaPrima" ENABLE ROW LEVEL SECURITY;

-- 2. Permitir que o usuário acesse SOMENTE o próprio profile
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 3. A inserção explícita de profiles e user_roles por chaves anônimas DEVE ser trancada.
-- Note: A criação de roles agora tem que ser gerida exclusivamente por nossa function SECURITY DEFINER (`02-supabase-auth-trigger.sql`) 
-- ou você garante que o Backend bloqueia isso.

-- Exemplos de proteção para outras tabelas vitais (adaptar conforme a modelagem já existente nas permissões):
-- Aqui forçaremos que só seja possível inserir/deletar Gasto onde auth.uid() for vinculado à empresaId no backend.
-- Se já existem policies, pule este passo de Gastos.
