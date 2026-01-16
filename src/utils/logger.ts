import winston from 'winston';
import env from '../config/env';

const logger = winston.createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                
                winston.format.colorize(),

                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let log = `${timestamp} ${level}: ${message}`;
                    if (Object.keys(meta).length > 0) {
                        const metaStr = JSON.stringify(meta, null, 2)
                            .replace(/^{/, '')
                            .replace(/}$/, '')
                            .trim();
                        if (metaStr) {
                            log += ` ${metaStr}`;
                        }
                    }

                    return log;
                })
            ),
        }),
    ],
});

export default logger;
