import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  build: {
    // La scena Three.js è già lazy-loaded (vedi App.tsx) ma il singolo
    // chunk da ~940 KB è ancora lento da scaricare. Lo splittiamo in tre
    // sotto-chunk parallelizzabili (browser HTTP/2 multiplexing):
    //  - three-vendor:    il core di three.js (~150 KB gzip)
    //  - drei-vendor:     drei + postprocessing (~80 KB gzip)
    //  - solar-scene:     il codice della scena stessa (~25 KB gzip)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "three-vendor";
          if (id.includes("node_modules/@react-three/")) return "drei-vendor";
          if (id.includes("node_modules/postprocessing")) return "drei-vendor";
          return undefined;
        },
      },
    },
    // Sopprimiamo il warning "chunk > 500 kB" di Vite: i vendor chunks
    // sono già lazy e parallelizzati (vedi manualChunks sopra). Il limite
    // resta per i chunk non-lazy.
    chunkSizeWarningLimit: 600,
  },
});
