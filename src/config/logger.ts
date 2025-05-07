import { type LoggerOptions } from 'pino';
import pino from 'pino';

const logLevel = process.env.LOG_LEVEL ?? 'info';
const nodeEnv = process.env.NODE_ENV ?? 'development';

const pinoOptions: LoggerOptions = {
  formatters: {
    bindings: (bindings) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { hostname: bindings.hostname, pid: bindings.pid };
    },
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime, // Format timestamp ISO
  level: logLevel,
};

if (nodeEnv === 'development') {
  pinoOptions.transport = {
    options: {
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      colorize: true,
    },
    target: 'pino-pretty',
  };
}

const logger: pino.Logger = pino(pinoOptions);

export default logger;
