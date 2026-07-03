export const mediaLogger = {
  info: (message: string, context?: any) => {
    console.info(`[Media] ${message}`, context ? JSON.stringify(context) : "");
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(`[Media] ${message}`, error, context ? JSON.stringify(context) : "");
  },
  warn: (message: string, context?: any) => {
    console.warn(`[Media] ${message}`, context ? JSON.stringify(context) : "");
  },
};
