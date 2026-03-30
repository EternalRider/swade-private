import { ModuleNamespace } from 'vite/types/hot.js';

/**
 * Enable HMR for an actor sheet
 * @param type        Actor type corresponding to the sheet
 * @param sheetName   Class name for the sheet
 */
export function hotReloadActorSheet(type: string, sheetName: string, defaultExport = false) {
  return (module: ModuleNamespace) => {
    const cls = defaultExport ? module.default : module[sheetName];
    const reSheet = (actor: Actor) => {
      //@ts-expect-error Types
      if (!(actor._sheet instanceof oldSheet)) return;
      const sheet = actor.sheet as foundry.applications.sheets.ActorSheetV2 | undefined;
      if (sheet?.rendered) {
        const position = { top: sheet.position.top, left: sheet.position.left };
        const tab = sheet.tabGroups;
        const locked = sheet.locked;
        sheet.close({ animate: false });
        //@ts-expect-error Types
        actor._sheet = null;
        sheet.render({ force: true, position, locked, tab });
      } else {
        //@ts-expect-error Types
        actor._sheet = null;
      }
    };
    const oldSheet = CONFIG.Actor.sheetClasses[type][`${game.system.id}.${sheetName}`].cls;
    const config = foundry.applications.apps.DocumentSheetConfig;
    config.unregisterSheet(Actor, game.system.id, oldSheet, { types: [type] });
    config.registerSheet(Actor, game.system.id, cls, { types: [type], makeDefault: true });
    for (const a of game.actors) {
      if (a.type !== type) continue;
      reSheet(a);
      for (const t of a.getActiveTokens(false, true)) {
        if (t.actor.isToken) reSheet(t.actor);
      }
    }
  };
}

/**
 * Enable HMR for an item sheet
 * @param type       Item type corresponding to the sheet
 * @param sheetName  Class name for the sheet
 */
export function hotReloadItemSheet(type: string, sheetName: string, defaultExport = false) {
  return (module: ModuleNamespace) => {
    const cls = defaultExport ? module.default : module[sheetName];
    const reSheet = (item: Item) => {
      //@ts-expect-error Types
      if (!(item._sheet instanceof oldSheet)) return;
      const sheet = item.sheet as foundry.applications.sheets.ItemSheetV2 | undefined;
      if (sheet?.rendered) {
        const position = { top: sheet.position.top, left: sheet.position.left };
        const tab = sheet.tabGroups;
        sheet.close({ animate: false });
        //@ts-expect-error Types
        item._sheet = null;
        sheet.render({ force: true, position, tab });
      } else {
        //@ts-expect-error Types
        item._sheet = null;
      }
    };
    const oldSheet = CONFIG.Item.sheetClasses[type][`${game.system.id}.${sheetName}`].cls;
    const config = foundry.applications.apps.DocumentSheetConfig;
    config.unregisterSheet(Item, game.system.id, oldSheet, { types: [type] });
    config.registerSheet(Item, game.system.id, cls, { types: [type], makeDefault: true });
    for (const item of game.items) if (item.type === type) reSheet(item);
    for (const actor of game.actors) {
      for (const item of actor.itemTypes[type]) {
        reSheet(item);
      }
      for (const token of actor.getActiveTokens(false, true)) {
        if (token.actor.isToken) {
          for (const item of token.actor.itemTypes[type]) {
            reSheet(item);
          }
        }
      }
    }
  };
}
