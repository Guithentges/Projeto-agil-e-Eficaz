-- ==========================================
-- 1. CONSTRAINTS DE INTEGRIDADE DE DADOS
-- ==========================================

-- Impedir valores negativos em quantidades e valores financeiros
ALTER TABLE public."Estoque" DROP CONSTRAINT IF EXISTS ck_quantidade_positiva;
ALTER TABLE public."Estoque" ADD CONSTRAINT ck_quantidade_positiva CHECK (quantidade >= 0);

ALTER TABLE public."Cardapio" DROP CONSTRAINT IF EXISTS ck_valor_positivo;
ALTER TABLE public."Cardapio" ADD CONSTRAINT ck_valor_positivo CHECK ("Valor" >= 0);

ALTER TABLE public."Gastos" DROP CONSTRAINT IF EXISTS ck_gasto_valor_positivo;
ALTER TABLE public."Gastos" ADD CONSTRAINT ck_gasto_valor_positivo CHECK ("Valor" >= 0);

ALTER TABLE public."MateriaPrima" DROP CONSTRAINT IF EXISTS ck_custo_positivo;
ALTER TABLE public."MateriaPrima" ADD CONSTRAINT ck_custo_positivo CHECK ("Custo" >= 0);

ALTER TABLE public."Produtos" DROP CONSTRAINT IF EXISTS ck_preco_venda_positivo;
ALTER TABLE public."Produtos" ADD CONSTRAINT ck_preco_venda_positivo CHECK ("Preco_venda" >= 0);

ALTER TABLE public."Produtos" DROP CONSTRAINT IF EXISTS ck_custo_produto_positivo;
ALTER TABLE public."Produtos" ADD CONSTRAINT ck_custo_produto_positivo CHECK ("Custo" >= 0);

ALTER TABLE public."PedidoModificacao" DROP CONSTRAINT IF EXISTS ck_modificacao_quantidade_positiva;
ALTER TABLE public."PedidoModificacao" ADD CONSTRAINT ck_modificacao_quantidade_positiva CHECK (quantidade >= 0);

ALTER TABLE public."ProduxMateria" DROP CONSTRAINT IF EXISTS ck_produx_quantidade_positiva;
ALTER TABLE public."ProduxMateria" ADD CONSTRAINT ck_produx_quantidade_positiva CHECK (quantidade >= 0);


-- ==========================================
-- 2. STORED PROCEDURES (RPCs)
-- ==========================================

-- Decrementar estoque de Matéria Prima
CREATE OR REPLACE FUNCTION public.decrementar_estoque(p_id_materia bigint, p_quantidade numeric, p_id_empresa bigint)
RETURNS void 
SECURITY INVOKER
AS $$
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade a decrementar deve ser maior que zero.';
  END IF;

  UPDATE public."Estoque" 
  SET quantidade = quantidade - p_quantidade 
  WHERE id_materia = p_id_materia AND id_empresa = p_id_empresa;
END;
$$ LANGUAGE plpgsql;

-- Decrementar estoque de Produto Acabado
CREATE OR REPLACE FUNCTION public.decrementar_estoque_produto(p_id_produto bigint, p_quantidade numeric, p_id_empresa bigint)
RETURNS void 
SECURITY INVOKER
AS $$
BEGIN
  IF p_quantidade <= 0 THEN
    RAISE EXCEPTION 'A quantidade a decrementar deve ser maior que zero.';
  END IF;

  UPDATE public."Estoque" 
  SET quantidade = quantidade - p_quantidade 
  WHERE id_produto = p_id_produto AND id_empresa = p_id_empresa;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissão de execução para usuários autenticados (necessário para chamadas via Edge Function com JWT)
