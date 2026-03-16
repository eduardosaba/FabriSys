-- Adiciona colunas para controle de conferência do fechamento de caixa
ALTER TABLE public.caixa_sessao
  ADD COLUMN IF NOT EXISTS status_conferencia text DEFAULT 'pendente';

ALTER TABLE public.caixa_sessao
  ADD COLUMN IF NOT EXISTS conferido_por uuid REFERENCES profiles(id);

ALTER TABLE public.caixa_sessao
  ADD COLUMN IF NOT EXISTS data_conferencia timestamptz;

-- Nota: Após aplicar esta migration, o frontend permitirá que Admin/Financeiro confirme o fechamento.
