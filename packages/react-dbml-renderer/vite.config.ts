import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    dts({
      entryRoot: 'src',
      outDir: 'dist/types',
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactDbmlRenderer',
      // the proper extensions will be added
      fileName: 'react-dbml-renderer',
      formats: ['es', 'cjs'],
      // fileName: (format) =>
      //   format === 'es'
      //     ? 'react-dbml-renderer.es.js'
      //     : 'react-dbml-renderer.cjs',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        'react',
        'react-dom',
        '@dbml/core',
        '@dbml/parse',
        'antlr4',
        'lodash',
      ],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
})
