-- Migration: Sistema de Comunicados e Avisos em Tempo Real
-- Permite que administradores enviem mensagens que aparecem como popup nas telas dos usuários

-- Criar tabela de avisos do sistema
CREATE TABLE IF NOT EXISTS avisos_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem TEXT NOT NULL,
  tipo_alvo TEXT DEFAULT 'todos', -- 'todos', 'admin', 'caixa', 'estoque', 'producao', etc.
  cor_tipo TEXT DEFAULT 'info', -- 'info', 'warning', 'erro'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE avisos_sistema ENABLE ROW LEVEL SECURITY;

-- Política: Todos usuários autenticados podem ler avisos
CREATE POLICY "Users can read avisos"
  ON avisos_sistema FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: Apenas admins podem criar avisos
CREATE POLICY "Admins can create avisos"
  ON avisos_sistema FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Apenas admins podem atualizar avisos
CREATE POLICY "Admins can update avisos"
  ON avisos_sistema FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Apenas admins podem deletar avisos
CREATE POLICY "Admins can delete avisos"
  ON avisos_sistema FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_avisos_sistema_ativo ON avisos_sistema(ativo);
CREATE INDEX IF NOT EXISTS idx_avisos_sistema_tipo_alvo ON avisos_sistema(tipo_alvo);
CREATE INDEX IF NOT EXISTS idx_avisos_sistema_created_at ON avisos_sistema(created_at DESC);

-- Habilitar Realtime para que o popup apareça instantaneamente
ALTER PUBLICATION supabase_realtime ADD TABLE avisos_sistema;

-- Comentários para documentação
COMMENT ON TABLE avisos_sistema IS 'Armazena comunicados enviados pelo admin para exibição em popup';
COMMENT ON COLUMN avisos_sistema.mensagem IS 'Texto do comunicado exibido no popup';
COMMENT ON COLUMN avisos_sistema.tipo_alvo IS 'Tipo de usuário que verá o aviso: todos, admin, caixa, estoque, producao';
COMMENT ON COLUMN avisos_sistema.cor_tipo IS 'Estilo visual do alerta: info (azul), warning (amarelo), erro (vermelho)';
COMMENT ON COLUMN avisos_sistema.ativo IS 'Se false, o popup não aparece mais nas telas';
