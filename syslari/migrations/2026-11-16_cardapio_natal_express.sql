-- Cardápio de Natal: libera o perfil 'express' (além de admin e master) para pedidos e edição do cardápio.
-- ATENÇÃO: express passa a ver dados pessoais dos clientes (nome, telefone, endereço) e a editar preços.
-- REVISAR antes de aplicar. Reaplicável.

BEGIN;

-- Pedidos
DROP POLICY IF EXISTS "cardapio_natal_pedidos_admin" ON public.cardapio_natal_pedidos;
CREATE POLICY "cardapio_natal_pedidos_admin" ON public.cardapio_natal_pedidos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

-- Produtos
DROP POLICY IF EXISTS "cardapio_natal_select_admin" ON public.cardapio_natal_produtos;
CREATE POLICY "cardapio_natal_select_admin" ON public.cardapio_natal_produtos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

DROP POLICY IF EXISTS "cardapio_natal_write_admin" ON public.cardapio_natal_produtos;
CREATE POLICY "cardapio_natal_write_admin" ON public.cardapio_natal_produtos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

-- Páginas e configuração
DROP POLICY IF EXISTS "cardapio_natal_paginas_write" ON public.cardapio_natal_paginas;
CREATE POLICY "cardapio_natal_paginas_write" ON public.cardapio_natal_paginas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

DROP POLICY IF EXISTS "cardapio_natal_config_write" ON public.cardapio_natal_config;
CREATE POLICY "cardapio_natal_config_write" ON public.cardapio_natal_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

-- Mídias (upload de imagens e vídeos)
DROP POLICY IF EXISTS "cardapio_natal_midia_escrita" ON storage.objects;
CREATE POLICY "cardapio_natal_midia_escrita" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cardapio-natal' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')))
  WITH CHECK (bucket_id = 'cardapio-natal' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master','express')));

COMMIT;
