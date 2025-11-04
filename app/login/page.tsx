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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Buscar role do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        // Redirecionar baseado no role
        const role = (profile as { role: string } | null)?.role || 'pdv';
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
      console.error('Erro no login:', error);
      toast.error('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32">
              <Image
                src={theme.logo_url || '/logo.png'}
                alt={`Logo ${theme.name || 'Sistema Lari'}`}
                fill
                className="object-contain"
                style={{ transform: `scale(${theme.logo_scale || 1})` }}
                priority
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="••••••••"
            />
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
