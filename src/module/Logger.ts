import { SWADE } from './config';

export class Logger {
  static PACKAGE_ID = SWADE.PACKAGE_ID;

  static LOG_LEVEL = {
    Debug: 0,
    Log: 1,
    Info: 2,
    Warn: 3,
    Error: 4,
  } as const;

  static log({ data, logLevel, options: { force, toast } = {} }: LogMessage) {
    const isDebugging = game.modules
      .get('_dev-mode')
      //@ts-expect-error adding an API to the module data is common practice
      ?.api?.getPackageDebugValue(Logger.PACKAGE_ID);

    switch (logLevel) {
      case Logger.LOG_LEVEL.Error:
        console.error(Logger.PACKAGE_ID, '|', data);
        if (toast) ui.notifications.error(data.toString());
        break;
      case Logger.LOG_LEVEL.Warn:
        console.warn(Logger.PACKAGE_ID, '|', data);
        if (toast) ui.notifications.warn(data.toString());
        break;
      case Logger.LOG_LEVEL.Info:
        console.info(Logger.PACKAGE_ID, '|', data);
        if (toast) ui.notifications.info(data.toString());
        break;
      case Logger.LOG_LEVEL.Debug:
        if (!force && !isDebugging) break;
        console.debug(Logger.PACKAGE_ID, '|', data);
        if (toast) ui.notifications.info(data.toString());
        break;
      case Logger.LOG_LEVEL.Log:
      default:
        if (!force && !isDebugging) break;
        console.log(Logger.PACKAGE_ID, '|', data);
        if (toast) ui.notifications.info(data.toString());
        break;
    }
  }

  static error({ data, options }: LogShortcut) {
    Logger.log({ data, logLevel: Logger.LOG_LEVEL.Error, options });
  }

  static warn({ data, options }: LogShortcut) {
    Logger.log({ data, logLevel: Logger.LOG_LEVEL.Warn, options });
  }

  static info({ data, options }: LogShortcut) {
    Logger.log({ data, logLevel: Logger.LOG_LEVEL.Info, options });
  }

  static debug({ data, options }: LogShortcut) {
    Logger.log({ data, logLevel: Logger.LOG_LEVEL.Debug, options });
  }
}

interface LogShortcut {
  /** The message or data to log */
  data: any;
  options?: LogMessageOptions;
}

interface LogMessage {
  /** The message or data to log */
  data: any;
  logLevel: ValueOf<typeof Logger.LOG_LEVEL>;
  options?: LogMessageOptions;
}

interface LogMessageOptions {
  force?: boolean;
  toast?: boolean;
}
