import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

const copyAssets = () => {
  return {
    name: 'copy-assets',
    closeBundle: () => {
      if (!fs.existsSync('dist')) fs.mkdirSync('dist');
      
      const filesToCopy = [
        { src: 'manifest.json', dest: 'dist/manifest.json' },
        { src: 'poe2_icon.png', dest: 'dist/poe2_icon.png' },
        { src: 'content/trade2state.cn.json', dest: 'dist/trade2state.cn.json' },
        { src: 'content/trade2state.en.json', dest: 'dist/trade2state.en.json' }
      ];

      filesToCopy.forEach(file => {
        if (fs.existsSync(file.src)) {
            fs.copyFileSync(file.src, file.dest);
            console.log(`Copied ${file.src} to ${file.dest}`);
        }
      });
    }
  }
}

export default defineConfig(({ mode }) => {
  const isBackground = mode.endsWith('background');
  const isProd = mode.startsWith('prod');

  return {
    root: '.',
    build: {
      outDir: 'dist',
      emptyOutDir: !isBackground,
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : undefined,
      cssMinify: isProd,
      rollupOptions: {
        input: {
          [isBackground ? 'background' : 'content']: isBackground 
            ? resolve(__dirname, 'src/background/index.js')
            : resolve(__dirname, 'src/content/index.js')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          format: 'es',
          inlineDynamicImports: true
        }
      }
    },
    plugins: [
      copyAssets()
    ]
  };
});
