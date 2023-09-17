export function ensureWeightsAreNumeric(source: any) {
  if (!Object.hasOwn(source, 'weight')) return; // return early in case of update
  if (source.weight === null || typeof source.weight === 'number') return;
  if (typeof source.weight === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.weight = Number(source.weight.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensurePricesAreNumeric(source: any) {
  if (!Object.hasOwn(source, 'price')) return; // return early in case of update
  if (source.price === null || typeof source.price === 'number') return;
  if (typeof source.price === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.price = Number(source.price.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensureAPisNumeric(source: any) {
  if (!Object.hasOwn(source, 'ap')) return; // return early in case of update
  if (source.ap === null || typeof source.ap === 'number') return;
  if (Number.isNumeric(source.ap)) {
    source.ap = Number(source.ap);
    return;
  }
  source.ap = 0; // set the ap to 0 as a default
}

export function ensureRoFisNumeric(source: any) {
  if (!Object.hasOwn(source, 'rof')) return; // return early in case of update
  if (source.rof === null || typeof source.rof === 'number') return;
  if (Number.isNumeric(source.rof)) {
    source.rof = Number(source.rof);
    return;
  }
  source.rof = 1; // set the rof to 1 as a default
}

export function ensureShotsAreNumeric(source: any) {
  if (
    Object.hasOwn(source, 'shots') &&
    source.shots !== null &&
    typeof source.shots !== 'number'
  ) {
    source.shots = null;
  }
  if (
    Object.hasOwn(source, 'currentShots') &&
    source.currentShots !== null &&
    typeof source.currentShots !== 'number'
  ) {
    source.currentShots = null;
  }
}

export function ensurePowerPointsAreNumeric(source: any) {
  if (!Object.hasOwn(source, 'pp')) return; // return early in case of update
  if (source.pp === null || typeof source.pp === 'number') return;
  if (Number.isNumeric(source.pp)) {
    source.pp = Number(source.pp);
    return;
  }
  source.pp = 0; // set the pp to 0 as a default
}
