'use client';

import { useState, useEffect } from 'react';
import { useFichaTecnica } from '@/hooks/useFichaTecnica';
import type { InsumoFicha } from '@/lib/types/ficha-tecnica';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Search, DollarSign, Package } from 'lucide-react';

interface FichaTecnicaEditorProps {
  produtoFinalId: string;
  nomeProduto: string;
  precoVenda: number;
  onSave: (insumos: InsumoFicha[], precoVenda: number, rendimento: number) => Promise<void>;
}

interface InsumoEstoque {
  id: string;
  nome: string;
  unidade_medida: string; // Mantido para compatibilidade
  custo_unitario?: number; // Mantido para compatibilidade
  // Novos campos do sistema de unidades duplas
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
  const [buscaInsumo, setBuscaInsumo] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [precoVendaInput, setPrecoVendaInput] = useState('');
  const [rendimentoUnidades, setRendimentoUnidades] = useState<number>(1);

  // Formatar valor para Real
  const formatarReal = (valor: number): string => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Converter string Real para número
  const parseReal = (valor: string): number => {
    const numero = valor.replace(/\./g, '').replace(',', '.');
    return parseFloat(numero) || 0;
  };

  // Inicializar input com preço formatado
  useEffect(() => {
    setPrecoVendaInput(formatarReal(precoVenda));
  }, [precoVenda]);

  const handlePrecoVendaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Permitir apenas números e vírgula
    const apenasNumeros = input.replace(/[^\d,]/g, '');

    // Limitar a duas casas decimais
    const partes = apenasNumeros.split(',');
    if (partes[1] && partes[1].length > 2) {
      partes[1] = partes[1].slice(0, 2);
    }
    const valorFormatado = partes.join(',');

