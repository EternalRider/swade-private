import {
  ObjectAttributeBar,
  SingleAttributeBar,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import SwadeActor from '../documents/actor/SwadeActor';
import { AuraPointSource } from './AuraPointSource';

declare global {
  interface PlaceableObjectClassConfig {
    Token: typeof SwadeToken;
  }
}
export default class SwadeToken extends Token {
  #blk = 0x000000;

  auras = new Collection<AuraPointSource>();

  protected _drawBar(
    number: number,
    bar: PIXI.Graphics,
    data: SingleAttributeBar | ObjectAttributeBar | null,
  ): void {
    if (data?.attribute === 'wounds') {
      return this._drawWoundsBar(number, bar, data as ObjectAttributeBar);
    }
    if (data?.attribute === 'fatigue') {
      return this._drawFatigueBar(number, bar, data as ObjectAttributeBar);
    }
    return super._drawBar(number, bar, data);
  }

  protected _drawWoundsBar(
    number: number,
    bar: PIXI.Graphics,
    data: ObjectAttributeBar,
  ): void {
    const { value, max } = data;
    const colorPct = Math.clamped(value, 0, max) / max;
    const woundColor = SwadeActor.getWoundsColor(value, max);

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max(canvas!.dimensions!.size / 12, 8);
    if (this.document.height >= 2) h *= 1.6;
    const stroke = Math.clamped(h / 8, 1, 2);

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

    const colorPct = Math.clamped(value, 0, max) / max;
    const woundColor = SwadeActor.getFatigueColor(value, max);

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max(canvas!.dimensions!.size / 12, 8);
    if (this.document.height >= 2) h *= 1.6;
    const stroke = Math.clamped(h / 8, 1, 2);

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
