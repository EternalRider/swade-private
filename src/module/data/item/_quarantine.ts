export function ensureWeightsAreNumeric(source: any) {
  if (source.weight === null || Number.isNumeric(source.weight)) return;
  if (source.weight instanceof String || typeof source.weight === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.weight = Number(source.weight.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensurePricesAreNumeric(source: any) {
  if (source.price === null || Number.isNumeric(source.price)) return;
  if (source.price instanceof String || typeof source.price === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.price = Number(source.price.replaceAll(/[^0-9.]/g, ''));
  }
}

export function ensureAPisNumeric(source: any) {
  if (source.ap === null || Number.isNumeric(source.ap)) return;
  source.ap = 0; // set the ap to 0 as a default
}

export function ensureShotsAreNumeric(source: any) {
  if (source.shots !== null && !Number.isNumeric(source.shots)) {
    source.shots = 0;
  }
  if (source.currentShots !== null && !Number.isNumeric(source.currentShots)) {
    source.currentShots = 0;
  }
}

export function ensurePowerPointsAreNumeric(source: any) {
  if (source.pp === null || Number.isNumeric(source.pp)) return;
  source.pp = 0; // set the pp to 0 as a default
}
