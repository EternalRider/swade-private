import { AuraData } from '../../interfaces/AuraData.interface';
import SwadeToken from './SwadeToken';

export class AuraPointSource extends foundry.canvas.sources.PointEffectSourceMixin(
  foundry.canvas.sources.BaseEffectSource,
) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static sourceType = 'light';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static effectsCollection = 'auras';
  graphics!: PIXI.Graphics;
  id: string;
  sourceId: string;
  declare object: SwadeToken;

  constructor({ object, id }: { object: SwadeToken; id: string }) {
    super({ object });
    this.id = id;
    this.sourceId = `${object.sourceId}.Aura.${id}`;
  }

  static get defaultData(): AuraData {
    return {
      ...super.defaultData,
      enabled: false,
      walls: false,
      color: '#000000',
      alpha: 0.25,
      radius: 5,
      visibleTo: []
    };
  }

  get auraData() {
    return this.object!.actor?.system?.auras[this.id] as AuraData;
  }

  /** @override */
  _configure(_changes: Record<string, unknown>) {
    this.graphics ??= new PIXI.Graphics();
    this.graphics.clear();
    this.graphics
      .beginFill(
        this.auraData?.color ?? '#000000',
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
  protected get active(): boolean {
    const isActive = super.active;
    return isActive && (this._checkPermission() || this._checkDisposition());
  }

  protected _checkPermission(): boolean {
    return (
      (this.object!.actor?.permission ?? 0) >=
      foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    );
  }

  protected _checkDisposition(): boolean {
    const visibleTo = Array.isArray(this.auraData.visibleTo)
      ? this.auraData.visibleTo
      : [this.auraData.visibleTo];
    return !!canvas?.tokens?.controlled.some((t) =>
      visibleTo.includes(t.document.disposition),
    );
  }
}
