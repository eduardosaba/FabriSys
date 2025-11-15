'use client';

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

import { useEffect, useState } from 'react';

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15 + 5; // avança de 5 a 20 por tick
      if (current >= 100) {
        current = 100;
        setProgress(100);
        clearInterval(interval);
        // Aguardar um pouco para mostrar 100% antes de completar
        setTimeout(onComplete, 300);
        return;
      }
      setProgress(Math.floor(current));
    }, 120);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-primary p-4">
      {/* Logo com efeito animado */}
      <div className="mb-8 flex items-center justify-center w-full">
        <img
          src={theme.logo_url || '/logo.png'}
          alt={`Logo ${theme.name || 'Confectio'}`}
          className="animate-logo-bounce drop-shadow-lg mx-auto"
          style={{
            width: '448px',
            height: '180px',
            maxWidth: '95vw',
            maxHeight: '32vh',
            objectFit: 'contain',
            transform: `scale(${theme.logo_scale || 1})`,
          }}
        />
      </div>
      {/* Barra de progresso real abaixo da logo */}
      <div className="mb-4 h-3 w-32 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 transition-all duration-200"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="mb-2 font-mono text-xs text-white">Carregando... {progress}%</span>
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
    </div>
  );
}

function OnboardingLogin() {
  // Lógica do login igual ao app/login/page.tsx
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 20 + 10;
      if (current >= 90) current = 90;
      setProgress(Math.floor(current));
    }, 120);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        setProgress(95);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profileError) throw profileError;
        setProgress(100);
        clearInterval(interval);
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
      clearInterval(interval);
      setProgress(0);
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
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background dark:bg-background md:flex-row">
      {/* Onboarding/Marketing */}
      <div className="flex flex-1 flex-col items-center justify-center bg-primary p-4 text-white">
        <div
          className="mb-4 drop-shadow-lg flex justify-center items-center w-full"
          style={{ minHeight: '48px', marginTop: '16px' }}
        >
          <img
            src={theme.logo_url || '/logo.png'}
            alt={`Logo ${theme.name || 'Confectio'}`}
            className="object-contain mx-auto"
            style={{
              width: '86px',
              height: '26px',
              maxWidth: '60vw',
              maxHeight: '48px',
              transform: `scale(${theme.logo_scale || 1})`,
              display: 'block',
            }}
          />
        </div>
        <div className="mb-6" />
        <h2 className="mb-2 text-2xl md:text-3xl font-bold text-center">
          O segredo da gestão gourmet.
        </h2>
        <div className="mb-4" />
        <p className="mb-2 text-sm md:text-base text-center">
          Controle de CMV, produção e insumos em tempo real.
        </p>
        <ul className="mb-4 list-disc pl-4 md:pl-6 text-sm md:text-lg text-left md:text-center">
          <li>Gestão inteligente de estoque</li>
          <li>Relatórios automáticos</li>
          <li>Segurança e privacidade</li>
        </ul>
      </div>
      {/* Login */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex flex-col items-center justify-center mb-6 w-full">
              <div
                className="relative mx-auto"
                style={{ width: '224px', height: '90px', maxWidth: '90vw', maxHeight: '30vh' }}
              >
                <Image
                  src={theme.company_logo_url || theme.logo_url || '/logo.png'}
                  alt={`Logo ${theme.name || 'Confectio'}`}
                  fill
                  sizes="224px"
                  className="object-contain"
                  priority
                  loading="eager"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <Text color="muted" className="mt-8 mb-4">
                Entre com suas credenciais
              </Text>
            </div>
            <div className="mt-4 rounded-md bg-blue-50 p-4 dark:bg-blue-900">
              <Text className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                🔑 Credenciais temporárias:
              </Text>
              <div className="space-y-1 text-left">
                <Text className="font-mono text-sm text-blue-700 dark:text-blue-300">
                  Admin: sababrtv@gmail.com / admin123
                </Text>
                <Text className="font-mono text-sm text-blue-700 dark:text-blue-300">
                  Fábrica: eduardosaba.rep@gmail.com / fabrica123
                </Text>
                <Text className="font-mono text-sm text-blue-700 dark:text-blue-300">
                  PDV: eduardosaba@uol.com / pdv123
                </Text>
              </div>
            </div>
          </div>
          {/* Barra de progresso durante login */}
          {loading && (
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          {loading && (
            <span className="mb-2 block font-mono text-xs text-blue-700 dark:text-blue-300">
              Carregando... {progress}%
            </span>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

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

  if (showSplash || loading) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }
  // Se não logado, mostra Onboarding/Login
  if (!user || !profile) {
    return <OnboardingLogin />;
  }
  // Se logado, redireciona conforme perfil
  return null;
}
