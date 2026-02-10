'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '@/components/Button';

interface Cliente {
  id: string;
  nome: string;
  saldo_pontos: number;
}

interface Props {
  totalVenda: number;
  onClienteSelecionado: (clienteId: string | null) => void;
  onDescontoPontos: (pontos: number, valorDesconto: number) => void;
}

export default function ClienteFidelidade({
  totalVenda,
  onClienteSelecionado,
  onDescontoPontos,
}: Props) {
  const [telefone, setTelefone] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [usarPontos, setUsarPontos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);

  const FATOR_CONVERSAO = 0.05;

  useEffect(() => {
    void supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'fidelidade_ativa')
      .single()
      .then(({ data }) => {
        if (data) setFidelidadeAtiva(data.valor === 'true');
      });
  }, []);

  if (!fidelidadeAtiva) return null;

  const buscarCliente = async () => {
    if (!telefone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefone)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCliente(data);
        onClienteSelecionado(data.id);
        toast.success(`Cliente ${data.nome} identificado!`);
      } else {
        const criar = confirm('Cliente não encontrado. Cadastrar agora?');
        if (criar) {
          const nome = prompt('Nome do Cliente:');
          if (nome) {
            const { data: novo, error: errCreate } = await supabase
              .from('clientes')
              .insert({ nome, telefone, saldo_pontos: 0 })
              .select()
              .single();
            if (!errCreate && novo) {
              setCliente(novo);
              onClienteSelecionado(novo.id);
              toast.success('Cliente cadastrado!');
            }
          }
        }
      }
    } catch {
      toast.error('Erro ao buscar cliente');
    } finally {
      setLoading(false);
    }
  };

  const togglePontos = () => {
    if (!cliente) return;
    const novoEstado = !usarPontos;
    setUsarPontos(novoEstado);

    if (novoEstado) {
      const descontoMaximoPontos = cliente.saldo_pontos * FATOR_CONVERSAO;
      const descontoReal = Math.min(descontoMaximoPontos, totalVenda);
      const pontosNecessarios = descontoReal / FATOR_CONVERSAO;

      onDescontoPontos(pontosNecessarios, descontoReal);
    } else {
      onDescontoPontos(0, 0);
    }
  };

  const limparCliente = () => {
    setCliente(null);
    setTelefone('');
    setUsarPontos(false);
    onClienteSelecionado(null);
    onDescontoPontos(0, 0);
  };

  if (cliente) {
    const descontoDisponivel = cliente.saldo_pontos * FATOR_CONVERSAO;
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-purple-600 font-bold uppercase flex items-center gap-1">
              <User size={12} /> Cliente Fidelidade
            </p>
            <p className="font-bold text-slate-800">{cliente.nome}</p>
            <p className="text-xs text-slate-500">
              Saldo: {cliente.saldo_pontos.toFixed(0)} pts (R$ {descontoDisponivel.toFixed(2)})
            </p>
          </div>
          <button onClick={limparCliente} className="text-slate-400 hover:text-red-500">
            <X size={16} />
          </button>
        </div>

        {cliente.saldo_pontos > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="usar_pontos"
              checked={usarPontos}
              onChange={togglePontos}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <label
              htmlFor="usar_pontos"
              className="text-sm text-slate-700 cursor-pointer select-none"
            >
              Usar saldo para abater
              {usarPontos && (
                <span className="font-bold text-green-600 ml-1">
                  (- R$ {Math.min(totalVenda, descontoDisponivel).toFixed(2)})
                </span>
              )}
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 text-slate-400" size={16} />
        <input
          type="tel"
          placeholder="CPF ou Celular do Cliente"
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void buscarCliente();
          }}
        />
      </div>
      <Button
        onClick={buscarCliente}
        loading={loading}
        className="px-3 bg-purple-600 hover:bg-purple-700"
      >
        <User size={18} />
      </Button>
    </div>
  );
}
