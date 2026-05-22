-- RLS para tabelas de molhos (mesmo padrão de MateriaPrima / Produtos)
-- Execute no SQL Editor do Supabase se aparecer:
-- "new row violates row-level security policy for table molho"

ALTER TABLE public.molho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.molhoxmateria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.molhoxproduto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public.molho;
CREATE POLICY "Acesso_Propria_Empresa" ON public.molho
FOR ALL
USING (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public.molhoxmateria;
CREATE POLICY "Acesso_Propria_Empresa" ON public.molhoxmateria
FOR ALL
USING (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Acesso_Propria_Empresa" ON public.molhoxproduto;
CREATE POLICY "Acesso_Propria_Empresa" ON public.molhoxproduto
FOR ALL
USING (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (id_empresa IN (SELECT id_empresa FROM public.profiles WHERE id = auth.uid()));
