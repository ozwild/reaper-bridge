import { nodeResolve } from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'

const createConfig = (input, outputName, external = []) => ({
  input,
  external: [...external],
  output: [
    {
      file: `dist/${outputName}.esm.js`,
      format: 'es',
      sourcemap: true,
    },
    {
      file: `dist/${outputName}.cjs.js`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named', // Use named exports to avoid mixed export warnings
    },
  ],
  plugins: [
    peerDepsExternal(),
    nodeResolve({
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationMap: true,
      declarationDir: 'dist',
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      extensions: ['.js', '.ts'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              // Support modern browsers and Node 22+
              browsers: ['>0.5%', 'not dead', 'not op_mini all'],
              node: '22',
            },
            modules: false, // Let Rollup handle modules
          },
        ],

        '@babel/preset-typescript',
      ],
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
      mangle: {
        reserved: ['Bridge'], // Keep main exports unmangled
      },
    }),
  ],
})

export default [
  // Main bundle (Bridge with all dependencies)
  createConfig('src/index.ts', 'index'),

  // Bridge standalone bundle
  createConfig('src/Bridge.ts', 'Bridge'),
]
