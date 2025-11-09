'use client';

import { useState, useCallback, useMemo } from 'react';
import type { InsumoFicha, FichaTecnicaData, CustoResumo } from '@/lib/types/ficha-tecnica';

export function useFichaTecnica(initialData?: FichaTecnicaData) {
  const [insumos, setInsumos] = useState<InsumoFicha[]>(initialData?.insumos || []);
  const [precoVenda, setPrecoVenda] = useState<number>(initialData?.precoVenda || 0);

  // Adicionar novo insumo à lista
  const addInsumo = useCallback(() => {
    const newInsumo: InsumoFicha = {
      idLocal: `temp-${Date.now()}`, // ID temporário para novos insumos
      insumoId: null,
      nomeInsumo: '',
      quantidade: 0,
      unidadeMedida: '',
      perdaPadrao: 0,
      custoUnitario: 0,
    };
    setInsumos((prev) => [...prev, newInsumo]);
  }, []);

  // Remover insumo da lista
  const removeInsumo = useCallback((idLocal: string) => {
    setInsumos((prev) => prev.filter((insumo) => insumo.idLocal !== idLocal));
  }, []);

  // Atualizar insumo específico
  const updateInsumo = useCallback(
    <K extends keyof InsumoFicha>(idLocal: string, field: K, value: InsumoFicha[K]) => {
      setInsumos((prev) =>
        prev.map((insumo) => {
          if (insumo.idLocal !== idLocal) return insumo;
          return { ...insumo, [field]: value };
        })
      );
    },
    []
  );

  // Atualizar insumo completo (útil quando selecionar do banco de dados)
  const updateInsumoFull = useCallback((idLocal: string, data: Partial<InsumoFicha>) => {
    setInsumos((prev) =>
      prev.map((insumo) => {
        if (insumo.idLocal !== idLocal) return insumo;
        return { ...insumo, ...data };
      })
    );
  }, []);

  // Calcular custo total de um insumo considerando perda
  const calcularCustoInsumo = useCallback((insumo: InsumoFicha): number => {
    const quantidadeComPerda = insumo.quantidade * (1 + insumo.perdaPadrao / 100);
    return quantidadeComPerda * insumo.custoUnitario;
  }, []);

  // Calcular resumo de custos em tempo real
  const custoResumo = useMemo<CustoResumo>(() => {
    const custoTotal = insumos.reduce((acc, insumo) => {
      const quantidadeComPerda = insumo.quantidade * (1 + insumo.perdaPadrao / 100);
      return acc + quantidadeComPerda * insumo.custoUnitario;
    }, 0);

    const margemBruta = precoVenda - custoTotal;
    const margemBrutaPercentual = custoTotal > 0 ? (margemBruta / precoVenda) * 100 : 0;

    return {
      custoTotal,
      precoVenda,
      margemBruta,
      margemBrutaPercentual,
    };
  }, [insumos, precoVenda]);

  // Resetar formulário
  const reset = useCallback((data?: FichaTecnicaData) => {
    setInsumos(data?.insumos || []);
    setPrecoVenda(data?.precoVenda || 0);
  }, []);

  // Obter dados para salvar no banco
  const getFichaTecnicaData = useCallback(
    (produtoFinalId: string, nomeProduto: string): FichaTecnicaData => {
      return {
        produtoFinalId,
        nomeProduto,
        precoVenda,
        insumos,
      };
    },
    [insumos, precoVenda]
  );

  return {
    insumos,
    precoVenda,
    setPrecoVenda,
    custoResumo,
    addInsumo,
    removeInsumo,
    updateInsumo,
    updateInsumoFull,
    calcularCustoInsumo,
    reset,
    getFichaTecnicaData,
  };
}
