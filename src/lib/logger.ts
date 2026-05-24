import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});

export default logger;
export const log = {
  info:  (msg: string, obj?: object) => logger.info(obj || {}, msg),
  warn:  (msg: string, obj?: object) => logger.warn(obj || {}, msg),
  error: (msg: string, obj?: object) => logger.error(obj || {}, msg),
  debug: (msg: string, obj?: object) => logger.debug(obj || {}, msg),
};
