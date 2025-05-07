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
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime, // Format timestamp ISO
};

if (nodeEnv === 'development') {
  pinoOptions.transport = {
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
    },
    target: 'pino-pretty',
  };
}

const logger: pino.Logger = pino(pinoOptions);

export default logger;
