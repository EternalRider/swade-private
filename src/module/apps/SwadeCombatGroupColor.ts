/** This class defines a form colorpicker for group leader to assign a group color */
export default class SwadeCombatGroupColor extends FormApplication<
  FormApplicationOptions,
  any,
  Combatant
> {
  config: any;
  groupDefaultColors: any;
  constructor(object: Combatant, options = {}) {
    super(object, options);
  }
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    html.find('.reset-color').on('click', this._onResetColor.bind(this));
  }
  static get defaultOptions() {
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

  async _onChangeColorPicker(event) {
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

    await this.object.unsetFlag('swade', 'groupColor');
    $(this.form!).find('#groupColor').val(groupColor);
  }

  async _updateObject(_event, _formData: GroupColorPickerData) {}
}

interface GroupColorPickerData {}
