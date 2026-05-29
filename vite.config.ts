import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const BUILD_VERSION = Date.now().toString(36);

const htmlVersionPlugin = {
  name: 'html-version',
  transformIndexHtml(html: string) {
    return html.replace(/__BUILD_VERSION__/g, BUILD_VERSION);
  },
};

export default defineConfig(() => {
  return {
    base: '/hws.com/',
    define: {
      __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    },
    plugins: [react(), tailwindcss(), htmlVersionPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
