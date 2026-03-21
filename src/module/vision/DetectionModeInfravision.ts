import InfraVisionFilter from './InfravisionFilter';

export default class DetectionModeInfravision extends foundry.canvas.perception.DetectionMode {
  static override getDetectionFilter(): PIXI.Filter {
    return (this._detectionFilter ??= InfraVisionFilter.create());
  }

  override _canDetect(visionSource: foundry.canvas.sources.PointVisionSource, target: PlaceableObject): boolean {
    // See/Sense Heat can ONLY detect warm tokens, ignoring those that are cold-bodied
    const tgt = target?.document;
    const coldBodied = tgt instanceof TokenDocument && tgt.hasStatusEffect(CONFIG.specialStatusEffects.COLDBODIED);
    if (coldBodied) return false;

    // The source may not be blind if the detection mode requires sight
    const src = visionSource?.object?.document;
    const isBlind =
      src instanceof TokenDocument &&
      this.type === foundry.canvas.perception.DetectionMode.DETECTION_TYPES.SIGHT &&
      src.hasStatusEffect(CONFIG.specialStatusEffects.BLIND);
    return !isBlind;
  }
}
