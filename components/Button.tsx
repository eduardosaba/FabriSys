import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export default function Button({ label, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm font-medium text-background ${
        rest.className ?? ''
      }`}
    >
      {label ?? children}
    </button>
  );
}
