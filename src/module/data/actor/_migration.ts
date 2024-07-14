export function splitTopSpeed(source: any) {
  if (
    Object.hasOwn(source, 'topspeed') &&
    typeof source.topspeed === 'string'
  ) {
    const stringValue: string = source.topspeed;
    const match = stringValue.match(/^\d*/);
    if (Number.isNumeric(stringValue)) {
      source.topspeed = { value: Number(stringValue), unit: '' };
    } else if (!match) {
      source.topspeed = { value: 0, unit: '' };
    } else {
      const value = match[0];
      const unit = stringValue.slice(value.length).trim();
      source.topspeed = { value: Number(value), unit };
    }
  }
}
