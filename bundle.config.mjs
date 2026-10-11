/**
 * S10a · M6b — Soglie gzip per il budget bundle (KB).
 * Modificare con cautela: sono i guardrail del workflow CI.
 * Riferimento baseline S7:
 *   - main: 16.04 KB gz
 *   - SolarScene: 10.35 KB gz
 *   - drei-vendor: 161.51 KB gz
 *   - three-vendor: 176.26 KB gz
 *   - totale: ~364 KB gz (alcuni chunk ausiliari non categorizzati)
 *
 * Soglie intenzionalmente generose (warning prima, error dopo 2 sprint
 * di calibrazione). Vedi docs/ROADMAP.md §4 step 2.2.
 */
export default {
  main: 25,
  'solar-scene': 15,
  'drei-vendor': 180,
  'three-vendor': 200,
  total: 420,
};
