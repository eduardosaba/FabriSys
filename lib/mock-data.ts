// Constantes globais usadas no sistema
export const CATEGORIAS = [
  'Laticínios',
  'Farináceos',
  'Chocolates',
  'Embalagens',
  'Hortifruti',
  'Outros',
];
export const UNIDADES_UE = ['LATA', 'CX', 'UN', 'KG', 'PCT', 'LT', 'FD', 'SC'];
export const UNIDADES_UC = ['g', 'ml', 'un', 'kg', 'l'];
export const FORNECEDORES = ['Atacadão', 'Assaí', 'Nestlé Direto', 'Embalagens Bahia', 'Ceasa'];

// Dados iniciais para testes (caso o banco esteja vazio)
export const initialInsumos = [
  {
    id: 1,
    nome: 'Leite Condensado Moça',
    categoria: 'Laticínios',
    ue: 'LATA',
    custo_ue: 5.8,
    uc: 'g',
    fator_conversao: 395,
    estoque_atual: 45,
    estoque_minimo: 20,
    status: 'ok',
  },
  {
    id: 2,
    nome: 'Chocolate em Pó 50%',
    categoria: 'Chocolates',
    ue: 'PCT',
    custo_ue: 42.0,
    uc: 'g',
    fator_conversao: 1000,
    estoque_atual: 1.5,
    estoque_minimo: 5,
    status: 'critico',
  },
  {
    id: 3,
    nome: 'Creme de Leite',
    categoria: 'Laticínios',
    ue: 'CX',
    custo_ue: 3.2,
    uc: 'g',
    fator_conversao: 200,
    estoque_atual: 12,
    estoque_minimo: 15,
    status: 'alerta',
  },
];
