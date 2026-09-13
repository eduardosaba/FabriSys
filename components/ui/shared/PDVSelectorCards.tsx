'use client';

import React from 'react';
import { Store, CheckCircle2 } from 'lucide-react';

export interface LocalPDV {
  id: string;
  nome: string;
  tipo?: string; // Ex: 'quiosque', 'loja', 'evento'
}

export interface PDVSelectorCardsProps {
  locais: LocalPDV[];
  selectedId: string;
  onSelect: (id: string) => void;
  carregando?: boolean;
}

export interface PDVSelectorChipsProps {
  locais: LocalPDV[];
  selectedId: string;
  onSelect: (id: string) => void;
  todosLabel?: string;
  carregando?: boolean;
}

/**
 * Grid Seletor por Cards Clicáveis
 * Ideal para formulários de lançamento (ex: Lançamento de Romaneio no PDV)
 */
export function PDVSelectorCards({
  locais,
  selectedId,
  onSelect,
  carregando = false,
}: PDVSelectorCardsProps) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 w-full max-w-full min-w-0">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-primary/10 bg-primary/5 p-3 sm:p-4"
          />
        ))}
      </div>
    );
  }

  if (locais.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-center text-xs text-text/50 w-full">
        Nenhum ponto de venda (PDV) cadastrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 w-full max-w-full min-w-0">
      {locais.map((pdv) => {
        const isSelected = selectedId === pdv.id;

        return (
          <button
            key={pdv.id}
            type="button"
            onClick={() => onSelect(pdv.id)}
            className={`group relative flex flex-col items-start justify-between rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 active:scale-[0.98] min-w-0 w-full overflow-hidden ${
              isSelected
                ? 'border-primary bg-primary/10 shadow-sm shadow-primary/15 ring-2 ring-primary/30 font-bold'
                : 'border-primary/15 bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
            }`}
          >
            {/* Ícone e Indicador de Seleção */}
            <div className="flex w-full items-center justify-between">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                }`}
              >
                <Store className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              {isSelected && (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-in fade-in zoom-in-75 duration-150 shrink-0" />
              )}
            </div>

            {/* Informações do PDV */}
            <div className="mt-2 sm:mt-3 w-full min-w-0">
              <p
                className={`text-xs sm:text-sm font-bold tracking-tight transition-colors truncate w-full ${
                  isSelected ? 'text-primary' : 'text-text/80 group-hover:text-text'
                }`}
                title={pdv.nome}
              >
                {pdv.nome}
              </p>
              <span className="text-[10px] sm:text-[11px] font-medium text-text/50 capitalize truncate block w-full">
                {pdv.tipo || 'Ponto de Venda'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Barra Horizontal de Chips/Tabs Deslizáveis
 * Ideal para Filtros Rápido de Dashboard & Auditoria
 */
export function PDVSelectorChips({
  locais,
  selectedId,
  onSelect,
  todosLabel = 'Todos os PDVs',
  carregando = false,
}: PDVSelectorChipsProps) {
  if (carregando) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full min-w-0 w-full scrollbar-none">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-xl bg-primary/5 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full min-w-0 w-full scrollbar-none snap-x">
      {/* Opção Todos os PDVs */}
      <button
        type="button"
        onClick={() => onSelect('todos')}
        className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 snap-start ${
          selectedId === 'todos' || selectedId === ''
            ? 'bg-primary text-white shadow-sm'
            : 'border border-primary/20 bg-background text-text/70 hover:border-primary/40'
        }`}
      >
        {todosLabel}
      </button>

      {/* Cards/Chips dos PDVs individuais */}
      {locais.map((pdv) => {
        const isSelected = selectedId === pdv.id;
        return (
          <button
            key={pdv.id}
            type="button"
            onClick={() => onSelect(pdv.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 snap-start ${
              isSelected
                ? 'bg-primary text-white shadow-sm'
                : 'border border-primary/20 bg-background text-text/70 hover:border-primary/40'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            {pdv.nome}
          </button>
        );
      })}
    </div>
  );
}
