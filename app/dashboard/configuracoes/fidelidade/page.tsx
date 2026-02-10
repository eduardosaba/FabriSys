'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/Button';
import { Gift, Save, Search, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FidelidadeConfigPage() {
  const [fatorPontos, setFatorPontos] = useState('0.05');
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase
      .from('configuracoes_sistema')
      .select('chave, valor')
      .in('chave', ['fidelidade_fator', 'fidelidade_ativa'])
      .then(({ data }) => {
        data?.forEach((cfg) => {
          if (cfg.chave === 'fidelidade_fator') setFatorPontos(cfg.valor || '0.05');
          if (cfg.chave === 'fidelidade_ativa') setFidelidadeAtiva(cfg.valor === 'true');
        });
      });
    // carregar uma lista inicial de clientes para exibir a base
    void buscarClientes();
  }, []);

  const buscarClientes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nome', `%${busca}%`)
      .order('saldo_pontos', { ascending: false })
      .limit(20);
    setClientes(data || []);
    setLoading(false);
  };

  const salvarConfig = async () => {
    const updates = [
      { chave: 'fidelidade_fator', valor: fatorPontos },
      { chave: 'fidelidade_ativa', valor: String(fidelidadeAtiva) },
    ];

    try {
      const { error } = await supabase.from('configuracoes_sistema').upsert(
        updates.map((u) => ({ ...u, updated_at: new Date().toISOString() })),
        { onConflict: 'chave' }
      );

      if (error) {
        console.error('Erro ao salvar configuracoes_fidelidade:', error);
        toast.error(error.message || 'Erro ao salvar configurações');
        return;
      }
      toast.success('Configurações atualizadas!');
    } catch (err: any) {
      console.error('Exception ao salvar configuracoes_fidelidade:', err);
      toast.error(err?.message || 'Erro ao salvar configurações');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      <PageHeader
        title="Clube de Fidelidade"
        description="Configure as regras de cashback e gerencie pontuação dos clientes."
        icon={Gift}
      />

      <div className="bg-gradient-to-r from-purple-50 to-white p-6 rounded-xl border border-purple-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-800">Configurações Gerais</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Campanha de Fidelidade</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={fidelidadeAtiva}
                onChange={(e) => setFidelidadeAtiva(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span
              className={`text-xs font-bold ${fidelidadeAtiva ? 'text-green-600' : 'text-red-600'}`}
            >
              {fidelidadeAtiva ? 'ATIVA' : 'DESATIVADA'}
            </span>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-md">
            <label className="text-sm text-slate-600 block mb-2">
              Valor do Ponto em Reais (Cashback)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">1 Ponto = R$</span>
              <input
                type="number"
                step="0.01"
                className="p-3 border rounded-lg text-lg font-bold w-32"
                value={fatorPontos}
                onChange={(e) => setFatorPontos(e.target.value)}
                disabled={!fidelidadeAtiva}
              />
              <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">
                {(parseFloat(fatorPontos) * 100).toFixed(0)}% de Cashback
              </span>
            </div>
          </div>
          <Button onClick={salvarConfig} icon={Save} className="bg-purple-600 hover:bg-purple-700">
            Salvar Configurações
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">Base de Clientes</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="pl-9 p-2 border rounded-lg text-sm w-64"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void buscarClientes();
                }}
              />
            </div>
            <Button onClick={buscarClientes} variant="secondary">
              Buscar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 font-medium border-b">
              <tr>
                <th className="p-4">Cliente</th>
                <th className="p-4">Telefone / CPF</th>
                <th className="p-4 text-right">Saldo de Pontos</th>
                <th className="p-4 text-right">Equivalente em R$</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <User size={16} />
                    </div>
                    {c.nome}
                  </td>
                  <td className="p-4 text-slate-500">{c.telefone || c.cpf || '-'}</td>
                  <td className="p-4 text-right font-mono text-lg">{c.saldo_pontos}</td>
                  <td className="p-4 text-right font-bold text-green-600">
                    R$ {(c.saldo_pontos * parseFloat(fatorPontos)).toFixed(2)}
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Nenhum cliente encontrado. Faça uma busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
