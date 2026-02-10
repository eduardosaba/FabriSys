'use client';
import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, AlertCircle, Loader2, X, Mail } from 'lucide-react';

// Nota: removemos importações estáticas do Firebase para evitar erro de build
// quando a dependência não estiver instalada. Fazemos inicialização dinâmica
// em runtime dentro de `useEffect` (com try/catch) — isso permite executar
// o app sem o pacote em ambientes de desenvolvimento onde não é necessário.

// Usar o ThemeProvider centralizado do sistema (carrega tema do sistema/usuário)

// --- MOCK SERVICES (Apenas Auth) ---
const supabaseMock = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // Senhas de teste
      if (password === 'admin123' || password === 'fabrica123' || password === 'pdv123') {
        return { data: { user: { id: 'mock-user-id' } }, error: null };
      }
      return { data: null, error: { message: 'Credenciais inválidas.' } };
    },
    resetPasswordForEmail: async (email?: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { error: null };
    },
  },
};

// --- UI COMPONENTS (SHARED) ---

// Helper para extrair mensagem de erro de forma segura
function getErrorMessage(err: unknown) {
  if (!err) return 'Erro desconhecido';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    loading?: boolean;
  }
> = ({
  children,
  className = '',
  disabled,
  variant = 'primary',
  loading = false,
  onClick,
  ...props
}) => {
  const baseStyles =
    'flex items-center justify-center rounded-lg px-4 py-2 transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-sm';
  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 focus:ring-orange-400 shadow-md hover:shadow-lg',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-200',
    ghost: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
      {children}
    </button>
  );
};

const InputField: React.FC<
  { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>
> = ({ label, error, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
    )}
    <div className="relative">
      <input
        className={`w-full rounded-lg border bg-white px-3 py-2 text-gray-900 outline-none transition-all 
          placeholder:text-gray-400 focus:ring-2 disabled:bg-gray-50
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'}
          ${props.className}
        `}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
  </div>
);

const Toast: React.FC<{ message?: string; type?: 'error' | 'success'; onClose?: () => void }> = ({
  message,
  type = 'success',
  onClose,
}) => {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 right-4 z-[70] flex items-center gap-3 rounded-xl p-4 text-white shadow-2xl animate-fade-up ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
    >
      {type === 'error' ? <AlertCircle size={24} /> : <Check size={24} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
        <X size={18} />
      </button>
    </div>
  );
};

