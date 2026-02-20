'use client';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import getImageUrl from '@/lib/getImageUrl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Button from '@/components/Button';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/theme';

export default function ResetPasswordPage() {
  const { profile, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error: unknown) {
      console.error('Erro no reset de senha:', error);
      toast.error('Erro ao enviar email de recuperação. Verifique o email digitado.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Card className="p-8">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <Text variant="h2" className="mb-2 mt-4">
                Email enviado!
              </Text>
              <Text color="muted" className="mb-6">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </Text>
              <Button onClick={() => router.push('/login')} className="w-full">
                Voltar ao Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-16 w-16">
            {theme.company_logo_url || theme.logo_url ? (
              <div style={{ transform: `scale(${theme.logo_scale || 1})` }}>
                <Image
                  src={
                    getImageUrl(theme.company_logo_url) ||
                    getImageUrl(theme.logo_url) ||
                    theme.company_logo_url ||
                    theme.logo_url
                  }
                  alt={theme.name || 'Confectio'}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-blue-600">
                <span className="text-xl font-bold text-white">SL</span>
              </div>
            )}
          </div>
          <Text variant="h2" className="mb-2">
            {theme.name || 'Confectio'}
          </Text>
          <Text color="muted">Recupere sua senha</Text>
        </div>

        <Card className="p-8">
          <form onSubmit={handleResetPassword} className="space-y-6">
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="seu@email.com"
              />
              <Text color="muted" className="mt-1 text-sm">
                Digite o email associado à sua conta
              </Text>
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
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
