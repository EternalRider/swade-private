import { HeadquartersData } from './headquarters'

export { HeadquartersData } from './headquarters'

export const config = {
    headquarters: HeadquartersData
}

declare global {
    interface SystemConfig {
        JournalEntryPage: {
            headquarters: HeadquartersData
        }
    }
}