import React from 'react';

type Props = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex w-full items-center justify-between px-4">
        <button
          type="button"
          className="inline-flex items-center p-2 text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          onClick={onMenuClick}
        >
          <span className="sr-only">Abrir menu</span>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        
        <div className="flex items-center ml-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Usuário
          </span>
        </div>
      </div>
    </header>
  );
}