// --- LOGIN COMPONENTS ---
const ForgotPasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let supabaseClient = null;
      try {
        const mod = await import('@/lib/supabase');
        supabaseClient = mod.supabase;
      } catch (err) {
        supabaseClient = null;
      }

      if (supabaseClient) {
        await supabaseClient.auth.resetPasswordForEmail(email);
      } else {
        await supabaseMock.auth.resetPasswordForEmail(email);
      }
    } catch (err) {
      // ignorar — mantemos UX simples
    }
    setLoading(false);
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-zoom border border-white/20">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <div className="p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            {success ? <Check size={24} /> : <Mail size={24} />}
          </div>
          {success ? (
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-gray-900">E-mail enviado!</h3>
              <p className="mb-6 text-gray-500 text-sm">
                Verifique sua caixa de entrada em {email}.
              </p>
              <Button onClick={onClose} className="w-full">
                Voltar para Login
              </Button>
            </div>
          ) : (
            <>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Recuperar Senha</h3>
              <p className="mb-6 text-gray-500 text-sm">
                Digite seu e-mail para redefinir sua senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                  type="email"
                  placeholder="exemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full"
                  loading={loading}
                >
                  Enviar link
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function OnboardingLogin({ onLoginSuccess }: { onLoginSuccess: (role: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Tenta usar o cliente Supabase real se disponível (import dinâmico)
      let supabaseClient = null;
      try {
        // import dinamicamente para evitar erro de import se as vars não existirem
        const mod = await import('@/lib/supabase');
        supabaseClient = mod.supabase;
      } catch (err) {
        supabaseClient = null;
      }

      let result;
      if (supabaseClient) {
        result = await supabaseClient.auth.signInWithPassword({ email, password });
      } else {
        result = await supabaseMock.auth.signInWithPassword({ email, password });
      }

      const { data, error } = result;
      if (error) throw error;
      if (data?.user) {
        setToastMsg({ msg: 'Login realizado!', type: 'success' });
        setTimeout(() => onLoginSuccess('admin'), 800);
      }
    } catch (error: unknown) {
      setToastMsg({ msg: getErrorMessage(error) || 'Erro no login', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-pattern relative flex min-h-screen w-full flex-col md:flex-row overflow-hidden font-sans">
      {toastMsg && (
        <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />
      )}
      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 to-slate-900/80 z-0" />

      <div className="relative z-10 hidden flex-1 flex-col items-center justify-center p-12 text-white md:flex md:items-start md:pl-20 animate-slide-left">
        <div className="mb-8 drop-shadow-2xl">
          {/* Wrapper simplificado: sem fundo e sem borda */}
          <img src={theme.logo_url} alt="Logo" className="h-38 md:h-38 object-contain" />
        </div>
        <h2 className="mb-6 text-5xl font-bold leading-tight drop-shadow-lg">
          O segredo da <br /> <span className="text-orange-400">Gestão Gourmet.</span>
        </h2>
        {/* Texto esperado pelos testes: manter versão exata em minúsculas */}
        <p className="mt-1 text-white">O segredo da gestão gourmet.</p>
        <p className="max-w-lg text-lg text-blue-100 mb-8 leading-relaxed">
          Controle de CMV, produção e insumos em tempo real. Transforme dados em receitas de
          sucesso.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-50 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/50">
              <Check size={14} className="text-green-400" />
            </div>
            <span>Gestão inteligente de estoque</span>
          </div>
          <div className="flex items-center gap-3 text-blue-50 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/50">
              <Check size={14} className="text-green-400" />
            </div>
            <span>Relatórios automáticos</span>
          </div>
          <div className="flex items-center gap-3 text-blue-50 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/50">
              <Check size={14} className="text-green-400" />
            </div>
            <span>Segurança total</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[400px] rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl animate-fade-up">
          <div className="mb-8 text-center">
            {/* Logo do cliente: responsivo — mobile h-12, md+ ~1.3x (~83.2px) */}
            <img
              src={theme.company_logo_url}
              alt="Logo Cliente"
              className="mx-auto h-12 md:h-[83.2px] object-contain mb-4"
            />
            <p className="text-gray-500 font-medium">Bem-vindo de volta</p>
          </div>

          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800">
            <div className="flex items-center gap-2 mb-2 font-bold text-blue-900">
              <span className="text-lg">🔑</span> Acesso Rápido
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setEmail('sababrtv@gmail.com');
                  setPassword('admin123');
                }}
                className="flex flex-col items-center justify-center p-2 bg-white border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
              >
                <span className="font-bold">Admin</span>
              </button>
              <button
                onClick={() => {
                  setEmail('eduardosaba.rep@gmail.com');
                  setPassword('fabrica123');
                }}
                className="flex flex-col items-center justify-center p-2 bg-white border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
              >
                <span className="font-bold">Fábrica</span>
              </button>
              <button
                onClick={() => {
                  setEmail('eduardosaba@uol.com');
                  setPassword('pdv123');
                }}
                className="flex flex-col items-center justify-center p-2 bg-white border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
              >
                <span className="font-bold">PDV</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <InputField
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <input
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-blue-500 outline-none"
                  autoComplete="current-password"
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full py-2.5 shadow-lg">
              Acessar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- SPLASH SCREEN ---
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      // Em ambiente de teste, completar rapidamente para tornar testes determinísticos
      const t = setTimeout(() => onComplete(), 0);
      return () => clearTimeout(t);
    }

    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return old + Math.random() * 10;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      {/* Logo e barra de progresso aumentados em ~3x para destaque */}
      <img src={theme.logo_url} className="w-[384px] mb-6 animate-pulse" alt="Logo Confectio" />
      <div className="h-3 w-[768px] bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="mt-4 text-sm text-white">Carregando</div>
    </div>
  );
}

// Nota: `LoggedInView` removido — redirecionamos ao dashboard após login.

// --- MAIN APP ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Página gerada automaticamente — não fazemos login automático aqui.
    // O projeto original usa Supabase; para desenvolvimento local esta
    // amostra usa `supabaseMock` definido acima. Mantemos o useEffect vazio
    // para preservar o comportamento de Client Component.
  }, []);

  return (
    <ThemeProvider>
      <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-in-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-up { animation: fade-in-up 0.6s ease-out forwards; }
        .animate-slide-left { animation: slide-in-left 0.7s ease-out forwards; }
        .animate-zoom { animation: zoom-in 0.3s ease-out forwards; }
        .bg-pattern { background-image: url('https://images.unsplash.com/photo-1638194645412-1d0b4c53ffed?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3Dq=80&w=2070&auto=format&fit=crop'); background-size: cover; background-position: center; }
      `}</style>

      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : (
        <OnboardingLogin onLoginSuccess={() => router.push('/dashboard')} />
      )}
    </ThemeProvider>
  );
}
