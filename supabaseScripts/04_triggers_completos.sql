-- ==========================================
-- SCRIPT COMPLETO DE TRIGGERS - Execute tudo de uma vez
-- ==========================================

-- -------------------------------------------------------
-- PARTE 1: Trigger de Categorias Padrão
-- (Deve existir ANTES do trigger de onboarding para ser 
--  ativado quando a Empresa for inserida)
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_categorias_padrao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Categoria" ("Nome", id_empresa) VALUES
    ('Materia prima',  NEW.id),
    ('Revenda',        NEW.id),
    ('Energia',        NEW.id),
    ('Aluguel',        NEW.id),
    ('Funcionários',   NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'criar_categorias_padrao falhou para empresa=%: [%] %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_categorias_padrao ON public."Empresa";
CREATE TRIGGER trg_categorias_padrao
AFTER INSERT ON public."Empresa"
FOR EACH ROW
EXECUTE FUNCTION public.criar_categorias_padrao();


-- -------------------------------------------------------
-- PARTE 2: Trigger de Onboarding do Usuário
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id bigint;
  v_nome text;
  v_empresa_nome text;
BEGIN
  v_nome       := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  v_empresa_nome := COALESCE(NEW.raw_user_meta_data->>'empresa_nome', 'Minha Empresa');

  -- 1. Criar a Empresa (isso vai disparar o trigger de categorias)
  INSERT INTO public."Empresa" ("Nome")
  VALUES (v_empresa_nome)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o Profile
  INSERT INTO public.profiles (id, nome, id_empresa)
  VALUES (NEW.id, v_nome, v_empresa_id);

  -- 3. Atribuir role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user falhou para uid=%: [%] %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- -------------------------------------------------------
-- PARTE 3: Garantir que as policies permitem INSERT
-- em profiles e user_roles (necessário quando RLS está ativo)
-- -------------------------------------------------------

-- Permitir que o trigger (rodando como postgres/superuser) insira profiles
-- Nota: SECURITY DEFINER como postgres já bypassa RLS, mas adicionamos
-- esta policy como fallback para Supabase hosted

DROP POLICY IF EXISTS "Insert_Proprio_Perfil" ON public.profiles;
CREATE POLICY "Insert_Proprio_Perfil" ON public.profiles
FOR INSERT
WITH CHECK (true);  -- O trigger garante segurança; o RLS já filtra SELECT/UPDATE

-- Permitir INSERT em user_roles pelo sistema (trigger)
DROP POLICY IF EXISTS "Insert_Role_Sistema" ON public.user_roles;
CREATE POLICY "Insert_Role_Sistema" ON public.user_roles
FOR INSERT
WITH CHECK (true);  -- Apenas o trigger de onboarding deve chamar isso
