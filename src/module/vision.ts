export default class DetectionModeInfravision extends DetectionMode {
  static override getDetectionFilter() {
    return (this._detectionFilter ??= GlowOverlayFilter.create({
      glowColor: [1, 0.27, 0, 1],
    }));
  }

  override _canDetect(visionSource, target) {
    // See/Detect Invisibility can ONLY detect invisible status
    const tgt = target?.document;
    const coldBodied =
      tgt instanceof TokenDocument &&
      tgt.hasStatusEffect(CONFIG.specialStatusEffects.COLDBODIED);
    if (coldBodied) return false;

    // The source may not be blind if the detection mode requires sight
    const src = visionSource.object.document;
    const isBlind =
      src instanceof TokenDocument &&
      this.type === DetectionMode.DETECTION_TYPES.SIGHT &&
      src.hasStatusEffect(CONFIG.specialStatusEffects.BLIND);
    return !isBlind;
  }
}
