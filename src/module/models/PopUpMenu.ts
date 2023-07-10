/**
 * Provides a fixed / free placement context menu. With a few modifications below the Foundry
 * ContextMenu is converted into a free placement context menu. This is useful to free the context menu from being bound
 * within the overflow constraints of a parent element and allow the context menu to display at the exact mouse point
 * clicked in a larger element. Note: be mindful that CSS style `position: fixed` is used to make the context menu
 * display relative to the main page viewport which defines the containing block, however if you use `filter`,
 * `perspective`, or `transform` in styles then that element becomes the containing block higher up than the main
 * window.
 */
export default class PopUpMenu extends ContextMenu {
  _position: Record<string, number> = {};
  defaultStyle = {
    position: 'fixed',
    width: 'max-content',
    'font-family': '"Signika", sans-serif',
    'font-size': '14px',
    'box-shadow': '0 0 10px #000',
  };
  /** Stores the pageX / pageY position from the the JQuery event to be applied in `_setPosition`. */
  override bind() {
    this.element.on(this.eventName, this.selector, (event) => {
      event.preventDefault();
      // this._position = { left: event.pageX, top: event.pageY };
      const rect = event.currentTarget.getBoundingClientRect();
      this._position = {
        left: rect.right,
        top: rect.bottom,
      };
    });
    super.bind();
  }

  /** Delegate to the parent `_setPosition` then apply the stored position from the callback in `bind`. */
  protected override _setPosition(html: JQuery, target: JQuery) {
    //make sure the target is the parent of the target if the target is a button
    if (target.is('button')) {
      target = target.parent();
    }
    super._setPosition(html, target);
    this._position.left -= html.width() ?? 0;
    html.css(foundry.utils.mergeObject(this._position, this.defaultStyle));
  }
}
