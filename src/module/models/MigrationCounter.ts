export class MigrationCounter {
  #current = 0;
  #max = 0;

  constructor(max: number) {
    this.#max = max;
    SceneNavigation.displayProgressBar({ label: 'Migrating', pct: 0 });
  }

  increment() {
    this.#current += 1;
    const pct = this.#current / this.#max;
    SceneNavigation.displayProgressBar({
      label: 'Migration',
      pct: Math.round(pct * 100),
    });
  }

  reset(max?: number) {
    if (max) this.#max = max;
    this.#current = 0;
  }
}
