# 📌 Roadmap de Evolução Futurível - FabriSys (Fábrica + PDV Universitário)

Este documento registra as análises, diagnósticos e sugestões de melhorias identificadas para o ecossistema **FabriSys**, visando futuras fases de desenvolvimento.

---

## 🏗️ 1. Diagnóstico do Modelo de Negócio

### 🏭 Fábrica de Confeitaria / Doces

- **Insumos & Unidades Duplas:** Compra em Unidade de Estoque ($UE$) vs uso em Unidade de Consumo ($UC$) com Fator de Conversão ($FC$).
- **Produção em 3 Fases:** Fichas técnicas (BOM), produtos semi-acabados (massas/bases de recheio) e produto final.
- **Controle de Rendimento Real:** Variações de custo provenientes de perdas por cozimento/evaporação ou raspagem de panela.

### 🎓 PDVs em Faculdades

- **Picos Intensos em Intervalos:** Janelas curtas de 15 a 20 minutos com alta demanda por caixa.
- **Sazonalidade Acadêmica:** Variação de público conforme dias de aula, semanas de prova e recessos/férias.
- **Sobras Diárias & Validade Curta:** Doces artesanais têm shelf-life reduzido.
- **Operação Descentralizada:** Necessidade de facilidade no fechamento de caixa e expedição simplificada.

---

## 🎯 2. Funcionalidades Mapeadas para Implementação Futura

### Phase A: Otimização do PDV para Alta Velocidade

1. **Modo Caixa Ultra-Rápido:**
   - Atalhos de teclado e botões grandes touch para os 10 doces mais vendidos.
   - Integração com QR Code Pix visível na tela para recebimento instantâneo.
2. **Offline-First no PDV:**
   - Persistência local (IndexedDB) para permitir vendas no caixa mesmo em momentos de oscilação do Wi-Fi da faculdade, sincronizando dados automaticamente ao reconectar.

### Phase B: Gestão de Perdas, Sobras e Validade

1. **Controle de Sobra Diária e Clearance (Desconto de Fim de Turno):**
   - Botão de "Promoção Fim de Turno" para aplicar desconto progressivo nos produtos perto da validade.
   - Registro estruturado de perdas e avarias no fechamento de caixa para auditoria de descartes.
2. **Fechamento de Caixa Cego:**
   - O operador declara o valor em dinheiro e comprovantes sem visualizar a contabilidade prévia do sistema, evitando manipulações.

### Phase C: Planejamento Inteligente de Produção

1. **Calendário Acadêmico:**
   - Cadastro de dias letivos vs recessos/feriados para ajustar automaticamente a sugestão diária de produção para cada PDV.
2. **Rendimento Real por Lote:**
   - Registro de peso final produzido por lote de massa para recálculo exato de custo unitário em receitas de panela.
3. **Ponto de Ressuprimento Automático:**
   - Alertas automáticos de emissão de Pedido de Compra quando insumos críticos atingirem o limite mínimo de estoque.

---

## 📄 Histórico de Registro

- **Data:** 12/09/2026
- **Status:** Gravado em arquivo de documentação do projeto (`docs/ROADMAP_EVOLUCAO_PDV_FABRICA.md`) para futura priorização.
