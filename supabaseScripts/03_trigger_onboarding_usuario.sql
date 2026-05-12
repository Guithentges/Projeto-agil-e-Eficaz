-- ==========================================
-- TRIGGER: Onboarding automático de novos usuários (versão corrigida)
-- ==========================================
-- CORREÇÃO: Adicionado SET search_path = public para garantir contexto correto
-- no Supabase ao rodar como trigger de auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id bigint;
  v_nome text;
  v_empresa_nome text;
BEGIN
  -- Desabilitar RLS dentro desta função (SECURITY DEFINER roda como postgres)
  SET LOCAL row_security = off;

  -- Extrair nome e empresa do metadata do usuário
  v_nome       := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  v_empresa_nome := COALESCE(NEW.raw_user_meta_data->>'empresa_nome', 'Minha Empresa');

  -- 1. Criar a Empresa
  INSERT INTO public."Empresa" ("Nome")
  VALUES (v_empresa_nome)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o Profile vinculado ao usuário e à empresa
  INSERT INTO public.profiles (id, nome, id_empresa)
  VALUES (NEW.id, v_nome, v_empresa_id);

  -- 3. Atribuir role de admin ao novo usuário (dono da empresa)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user falhou para uid=%: [%] %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
