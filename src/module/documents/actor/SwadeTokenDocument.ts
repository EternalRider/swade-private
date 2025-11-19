export default class SwadeTokenDocument extends foundry.documents
  .TokenDocument {
  protected override _inferMovementAction(): string {
    const basePace =
      (foundry.utils.getProperty(this, 'actor.system.pace.base') as string) ??
      '';
    if (basePace in CONFIG.Token.movement.actions) {
      return basePace!;
    }
    return super._inferMovementAction();
  }
}
