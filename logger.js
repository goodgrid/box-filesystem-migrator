import winston from "winston"
import config from "./config.js";

winston.level = "info"

const { combine, timestamp, splat, printf } = winston.format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: config.logLevel ? config.logLevel : "info",
  format: combine(
    timestamp(),
    splat(),
    myFormat
  ),
  transports: [
    new winston.transports.File({
      filename: 'combined.log',
      level: "debug"
    }),
    new winston.transports.Console({
    }),    
  ]
});

export default logger