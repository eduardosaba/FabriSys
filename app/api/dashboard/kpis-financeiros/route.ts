import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';

export const revalidate = 60; // seconds

export async function GET() {
  try {
    const supabase = await getServiceSupabase();

    const { data, error } = await supabase
      .from('vw_financeiro_conferencias')
      .select('*')
      .order('data_conferencia', { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const kpis = {
      total_faturado: rows.reduce(
        (acc: number, curr: any) => acc + Number(curr.faturamento_real || 0),
        0
      ),
      total_descontos: rows.reduce(
        (acc: number, curr: any) => acc + Number(curr.descontos_concedidos || 0),
        0
      ),
      total_quebras: rows.reduce(
        (acc: number, curr: any) => acc + Number(curr.quebra_real || 0),
        0
      ),
      lojas_com_mais_quebra: rows
        .filter((d: any) => Number(d.quebra_real || 0) > 10)
        .map((d: any) => d.local_nome),
    };

    return NextResponse.json(kpis);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
