/** This class defines a form colorpicker for group leader to assign a group color */
export default class SwadeCombatGroupColor extends FormApplication<
  FormApplicationOptions,
  Combatant
> {
  config: any;
  groupDefaultColors: any;

  override activateListeners(jquery: JQuery<HTMLElement>) {
    super.activateListeners(jquery);
    const html = jquery[0];
    html
      .querySelector('.reset-color')
      ?.addEventListener('click', this._onResetColor.bind(this));
  }
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'group-color-picker',
      title: 'SWADE.SetGroupColor',
      template:
        'systems/swade/templates/sidebar/combatant-group-color-picker.hbs',
      classes: ['swade', 'swade-app'],
      width: 275,
      height: 'auto' as const,
      resizable: false,
      closeOnSubmit: true,
      submitOnClose: true,
      submitOnChange: false,
    });
  }

  override async _onChangeColorPicker(event) {
    super._onChangeColorPicker(event);
    this.object.setFlag('swade', 'groupColor', event.currentTarget.value);
  }

  async _onResetColor() {
    const c = game.combat?.combatants.get(this.object.id!);
    let groupColor = '#efefef';

    if (c?.players?.length) {
      groupColor = c.players[0].color!;
    } else {
      const gm = game.users?.find((u) => u.isGM === true)!;
      groupColor = gm.color!;
    }

    await this.object.setFlag('swade', 'groupColor', null);
    const colorEl = this.form!.querySelector('#groupColor');
    if (colorEl) colorEl.value = groupColor;
  }

  async _updateObject(_event, _formData: unknown) {}
}
