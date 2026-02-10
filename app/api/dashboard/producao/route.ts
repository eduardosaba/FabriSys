import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dataInicial = searchParams.get('dataInicial');
    const dataFinal = searchParams.get('dataFinal');
    const statusSelecionado = searchParams.get('statusSelecionado');

    // Dados base da dashboard de produção
    const baseData = {
      producaoTotal: 15234,
      eficiencia: 87.5,
      produtividade: 42.8,
      perdas: 1.8,
    };

    // Aplicar multiplicadores baseados no status
    let multiplier = 1;

    if (statusSelecionado === 'active')
      multiplier *= 1.1; // Foco em ativas
    else if (statusSelecionado === 'completed')
      multiplier *= 0.9; // Foco em concluídas
    else if (statusSelecionado === 'pending') multiplier *= 0.8; // Foco em pendentes

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
      producaoTotal: Math.round(baseData.producaoTotal * multiplier),
      eficiencia: Math.round(baseData.eficiencia * multiplier * 100) / 100,
      produtividade: Math.round(baseData.produtividade * multiplier * 100) / 100,
      perdas: Math.round(baseData.perdas * multiplier * 100) / 100,
    };

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 700));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Erro na API de dashboard de produção:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
