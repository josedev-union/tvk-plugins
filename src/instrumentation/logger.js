import winston from 'winston'

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, label, timestamp, stack}) => {
      let msg = `${timestamp} [${level}] ${message}`
      if (stack) msg = `${msg} - ${stack}`
      return msg
    })
  ),
  transports: [new winston.transports.Console()]
})
