import { PACKAGE_ID } from './config';

export class Logger {
  static PACKAGE_ID = PACKAGE_ID;

  static LOG_LEVEL = {
    Debug: 0,
    Log: 1,
    Info: 2,
    Warn: 3,
    Error: 4,
  } as const;

  static log({
    msg,
    level,
    options: { force, toast, permanent } = {},
  }: LogMessage) {
    const isDebugging = game.modules
      .get('_dev-mode')
      //@ts-expect-error adding an API to the module data is common practice
      ?.api?.getPackageDebugValue(Logger.PACKAGE_ID);

    switch (level) {
      case Logger.LOG_LEVEL.Error:
        console.error(Logger.PACKAGE_ID, '|', msg);
        if (toast) ui.notifications.error(msg.toString(), { permanent });
        break;
      case Logger.LOG_LEVEL.Warn:
        console.warn(Logger.PACKAGE_ID, '|', msg);
        if (toast) ui.notifications.warn(msg.toString(), { permanent });
        break;
      case Logger.LOG_LEVEL.Info:
        console.info(Logger.PACKAGE_ID, '|', msg);
        if (toast) ui.notifications.info(msg.toString(), { permanent });
        break;
      case Logger.LOG_LEVEL.Debug:
        if (!force && !isDebugging) break;
        console.debug(Logger.PACKAGE_ID, '|', msg);
        if (toast) ui.notifications.info(msg.toString(), { permanent });
        break;
      case Logger.LOG_LEVEL.Log:
      default:
        if (!force && !isDebugging) break;
        console.log(Logger.PACKAGE_ID, '|', msg);
        if (toast) ui.notifications.info(msg.toString(), { permanent });
        break;
    }
  }

  static error({ msg, options }: LogShortcut) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Error, options });
  }

  static warn({ msg, options }: LogShortcut) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Warn, options });
  }

  static info({ msg, options }: LogShortcut) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Info, options });
  }

  static debug({ msg, options }: LogShortcut) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Debug, options });
  }
}

interface LogShortcut {
  /** The message or data to log */
  msg: any;
  options?: LogMessageOptions;
}

interface LogMessage {
  /** The message or data to log */
  msg: any;
  level: ValueOf<typeof Logger.LOG_LEVEL>;
  options?: LogMessageOptions;
}

interface LogMessageOptions {
  force?: boolean;
  toast?: boolean;
  permanent?: boolean;
}
