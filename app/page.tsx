'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

import Image from 'next/image';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useTheme } from '../lib/theme';
import { Eye, EyeOff } from 'lucide-react';

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary p-4">
      <img src="/logo.png" alt="Logo FabriSys" className="w-32 h-32 mb-6 drop-shadow-lg" />
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  );
}

function OnboardingLogin() {
  // Lógica do login igual ao app/login/page.tsx
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profileError) throw profileError;
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
      let errorMessage = 'Email ou senha incorretos';
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
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
    <div className="flex flex-col md:flex-row min-h-screen bg-background dark:bg-background">
      {/* Onboarding/Marketing */}
      <div className="flex-1 flex flex-col justify-center items-center bg-primary text-white p-8">
        <img src="/logo.png" alt="Logo FabriSys" className="w-24 h-24 mb-4 drop-shadow-lg" />
        <h2 className="text-3xl font-bold mb-2">Zero Desperdício</h2>
        <p className="mb-2">Controle de CMV, produção e insumos em tempo real.</p>
        <ul className="text-lg list-disc pl-6 mb-4">
          <li>Gestão inteligente de estoque</li>
          <li>Relatórios automáticos</li>
          <li>Segurança e privacidade</li>
        </ul>
      </div>
      {/* Login */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
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
        <p className="mt-4 text-sm text-foreground">
          Ainda não tem conta?{' '}
          <a href="#" className="text-primary">
            Solicite acesso
          </a>
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // SplashScreen mais rápida
    const timer = setTimeout(() => setShowSplash(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      switch (profile.role) {
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
    }
  }, [user, profile, loading, router]);

  if (loading || showSplash) {
    return <SplashScreen />;
  }

  // Se não logado, mostra Onboarding/Login
  return <OnboardingLogin onLogin={() => router.push('/login')} />;
}
