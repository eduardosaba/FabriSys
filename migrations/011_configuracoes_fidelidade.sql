-- Migration: Adiciona configurações de sistema para gerenciamento de fidelidade
-- Executar após 010_setup_metas_e_fidelidade.sql

-- Inserir configurações padrão do sistema (se não existirem)
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES 
  ('fidelidade_ativa', 'true', 'Ativa/desativa a campanha de fidelidade (true/false)'),
  ('fidelidade_fator', '0.05', 'Fator de conversão de pontos para reais (1 ponto = R$ 0.05 = 5% cashback)')
ON CONFLICT (chave) DO NOTHING;

-- Criar índice para otimizar busca por configurações
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave ON configuracoes_sistema(chave);

-- Comentários adicionais
COMMENT ON COLUMN configuracoes_sistema.chave IS 'Chave única da configuração';
COMMENT ON COLUMN configuracoes_sistema.valor IS 'Valor da configuração (sempre armazenado como texto)';
COMMENT ON COLUMN configuracoes_sistema.descricao IS 'Descrição para documentação';
