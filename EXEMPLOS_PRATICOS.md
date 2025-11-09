# 📊 Exemplos Práticos - Controle de Produção

## 🍫 Cenário: Fábrica de Doces da Sobrinha

### Insumos Cadastrados

| Insumo               | UE     | Custo/UE | UC  | FC   | Custo/UC   |
| -------------------- | ------ | -------- | --- | ---- | ---------- |
| **Leite Condensado** | Lata   | R$ 5,00  | g   | 395  | R$ 0,01265 |
| **Chocolate em Pó**  | KG     | R$ 25,00 | g   | 1000 | R$ 0,025   |
| **Manteiga**         | Pacote | R$ 8,00  | g   | 500  | R$ 0,016   |
| **Granulado**        | KG     | R$ 15,00 | g   | 1000 | R$ 0,015   |

---

## 🏭 EXEMPLO 1: Produção de Massa de Chocolate

### Ficha Técnica da Massa

**Rendimento**: 1 KG de Massa

| Insumo           | Quantidade (UC) | Custo/UC   | Custo Total    |
| ---------------- | --------------- | ---------- | -------------- |
| Leite Condensado | 200g            | R$ 0,01265 | R$ 2,53        |
| Chocolate em Pó  | 150g            | R$ 0,025   | R$ 3,75        |
| Manteiga         | 50g             | R$ 0,016   | R$ 0,80        |
| **TOTAL**        |                 |            | **R$ 7,08/KG** |

### Ordem de Produção 1: 20 KG de Massa

**Status Inicial**: Pendente

#### Fase 1: Criação (Cálculo Teórico)

```
Quantidade solicitada: 20 KG
Custo previsto: 20 × R$ 7,08 = R$ 141,60

Insumos necessários (convertidos para UE):
• Leite Condensado: 200g × 20 = 4.000g → 4.000 ÷ 395 ≈ 10,13 latas
• Chocolate em Pó: 150g × 20 = 3.000g → 3.000 ÷ 1000 = 3,00 KG
• Manteiga: 50g × 20 = 1.000g → 1.000 ÷ 500 = 2,00 pacotes

TOTAL TEÓRICO: 10,13 latas + 3 KG + 2 pacotes
```

#### Fase 2: Execução

**Status**: Em Produção

- Equipe produz a massa
- Sistema aguarda finalização

#### Fase 3: Finalização

**Quantidade Real Produzida**: 21 KG (ganho de 5%)

```
Baixa de Estoque (usa quantidades TEÓRICAS):
• 10,13 latas de leite condensado
• 3,00 KG de chocolate em pó
• 2,00 pacotes de manteiga

Cálculo do Custo Real:
• Custo total dos insumos: R$ 141,60
• Quantidade real: 21 KG
• Custo real por KG: R$ 141,60 ÷ 21 ≈ R$ 6,74

Resultado:
✅ Estoque de Massa: +21 KG
✅ Custo da Massa: R$ 6,74/KG (mais barato devido ao ganho)
```

---

## 🍬 EXEMPLO 2: Produção de Brigadeiros

### Ficha Técnica do Brigadeiro

**Rendimento**: 1 unidade

| Insumo             | Quantidade (UC) | Custo/UC   | Custo Total            |
| ------------------ | --------------- | ---------- | ---------------------- |
| Massa de Chocolate | 3g              | R$ 0,00674 | R$ 0,02022             |
| Granulado          | 2g              | R$ 0,015   | R$ 0,030               |
| **TOTAL**          |                 |            | **R$ 0,05022/unidade** |

### Ordem de Produção 2: 500 Brigadeiros

**Status Inicial**: Pendente

#### Fase 1: Criação (Cálculo Teórico)

```
Quantidade solicitada: 500 unidades
Custo previsto: 500 × R$ 0,05022 ≈ R$ 25,11

Insumos necessários (convertidos para UE):
• Massa Chocolate: 3g × 500 = 1.500g → 1.500 ÷ 1000 = 1,50 KG
• Granulado: 2g × 500 = 1.000g → 1.000 ÷ 1000 = 1,00 KG

TOTAL TEÓRICO: 1,50 KG massa + 1,00 KG granulado
```

#### Fase 2: Execução

