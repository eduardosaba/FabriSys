'use client';

import React from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Impede que o clique dentro do modal o feche
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
