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
    options: { force, toast, permanent, localize } = {},
  }: LogMessage) {
    const isDebugging = game.modules
      .get('_dev-mode')
      //@ts-expect-error adding an API to the module data is common practice
      ?.api?.getPackageDebugValue(Logger.PACKAGE_ID);
    const prefix = Logger.PACKAGE_ID + '|';
    switch (level) {
      case Logger.LOG_LEVEL.Error:
        console.error(prefix, localize ? game.i18n.localize(msg) : msg);
        if (toast)
          ui.notifications.error(msg.toString(), {
            permanent,
            localize,
            console: false,
          });
        break;
      case Logger.LOG_LEVEL.Warn:
        console.warn(prefix, localize ? game.i18n.localize(msg) : msg);
        if (toast)
          ui.notifications.warn(msg.toString(), {
            permanent,
            localize,
            console: false,
          });
        break;
      case Logger.LOG_LEVEL.Info:
        console.info(prefix, localize ? game.i18n.localize(msg) : msg);
        if (toast)
          ui.notifications.info(msg.toString(), {
            permanent,
            localize,
            console: false,
          });
        break;
      case Logger.LOG_LEVEL.Debug:
        if (!force && !isDebugging) break;
        console.debug(prefix, localize ? game.i18n.localize(msg) : msg);
        if (toast)
          ui.notifications.info(msg.toString(), {
            permanent,
            localize,
            console: false,
          });
        break;
      case Logger.LOG_LEVEL.Log:
      default:
        if (!force && !isDebugging) break;
        console.log(prefix, localize ? game.i18n.localize(msg) : msg);
        if (toast)
          ui.notifications.info(msg.toString(), { permanent, console: false });
        break;
    }
  }

  static error(msg: any | string, options?: LogMessageOptions) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Error, options });
  }

  static warn(msg: any | string, options?: LogMessageOptions) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Warn, options });
  }

  static info(msg: any | string, options?: LogMessageOptions) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Info, options });
  }

  static debug(msg: any | string, options?: LogMessageOptions) {
    Logger.log({ msg, level: Logger.LOG_LEVEL.Debug, options });
  }
}

interface LogMessage {
  /** The message or data to log */
  msg: any;
  options?: LogMessageOptions;
  /** The log level @see {@link Logger.LOG_LEVEL} */
  level: ValueOf<typeof Logger.LOG_LEVEL>;
}

interface LogMessageOptions extends Notifications.NotifyOptions {
  force?: boolean;
  toast?: boolean;
}
