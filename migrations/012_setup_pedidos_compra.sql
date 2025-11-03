-- Tabela de pedidos de compra
CREATE TABLE pedidos_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('pendente', 'enviado', 'aprovado', 'rejeitado', 'finalizado')) DEFAULT 'pendente',
  observacoes TEXT,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  data_envio_email TIMESTAMP WITH TIME ZONE,
  data_envio_whatsapp TIMESTAMP WITH TIME ZONE
);

-- Tabela de itens do pedido
CREATE TABLE itens_pedido_compra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  quantidade DECIMAL(10,2) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE notificacoes_pedido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('status', 'email', 'whatsapp')),
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de pedidos" ON pedidos_compra
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de pedidos" ON pedidos_compra
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de pedidos" ON pedidos_compra
  FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura de itens" ON itens_pedido_compra
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de itens" ON itens_pedido_compra
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de notificações" ON notificacoes_pedido
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de notificações" ON notificacoes_pedido
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de notificações" ON notificacoes_pedido
  FOR UPDATE USING (true);