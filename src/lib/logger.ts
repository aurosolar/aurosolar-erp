// src/lib/logger.ts
// Logger estructurado con Winston — rotación diaria
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_PATH = process.env.LOG_PATH || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aurosolar-erp' },
  transports: [
    // Archivo rotativo diario
    new DailyRotateFile({
      filename: path.join(LOG_PATH, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
    // Errores en archivo separado
    new DailyRotateFile({
      filename: path.join(LOG_PATH, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '60d',
    }),
  ],
});

// En desarrollo, también a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

// Helpers para auditoría
export function logAccion(usuario: string, accion: string, entidad: string, detalle?: unknown) {
  logger.info('accion_usuario', { usuario, accion, entidad, detalle });
}

export function logWarn(mensaje: string, detalle?: unknown) {
  logger.warn(mensaje, { detalle });
}

export function logError(mensaje: string, error?: unknown) {
  logger.error(mensaje, { error: error instanceof Error ? error.message : error });
}