GRANT EXECUTE ON FUNCTION public.decrementar_estoque(bigint, numeric, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrementar_estoque_produto(bigint, numeric, bigint) TO authenticated;



-- ==========================================
-- 3. RPC TRANSACIONAL: Venda Atômica
-- ==========================================
-- Substitui a inteligência do Edge Function, fazendo a venda e a baixa 
-- de estoque de forma transacional e à prova de race conditions.

CREATE OR REPLACE FUNCTION public.processar_venda_atomica(
  p_id_empresa bigint,
  p_carrinho jsonb
)
RETURNS bigint
SECURITY INVOKER
AS $$
DECLARE
  v_venda_id bigint;
  v_item jsonb;
  v_id bigint;
  v_type text;
  v_qtd numeric;
  v_is_unique boolean;
  v_insumos_removidos jsonb;
  v_insumo_id bigint;
  v_mod_record jsonb;
  v_pedido_id bigint;
  
  -- Iterators
  i int;
  pm record;
  pc record;
BEGIN
  -- 1. Criar a Venda
  INSERT INTO public."Venda" (id_empresa, entregue)
  VALUES (p_id_empresa, false)
  RETURNING id INTO v_venda_id;

  -- 2. Processar cada item do carrinho
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrinho)
  LOOP
    v_id := (v_item->>'id')::bigint;
    v_type := v_item->>'type';
    v_qtd := (v_item->>'qtd')::numeric;
    v_insumos_removidos := coalesce(v_item->'insumos_removidos', '[]'::jsonb);

    IF v_qtd <= 0 THEN
      RAISE EXCEPTION 'Quantidade invalida no carrinho.';
    END IF;

    -- Inserir Pedido "qtd" vezes
    FOR i IN 1..v_qtd LOOP
      IF v_type = 'cardapio' THEN
        INSERT INTO public."Pedido" (id_venda, id_cardapio, id_empresa)
        VALUES (v_venda_id, v_id, p_id_empresa)
        RETURNING id INTO v_pedido_id;
      ELSE
        INSERT INTO public."Pedido" (id_venda, id_produto, id_empresa)
        VALUES (v_venda_id, v_id, p_id_empresa)
        RETURNING id INTO v_pedido_id;
      END IF;

      -- Registrar as modificações de insumos removidos
      IF jsonb_typeof(v_insumos_removidos) = 'array' AND jsonb_array_length(v_insumos_removidos) > 0 THEN
        FOR v_mod_record IN SELECT * FROM jsonb_array_elements(v_insumos_removidos)
        LOOP
          v_insumo_id := v_mod_record::bigint;
          INSERT INTO public."PedidoModificacao" (id_pedido, id_materia, tipo, id_empresa)
          VALUES (v_pedido_id, v_insumo_id, 'REMOVER', p_id_empresa);
        END LOOP;
      END IF;
    END LOOP;

    -- Baixa no Estoque (Segura e Direta)
    IF v_type = 'cardapio' THEN
      FOR pc IN (SELECT id_produto FROM public."ProduxCard" WHERE id_cardapio = v_id AND id_empresa = p_id_empresa)
      LOOP
        SELECT is_unique INTO v_is_unique FROM public."Produtos" WHERE id = pc.id_produto AND id_empresa = p_id_empresa;
        
        IF v_is_unique THEN
          UPDATE public."Estoque" SET quantidade = quantidade - v_qtd
          WHERE id_produto = pc.id_produto AND id_empresa = p_id_empresa;
        ELSE
          FOR pm IN (SELECT id_materia, quantidade FROM public."ProduxMateria" WHERE id_produto = pc.id_produto AND id_empresa = p_id_empresa)
          LOOP
            IF NOT (v_insumos_removidos @> to_jsonb(pm.id_materia)) THEN
              UPDATE public."Estoque" SET quantidade = quantidade - (pm.quantidade * v_qtd)
              WHERE id_materia = pm.id_materia AND id_empresa = p_id_empresa;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    ELSE
      -- Produto direto
      SELECT is_unique INTO v_is_unique FROM public."Produtos" WHERE id = v_id AND id_empresa = p_id_empresa;
      
      IF v_is_unique THEN
        UPDATE public."Estoque" SET quantidade = quantidade - v_qtd
        WHERE id_produto = v_id AND id_empresa = p_id_empresa;
      ELSE
        FOR pm IN (SELECT id_materia, quantidade FROM public."ProduxMateria" WHERE id_produto = v_id AND id_empresa = p_id_empresa)
        LOOP
          IF NOT (v_insumos_removidos @> to_jsonb(pm.id_materia)) THEN
            UPDATE public."Estoque" SET quantidade = quantidade - (pm.quantidade * v_qtd)
            WHERE id_materia = pm.id_materia AND id_empresa = p_id_empresa;
          END IF;
        END LOOP;
      END IF;
    END IF;

  END LOOP;

  RETURN v_venda_id;
END;
$$ LANGUAGE plpgsql;

-- IMPORTANTE: Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.processar_venda_atomica(bigint, jsonb) TO authenticated;


-- ==========================================
-- 4. HABILITANDO ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilita RLS em todas as tabelas sensíveis
ALTER TABLE public."Cardapio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Empresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Estoque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MateriaPrima" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PedidoModificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Produtos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProduxCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProduxMateria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Venda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."idChatxidEmpresa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 5. POLÍTICAS DE RLS (Tenant Isolation)
-- ==========================================

-- Helper para Empresa
DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public."Empresa";
CREATE POLICY "Acesso_Propria_Empresa" ON public."Empresa"
FOR ALL USING (id IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (id IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));

-- Políticas Genéricas para as Tabelas Operacionais
DO $$ 
DECLARE 
  tabela text;
BEGIN 
  FOR tabela IN 
    SELECT unnest(ARRAY[
      'Cardapio', 'Categoria', 'Estoque', 'MateriaPrima', 'Pedido', 
      'PedidoModificacao', 'Produtos', 'ProduxCard', 'ProduxMateria', 
      'Venda', 'idChatxidEmpresa'
    ]) 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public.%I;', tabela);
    EXECUTE format('
      CREATE POLICY "Acesso_Propria_Empresa" ON public.%I
      FOR ALL USING (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));
    ', tabela);
  END LOOP;
END $$;


-- ==========================================
-- 6. POLÍTICAS DE RLS ESPECÍFICAS
-- ==========================================

-- GASTOS (Somente Diretores)
DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public."Gastos"; 
DROP POLICY IF EXISTS "Acesso_Restrito_Diretor_Gastos" ON public."Gastos";
CREATE POLICY "Acesso_Restrito_Diretor_Gastos" ON public."Gastos"
FOR ALL
USING (
  id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()) AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()) AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- PROFILES
-- ATENÇÃO: Não usar sub-SELECT em profiles dentro da própria policy de profiles (circular dependency).
-- Cada usuário pode ver o próprio perfil. Admins veem via service_role no backend.
DROP POLICY IF EXISTS "Ver_Colegas_Empresa" ON public."profiles";
CREATE POLICY "Ver_Colegas_Empresa" ON public."profiles"
FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Modificar_Proprio_Perfil" ON public."profiles";
CREATE POLICY "Modificar_Proprio_Perfil" ON public."profiles"
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- USER ROLES
DROP POLICY IF EXISTS "Leitura_propria_role" ON public."user_roles";
CREATE POLICY "Leitura_propria_role" ON public."user_roles"
FOR SELECT
USING (user_id = auth.uid());
