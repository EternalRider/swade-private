export function ensureWeightsAreNumeric(source: any) {
  if (source.weight === null || typeof source.weight === 'number') return;
  if (source.weight instanceof String || typeof source.weight === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.weight = Number(source.weight.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensurePricesAreNumeric(source: any) {
  if (source.price === null || typeof source.price === 'number') return;
  if (source.price instanceof String || typeof source.price === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.price = Number(source.price.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensureAPisNumeric(source: any) {
  if (source.ap === null || typeof source.ap === 'number') return;
  if (Number.isNumeric(source.ap)) {
    source.ap = Number(source.ap);
    return;
  }
  source.ap = 0; // set the ap to 0 as a default
}

export function ensureRoFisNumeric(source: any) {
  if (source.rof === null || typeof source.rof === 'number') return;
  if (Number.isNumeric(source.rof)) {
    source.rof = Number(source.rof);
    return;
  }
  source.rof = null; // set the ap to 0 as a default
}

export function ensureShotsAreNumeric(source: any) {
  if (source.shots !== null && typeof source.shots !== 'number') {
    source.shots = null;
  }
  if (source.currentShots !== null && typeof source.shots !== 'number') {
    source.currentShots = null;
  }
}

export function ensurePowerPointsAreNumeric(source: any) {
  if (source.pp === null || typeof source.pp === 'number') return;
  if (Number.isNumeric(source.pp)) {
    source.pp = Number(source.pp);
    return;
  }
  source.pp = 0; // set the pp to 0 as a default
}
