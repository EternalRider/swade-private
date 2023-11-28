import { DataModel } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs';

// Forward hack for headquarters until v10 updates are done
type JournalEntryPage = any;

declare global {
  namespace foundry.abstract {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class TypeDataModel<S, P> extends DataModel<any, any> {
      // Excluding property "modelProvider" as it's not needed
      parent: P;

      prepareBaseData(): void;

      prepareDerivedData(): void;
    }
  }

  interface CONFIG {
    Actor: {
      dataModels: Record<string, DataModel<any, Actor>>;
    };
    Item: {
      dataModels: Record<string, DataModel<any, Item>>;
    };
    JournalEntryPage: {
      dataModels: Record<string, DataModel<any, JournalEntryPage>>;
    };
  }
}
