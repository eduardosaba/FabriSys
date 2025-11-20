# 📋 Manual do Sistema de Controle de Produção e Estoque

## 🎯 Visão Geral

Este sistema foi desenvolvido especificamente para fábricas de alimentos, resolvendo o desafio comum onde a **unidade de compra/estoque** é diferente da **unidade de consumo** na produção.

### O Problema

- Você compra leite condensado em **latas** (unidade de estoque)
- Mas usa na receita em **gramas** (unidade de consumo)
- Como controlar o estoque e calcular custos com precisão?

### A Solução

Sistema de **Unidades Duplas** com controle em **3 fases** e **hierarquia de produtos**.

---

## 🏗️ 1. SISTEMA DE UNIDADES DUPLAS

### Conceito Básico

Cada insumo tem **duas unidades**:

- **UE (Unidade de Estoque)**: Como você compra e armazena
- **UC (Unidade de Consumo)**: Como você usa na receita

### Exemplo Prático: Leite Condensado

| Campo                    | Valor            | Explicação                |
| ------------------------ | ---------------- | ------------------------- |
| **Nome**                 | Leite Condensado | Nome do insumo            |
| **UE**                   | Lata             | Unidade de compra/estoque |
| **Custo por UE**         | R$ 5,00          | Preço de 1 lata           |
| **UC**                   | g (gramas)       | Unidade usada na receita  |
| **FC (Fator Conversão)** | 395              | 1 lata = 395g             |
| **Custo por UC**         | R$ 0,01265       | `5,00 ÷ 395`              |

### Como Cadastrar

1. Acesse **Insumos** → **Novo Insumo**
2. Preencha os campos básicos (nome, categoria)
3. Na seção **"Sistema de Unidades Duplas"**:
   - **Unidade de Estoque**: Lata, KG, Pacote, etc.
   - **Custo por UE**: preço de compra
   - **Unidade de Consumo**: g, ml, kg, un
   - **Fator de Conversão**: quantos UC cabem em 1 UE

---

## 📝 2. FICHA TÉCNICA (RECEITAS)

### Como Funciona

- As quantidades são informadas em **UC** (unidade de consumo)
- O sistema converte automaticamente para **UE** para controle de estoque
- Cálculo de custo usa o **custo por UC**

### Exemplo: Receita do Brigadeiro

| Insumo           | UC  | Quantidade | Conversão para UE         |
| ---------------- | --- | ---------- | ------------------------- |
| Leite Condensado | g   | 30g        | `30 ÷ 395 = 0,076 latas`  |
| Chocolate em Pó  | g   | 5g         | `5 ÷ 1000 = 0,005 KG`     |
| Manteiga         | g   | 2g         | `2 ÷ 500 = 0,004 pacotes` |

### Como Criar

1. Acesse **Produção** → **Produtos** → selecione um produto
2. Clique em **Editar Ficha Técnica**
3. Adicione insumos informando quantidades em **UC**
4. O sistema mostra automaticamente:
   - Conversão para UE
   - Custo por UC
   - Custo total da receita

---

## 🔄 3. ORDENS DE PRODUÇÃO - 3 FASES

### Fase 1: Criação (Cálculo Teórico) 🧮

**Status**: Pendente

**O que acontece:**

1. Você solicita produção (ex: 500 brigadeiros)
2. Sistema consulta ficha técnica
3. Calcula necessidade teórica em UC
4. Converte para UE usando FC
5. **NÃO** baixa do estoque ainda

**Exemplo:**

- Solicitação: 500 brigadeiros
- Leite necessário: `500 × 30g = 15.000g`
- Conversão: `15.000 ÷ 395 ≈ 38 latas`
- **Resultado**: Reserva teórica de 38 latas

### Fase 2: Execução (Produção) 🏭

**Status**: Em Produção

**O que acontece:**

1. Status muda para "Em Produção"
2. Equipe produz usando os insumos
3. Sistema acompanha o progresso
4. Pode haver **perdas ou ganhos** na produção

### Fase 3: Finalização (Baixa Real + Ajuste) ✅

**Status**: Finalizada

**O que acontece:**

1. Você informa quantidade **REAL** produzida
2. Sistema baixa do estoque usando quantidades **TEÓRICAS**
3. Calcula custo real unitário
4. Ajusta automaticamente por perdas/ganhos

**Exemplo de Ajuste:**

| Cenário   | Qtd. Prevista | Qtd. Real | Custo Total | Custo Unitário |
| --------- | ------------- | --------- | ----------- | -------------- |
| Padrão    | 100           | 100       | R$ 50,00    | R$ 0,50        |
| **Ganho** | 100           | **110**   | R$ 50,00    | **R$ 0,45**    |
| **Perda** | 100           | **90**    | R$ 50,00    | **R$ 0,55**    |

---

## 🏭 4. PRODUTOS SEMI-ACABADOS

### Hierarquia de 3 Níveis

```
NÍVEL 1: Insumos Básicos
├── Leite Condensado (Lata)
├── Chocolate em Pó (KG)
└── Manteiga (Pacote)

NÍVEL 2: Semi-Acabados (Massas)
├── Massa de Chocolate
├── Massa de Chocolate Branco
└── Massa de Cookies

NÍVEL 3: Produtos Finais
├── Brigadeiro
├── Casadinho
└── Cookie
```

