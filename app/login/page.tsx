'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/theme';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('=== DEBUG LOGIN ===');
    console.log('Tentando fazer login com email:', email);

    try {
      console.log('Chamando supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Resposta do Supabase:', { data: data ? 'success' : null, error });

      if (error) {
        console.error('Erro no login:', error);
        throw error;
      }

      if (data.user) {
        console.log('Usuário autenticado:', data.user.id);
        // Buscar role do usuário
        console.log('Buscando perfil do usuário...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          throw profileError;
        }

        console.log('Perfil encontrado:', profile);
        // Redirecionar baseado no role
        const role = (profile as { role: string } | null)?.role || 'pdv';
        console.log('Role do usuário:', role);
        switch (role) {
          case 'admin':
          case 'fabrica':
            router.push('/dashboard');
            break;
          case 'pdv':
            router.push('/dashboard/pedidos-compra');
            break;
          default:
            router.push('/dashboard');
        }

        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('=== ERRO DETALHADO NO LOGIN ===');
      console.error('Erro completo:', error);
      console.error('Tipo do erro:', typeof error);
      console.error(
        'Propriedades do erro:',
        error && typeof error === 'object' ? Object.keys(error) : 'N/A'
      );

      let errorMessage = 'Email ou senha incorretos';

      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        console.error('Mensagem do erro:', error.message);
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        } else {
          errorMessage = `Erro de autenticação: ${error.message}`;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="relative w-32 h-32"
              style={{ transform: `scale(${theme.logo_scale || 1})` }}
            >
              <Image
                src={theme.logo_url || '/logo.png'}
                alt={`Logo ${theme.name || 'Sistema Lari'}`}
                fill
                sizes="128px"
                className="object-contain"
                priority
                loading="eager"
              />
            </div>
          </div>
          <Text variant="h2" className="mb-2">
            {theme.name || 'Sistema Lari'}
          </Text>
          <Text color="muted">Entre com suas credenciais</Text>

          {/* Instruções temporárias */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
            <Text className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              🔑 Credenciais temporárias:
            </Text>
            <div className="space-y-1 text-left">
              <Text className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                Admin: sababrtv@gmail.com / admin123
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                Fábrica: eduardosaba.rep@gmail.com / fabrica123
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                PDV: eduardosaba@uol.com / pdv123
              </Text>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/reset-password')}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Esqueci minha senha
          </button>
        </div>
      </Card>
    </div>
  );
}
