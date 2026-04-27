-- Script for Adding Delivery Tracking to Orders
-- This field will handle the delivery capability in the Kitchen view.

ALTER TABLE "Venda"
ADD COLUMN IF NOT EXISTS "entregue" BOOLEAN DEFAULT false;

-- After running this query, check your Vendas table. 
-- New orders will start with "entregue" false.
