'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/theme';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  useEffect(() => {
    // Verificar se há parâmetros de URL para reset de senha
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    console.log('Parâmetros da URL:', {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      type
    });

    if (accessToken && refreshToken) {
      // Para reset de senha, usar setSession diretamente
      void supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        console.log('Sessão configurada:', {
          user: !!data.user,
          session: !!data.session,
          error
        });

        if (error) {
          console.error('Erro ao configurar sessão:', error);
          toast.error('Link de recuperação inválido ou expirado.');
        } else if (data.session) {
          toast.success('Sessão de recuperação configurada. Você pode alterar sua senha.');
        }
      });
    } else if (type === 'recovery') {
      // Se não há tokens mas type=recovery, pode ser um fluxo diferente
      console.log('Tipo recovery detectado, verificando sessão atual...');
      void supabase.auth.getSession().then(({ data, error }) => {
        console.log('Sessão atual:', { session: !!data.session, error });
        if (!data.session) {
          toast.error('Link de recuperação inválido. Solicite um novo link.');
        }
      });
    } else {
      console.log('Nenhum parâmetro de recuperação encontrado');
      toast.error('Link de recuperação inválido. Solicite um novo link.');
    }
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Verificar se há uma sessão válida
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Sessão atual:', { session: !!sessionData.session, error: sessionError });

      if (sessionError || !sessionData.session) {
        throw new Error('Sessão inválida. O link de recuperação pode ter expirado.');
      }

      console.log('Tentando atualizar senha...');
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      console.log('Resultado da atualização:', { data, error });

      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
      console.log('Redirecionando para login...');

      // Pequeno delay para mostrar o toast
      setTimeout(() => {
        router.push('/login');
      }, 1000);

    } catch (error: unknown) {
      console.error('Erro ao atualizar senha:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar senha. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 relative mb-4">
            {theme.logo_url ? (
              <Image
                src={theme.logo_url}
                alt={theme.name || 'Sistema Lari'}
                fill
                className="object-contain"
                style={{
                  transform: `scale(${theme.logo_scale || 1})`,
                }}
              />
            ) : (
              <div className="h-full w-full bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">SL</span>
              </div>
            )}
          </div>
          <Text variant="h2" className="mb-2">
            {theme.name || 'Sistema Lari'}
          </Text>
          <Text color="muted">Defina sua nova senha</Text>
        </div>

        <Card className="p-8">
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Nova Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirmar Nova Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Voltar ao Login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}