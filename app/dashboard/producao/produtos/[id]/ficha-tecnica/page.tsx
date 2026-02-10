'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const ALLOWED_EDIT_USERS = [
  // Emails ou IDs de usuários pré-estabelecidos que podem abrir diretamente em edição
  'poweruser@exemplo.com',
];

export default function ProdutoFichaRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { profile } = useAuth();
  const [message, setMessage] = useState('Redirecionando...');

  useEffect(() => {
    if (!id) {
      setMessage('Produto inválido.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('fichas_tecnicas')
          .select('slug')
          .eq('produto_final_id', id)
          .limit(1)
          .single();

        if (cancelled) return;

        if (error && (error as any)?.code !== 'PGRST116') {
          // erro inesperado
          console.error('Erro ao buscar ficha por produto:', error);
        }

        const slug = data && (data as any).slug;

        // Decide se usuário pode abrir em edição
        const canEdit =
          profile?.role === 'admin' || ALLOWED_EDIT_USERS.includes(profile?.email || '');

        if (slug) {
          const target = canEdit
            ? `/dashboard/producao/fichas-tecnicas/${slug}/edit`
            : `/dashboard/producao/fichas-tecnicas/${slug}/view`;
          router.replace(target);
          return;
        }

        // Não existe ficha: abrir criação (todos)
        router.replace(`/dashboard/producao/fichas-tecnicas/nova?produto_final_id=${id}`);
      } catch (err) {
        console.error('Erro ao redirecionar ficha técnica:', err);
        setMessage('Erro ao redirecionar.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, profile, router]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium">{message}</h2>
    </div>
  );
}
