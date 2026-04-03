export class MigrationCounter {
  #current = 0;
  #max = 0;
  #progress: any; //TODO get proper type

  constructor(max: number) {
    this.#max = max;
    this.#progress = ui.notifications.info('Migrating', { progess: true });
  }

  increment() {
    this.#current += 1;
    this.#progress.update({ pct: this.#current / this.#max, message: 'Migration' });
  }

  reset(max?: number) {
    if (max) this.#max = max;
    this.#current = 0;
  }
}
