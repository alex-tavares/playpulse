import pino from 'pino';

export const createLogger = () =>
  pino({
    base: null,
    formatters: {
      level: (label) => ({
        level: label,
      }),
    },
    level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    messageKey: 'message',
  });
