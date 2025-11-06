// Função para formatar número da OP
export function formatNumeroOP(numero: string): string {
  return numero.padStart(4, '0');
}

// Função para calcular CMP unitário
export function calcularCMPUnitario(custoTotal: number, quantidadeProduzida: number): number {
  if (quantidadeProduzida <= 0) return 0;
  return Number((custoTotal / quantidadeProduzida).toFixed(2));
}

// Função para calcular eficiência
export function calcularEficiencia(
  quantidadeProduzida: number,
  quantidadePrevista: number
): number {
  if (quantidadePrevista <= 0) return 0;
  return Number(((quantidadeProduzida / quantidadePrevista) * 100).toFixed(2));
}

// Função para calcular perda percentual
export function calcularPerdaPercentual(
  quantidadePerda: number,
  quantidadeProduzida: number
): number {
  if (quantidadeProduzida <= 0) return 0;
  return Number(((quantidadePerda / quantidadeProduzida) * 100).toFixed(2));
}

// Função para formatar status da OP
export function formatarStatusOP(status: string): string {
  const statusMap: Record<string, string> = {
    pendente: 'Pendente',
    em_producao: 'Em Produção',
    pausada: 'Pausada',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  };
  return statusMap[status] || status;
}

// Função para validar transição de status da OP
export function validarTransicaoStatus(statusAtual: string, novoStatus: string): boolean {
  const transicoes: Record<string, string[]> = {
    pendente: ['em_producao', 'cancelada'],
    em_producao: ['pausada', 'finalizada', 'cancelada'],
    pausada: ['em_producao', 'cancelada'],
    finalizada: [],
    cancelada: [],
  };
  return transicoes[statusAtual]?.includes(novoStatus) || false;
}

// Função para classificar prioridade
export function classificarPrioridade(prioridade: number): string {
  const prioridadeMap: Record<number, string> = {
    1: 'Normal',
    2: 'Alta',
    3: 'Urgente',
  };
  return prioridadeMap[prioridade] || 'Normal';
}

// Função para calcular tempo de produção em minutos
export function calcularTempoProducao(
  dataInicio?: Date | string | null,
  dataFim?: Date | string | null
): number {
  if (!dataInicio || !dataFim) return 0;
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  return Math.round((fim.getTime() - inicio.getTime()) / 1000 / 60);
}

// Função para verificar se OP está atrasada
export function verificarAtraso(dataPrevista: Date | string, status: string): boolean {
  if (status === 'finalizada' || status === 'cancelada') return false;
  const hoje = new Date();
  const prevista = new Date(dataPrevista);
  return hoje > prevista;
}
