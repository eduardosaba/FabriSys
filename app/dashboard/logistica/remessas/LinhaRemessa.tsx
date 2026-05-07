'use client';

import React, { useEffect, useState } from 'react';

type Item = {
  op_id?: number;
  produto_id: number;
  produto_nome: string;
  quantidade_pedido: number;
  reserva_disponivel: number;
};

type Props = {
  item: Item;
  onChange: (produtoId: number, qtdExtra: number) => void;
};

export default function LinhaRemessa({ item, onChange }: Props) {
  const [qtdExtra, setQtdExtra] = useState<number>(0);

  useEffect(() => {
    onChange(item.produto_id, qtdExtra);
  }, [qtdExtra, item.produto_id, onChange]);

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h4 className="font-bold text-gray-800">{item.produto_nome}</h4>
        <p className="text-sm text-gray-500">Planejado: {item.quantidade_pedido} un</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3 bg-orange-50 p-2 rounded-lg border border-orange-200">
          <span className="text-xs font-semibold text-orange-700 uppercase">Reserva Admin:</span>
          <span className="font-mono font-bold text-orange-600">{item.reserva_disponivel} un</span>

          <input
            type="number"
            min={0}
            max={item.reserva_disponivel}
            className="w-16 p-1 border rounded text-center"
            value={qtdExtra}
            onChange={(e) =>
              setQtdExtra(Math.min(item.reserva_disponivel, parseInt(e.target.value || '0')))
            }
          />
        </div>

        <p className="text-sm font-bold text-slate-700">
          Total a Enviar: {item.quantidade_pedido + qtdExtra} un
        </p>
      </div>
    </div>
  );
}
