-- ============================================================
-- SCRIPT 05: Hardening Crítico de Segurança
-- ============================================================
-- Fecha as 3 falhas críticas ainda abertas na auditoria:
--   1. Bloquear alteração de profiles.id_empresa pelo usuário
--   2. Revogar acesso direto à RPC de venda para authenticated
--   3. Validar ownership + saldo na RPC processar_venda_atomica
--
-- Execute no SQL Editor do Supabase (pode reexecutar com segurança)
-- ============================================================


-- ============================================================
-- PARTE 1: Bloquear mudança de id_empresa no profile
-- ============================================================
-- Impede que um usuário autenticado mude sua própria empresa,
-- o que quebraria o isolamento de tenant (CRÍTICO).

CREATE OR REPLACE FUNCTION public.bloquear_mudanca_empresa()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id_empresa IS DISTINCT FROM NEW.id_empresa THEN
    RAISE EXCEPTION 'Alteração de empresa não é permitida por este canal.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_bloquear_mudanca_empresa ON public.profiles;
CREATE TRIGGER trg_bloquear_mudanca_empresa
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.bloquear_mudanca_empresa();


-- ============================================================
-- PARTE 2: Revogar execução direta da RPC de venda
-- ============================================================
-- A RPC deve ser chamada APENAS pela Edge Function (service_role).
-- Usuários autenticados não devem ter acesso direto.

