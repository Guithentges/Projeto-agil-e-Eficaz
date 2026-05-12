-- ==========================================
-- TRIGGER: Categorias padrão por Empresa
-- ==========================================
-- Sempre que uma nova Empresa for inserida, este trigger insere automaticamente
-- as categorias operacionais padrão vinculadas a ela.

-- 1. Criar a função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION public.criar_categorias_padrao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Categoria" (Nome, id_empresa) VALUES
    ('Materia prima',  NEW.id),
    ('Revenda',        NEW.id),
    ('Energia',        NEW.id),
    ('Aluguel',        NEW.id),
    ('Funcionários',   NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remover o trigger caso já exista (para permitir re-execução segura)
DROP TRIGGER IF EXISTS trg_categorias_padrao ON public."Empresa";

-- 3. Criar o trigger que dispara APÓS a inserção de uma nova empresa
CREATE TRIGGER trg_categorias_padrao
AFTER INSERT ON public."Empresa"
FOR EACH ROW
EXECUTE FUNCTION public.criar_categorias_padrao();
