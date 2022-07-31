import { SWADE } from './config';

export class Logger {
  static MODULE_ID = SWADE.PACKAGE_ID;

  static LOG_LEVEL = {
    Debug: 0,
    Log: 1,
    Info: 2,
    Warn: 3,
    Error: 4,
  };

  static log(force: boolean, logLevel: number, ...args) {
    const isDebugging = game.modules
      .get('_dev-mode')
      //@ts-expect-error adding an API to the module data is common practice
      ?.api?.getPackageDebugValue(Logger.MODULE_ID);

    if (force || isDebugging) {
      switch (logLevel) {
        case Logger.LOG_LEVEL.Error:
          console.error(Logger.MODULE_ID, '|', ...args);
          break;
        case Logger.LOG_LEVEL.Warn:
          console.warn(Logger.MODULE_ID, '|', ...args);
          break;
        case Logger.LOG_LEVEL.Info:
          console.info(Logger.MODULE_ID, '|', ...args);
          break;
        case Logger.LOG_LEVEL.Debug:
          console.debug(Logger.MODULE_ID, '|', ...args);
          break;
        case Logger.LOG_LEVEL.Log:
        default:
          console.log(Logger.MODULE_ID, '|', ...args);
          break;
      }
    }
  }

  static error(force: boolean, ...args) {
    Logger.log(force, Logger.LOG_LEVEL.Error, ...args);
  }

  static warn(force: boolean, ...args) {
    Logger.log(force, Logger.LOG_LEVEL.Warn, ...args);
  }

  static info(force: boolean, ...args) {
    Logger.log(force, Logger.LOG_LEVEL.Info, ...args);
  }

  static debug(force: boolean, ...args) {
    Logger.log(force, Logger.LOG_LEVEL.Debug, ...args);
  }
}

// interface LogMessage {
//   message: any;
//   logLevel: ValueOf<typeof Logger.LOG_LEVEL>;
//   options?: LogMessageOptions;
// }

// interface LogMessageOptions {
//   force?: boolean;
//   toast?: boolean;
// }
