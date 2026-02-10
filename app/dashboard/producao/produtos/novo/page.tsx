'use client';

import ProdutoForm from '@/components/producao/ProdutoForm';

export default function NovoProdutoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Novo Produto</h1>
      <ProdutoForm />
    </div>
  );
}
