import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dataInicial = searchParams.get('dataInicial');
    const dataFinal = searchParams.get('dataFinal');
    const categoriaSelecionada = searchParams.get('categoriaSelecionada');

    // Dados base da dashboard principal
    const baseData = {
      lucro: 150000,
      vendas: 500000,
      custo: 200000,
      perdas: 10000,
    };

    // Aplicar multiplicadores baseados na categoria
    let multiplier = 1;

    if (categoriaSelecionada === 'sales')
      multiplier *= 1.2; // Foco em vendas
    else if (categoriaSelecionada === 'loss')
      multiplier *= 0.8; // Foco em perdas
    else if (categoriaSelecionada === 'costs') multiplier *= 0.9; // Foco em custos

    // Simular variação baseada no período
    if (dataInicial && dataFinal) {
      const startDate = new Date(dataInicial);
      const endDate = new Date(dataFinal);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Ajustar multiplicador baseado no período
      if (diffDays <= 1)
        multiplier *= 0.4; // Hoje/Ontem/Amanhã
      else if (diffDays <= 7)
        multiplier *= 0.6; // Últimos 7 dias
      else if (diffDays <= 30)
        multiplier *= 0.9; // Últimos 30 dias
      else if (diffDays <= 90)
        multiplier *= 1.3; // Trimestre
      else multiplier *= 1.6; // Ano ou mais
    }

    // Aplicar variação aleatória pequena para simular dados reais
    const randomVariation = 0.9 + Math.random() * 0.2; // 0.9 a 1.1
    multiplier *= randomVariation;

    // Retornar dados calculados
    const responseData = {
      lucro: Math.round(baseData.lucro * multiplier),
      vendas: Math.round(baseData.vendas * multiplier),
      custo: Math.round(baseData.custo * multiplier),
      perdas: Math.round(baseData.perdas * multiplier),
    };

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 600));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Erro na API de dashboard principal:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
