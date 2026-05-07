'use client';

import React, { useEffect, useState } from 'react';
import LinhaRemessa from './LinhaRemessa';
import { useAuth } from '../../../../lib/auth';

type RemessaItem = {
  op_id?: number;
  produto_id: number;
  produto_nome: string;
  quantidade_pedido: number;
  reserva_disponivel: number;
};

export default function Page() {
  const { user } = useAuth();
  const [items, setItems] = useState<RemessaItem[]>([]);
  const [extras, setExtras] = useState<Record<number, number>>({});
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: buscar itens planejados/pendentes para a loja selecionada via API
    // por ora mock vazio até backend existir
    setItems([]);
  }, []);

  const handleChange = (produtoId: number, qtdExtra: number) => {
    setExtras((prev) => ({ ...prev, [produtoId]: qtdExtra }));
  };

  const handleConfirmarEnvio = async () => {
    if (!lojaId) return alert('Selecione uma loja');
    const payload = items.map((it) => ({
      op_id: it.op_id,
      produto_id: it.produto_id,
      quantidade_pedido: it.quantidade_pedido,
      extra: extras[it.produto_id] || 0,
    }));
    setLoading(true);
    try {
      const res = await fetch('/api/remessas/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loja_id: lojaId, itens: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Remessa criada: ' + (data.remessa_id ?? 'ok'));
        setExtras({});
      } else {
        alert('Erro ao criar remessa: ' + (data.error || res.statusText));
      }
    } catch (err: any) {
      alert('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Autentique-se para acessar this página</div>;

  if (!user.role || !['admin', 'logistica'].includes(user.role)) {
    return <div>Você não tem permissão para acessar Remessas.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Criar Remessa</h2>

      <div className="mb-4">
        <label className="block text-sm">Loja</label>
        <select
          className="border p-2 rounded"
          value={lojaId ?? ''}
          onChange={(e) => setLojaId(Number(e.target.value) || null)}
        >
          <option value="">-- selecione --</option>
          <option value="1">Loja 1 (exemplo)</option>
        </select>
      </div>

      <div className="border rounded overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            Nenhum item pendente para remessa (placeholder).
          </div>
        ) : (
          items.map((it) => <LinhaRemessa key={it.produto_id} item={it} onChange={handleChange} />)
        )}
      </div>

      <div className="mt-4">
        <button onClick={handleConfirmarEnvio} disabled={loading} className="btn btn-primary">
          {loading ? 'Enviando...' : 'Confirmar Envio'}
        </button>
      </div>
    </div>
  );
}
