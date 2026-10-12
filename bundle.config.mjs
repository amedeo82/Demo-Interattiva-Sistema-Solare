/**
 * S10a · M6b — Soglie gzip per il budget bundle (KB).
 * Modificare con cautela: sono i guardrail del workflow CI.
 *
 * Riferimento baseline S7 (prima del budget script):
 *   - main (index-*.js): 16.04 KB gz
 *   - SolarScene: 10.35 KB gz
 *   - drei-vendor: 161.51 KB gz
 *   - three-vendor: 176.26 KB gz
 *   - totale: ~364 KB gz (alcuni chunk ausiliari non categorizzati)
 *
 * Calibrazione dopo S9–S15 (i18n, command palette, deep link, screenshot,
 * tour, modali extra): il main è cresciuto legittimamente a ~25 KB gz
 * per le feature nuove. I chunk lazy dei modali (Compare/Events/Quiz/Sky
 * View) sono separati in `modals` per non inquinare il budget del main
 * (scaricato al primo paint vs on-demand).
 *
 * Soglie intenzionalmente generose (warning prima, error dopo 2 sprint
 * di calibrazione). Vedi docs/ROADMAP.md §4 step 2.2.
 */
export default {
  main: 28,
  modals: 12,
  'solar-scene': 15,
  'drei-vendor': 180,
  'three-vendor': 200,
  total: 450,
};
