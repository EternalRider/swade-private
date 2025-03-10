import SwadeItem from '../documents/item/SwadeItem';

declare global {
  interface PlaceableObjectClassConfig {
    MeasuredTemplate: typeof SwadeMeasuredTemplate;
  }
}

export default class SwadeMeasuredTemplate extends MeasuredTemplate {
  handlers: Record<string, (...args) => void> = {};
  /**
   * A factory method to create a SwadeMeasuredTemplate instance using provided preset
   * @param preset the preset to use.
   * @param item the item the preset is attached to.
   * @returns SwadeTemplate | null
   */
  static fromPreset(preset: string, item?: SwadeItem) {
    const existingPreview = CONFIG.SWADE.activeMeasuredTemplatePreview;
    if (existingPreview && !existingPreview._destroyed) {
      existingPreview.destroy({ children: true });
    }

    CONFIG.SWADE.activeMeasuredTemplatePreview = this._constructPreset(
      preset,
      item,
    );
    if (CONFIG.SWADE.activeMeasuredTemplatePreview)
      CONFIG.SWADE.activeMeasuredTemplatePreview.drawPreview();
  }

  protected static _constructPreset(preset: string, item?: SwadeItem) {
    // Prepare template data
    const templateBaseData: MeasuredTemplate.CreateData = {
      user: game.user?.id,
      distance: 0,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user?.color,
      flags: item ? { swade: { origin: item.uuid } } : {},
    };

    const presetPrototype = CONFIG.SWADE.measuredTemplatePresets.find(
      (c) => c.button.name === preset,
    );
    if (!presetPrototype) return null;

    //Set template data based on preset option
    const template = new CONFIG.MeasuredTemplate.documentClass(
      foundry.utils.mergeObject(templateBaseData, presetPrototype.data),
      {
        parent: canvas.scene ?? undefined,
      },
    );

    //Return the template constructed from the item data
    return new this(template);
  }

  /** Creates a preview of the template */
  drawPreview() {
    const initialLayer = canvas.activeLayer!;
    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview?.addChild(this);
    // Activate interactivity
    this.activatePreviewListeners(initialLayer);
  }

  /** Activate listeners for the template preview */
  activatePreviewListeners(initialLayer: CanvasLayer) {
    let moveTime = 0;

    // Update placement (mouse-move)
    this.handlers.mm = (event) => {
      event.stopPropagation();
      const now = Date.now(); // Apply a 20ms throttle
      if (now - moveTime <= 20) return;
      const center = event.data.getLocalPosition(this.layer);
      const snapped = canvas.grid.getSnappedPoint(center, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
      });
      this.document.updateSource({ x: snapped?.x, y: snapped?.y });
      this.refresh();
      moveTime = now;
    };

    // Cancel the workflow (right-click)
    this.handlers.rc = (event) => {
      this.layer._onDragLeftCancel(event);
      this._removeListenersFromCanvas();
      initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    this.handlers.lc = (event) => {
      this.handlers.rc(event);
      const dest = canvas.grid.getSnappedPoint(this.document, {
        mode: CONST.GRID_SNAPPING_MODES.CENTER,
        resolution: 2,
      });
      this.document.updateSource(dest);
      canvas.scene?.createEmbeddedDocuments('MeasuredTemplate', [
        this.document.toObject(),
      ]);
    };

    // Rotate the template by 3 degree increments (mouse-wheel)
    this.handlers.mw = (event) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      const delta = canvas.grid!.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = event.shiftKey ? delta : 5;
      this.document.updateSource({
        direction: this.document.direction + snap * Math.sign(event.deltaY),
      });
      this.refresh();
    };

    // Activate listeners
    canvas.stage!.on('mousemove', this.handlers.mm);
    canvas.stage!.on('mousedown', this.handlers.lc);
    canvas.app!.view.oncontextmenu = this.handlers.rc;
    canvas.app!.view.onwheel = this.handlers.mw;
  }

  override destroy(...args) {
    CONFIG.SWADE.activeMeasuredTemplatePreview = null;
    this._removeListenersFromCanvas();
    return super.destroy(...args);
  }

  /** Remove the mouse listeners from the canvas */
  protected _removeListenersFromCanvas() {
    canvas.stage!.off('mousemove', this.handlers.mm);
    canvas.stage!.off('mousedown', this.handlers.lc);
    canvas.app!.view.oncontextmenu = null;
    canvas.app!.view.onwheel = null;
  }

  override _computeShape(): MeasuredTemplateShape {
    const { angle, t } = this.document;
    const { angle: direction, distance } = this.ray;
    if (t === CONST.MEASURED_TEMPLATE_TYPES.CONE)
      return this._getConeShape(direction, angle, distance);
    return super._computeShape() as MeasuredTemplateShape;
  }

  protected _getConeShape(
    direction: number,
    angle: number,
    distance: number,
  ): PIXI.Polygon {
    // Special case to handle the base SWADE cone rather than a normal cone definition
    if (angle === 0) {
      const coneWidth = 1.5 * (distance / 9);
      const coneLength = distance - coneWidth;
      const da = 3;
      const c = Ray.fromAngle(0, 0, direction, coneLength);
      const angles = Array.fromRange(180 / da)
        .map((a) => 180 / -2 + a * da)
        .concat([180 / 2]);
      // Get the cone shape as a polygon
      const rays = angles.map((a) =>
        Ray.fromAngle(0, 0, direction + Math.toRadians(a), coneWidth),
      );
      const points = rays
        .reduce(
          (arr, r) => {
            return arr.concat([c.B.x + r.B.x, c.B.y + r.B.y]);
          },
          [0, 0],
        )
        .concat([0, 0]);
      return new PIXI.Polygon(points);
    } else {
      // honestly don't know why super.getConeShape() isn't working but it's not
      return MeasuredTemplate.getConeShape(direction, angle, distance);
    }
  }

  override highlightGrid() {
    //return early if te object doesn't actually exist yet
    if (!this.shape) return;

    const highlightRAW = game.settings.get('swade', 'highlightTemplate');
    //defer to the core highlighting if the setting is off
    if (!highlightRAW) return super.highlightGrid();

    const color = Number(this.document.fillColor);
    const border = Number(this.document.borderColor);

    //get the highlight layer and prep it
    const layer = canvas.interface.grid.getHighlightLayer(this.highlightId);
    if (!layer) return;
    layer.clear();

    //get the shape of the template and prep it
    const shape = this.shape.clone();
    if ('points' in shape) {
      shape.points = shape.points.map((p, i) => {
        if (i % 2) return this.y + p;
        else return this.x + p;
      });
    } else {
      shape.x += this.x;
      shape.y += this.y;
    }

    //draw the actual shape
    this._highlightGridArea(layer, { color, border, shape });
  }

  /** A re-implementation of `BaseGrid#highlightGridPosition()` to force gridless behavior */
  private _highlightGridArea(
    layer: GridHighlight,
    { color, border, alpha = 0.25, shape }: IGridHighLightOptions,
  ) {
    layer.beginFill(color, alpha);
    if (border) layer.lineStyle(2, border, Math.min(alpha * 1.5, 1.0));
    layer.drawShape(shape).endFill();
  }
}

interface IGridHighLightOptions {
  color: number;
  border?: number;
  alpha?: number;
  shape:
    | PIXI.Circle
    | PIXI.Ellipse
    | PIXI.Polygon
    | PIXI.Rectangle
    | PIXI.RoundedRectangle;
}

type MeasuredTemplateShape = PIXI.Circle | PIXI.Rectangle | PIXI.Polygon;
