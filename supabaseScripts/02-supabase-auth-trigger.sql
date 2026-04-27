  -- Supabase Auth Trigger (Security Definer) - Vendas Pro
  -- Rode este código no SQL Editor do Supabase para tratar automaticamente do registro seguro.

  -- Essa função cria a Empresa, o Profile e Atribui a Role Admin automaticamente
  -- usando privilégios elevados apenas durante esse fluxo. O Client/Navegador NUNCA dita as regras.

  CREATE OR REPLACE FUNCTION public.handle_new_tenant() 
  RETURNS trigger
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_empresa_id bigint;
    v_empresa_nome text;
    v_user_nome text;
  BEGIN
    -- Extraindo variaveis do raw_user_meta_data populadas durante o auth.signUp() do React
    v_empresa_nome := new.raw_user_meta_data->>'empresa_nome';
    v_user_nome := new.raw_user_meta_data->>'nome';

    IF v_empresa_nome IS NOT NULL AND v_empresa_nome <> '' THEN
        -- Cria Empresa e colhe o ID
        INSERT INTO public."Empresa" ("Nome") 
        VALUES (v_empresa_nome)
        RETURNING id INTO v_empresa_id;

        -- Vincula o novo Profile a empresa
        INSERT INTO public.profiles (id, nome, id_empresa)
        VALUES (new.id, v_user_nome, v_empresa_id);

        -- Concede role 'admin' para ele liderar própria empresa criadamente
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'admin');
    END IF;

    RETURN new;
  END;
  $$ LANGUAGE plpgsql;

  -- Acoplando na tabela do auth do Supabase
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

  -- Obs: Importante ter cuidado que 'SECURITY DEFINER' fará o código desobedecer o RLS (isso é intencional nesse caso específico do onboarding).
