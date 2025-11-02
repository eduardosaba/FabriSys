import Button from '@/components/Button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <main className="flex flex-col items-center text-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
          Bem-vindo ao Sistema Lari
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Gerencie seus clientes, projetos e finanças de forma integrada e eficiente.
        </p>
        <div className="flex gap-4">
          <Button>
            Acessar Painel
          </Button>
          <Button
            variant="secondary"
            className="border border-solid border-black/8 dark:border-white/[.145] hover:bg-black/4 dark:hover:bg-[#1a1a1a]"
          >
            Saber Mais
          </Button>
        </div>
      </main>
    </div>
  );
}
