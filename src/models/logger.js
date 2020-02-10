import winston from 'winston'

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${level}] ${message}`
    })
  ),
  transports: [new winston.transports.Console()]
})

export default logger
