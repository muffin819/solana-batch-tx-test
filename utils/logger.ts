import pino from 'pino';
import pretty from 'pino-pretty'

const stream = pretty({
  levelFirst: true,
  colorize: true,
  ignore: "time,hostname,pid",
});

export const logger = pino(
  {
    level: 'info',
    redact: ['poolKeys'],
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  stream,
);