### Como Funciona na Prática

#### Exemplo: Produção de Brigadeiro

**OP 1 - Produzir Massa (Nível 2):**

- Solicitação: 20 KG de Massa de Chocolate
- Sistema calcula: quantas latas de leite, etc.
- Produz 21 KG (ganho de 1 KG)
- **Entrada no estoque**: 21 KG de Massa
- **Custo real**: R$ X por KG

**OP 2 - Produzir Brigadeiro (Nível 3):**

- Solicitação: 500 brigadeiros
- Receita: 3g de massa por brigadeiro = 1,5 KG total
- **Baixa do estoque**: 1,5 KG de Massa
- Produz 520 brigadeiros (ganho)
- **Custo do brigadeiro**: usa custo real da massa

### Benefícios

1. **Custo realista**: varia conforme custo da massa
2. **Controle duplo**: perdas na massa E no doce
3. **Estoque intermediário**: sabe quanto tem pronto
4. **Planejamento**: pode atender pedidos imediatos

---

## 📊 5. CONTROLE DE ESTOQUE

### Método FIFO (Primeiro a Entrar, Primeiro a Sair)

- Sempre consome do lote mais antigo primeiro
- Garante rotação adequada dos insumos

### Baixa de Estoque

- **Quando**: Apenas na finalização da OP
- **Quantidade**: Teórica calculada na criação
- **Método**: FIFO por lote

### Exemplo de Baixa

```
Estoque Atual:
├── Lote A: 10 latas (mais antigo)
├── Lote B: 15 latas
└── Lote C: 20 latas

Necessário: 38 latas

Baixa:
├── Lote A: 10 latas (esvazia)
├── Lote B: 15 latas (esvazia)
└── Lote C: 13 latas (restam 7)
```

---

## 🎯 6. FLUXO COMPLETO - EXEMPLO PRÁTICO

### Cenário: Fábrica de Doces

**Dia 1 - Manhã:**

1. **Cadastra insumos** com unidades duplas
2. **Cria ficha técnica** da Massa de Chocolate
3. **Cria OP 1**: Produzir 20 KG de Massa
4. Sistema calcula: ~51 latas de leite condensado
5. **Inicia produção** da massa

**Dia 1 - Tarde:**

1. **Finaliza OP 1**: Produziu 21 KG (ganho de 5%)
2. Sistema baixa 51 latas do estoque
3. **Entrada**: 21 KG de Massa (custo real calculado)

**Dia 2 - Manhã:**

1. **Cria ficha técnica** do Brigadeiro (usa Massa)
2. **Cria OP 2**: Produzir 500 brigadeiros
3. Sistema calcula: 1,5 KG de massa necessária
4. **Inicia produção** dos brigadeiros

**Dia 2 - Tarde:**

1. **Finaliza OP 2**: Produziu 520 brigadeiros (ganho de 4%)
2. Sistema baixa 1,5 KG de massa
3. **Entrada**: 520 brigadeiros no estoque final
4. **Custo ajustado** automaticamente

---

## ⚙️ 7. CONFIGURAÇÃO INICIAL

### Passos para Implementar

1. **Cadastrar Insumos** com unidades duplas
2. **Cadastrar Produtos Semi-Acabados** (tipo: semi_acabado)
3. **Cadastrar Produtos Finais** (tipo: final)
4. **Criar Fichas Técnicas** usando UC
5. **Configurar Lotes** de insumos no estoque

### Dicas Importantes

- Sempre use **unidades consistentes** (g, ml, kg)
- Mantenha **fatores de conversão atualizados**
- Faça **conferência física** regular dos estoques
- Use **códigos internos** para facilitar busca

---

## 🔍 8. RELATÓRIOS E MONITORAMENTO

### KPIs Disponíveis

- **Eficiência de Produção**: real vs previsto
- **Custo por Produto**: evolução temporal
- **Rotação de Estoque**: por insumo
- **Perdas/Ganhos**: por OP e produto

### Alertas

- **Estoque baixo**: baseado em UE
- **Vencimento próximo**: por lote
- **Custo fora do padrão**: comparação histórica

---

## ❓ PERGUNTAS FREQUENTES

**P: Posso mudar fatores de conversão?**
R: Sim, mas isso afeta cálculos históricos. Use com cuidado.

**P: E se eu não usar semi-acabados?**
R: Pode usar apenas produtos finais, mas perde precisão de custo.

**P: Como funciona com validade de lotes?**
R: Sistema sempre consome primeiro os mais próximos do vencimento.

**P: Posso ter perdas na produção?**
R: Sim! O sistema ajusta custos automaticamente.

---

## 📞 SUPORTE

Para dúvidas ou problemas:

1. Consulte este manual
2. Verifique configurações de unidades
3. Confirme fatores de conversão
4. Teste com pequenas quantidades primeiro

**Lembre-se**: O sistema foi feito para refletir a realidade da produção de alimentos. Comece devagar e ajuste conforme necessário! 🚀</content>
<parameter name="filePath">d:\DOCUMENTOS PAI\SistemaLari\syslari\MANUAL_CONTROLE_PRODUCAO.md
