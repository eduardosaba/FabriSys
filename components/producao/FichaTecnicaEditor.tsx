'use client';

import { useState, useEffect } from 'react';
import { useFichaTecnica } from '@/hooks/useFichaTecnica';
import type { InsumoFicha } from '@/lib/types/ficha-tecnica';
import type { FichaTecnica } from '@/lib/types/producao';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Search, DollarSign, Package } from 'lucide-react';

interface FichaTecnicaEditorProps {
  produtoFinalId: string;
  nomeProduto: string;
  precoVenda: number;
  // ATUALIZADO: Adicionado rendimentoTotalG na assinatura da função
  onSave: (
    insumos: InsumoFicha[],
    precoVenda: number,
    rendimento: number,
    rendimentoTotalG: number,
    observacao?: string
  ) => Promise<void>;
  ficha?: Partial<FichaTecnica>;
  modoEdicao?: boolean;
}

interface InsumoEstoque {
  id: string;
  nome: string;
  unidade_medida: string;
  custo_unitario?: number;
  unidade_estoque: string;
  custo_por_ue?: number;
  unidade_consumo: string;
  fator_conversao: number;
}

export function FichaTecnicaEditor({
  produtoFinalId,
  nomeProduto,
  precoVenda: initialPrecoVenda,
  onSave,
  ficha: _ficha,
  modoEdicao: _modoEdicao = false,
}: FichaTecnicaEditorProps) {
  const {
    insumos,
    precoVenda,
    setPrecoVenda,
    custoResumo,
    addInsumo,
    removeInsumo,
    updateInsumo,
    updateInsumoFull,
  } = useFichaTecnica({
    produtoFinalId,
    nomeProduto,
    precoVenda: initialPrecoVenda,
    insumos: [],
  });

  const [insumosDisponiveis, setInsumosDisponiveis] = useState<InsumoEstoque[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [buscaInsumo, setBuscaInsumo] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [precoVendaInput, setPrecoVendaInput] = useState('');

  // Estado para Rendimento em Unidades (Ex: 20 doces)
  const [rendimentoUnidades, setRendimentoUnidades] = useState<number>(1);
  // NOVO: Estado para Rendimento em Gramas (Ex: 450g de massa)
  const [rendimentoTotalG, setRendimentoTotalG] = useState<number>(0);
  // Novo campo de instruções/observações da ficha técnica
  const [observacao, setObservacao] = useState<string>('');

  // Formatar valor para Real
  const formatarReal = (valor: number): string => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Converter string Real para número
  const parseReal = (valor: string): number => {
    const numero = valor.replace(/\./g, '').replace(',', '.');
    return parseFloat(numero) || 0;
  };

  useEffect(() => {
    setPrecoVendaInput(formatarReal(precoVenda));
  }, [precoVenda]);

  const handlePrecoVendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const apenasNumeros = input.replace(/[^\d,]/g, '');
    const partes = apenasNumeros.split(',');
    if (partes[1] && partes[1].length > 2) {
      partes[1] = partes[1].slice(0, 2);
    }
    const valorFormatado = partes.join(',');
    setPrecoVendaInput(valorFormatado);
    setPrecoVenda(parseReal(valorFormatado));
  };

  useEffect(() => {
    async function carregarListas() {
      const [
        { data: insumosData, error: insumosError },
        { data: produtosData, error: produtosError },
      ] = await Promise.all([
        supabase
          .from('insumos')
          .select(
            'id, nome, unidade_medida, custo_unitario, unidade_estoque, custo_por_ue, unidade_consumo, fator_conversao'
          )
          .order('nome'),
        // Para a lista de preparações, buscar apenas produtos marcados como 'semi_acabado'
        supabase
          .from('produtos_finais')
          .select('id, nome')
          .eq('ativo', true)
          .eq('tipo', 'semi_acabado')
          .order('nome'),
      ] as any);

      if (!insumosError && insumosData) setInsumosDisponiveis(insumosData);
      if (!produtosError && produtosData) setProdutosDisponiveis(produtosData);
    }

    void carregarListas();
  }, []);

  const insumosFiltrados = insumosDisponiveis.filter((insumo) =>
    insumo.nome.toLowerCase().includes(buscaInsumo.toLowerCase())
  );

  const handleSelectInsumo = (idLocal: string, insumo: InsumoEstoque) => {
    const custoPorUC =
      insumo.custo_por_ue && insumo.fator_conversao
        ? insumo.custo_por_ue / insumo.fator_conversao
        : insumo.custo_unitario || 0;

    updateInsumoFull(idLocal, {
      insumoId: insumo.id,
      nomeInsumo: insumo.nome,
      unidadeMedida: insumo.unidade_consumo,
      custoUnitario: custoPorUC,
      unidadeEstoque: insumo.unidade_estoque,
      custoPorUE: insumo.custo_por_ue,
      fatorConversao: insumo.fator_conversao,
    });
    setMostrarBusca(null);
    setBuscaInsumo('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Passando o rendimentoTotalG e observação para a função pai
      await onSave(insumos, precoVenda, rendimentoUnidades, rendimentoTotalG, observacao);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Ficha Técnica - {nomeProduto}
        </h2>
        {/* ATUALIZADO: Mudado para grid-cols-3 para caber os 3 campos lado a lado */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Campo 1: Preço */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <DollarSign size={18} />
                Preço de Venda (R$)
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-500 dark:text-gray-400">
                R$
              </span>
              <input
                type="text"
                value={precoVendaInput}
                onChange={handlePrecoVendaChange}
                placeholder="0,00"
                className="w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 text-lg font-semibold transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Preço de venda por unidade
            </p>
          </div>

          {/* Campo 2: Rendimento Unidades */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Package size={18} />
                Rendimento (Unidades)
              </div>
            </label>
            <input
              type="number"
              min="1"
              value={rendimentoUnidades}
              onChange={(e) => setRendimentoUnidades(parseInt(e.target.value) || 1)}
              placeholder="1"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg font-semibold transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Ex: 20 cones</p>
          </div>

          {/* Campo 3: NOVO - Peso da Massa (Rendimento da Panela) */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Package size={18} />
                Peso da Massa pronta
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={rendimentoTotalG}
                onChange={(e) => setRendimentoTotalG(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 450"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg font-semibold transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-gray-500 font-medium">g</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Essencial p/ cálculo de panelas
            </p>
          </div>
        </div>
      </div>
      {/* Lista de Insumos */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Receita Completa</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Dica:</strong> Adicione as quantidades em{' '}
              <strong>Unidade de Consumo (UC)</strong>. O sistema converte automaticamente.
            </p>
          </div>
          <button
            onClick={addInsumo}
            className="flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
          >
            <Plus size={20} />
            Adicionar Insumo
          </button>
        </div>

        <div className="space-y-4">
          {insumos.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-600 dark:bg-gray-900">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Plus size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                Nenhum insumo adicionado
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Clique em "Adicionar Insumo" para começar
              </p>
            </div>
          ) : (
            insumos.map((insumo) => (
              <div
                key={insumo.idLocal}
                className="grid grid-cols-1 gap-4 rounded-xl border-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6 transition-all hover:border-blue-300 dark:border-gray-600 dark:from-gray-800 dark:to-gray-700 dark:hover:border-blue-700 md:grid-cols-6"
              >
                {/* Seleção de Insumo */}
                <div className="relative md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Search className="mr-1 inline h-4 w-4" />
                    Insumo
                  </label>
                  <div className="relative">
                    {/* Tipo de insumo: insumo simples ou preparação (produto final) */}
                    <div className="flex items-center gap-3">
                      <input
                        id={`composed-${insumo.idLocal}`}
                        type="checkbox"
                        checked={Boolean(insumo.isComposto)}
                        onChange={(e) =>
                          updateInsumo(insumo.idLocal, 'isComposto', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <label
                        htmlFor={`composed-${insumo.idLocal}`}
                        className="text-sm text-gray-600"
                      >
                        Preparação (usar produto final)
                      </label>
                    </div>

                    {!insumo.isComposto ? (
                      <input
                        type="text"
                        value={insumo.nomeInsumo}
                        onFocus={() => setMostrarBusca(insumo.idLocal)}
                        onChange={(e) => {
                          setBuscaInsumo(e.target.value);
                          setMostrarBusca(insumo.idLocal);
                        }}
                        placeholder="Buscar insumo..."
                        className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 pr-10 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <select
                        value={insumo.compostoProdutoId || ''}
                        onChange={(e) => {
                          const prodId = e.target.value || null;
                          const prod = produtosDisponiveis.find((p) => p.id === (prodId as string));
                          updateInsumoFull(insumo.idLocal, {
                            compostoProdutoId: prodId,
                            nomeInsumo: prod ? prod.nome : '',
                            insumoId: null,
                          });
                        }}
                        className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 pr-10 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">-- Selecionar preparação --</option>
                        {produtosDisponiveis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    )}
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                  </div>

                  {/* Dropdown de busca */}
                  {mostrarBusca === insumo.idLocal && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border-2 border-blue-300 bg-white shadow-2xl dark:bg-gray-700">
                      {insumosFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          Nenhum insumo encontrado
                        </div>
                      ) : (
                        insumosFiltrados.map((ins) => (
                          <button
                            key={ins.id}
                            onClick={() => handleSelectInsumo(insumo.idLocal, ins)}
                            className="w-full border-b p-3 text-left transition-colors last:border-b-0 hover:bg-blue-50 dark:hover:bg-gray-600"
                          >
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {ins.nome}
                            </div>
                            <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <div>
                                <span className="font-medium">Estoque:</span> {ins.unidade_estoque}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={insumo.quantidade}
                    onChange={(e) =>
                      updateInsumo(insumo.idLocal, 'quantidade', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Unidade */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Unidade (UC)
                  </label>
                  <input
                    type="text"
                    value={insumo.unidadeMedida}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border-2 border-gray-300 bg-gray-100 px-4 py-3 dark:border-gray-600 dark:bg-gray-600"
                  />
                  {insumo.unidadeEstoque && (
                    <div className="mt-2 text-xs text-blue-800 dark:text-blue-200">
                      Estoque em: {insumo.unidadeEstoque}
                    </div>
                  )}
                </div>

                {/* Perda (%) */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Perda (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={insumo.perdaPadrao}
                    onChange={(e) =>
                      updateInsumo(insumo.idLocal, 'perdaPadrao', parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Botão remover */}
                <div className="flex items-end">
                  <button
                    onClick={() => removeInsumo(insumo.idLocal)}
                    className="flex w-full transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-red-600 hover:to-red-700"
                    title="Remover insumo"
                  >
                    <Trash2 size={18} />
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campo de Observações / Instruções */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Instruções / Observações (opcional)
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex: Assar em forno pré-aquecido a 180°C por 20 minutos..."
          className="w-full min-h-[100px] rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Resumo de Custos */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h3 className="mb-4 text-xl font-semibold">Resumo de Custos</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <div className="text-sm text-gray-500">Custo Total</div>
            <div className="text-2xl font-bold">R$ {custoResumo.custoTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Preço de Venda</div>
            <div className="text-2xl font-bold">R$ {custoResumo.precoVenda.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Margem Bruta</div>
            <div className="text-2xl font-bold">R$ {custoResumo.margemBruta.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Margem %</div>
            <div
              className={`text-2xl font-bold ${
                custoResumo.margemBrutaPercentual < 0
                  ? 'text-red-600'
                  : custoResumo.margemBrutaPercentual < 20
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {custoResumo.margemBrutaPercentual.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || insumos.length === 0}
          className="transform rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:from-green-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
        >
          {loading ? 'Salvando...' : '💾 Salvar Ficha Técnica'}
        </button>
      </div>
    </div>
  );
}