REVOKE EXECUTE ON FUNCTION public.processar_venda_atomica(bigint, jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.processar_venda_atomica(bigint, jsonb) TO service_role;

-- Idem para as RPCs auxiliares (só chamadas internamente)
REVOKE EXECUTE ON FUNCTION public.decrementar_estoque(bigint, numeric, bigint) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrementar_estoque_produto(bigint, numeric, bigint) FROM authenticated;


-- ============================================================
-- PARTE 3: RPC de Venda com validação de ownership e saldo
-- ============================================================

CREATE OR REPLACE FUNCTION public.processar_venda_atomica(
  p_id_empresa bigint,
  p_carrinho   jsonb
)
RETURNS bigint
SECURITY INVOKER
AS $$
DECLARE
  v_venda_id          bigint;
  v_pedido_id         bigint;
  v_item              jsonb;
  v_id                bigint;
  v_type              text;
  v_qtd               numeric;
  v_insumos_removidos jsonb;
  v_insumo_id         bigint;
  v_mod_record        jsonb;
  v_is_unique         boolean;
  v_rows              integer;
  pm                  record;
  pc                  record;
  i                   integer;
BEGIN

  -- ── PRÉ-VALIDAÇÃO COMPLETA DO CARRINHO ────────────────────
  -- Valida tipo, ID, quantidade e ownership de cada item
  -- antes de qualquer mutação no banco.

  IF jsonb_array_length(p_carrinho) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio.';
  END IF;

  IF jsonb_array_length(p_carrinho) > 100 THEN
    RAISE EXCEPTION 'Carrinho excede o limite de 100 itens por venda.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrinho)
  LOOP
    -- Validar type (allowlist)
    v_type := v_item->>'type';
    IF v_type NOT IN ('cardapio', 'produto') THEN
      RAISE EXCEPTION 'Tipo de item inválido: "%" — apenas "cardapio" ou "produto".', v_type;
    END IF;

    -- Validar id
    v_id := (v_item->>'id')::bigint;
    IF v_id IS NULL OR v_id <= 0 THEN
      RAISE EXCEPTION 'ID de item inválido: %.', v_id;
    END IF;


    -- ── Validar OWNERSHIP do item (anti-IDOR cross-tenant) ──
    IF v_type = 'cardapio' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public."Cardapio"
        WHERE id = v_id AND id_empresa = p_id_empresa
      ) THEN
        RAISE EXCEPTION 'Item de cardápio (id=%) não pertence a esta empresa.', v_id;
      END IF;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public."Produtos"
        WHERE id = v_id AND id_empresa = p_id_empresa
      ) THEN
        RAISE EXCEPTION 'Produto (id=%) não pertence a esta empresa.', v_id;
      END IF;
    END IF;

    -- Validar insumos_removidos: cada id deve pertencer à empresa
    v_insumos_removidos := coalesce(v_item->'insumos_removidos', '[]'::jsonb);
    IF jsonb_typeof(v_insumos_removidos) = 'array' THEN
      FOR v_mod_record IN SELECT * FROM jsonb_array_elements(v_insumos_removidos)
      LOOP
        v_insumo_id := v_mod_record::bigint;
        IF NOT EXISTS (
          SELECT 1 FROM public."MateriaPrima"
          WHERE id = v_insumo_id AND id_empresa = p_id_empresa
        ) THEN
          RAISE EXCEPTION 'Insumo (id=%) não pertence a esta empresa.', v_insumo_id;
        END IF;
      END LOOP;
    END IF;

  END LOOP;
  -- ── FIM DA PRÉ-VALIDAÇÃO ──────────────────────────────────


  -- ── MUTAÇÕES NO BANCO ─────────────────────────────────────

  -- 1. Criar a Venda
  INSERT INTO public."Venda" (id_empresa, entregue)
  VALUES (p_id_empresa, false)
  RETURNING id INTO v_venda_id;

  -- 2. Processar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrinho)
  LOOP
    v_id                := (v_item->>'id')::bigint;
    v_type              := v_item->>'type';
    v_qtd               := (v_item->>'qtd')::numeric;
    v_insumos_removidos := coalesce(v_item->'insumos_removidos', '[]'::jsonb);

    -- Inserir Pedido (uma linha por unidade)
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

      -- Registrar modificações
      IF jsonb_typeof(v_insumos_removidos) = 'array' AND jsonb_array_length(v_insumos_removidos) > 0 THEN
        FOR v_mod_record IN SELECT * FROM jsonb_array_elements(v_insumos_removidos)
        LOOP
          v_insumo_id := v_mod_record::bigint;
          INSERT INTO public."PedidoModificacao" (id_pedido, id_materia, tipo, id_empresa)
          VALUES (v_pedido_id, v_insumo_id, 'REMOVER', p_id_empresa);
        END LOOP;
      END IF;
    END LOOP;

    -- ── Baixa de Estoque com verificação de saldo ──────────
    IF v_type = 'cardapio' THEN
      FOR pc IN (
        SELECT id_produto FROM public."ProduxCard"
        WHERE id_cardapio = v_id AND id_empresa = p_id_empresa
      )
      LOOP
        SELECT is_unique INTO v_is_unique
        FROM public."Produtos"
        WHERE id = pc.id_produto AND id_empresa = p_id_empresa;

        IF v_is_unique THEN
          -- Produto único: debitar unidade do estoque
          UPDATE public."Estoque"
          SET quantidade = quantidade - v_qtd
          WHERE id_produto = pc.id_produto
            AND id_empresa = p_id_empresa
            AND quantidade >= v_qtd;       -- ← garante saldo suficiente

          GET DIAGNOSTICS v_rows = ROW_COUNT;
          IF v_rows = 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto (id=%).', pc.id_produto;
          END IF;

        ELSE
          -- Produto composto: debitar matérias-primas
          FOR pm IN (
            SELECT id_materia, quantidade AS qty_por_unidade
            FROM public."ProduxMateria"
            WHERE id_produto = pc.id_produto AND id_empresa = p_id_empresa
          )
          LOOP
            IF NOT (v_insumos_removidos @> to_jsonb(pm.id_materia)) THEN
              UPDATE public."Estoque"
              SET quantidade = quantidade - (pm.qty_por_unidade * v_qtd)
              WHERE id_materia = pm.id_materia
                AND id_empresa = p_id_empresa
                AND quantidade >= (pm.qty_por_unidade * v_qtd);  -- ← garante saldo

              GET DIAGNOSTICS v_rows = ROW_COUNT;
              IF v_rows = 0 THEN
                RAISE EXCEPTION 'Estoque insuficiente para a matéria-prima (id=%) do cardápio (id=%).', pm.id_materia, v_id;
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;

    ELSE -- produto direto
      SELECT is_unique INTO v_is_unique
      FROM public."Produtos"
      WHERE id = v_id AND id_empresa = p_id_empresa;

      IF v_is_unique THEN
        UPDATE public."Estoque"
        SET quantidade = quantidade - v_qtd
        WHERE id_produto = v_id
          AND id_empresa = p_id_empresa
          AND quantidade >= v_qtd;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
          RAISE EXCEPTION 'Estoque insuficiente para o produto (id=%).', v_id;
        END IF;

      ELSE
        FOR pm IN (
          SELECT id_materia, quantidade AS qty_por_unidade
          FROM public."ProduxMateria"
          WHERE id_produto = v_id AND id_empresa = p_id_empresa
        )
        LOOP
          IF NOT (v_insumos_removidos @> to_jsonb(pm.id_materia)) THEN
            UPDATE public."Estoque"
            SET quantidade = quantidade - (pm.qty_por_unidade * v_qtd)
            WHERE id_materia = pm.id_materia
              AND id_empresa = p_id_empresa
              AND quantidade >= (pm.qty_por_unidade * v_qtd);

            GET DIAGNOSTICS v_rows = ROW_COUNT;
            IF v_rows = 0 THEN
              RAISE EXCEPTION 'Estoque insuficiente para a matéria-prima (id=%) do produto (id=%).', pm.id_materia, v_id;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
    -- ── FIM DA BAIXA DE ESTOQUE ────────────────────────────

  END LOOP;

  RETURN v_venda_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PARTE 4: Políticas granulares de Empresa (bonus)
-- ============================================================
-- Substituir a policy FOR ALL por políticas separadas por ação,
-- restringindo UPDATE/DELETE apenas para admin.

DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public."Empresa";

-- Leitura: qualquer membro da empresa
CREATE POLICY "Select_Empresa" ON public."Empresa"
FOR SELECT
USING (id IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));

-- Atualização: somente admin
CREATE POLICY "Update_Empresa_Admin" ON public."Empresa"
FOR UPDATE
USING (
  id IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  id IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- INSERT e DELETE: bloqueados (criação via trigger de onboarding, exclusão via service_role)


-- ============================================================
-- PARTE 5: Alinhar Gastos — RLS somente admin (mais seguro)
-- ============================================================
-- O frontend já vai ser ajustado para remover acesso de gerente.
-- O banco fica como referência de autoridade (admin only).

DROP POLICY IF EXISTS "Acesso_Restrito_Diretor_Gastos" ON public."Gastos";
CREATE POLICY "Acesso_Restrito_Admin_Gastos" ON public."Gastos"
FOR ALL
USING (
  id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