**Status**: Em Produção

- Equipe usa a massa pronta do estoque
- Produz os brigadeiros

#### Fase 3: Finalização

**Quantidade Real Produzida**: 520 unidades (ganho de 4%)

```
Baixa de Estoque (usa quantidades TEÓRICAS):
• 1,50 KG de massa de chocolate
• 1,00 KG de granulado

Cálculo do Custo Real:
• Custo total dos insumos: R$ 25,11
• Quantidade real: 520 unidades
• Custo real por unidade: R$ 25,11 ÷ 520 ≈ R$ 0,04829

Resultado:
✅ Estoque de Brigadeiros: +520 unidades
✅ Custo do Brigadeiro: R$ 0,04829 (mais barato devido ao ganho)
```

---

## 📈 ANÁLISE DOS RESULTADOS

### Comparação: Com vs Sem Semi-Acabados

| Método        | Custo Brigadeiro | Precisão   | Controle   |
| ------------- | ---------------- | ---------- | ---------- |
| **Com Massa** | R$ 0,04829       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Direto**    | R$ 0,05022       | ⭐⭐⭐     | ⭐⭐       |

### Impacto dos Ganhos

```
OP da Massa: +5% (20→21 KG) = Custo -5%
OP do Doce: +4% (500→520) = Custo -4%
Resultado: Custo total -9% mais preciso!
```

---

## 🔄 EXEMPLO 3: Produção Sem Massa Pronta

### Situação

- Não tem massa pronta em estoque
- Cliente pediu 500 brigadeiros urgentemente
- Sistema calcula automaticamente a produção completa

### Ordem de Produção Combinada

```
Solicitação: 500 Brigadeiros
Sistema detecta: falta massa
Solução: Criar OP combinada (Massa + Doces)
```

#### Cálculo Automático

```
Para 500 brigadeiros:
• Massa necessária: 1,5 KG
• Sistema calcula produção de 1,5 KG de massa
• Insumos para massa: proporcionais
• Total de insumos: leite, chocolate, manteiga, granulado
```

#### Resultado

- Uma única OP produz tudo
- Menos controle intermediário
- Custo menos preciso
- Mas atende urgência

---

## 💰 EXEMPLO 4: Análise de Custos

### Custo por Etapa (500 Brigadeiros)

| Etapa          | Insumos                      | Custo    | Unidades | Custo/Unit     |
| -------------- | ---------------------------- | -------- | -------- | -------------- |
| **Massa**      | Leite + Chocolate + Manteiga | R$ 10,61 | 1,5 KG   | R$ 7,07/KG     |
| **Brigadeiro** | Massa + Granulado            | R$ 25,11 | 500      | R$ 0,05022     |
| **TOTAL**      | Todos                        | R$ 35,72 | 500      | **R$ 0,07144** |

### Comparação com Venda

```
Preço de Venda: R$ 2,00/brigadeiro
Custo Total: R$ 0,07144
Margem: R$ 1,92856 (96,4%)
```

---

## 🎯 DICAS PARA OTIMIZAÇÃO

### 1. Produção em Lotes

- Produza massas em quantidades maiores
- Aproveite ganhos para reduzir custos
- Mantenha estoque estratégico

### 2. Controle de Perdas

- Monitore percentual de ganho/perda
- Ajuste processos conforme dados
- Mantenha padrão entre -5% e +10%

### 3. Planejamento

- Use relatórios semanais
- Antecipe necessidades
- Negocie melhores preços com fornecedores

---

## ⚠️ Cenários de Alerta

### Estoque Crítico

```
Sistema avisa: "Faltam 5 latas de leite"
Ação: Fazer pedido de compra
```

### Custo Fora do Padrão

```
Brigadeiro custando R$ 0,08 (normal: R$ 0,05)
Ação: Verificar insumos ou processo
```

### Lote Próximo Vencimento

```
Sistema prioriza consumo do lote antigo
Ação: Planejar produção para consumir
```

---

_Este documento serve como referência prática. Os números são exemplos baseados em custos reais de mercado brasileiro._</content>
<parameter name="filePath">d:\DOCUMENTOS PAI\SistemaLari\syslari\EXEMPLOS_PRATICOS.md
