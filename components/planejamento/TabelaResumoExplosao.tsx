import React from 'react';

interface ExplosaoItem {
  massa_id: string;
  massa_nome: string;
  quantidade_necessaria_total: number;
  saldo_estoque_atual: number;
  sugestao_producao: number;
}

export default function TabelaResumoExplosao({
  dados,
  valores,
  onChange,
}: {
  dados: ExplosaoItem[];
  valores: Record<string, number>;
  onChange: (massaId: string, valor: number) => void;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mt-4">
      <h3 className="text-sm font-bold text-slate-700 mb-3">Necessidade de Massas (Explosão)</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-slate-500 border-b">
            <th className="py-2">Massa / Semi-acabado</th>
            <th className="py-2 text-center">Necessário</th>
            <th className="py-2 text-center">Em Estoque</th>
            <th className="py-2 text-right">Produzir (kg)</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.massa_id} className="border-b last:border-0">
              <td className="py-3 font-medium text-slate-800">{d.massa_nome}</td>
              <td className="py-3 text-center text-slate-600">
                {Number(d.quantidade_necessaria_total).toFixed(3)}
              </td>
              <td className="py-3 text-center text-slate-600">
                {Number(d.saldo_estoque_atual).toFixed(3)}
              </td>
              <td className="py-3 text-right">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="w-28 p-1 border rounded text-right"
                  value={(valores[d.massa_id] ?? Number(d.sugestao_producao)).toString()}
                  onChange={(e) => onChange(d.massa_id, Number(e.target.value || 0))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
