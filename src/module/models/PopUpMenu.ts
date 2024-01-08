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
    position: 'absolute',
    width: 'max-content',
    'z-index': 'var(--z-index-tooltip)',
    'font-family': 'var(--font-primary)',
    'font-size': 'var(--font-size-14)',
    'box-shadow': '0 0 10px var(--color-border-dark)',
  };
  /** Stores the pageX / pageY position from the the JQuery event to be applied in `_setPosition`. */
  override bind() {
    this.element.on(this.eventName, this.selector, (event) => {
      event.preventDefault();
      // this._position = { left: event.pageX, top: event.pageY };
      const { right, bottom } = event.currentTarget.getBoundingClientRect();
      this._position = { left: right, top: bottom };
    });
    super.bind();
  }

  /** Delegate to the parent `_setPosition` then apply the stored position from the callback in `bind`. */
  protected override _setPosition(html: JQuery, _target: JQuery) {
    super._setPosition(html, $('body'));
    html.css(this.defaultStyle); //apply the default style
    this._position.left -= this.menu.width() ?? 0; //calculate the final position
    html.css(this._position); //set the absolute position
  }
}
