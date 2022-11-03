import winston from 'winston'
import {env} from '../config/env'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  debugverbose: 6,
  silly: 7,
}

export const logger = winston.createLogger({
  level: env.logLevel || 'info',
  levels: levels,
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
