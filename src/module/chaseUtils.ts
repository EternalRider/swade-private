import type { CCMGridConfig } from '../types/CCM';

const { createFormGroup, createNumberInput, createSelectInput } =
  foundry.applications.fields;

export async function layoutChase(deck: Cards) {
  // Now requires CCM
  const ccmModule = game.modules.get('complete-card-management');
  if (!ccmModule) {
    return ui.notifications.error('SWADE.NoCCMInstall', { localize: true });
  } else if (!ccmModule.active) {
    return ui.notifications.error('SWADE.NoCCMActive', { localize: true });
  }

  //return if no canvas or scene is available
  if (!canvas || !canvas.ready || !canvas.scene) {
    return ui.notifications.warn('SWADE.NoSceneAvailable', { localize: true });
  }

  if (!deck || deck.type !== 'deck') {
    return ui.notifications.warn('SWADE.ChaseNoDeck', { localize: true });
  }

  const layout = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.innerText = game.i18n.localize('SWADE.ChaseLayout');
  layout.prepend(legend);
  const rowInput = createNumberInput({
    name: 'rows',
    min: 1,
    max: 54,
    step: 1,
    value: 1,
  });
  const rows = createFormGroup({
    input: rowInput,
    label: game.i18n.localize('SWADE.ChaseRows'),
  });
  const columnInput = createNumberInput({
    name: 'columns',
    min: 1,
    max: 54,
    step: 1,
    value: 9,
  });
  const columns = createFormGroup({
    input: columnInput,
    label: game.i18n.localize('SWADE.ChaseColumns'),
  });
  const discardOptions = game.cards.reduce((acc, stack: Cards) => {
    if (stack.type === 'pile')
      acc.push({ value: stack.id!, label: stack.name });
    return acc;
  }, [] as foundry.applications.fields.FormSelectOption[]);
  const discardInput = createSelectInput({
    name: 'to',
    options: discardOptions,
  });
  const discard = createFormGroup({
    input: discardInput,
    label: game.i18n.localize('SWADE.ChaseDiscard'),
  });
  layout.append(rows, columns, discard);

  const gridConfig = await foundry.applications.api.DialogV2.prompt<
    Partial<foundry.applications.api.DialogV2.WaitOptions>,
    CCMGridConfig
  >({
    window: {
      title: 'SWADE.SetUpChase',
      contentClasses: ['standard-form'],
    },
    content: layout.outerHTML,
    ok: {
      callback: async (_event, button, _dialog) => ({
        from: deck,
        to: game.cards.get(button.form?.elements['to'].value),
        rows: button.form?.elements['rows'].value,
        columns: button.form?.elements['columns'].value,
      }),
    },
    rejectClose: false,
  });

  if (!gridConfig) return;

  try {
    await ccm!.api.grid(gridConfig);
  } catch (error) {
    ui.notifications.warn('SWADE.ChaseLayoutError', { localize: true });
  }

  // TODO: Integrate CCM with Types so this is properly typed
  canvas['cards'].activate();
}
