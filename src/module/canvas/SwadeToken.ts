import {
  ObjectAttributeBar,
  SingleAttributeBar,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token.mjs';
import SwadeActor from '../documents/actor/SwadeActor';
import { AuraPointSource } from './AuraPointSource';

declare global {
  interface PlaceableObjectClassConfig {
    Token: typeof SwadeToken;
  }
}
export default class SwadeToken extends Token {
  declare shape: PIXI.Rectangle | PIXI.Polygon | PIXI.Circle; //TODO
  #blk = 0x000000;

  auras = new Collection<AuraPointSource>();

  /**
   * This token's shape at its canvas position
   * thanks to stwlam for this!
   */
  get localShape() {
    switch (this.shape.type) {
      case PIXI.SHAPES.RECT:
        return this.bounds;
      case PIXI.SHAPES.POLY: {
        const shape = this.shape.clone();
        const bounds = this.bounds;
        shape.points = shape.points.map((c, i) =>
          i % 2 === 0 ? c + bounds.x : c + bounds.y,
        );
        return shape;
      }
      case PIXI.SHAPES.CIRC: {
        const shape = this.shape.clone();
        const center = this.center;
        shape.x = center.x;
        shape.y = center.y;
        return shape;
      }
    }
  }

  protected override _drawBar(
    number: number,
    bar: PIXI.Graphics,
    data: SingleAttributeBar | ObjectAttributeBar | null,
  ): void {
    if (data?.attribute === 'wounds') {
      return this._drawWoundsBar(number, bar, data as ObjectAttributeBar);
    }
    return super._drawBar(number, bar, data);
  }

  protected _drawWoundsBar(
    number: number,
    bar: PIXI.Graphics,
    data: ObjectAttributeBar,
  ): void {
    const { value, max } = data;
    const colorPct = Math.clamp(value, 0, max) / max;
    const woundColor = SwadeActor.getWoundsColor(value, max);

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max(canvas!.dimensions!.size / 12, 8);
    if (this.document.height >= 2) h *= 1.6;
    const stroke = Math.clamp(h / 8, 1, 2);

    //set up bar container
    this._resetVitalsBar(bar, w, h, stroke);

    //fill bar as wounds increase, gradually going from green to red as it fills
    bar
      .beginFill(woundColor, 1.0)
      .lineStyle(stroke, this.#blk, 1.0)
      .drawRoundedRect(0, 0, colorPct * w, h, 2);

    //position the bar according to its number
    this._setVitalsBarPosition(bar, number, h);
  }

  protected _drawFatigueBar(
    number: number,
    bar: PIXI.Graphics,
    data: ObjectAttributeBar,
  ): void {
    const { value, max } = data;

    const colorPct = Math.clamp(value, 0, max) / max;
    const woundColor = SwadeActor.getFatigueColor(value, max);

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max(canvas!.dimensions!.size / 12, 8);
    if (this.document.height >= 2) h *= 1.6;
    const stroke = Math.clamp(h / 8, 1, 2);

    //set up bar container
    this._resetVitalsBar(bar, w, h, stroke);

    //fill bar as wounds increase, gradually going from green to red as it fills
    bar
      .beginFill(woundColor, 1.0)
      .lineStyle(stroke, this.#blk, 1.0)
      .drawRoundedRect(0, 0, colorPct * w, h, 2);

    //position the bar according to its number
    this._setVitalsBarPosition(bar, number, h);
  }

  protected _resetVitalsBar(
    bar: PIXI.Graphics,
    width: number,
    height: number,
    stroke: number,
  ) {
    bar
      .clear()
      .beginFill(this.#blk, 0.5)
      .lineStyle(stroke, this.#blk, 1.0)
      .drawRoundedRect(0, 0, width, height, 3);
  }

  protected _setVitalsBarPosition(
    bar: PIXI.Graphics,
    order: number,
    height: number,
  ) {
    // Set position
    const posY = order === 0 ? this.h - height : 0;
    bar.position.set(0, posY);
  }
}
