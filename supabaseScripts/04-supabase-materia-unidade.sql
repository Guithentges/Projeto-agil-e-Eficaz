-- Script for adding Unidade de Medida to MateriaPrima

ALTER TABLE "MateriaPrima"
ADD COLUMN IF NOT EXISTS "unidade_medida" text DEFAULT 'un';

-- Default is 'un' but users can use 'kg', 'g', etc.
