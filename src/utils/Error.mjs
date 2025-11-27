/**
 * Comprehensive Error class for 404ping
 * Supports error codes, categories, and detailed context
 */
class CliError extends Error {
    constructor({
        isKnown = false,
        message,
        type = "error",
        code = null,
        category = "general",
        details = null,
        originalError = null,
        statusCode = null,
        url = null
    } = {}) {
        super(message);
        this.name = "CliError";
        this.isKnown = isKnown;
        this.message = message;
        this.type = type; // error, warn, info
        this.code = code; // Error code (e.g., "ENOTFOUND", "ETIMEDOUT")
        this.category = category; // network, http, ssl, file, validation, timeout
        this.details = details; // Additional error details
        this.originalError = originalError; // Original error object if wrapped
        this.statusCode = statusCode; // HTTP status code if applicable
        this.url = url; // URL that caused the error if applicable
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Get formatted error message with context
     */
    getFormattedMessage() {
        let msg = this.message;
        
        if (this.url) {
            msg += `\n  URL: ${this.url}`;
        }
        
        if (this.statusCode) {
            msg += `\n  HTTP Status: ${this.statusCode}`;
        }
        
        if (this.code) {
            msg += `\n  Error Code: ${this.code}`;
        }
        
        if (this.details) {
            if (typeof this.details === 'string') {
                msg += `\n  Details: ${this.details}`;
            } else {
                msg += `\n  Details: ${JSON.stringify(this.details, null, 2)}`;
            }
        }
        
        return msg;
    }
}

export default CliError;