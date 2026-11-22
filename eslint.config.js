import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
  { ignores: ['**/dist/**', '**/dev-dist/**', '**/node_modules/**', 'apps/web/android/**', 'packages/ui/open-design/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, __VERSAO__: 'readonly' } },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // O SVG dos ícones vem de arquivos do próprio repositório.
      'svelte/no-at-html-tags': 'off',
      // Os Set e Map dos jogos são temporários locais; o estado é sempre trocado inteiro.
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
);
