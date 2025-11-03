import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      'pnpm-lock.yaml',
      'next-env.d.ts',
      'coverage/**',
      '__tests__/**',
      'components/insumos/InsumosTable.old.tsx',
      'components/insumos/PedidoCompraForm.tsx',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    plugins: {
      '@typescript-eslint': ts,
      'next': nextPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'import': importPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLImageElement: 'readonly',
        SVGSVGElement: 'readonly',
        FormData: 'readonly',
        console: 'readonly',
        process: 'readonly',
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        RequestInfo: 'readonly',
        RequestInit: 'readonly',
        confirm: 'readonly',
        require: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Em projetos TypeScript, no-undef costuma conflitar com tipos/names DOM e Node
      // (ex.: HTMLDivElement, Buffer, setTimeout). O TypeScript já valida undefineds.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': ['off'],
    },
  },
];

export default config;
