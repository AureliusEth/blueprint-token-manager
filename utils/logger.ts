type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    // Add other config options as needed (e.g., remote logging)
}

class Logger {
    private config: LoggerConfig = {
        level: 'info',
        enableConsole: true
    };

    configure(config: Partial<LoggerConfig>) {
        this.config = { ...this.config, ...config };
    }

    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    error(message: string, data?: any) {
        this.log('error', message, data);
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    debug(message: string, data?: any) {
        this.log('debug', message, data);
    }

    private log(level: LogLevel, message: string, data?: any) {
        if (!this.shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        if (this.config.enableConsole) {
            const logFn = console[level] || console.log;
            logFn(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data ? data : '');
        }

        // Add additional logging handlers here (e.g., remote logging)
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        return levels[level] <= levels[this.config.level];
    }
}

export const logger = new Logger(); 