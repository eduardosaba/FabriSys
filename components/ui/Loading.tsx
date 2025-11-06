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
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
      <p className="text-gray-600 text-center">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-lg">{content}</div>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
