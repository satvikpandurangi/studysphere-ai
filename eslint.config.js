import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'worker-dist/**', 'node_modules/**', '.local/**', '.npm-cache/**', '.xdg/**', '.wrangler/**', 'artifacts/**', 'archive/**', '*.tsbuildinfo'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'worker/**/*.ts', 'vite*.config.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker, ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
