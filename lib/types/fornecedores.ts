export interface Fornecedor {
  id: string;
  created_at: string;
  nome: string;
  cnpj: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
}
