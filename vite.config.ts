import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		visualizer({
			filename: "stats.html",
			gzipSize: true,
			brotliSize: true,
			open: false,
		}),
		dts({
			entryRoot: "src",
			outDir: "dist/types",
			tsconfigPath: "./tsconfig.app.json",
		}),
	],
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "ReactDbmlRenderer",
			// the proper extensions will be added
			fileName: "react-dbml-renderer",
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: [
				/^react($|\/)/,        // Matches 'react' and 'react/jsx-runtime' etc.
  			/^react-dom($|\/)/,
				"@dbml/core",
				"@dbml/parse",
				"@xyflow/react",
			],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
				assetFileNames: ({ names }) => {
					for (const name of names) {
						if (name.endsWith(".css")) {
							return "style.css";
						}
					}

					// everything else keeps the default pattern
					return "[name].[extname]";
				},
			},
		},
		cssCodeSplit: false,
	},
	css: {
		modules: {
			localsConvention: "camelCaseOnly",
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		}
	}
});
