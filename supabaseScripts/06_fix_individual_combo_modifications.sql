-- Migração para suporte a modificações individuais em itens de combo
-- Adiciona vínculo direto entre a modificação e a instância do produto no combo

-- 1. Adicionar a coluna na tabela PedidoModificacao
ALTER TABLE public."PedidoModificacao" 
ADD COLUMN IF NOT EXISTS id_produx_card bigint;

-- 2. Adicionar a restrição de chave estrangeira
ALTER TABLE public."PedidoModificacao"
ADD CONSTRAINT PedidoModificacao_id_produx_card_fkey 
FOREIGN KEY (id_produx_card) REFERENCES public."ProduxCard"(id) ON DELETE SET NULL;

-- 3. Atualizar a função RPC para usar a nova coluna
CREATE OR REPLACE FUNCTION public.processar_venda_v2(
    p_empresa_id bigint,
    p_carrinho jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venda_id bigint;
    v_item jsonb;
    v_mod jsonb;
    v_pedido_id bigint;
    v_prod_item RECORD;
    v_materia_item RECORD;
    v_is_unique boolean;
BEGIN
    -- Criar a Venda
    INSERT INTO public."Venda" (id_empresa, entregue)
    VALUES (p_empresa_id, false)
    RETURNING id INTO v_venda_id;

    -- Processar cada linha do carrinho
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_carrinho)
    LOOP
        -- Inserir Pedido (um por item do carrinho)
        INSERT INTO public."Pedido" (id_venda, id_empresa, id_cardapio, id_produto)
        VALUES (
            v_venda_id, 
            p_empresa_id, 
            CASE WHEN (v_item->>'type') = 'cardapio' THEN (v_item->>'id')::bigint ELSE NULL END,
            CASE WHEN (v_item->>'type') = 'produto' THEN (v_item->>'id')::bigint ELSE NULL END
        )
        RETURNING id INTO v_pedido_id;

        -- Registrar modificações (agora com id_produx_card)
        FOR v_mod IN SELECT * FROM jsonb_array_elements(v_item->'mods')
        LOOP
            INSERT INTO public."PedidoModificacao" (id_pedido, id_materia, tipo, id_empresa, quantidade, id_produx_card)
            VALUES (
                v_pedido_id, 
                (v_mod->>'id_materia')::bigint, 
                'REMOVER', 
                p_empresa_id, 
                1,
                NULLIF((v_mod->>'instance_id'), '0')::bigint -- Se for 0 (avulso), fica NULL
            );
        END LOOP;

        -- Baixa de Estoque
        IF (v_item->>'type') = 'produto' THEN
            SELECT is_unique INTO v_is_unique FROM public."Produtos" WHERE id = (v_item->>'id')::bigint;
            IF v_is_unique THEN
                UPDATE public."Estoque" SET quantidade = quantidade - (v_item->>'qtd')::bigint 
                WHERE id_produto = (v_item->>'id')::bigint AND id_empresa = p_empresa_id;
            ELSE
                FOR v_materia_item IN SELECT id_materia, quantidade FROM public."ProduxMateria" WHERE id_produto = (v_item->>'id')::bigint
                LOOP
                    -- Para avulsos, id_produx_card é NULL
                    IF NOT EXISTS (SELECT 1 FROM public."PedidoModificacao" WHERE id_pedido = v_pedido_id AND id_materia = v_materia_item.id_materia AND id_produx_card IS NULL) THEN
                        UPDATE public."Estoque" SET quantidade = quantidade - (v_materia_item.quantidade * (v_item->>'qtd')::bigint)
                        WHERE id_materia = v_materia_item.id_materia AND id_empresa = p_empresa_id;
                    END IF;
                END LOOP;
            END IF;
        ELSE
            -- COMBO: Varre os produtos do combo
            FOR v_prod_item IN SELECT id, id_produto FROM public."ProduxCard" WHERE id_cardapio = (v_item->>'id')::bigint
            LOOP
                FOR v_materia_item IN SELECT id_materia, quantidade FROM public."ProduxMateria" WHERE id_produto = v_prod_item.id_produto
                LOOP
                    -- Agora o check é limpo: bate o Pedido + Matéria + Instância exata
                    IF NOT EXISTS (
                        SELECT 1 FROM public."PedidoModificacao" 
                        WHERE id_pedido = v_pedido_id 
                        AND id_materia = v_materia_item.id_materia 
                        AND id_produx_card = v_prod_item.id
                    ) THEN
                        UPDATE public."Estoque" SET quantidade = quantidade - (v_materia_item.quantidade * (v_item->>'qtd')::bigint)
                        WHERE id_materia = v_materia_item.id_materia AND id_empresa = p_empresa_id;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'venda_id', v_venda_id);
END;
$$;
