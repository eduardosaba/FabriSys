-- Seed idempotente para a organization usada pelo mock
-- Insere a organization com o ID esperado no payload do mock
-- Use ON CONFLICT DO NOTHING para ser seguro em execuções repetidas

INSERT INTO public.organizations (id, nome, slug, plano, setup_concluido, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Org Mock',
  'org-mock',
  'trial',
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;
