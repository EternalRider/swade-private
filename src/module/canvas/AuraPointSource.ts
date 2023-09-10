import { AuraData } from '../../interfaces/AuraData.interface';
import SwadeToken from './SwadeToken';

export class AuraPointSource extends PointSource {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static sourceType = 'light';
  graphics!: PIXI.Graphics;
  id: string;
  declare object: SwadeToken;

  constructor({ object, id }: { object: SwadeToken; id: string }) {
    super({ object });
    this.id = id;
  }

  static get defaultData(): AuraData {
    return {
      enabled: false,
      walls: false,
      color: game.user?.color ?? '#000000',
      alpha: 0.25,
      radius: 5,
      visibleTo: [],
    };
  }

  get sourceId() {
    return this.object.sourceId + `.Aura.${this.id}`;
  }

  get auraData() {
    return this.object.actor.auras[this.id] as AuraData;
  }

  /** @override */
  _configure(_changes: Record<string, unknown>) {
    this.graphics ??= new PIXI.Graphics();
    this.graphics.clear();
    this.graphics
      .beginFill(
        this.auraData?.color ?? game.user?.color ?? '#000000',
        this.auraData?.alpha,
      )
      .lineStyle(2, this.auraData?.color, 1)
      .drawShape(this.shape)
      .endFill();
  }

  /** @override */
  _destroy() {
    this.graphics?.destroy();
  }

  /** @override */
  protected _isActive(): boolean {
    const isActive = super._isActive();
    return isActive && (this._checkPermission() || this._checkDisposition());
  }

  protected _checkPermission(): boolean {
    return (
      this.object.actor?.permission >=
      foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    );
  }

  protected _checkDisposition(): boolean {
    return !!canvas.tokens?.controlled.some((t) =>
      this.auraData.visibleTo.includes(t.document.disposition),
    );
  }
}
