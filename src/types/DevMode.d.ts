/**
 * Based on devMode documentation
 * @see https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
interface DevModeApi {
  registerPackageDebugFlag(
    packageName: string,
    kind?: 'boolean' | 'level', //defaults to 'boolean'
    options?: {
      default?: boolean | LogLevel;
      choiceLabelOverrides?: Record<string, string>; // actually keyed by LogLevel number
    },
  ): Promise<boolean>;

  getPackageDebugValue(
    packageName: string,
    kind?: 'boolean' | 'level',
  ): boolean | LogLevel;
}

declare enum LogLevel {
  NONE = 0,
  INFO = 1,
  ERROR = 2,
  DEBUG = 3,
  WARN = 4,
  ALL = 5,
}
