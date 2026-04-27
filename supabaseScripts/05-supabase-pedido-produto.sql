-- Add id_produto to Pedido table to allow selling individual products
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "id_produto" bigint REFERENCES "Produtos"("id");
