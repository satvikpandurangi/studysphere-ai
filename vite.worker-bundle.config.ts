import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'worker-dist',
    emptyOutDir: true,
    lib: {
      entry: 'worker/index.ts',
      formats: ['es'],
      fileName: () => 'worker-bundle.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
