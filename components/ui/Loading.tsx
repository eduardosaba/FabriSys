import React from 'react';

interface LoadingProps {
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  overlay?: boolean;
}

export default function Loading({
  message = 'Carregando...',
  showRetry = false,
  onRetry,
  overlay = true,
}: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-loading-spinner border-r-transparent align-[-0.125em]" />
      <p className="text-center text-loading-text">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-loading-button-bg px-4 py-2 text-white transition-colors hover:bg-loading-button-hover"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div className="rounded-lg bg-white p-6 shadow-lg">{content}</div>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
