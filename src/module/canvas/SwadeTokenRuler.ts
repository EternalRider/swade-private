import { constants } from '../constants';

export default class SwadeTokenRuler extends foundry.canvas.placeables.tokens
  .TokenRuler {
  /**
   * Helper function run during `init`
   */
  static applySWADEMovementConfig() {
    foundry.utils.mergeObject(CONFIG.Token.movement.actions, {
      swim: {
        getCostFunction: (
          token: TokenDocument.Implementation,
          _options: foundry.canvas.placeables.Token.MeasureMovementPathOptions,
        ) => {
          if (Number.isNumeric(token?.actor?.system?.pace?.swim))
            return (cost) => cost;
          else return (cost) => cost * 2;
        },
      },
    });
  }

  protected override _getSegmentStyle(
    waypoint: foundry.canvas.placeables.tokens.TokenRuler.Waypoint,
  ): foundry.canvas.interaction.Ruler.SegmentStyle {
    const style = super._getSegmentStyle(waypoint);
    this.#speedValueStyle(style, waypoint);
    return style;
  }

  /* -------------------------------------------------- */

  protected override _getGridHighlightStyle(
    waypoint: foundry.canvas.placeables.tokens.TokenRuler.Waypoint,
    offset: foundry.grid.BaseGrid.Offset3D,
  ): foundry.canvas.placeables.tokens.TokenRuler.GridHighlightStyle {
    const style = super._getGridHighlightStyle(waypoint, offset);
    this.#speedValueStyle(style, waypoint);
    return style;
  }

  /* -------------------------------------------------- */

  /**
   * Adjusts the grid or segment style based on the token's movement characteristics.
   * @param style       The calculated style properties from the parent class.
   * @param waypoint    The waypoint being adjusted.
   * @protected
   */
  #speedValueStyle(
    style: { color?: PIXI.ColorSource },
    waypoint: foundry.canvas.placeables.tokens.TokenRuler.Waypoint,
  ) {
    const pace = foundry.utils.getProperty(
      this,
      'token.document.actor.system.pace',
    ) as
      | (Record<string, number | undefined> & {
          running: { die: number; mod: number };
        })
      | undefined;
    if (pace) {
      const value = pace[waypoint.action] ?? pace.ground ?? Infinity;
      if (waypoint.measurement.cost <= value)
        style.color = constants.RULER_COLORS.GREEN;
      else if (waypoint.measurement.cost <= value + pace.running.mod + 1)
        style.color = constants.RULER_COLORS.YELLOW;
      else if (
        waypoint.measurement.cost <=
        value + pace.running.die + pace.running.mod
      )
        style.color = constants.RULER_COLORS.ORANGE;
      else style.color = constants.RULER_COLORS.RED;
    }
  }
}
