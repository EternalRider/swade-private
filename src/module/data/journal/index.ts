import { HeadquartersData } from './headquarters';

export { HeadquartersData } from './headquarters';

export const config = {
  headquarters: HeadquartersData,
};

declare global {
  interface DataModelConfig {
    JournalEntryPage: {
      headquarters: typeof HeadquartersData;
    };
  }
}
