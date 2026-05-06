import js from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'playwright/.auth/**',
    ],
  },

  // ESLint built-in recommendations.
  js.configs.recommended,

  // typescript-eslint with type-aware rules — catches floating promises and
  // misused promises, the #1 source of flaky Playwright tests.
  ...tseslint.configs.recommendedTypeChecked,

  // perfectionist: only the import-ordering rules. Skipping `recommended-natural` because it
  // sorts class members and object keys too — config order is semantic in playwright.config.ts
  // and POM members are organized by lifecycle, not alphabetically.
  {
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-imports': ['warn', { type: 'natural' }],
      'perfectionist/sort-named-imports': ['warn', { type: 'natural' }],
      'perfectionist/sort-exports': ['warn', { type: 'natural' }],
      'perfectionist/sort-named-exports': ['warn', { type: 'natural' }],
    },
  },

  // TS source files: enable the type-aware parser.
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
  },

  // Playwright recommended + our promotions, applied to every test-related TS file.
  {
    ...playwright.configs['flat/recommended'],
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Surface .only/.skip/.fixme commits early.
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      // Catch missing awaits before they become flakes.
      'playwright/missing-playwright-await': 'error',
      'playwright/no-wait-for-timeout': 'error',
      // Require descriptive titles and at least one assertion.
      'playwright/expect-expect': 'warn',
      'playwright/valid-title': 'warn',
    },
  },

  // .mjs / .js files (this config, etc.) aren't in tsconfig — turn off type-aware rules.
  {
    files: ['**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
);