    setPrecoVendaInput(valorFormatado);
    setPrecoVenda(parseReal(valorFormatado));
  };

  // Carregar insumos disponíveis
  useEffect(() => {
    async function carregarInsumos() {
      const { data, error } = await supabase
        .from('insumos')
        .select(
          'id, nome, unidade_medida, custo_unitario, unidade_estoque, custo_por_ue, unidade_consumo, fator_conversao'
        )
        .order('nome');

      if (!error && data) {
        setInsumosDisponiveis(data);
      }
    }
    void carregarInsumos();
  }, []);

  // Filtrar insumos pela busca
  const insumosFiltrados = insumosDisponiveis.filter((insumo) =>
    insumo.nome.toLowerCase().includes(buscaInsumo.toLowerCase())
  );

  const handleSelectInsumo = (idLocal: string, insumo: InsumoEstoque) => {
    // Calcular custo por unidade de consumo (UC)
    const custoPorUC =
      insumo.custo_por_ue && insumo.fator_conversao
        ? insumo.custo_por_ue / insumo.fator_conversao
        : insumo.custo_unitario || 0;

    updateInsumoFull(idLocal, {
      insumoId: insumo.id,
      nomeInsumo: insumo.nome,
      unidadeMedida: insumo.unidade_consumo, // Agora usa UC
      custoUnitario: custoPorUC, // Custo por UC
      // Adicionar informações extras para exibição
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
      await onSave(insumos, precoVenda, rendimentoUnidades);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Ficha Técnica - {nomeProduto}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={18} />
                Preço de Venda Unitário (R$)
              </div>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                R$
              </span>
              <input
                type="text"
                value={precoVendaInput}
                onChange={handlePrecoVendaChange}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 text-lg font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Preço de venda por unidade do produto
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <div className="flex items-center gap-2">
                <Package size={18} />
                Rendimento da Receita (unidades)
              </div>
            </label>
            <input
              type="number"
              min="1"
              value={rendimentoUnidades}
              onChange={(e) => setRendimentoUnidades(parseInt(e.target.value) || 1)}
              placeholder="1"
              className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Quantas unidades esta receita produz? Ex: 20 cones
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Insumos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Receita Completa</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              💡 <strong>Dica:</strong> Adicione as quantidades em{' '}
              <strong>Unidade de Consumo (UC)</strong> (ex: 30g de leite condensado). O sistema
              calcula automaticamente a conversão para Unidade de Estoque (UE) durante a produção.
            </p>
          </div>
          <button
            onClick={addInsumo}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
          >
            <Plus size={20} />
            Adicionar Insumo
          </button>
        </div>

        <div className="space-y-4">
          {insumos.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                <Plus size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Nenhum insumo adicionado
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Clique em "Adicionar Insumo" para começar
              </p>
            </div>
          ) : (
            insumos.map((insumo) => (
              <div
                key={insumo.idLocal}
                className="grid grid-cols-1 md:grid-cols-6 gap-4 p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700"
              >
                {/* Seleção de Insumo */}
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Search className="inline w-4 h-4 mr-1" />
                    Insumo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={insumo.nomeInsumo}
                      onFocus={() => setMostrarBusca(insumo.idLocal)}
                      onChange={(e) => {
                        setBuscaInsumo(e.target.value);
                        setMostrarBusca(insumo.idLocal);
                      }}
                      placeholder="Buscar insumo..."
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                    />
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                  </div>

                  {/* Dropdown de busca */}
                  {mostrarBusca === insumo.idLocal && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white dark:bg-gray-700 border-2 border-blue-300 rounded-xl shadow-2xl">
                      {insumosFiltrados.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">
                          Nenhum insumo encontrado
                        </div>
                      ) : (
                        insumosFiltrados.map((ins) => (
                          <button
                            key={ins.id}
                            onClick={() => handleSelectInsumo(insumo.idLocal, ins)}
                            className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-gray-600 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-800 dark:text-white">
                              {ins.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                              <div>
                                <span className="font-medium">Estoque:</span> {ins.unidade_estoque}
                                {ins.custo_por_ue && (
                                  <span>
                                    {' '}
                                    - R$ {ins.custo_por_ue.toFixed(2)}/{ins.unidade_estoque}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="font-medium">Consumo:</span> {ins.unidade_consumo}
                                {ins.custo_por_ue && ins.fator_conversao && (
                                  <span>
                                    {' '}
                                    - R$ {(ins.custo_por_ue / ins.fator_conversao).toFixed(4)}/
                                    {ins.unidade_consumo}
                                  </span>
                                )}
                              </div>
                              {ins.fator_conversao && (
                                <div className="text-xs">
                                  <span className="font-medium">FC:</span> {ins.fator_conversao}{' '}
                                  {ins.unidade_consumo}/{ins.unidade_estoque}
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Unidade */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Unidade de Consumo (UC)
                  </label>
                  <input
                    type="text"
                    value={insumo.unidadeMedida}
                    disabled
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                  />
                  {/* Informações do sistema de unidades duplas */}
                  {insumo.unidadeEstoque && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                        <div>
                          <strong>Estoque (UE):</strong> {insumo.unidadeEstoque}
                        </div>
                        {insumo.custoPorUE && (
                          <div>
                            <strong>Custo por UE:</strong> R$ {insumo.custoPorUE.toFixed(2)}
                          </div>
                        )}
                        {insumo.fatorConversao && (
                          <div>
                            <strong>Fator Conversão:</strong> {insumo.fatorConversao}{' '}
                            {insumo.unidadeMedida}/{insumo.unidadeEstoque}
                          </div>
                        )}
                        <div>
                          <strong>Custo por UC:</strong> R$ {insumo.custoUnitario.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Perda (%) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  />
                </div>

                {/* Botão remover */}
                <div className="flex items-end">
                  <button
                    onClick={() => removeInsumo(insumo.idLocal)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 font-semibold"
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

      {/* Resumo de Custos */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Resumo de Custos</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-2xl"
        >
          {loading ? 'Salvando...' : '💾 Salvar Ficha Técnica'}
        </button>
      </div>
    </div>
  );
}
