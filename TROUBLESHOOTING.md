# 🔧 Troubleshooting - Controle de Produção

## 🚨 Problemas Comuns e Soluções

### 1. ERRO: "Unidade de Consumo não pode ser maior que Unidade de Estoque"

**Sintomas:**

- Sistema não permite salvar ficha técnica
- Mensagem de erro sobre unidades

**Causa:**

- Tentativa de usar UC > UE (ex: 500g quando UE é 200g)

**Solução:**

```
1. Verifique as unidades do insumo
2. Use quantidades lógicas (ex: 50g para UE=200g)
3. Se precisar de mais, use decimal (ex: 0.25 latas)
```

---

### 2. ERRO: "Estoque insuficiente para produção"

**Sintomas:**

- OP não pode ser finalizada
- Sistema bloqueia baixa de estoque

**Causa:**

- Quantidade em estoque menor que necessária

**Solução:**

```
1. Verifique estoque atual no dashboard
2. Faça pedido de compra urgente
3. Ajuste quantidade da OP
4. Use substituto se disponível
```

---

### 3. PROBLEMA: Custos muito diferentes do esperado

**Sintomas:**

- Custo real muito maior/menor que teórico
- Margem comprometida

**Possíveis Causas:**

- Preços de insumos desatualizados
- Perdas/ganhos excessivos
- Erro na ficha técnica

**Solução:**

```
1. Atualize preços dos insumos
2. Revise ficha técnica
3. Monitore percentual de perdas
4. Ajuste processos de produção
```

---

### 4. ERRO: "Não foi possível converter unidades"

**Sintomas:**

- Sistema falha ao calcular conversões
- OP fica travada

**Causa:**

- Fator de conversão (FC) incorreto ou ausente

**Solução:**

```
1. Verifique FC do insumo
2. Exemplo: Lata 395g → FC=395
3. Teste conversão manual
4. Corrija cadastro do insumo
```

---

### 5. PROBLEMA: Semi-acabados não aparecem

**Sintomas:**

- Lista de insumos não mostra produtos semi-acabados
- Não consegue usar massa pronta

**Causa:**

- Produto não marcado como "Semi-acabado"
- Status do estoque

**Solução:**

```
1. Edite produto no cadastro
2. Marque "É semi-acabado: Sim"
3. Verifique se tem estoque
4. Atualize página
```

---

### 6. ERRO: "OP não pode ser finalizada - dados incompletos"

**Sintomas:**

- Botão "Finalizar" desabilitado
- Campos obrigatórios não preenchidos

**Causa:**

- Quantidade real não informada
- Data/hora não preenchida

**Solução:**

```
1. Preencha quantidade produzida real
2. Informe data/hora da finalização
3. Verifique se todos campos obrigatórios estão preenchidos
4. Salve antes de finalizar
```

---

### 7. PROBLEMA: Relatórios não mostram dados

**Sintomas:**

- Relatórios vazios
- Filtros não funcionam

**Causa:**

- Período muito longo
- Dados não consolidados
- Cache do navegador

**Solução:**

```
1. Use período menor (última semana)
2. Atualize cache (Ctrl+F5)
3. Verifique se há OPs finalizadas
4. Aguarde processamento noturno
```

---

### 8. ERRO: "Permissão negada ao salvar"

**Sintomas:**

- Não consegue salvar alterações
- Mensagem de erro de permissão

**Causa:**

- Usuário sem permissões adequadas
- Sessão expirada

**Solução:**

```
1. Verifique nível de acesso do usuário
2. Faça login novamente
3. Peça elevação de privilégios ao admin
4. Use conta com permissões corretas
```

---

## 🔍 Diagnóstico Rápido

### Checklist Básico

```
□ Usuário logado corretamente?
□ Permissões adequadas?
□ Conexão com internet estável?
□ Navegador atualizado?
□ Cache limpo?
□ Dados salvos antes de ações?
```

### Verificações Técnicas

```
□ Console do navegador (F12) sem erros?
□ Rede funcionando (sem 403/500)?
□ Banco de dados acessível?
□ Arquivos estáticos carregando?
```

---

## 🛠️ Ferramentas de Diagnóstico

### 1. Verificar Status do Sistema

```sql
-- Execute no Supabase SQL Editor
SELECT
  'Insumos' as tabela,
  COUNT(*) as registros
FROM insumos
UNION ALL
SELECT
  'Produtos',
  COUNT(*)
FROM produtos
UNION ALL
SELECT
  'Ordens Producao',
  COUNT(*)
FROM ordens_producao;
```

### 2. Verificar Conversões

```sql
-- Teste conversão de unidades
SELECT
  nome,
  unidade_estoque,
  unidade_consumo,
  fator_conversao,
  ROUND(1000 / fator_conversao, 2) as exemplo_conversao
FROM insumos
WHERE ativo = true;
```

### 3. Verificar Estoque

```sql
-- Estoque atual por insumo
SELECT
  i.nome,
  e.quantidade_atual,
  i.unidade_estoque,
  e.custo_medio,
  CASE
    WHEN e.quantidade_atual < i.estoque_minimo THEN 'CRÍTICO'
    WHEN e.quantidade_atual < i.estoque_minimo * 1.5 THEN 'BAIXO'
    ELSE 'OK'
  END as status
FROM insumos i
LEFT JOIN estoque e ON i.id = e.insumo_id;
```

---

## 🚑 Recuperação de Emergência

### Quando Tudo Falha

```
1. Fazer backup dos dados atuais
2. Limpar cache do navegador completamente
3. Tentar em navegador diferente
4. Verificar conexão VPN/firewall
5. Contatar suporte técnico
```

### Reset de Sessão

```
1. Logout completo
2. Fechar navegador
3. Aguardar 5 minutos
4. Login novamente
5. Testar funcionalidades básicas
```

---

## 📞 Contato e Suporte

### Para Problemas Técnicos

- **Email**: suporte@syslari.com
- **WhatsApp**: (11) 99999-9999
- **Horário**: Segunda a Sexta, 8h às 18h

### Informações Necessárias

```
□ Descrição detalhada do problema
□ Passos para reproduzir
□ Captura de tela do erro
□ Navegador e versão
□ Sistema operacional
□ Logs do console (F12)
```

---

## 📋 Log de Problemas Conhecidos

### Versão 1.0.1

- ✅ Corrigido: Conversão de unidades decimais
- ✅ Corrigido: Cache de semi-acabados
- 🔄 Pendente: Otimização de relatórios grandes

### Próximas Correções

- Melhoria na validação de estoques
- Interface mais intuitiva para conversões
- Alertas automáticos de reabastecimento

---

_Atualizado em: Janeiro 2024_
_Versão do Sistema: 1.0.1_</content>
<parameter name="filePath">d:\DOCUMENTOS PAI\SistemaLari\syslari\TROUBLESHOOTING.md
