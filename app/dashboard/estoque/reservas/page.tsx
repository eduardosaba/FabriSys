import Link from 'next/link';
import { getServiceSupabase } from '@/lib/supabase-service';

export default async function ReservasPage() {
  let supabase: any;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Reservas de Segurança</h1>
        <p className="mt-4 text-sm text-gray-600">
          Service role key não configurada — não é possível listar reservas aqui.
        </p>
      </div>
    );
  }

  try {
    const { data, error } = await supabase
      .from('ordens_producao')
      .select('id,produto_id,loja_id,estoque_seguranca,quantidade_enviada_extra,status_logistica')
      .neq('status_logistica', 'recebido')
      .gt('estoque_seguranca', 0);

    if (error) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Reservas de Segurança</h1>
          <p className="mt-4 text-sm text-red-600">Erro ao consultar reservas.</p>
        </div>
      );
    }

    const rows = (data || []).map((op: any) => {
      const estoque = Number(op.estoque_seguranca ?? 0);
      const enviado = Number(op.quantidade_enviada_extra ?? 0);
      const disponivel = Math.max(0, estoque - enviado);
      return { ...op, estoque, enviado, disponivel };
    });

    return (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reservas de Segurança</h1>
          <Link href="/dashboard/logistica/remessas" className="text-sm text-blue-600">
            Ir para Remessas
          </Link>
        </div>

        <div className="mt-6 overflow-auto rounded border">
          <table className="min-w-full text-left">
            <thead className="bg-white sticky top-0 z-30">
              <tr>
                <th className="px-4 py-2">OP</th>
                <th className="px-4 py-2">Produto</th>
                <th className="px-4 py-2">Loja</th>
                <th className="px-4 py-2">Estoque Seg.</th>
                <th className="px-4 py-2">Enviado Extra</th>
                <th className="px-4 py-2">Disponível</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={String(r.id)} className="border-t">
                  <td className="px-4 py-2">{String(r.id)}</td>
                  <td className="px-4 py-2">{String(r.produto_id ?? '-')}</td>
                  <td className="px-4 py-2">{String(r.loja_id ?? '-')}</td>
                  <td className="px-4 py-2">{r.estoque}</td>
                  <td className="px-4 py-2">{r.enviado}</td>
                  <td className="px-4 py-2">{r.disponivel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Reservas de Segurança</h1>
        <p className="mt-4 text-sm text-red-600">Erro inesperado ao carregar reservas.</p>
      </div>
    );
  }
}
