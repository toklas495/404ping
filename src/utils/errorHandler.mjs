import CliError from "./Error.mjs"
import theme from "./theme.mjs"

/**
 * Comprehensive error handler with curl/postman-like error messages
 */
const errorHandler = (error) => {
    // Handle CliError instances
    if (error instanceof CliError) {
        const { message, type, category, code, statusCode, url, details } = error;
        
        // Format error message based on category
        let errorMessage = `404ping: ${message}`;
        
        // Add context based on category
        switch (category) {
            case "network":
                errorMessage = formatNetworkError(error);
                break;
            case "http":
                errorMessage = formatHttpError(error);
                break;
            case "ssl":
            case "tls":
                errorMessage = formatSslError(error);
                break;
            case "timeout":
                errorMessage = formatTimeoutError(error);
                break;
            case "dns":
                errorMessage = formatDnsError(error);
                break;
            case "file":
                errorMessage = formatFileError(error);
                break;
            case "validation":
                errorMessage = formatValidationError(error);
                break;
            default:
                // Use formatted message if available
                if (error.getFormattedMessage) {
                    errorMessage = `404ping: ${error.getFormattedMessage()}`;
                }
        }
        
        // Print based on type
        if (type === "warn") {
            console.error(theme.warning(errorMessage));
            process.exit(0);
        } else if (type === "info") {
            console.log(theme.info(errorMessage));
            process.exit(0);
        } else {
            console.error(theme.error(errorMessage));
            process.exit(1);
        }
    }

    // Handle unknown errors - try to categorize them
    const categorizedError = categorizeUnknownError(error);
    if (categorizedError) {
        return errorHandler(categorizedError);
    }

    // Fallback for completely unknown errors
    const message = error?.message || "Something went wrong!";
    const stack = error?.stack;
    console.error(theme.error(`404ping: ${message}`));
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        console.error(theme.debug(`\nStack trace:\n${stack}`));
    }
    process.exit(1);
}

/**
 * Format network-related errors
 */
function formatNetworkError(error) {
    const { message, code, url, details } = error;
    let msg = `404ping: ${message}`;
    
    if (url) {
        msg += `\n  Trying ${url}...`;
    }
    
    switch (code) {
        case "ENOTFOUND":
            msg += `\n  curl: (6) Could not resolve host: ${details?.hostname || 'unknown'}`;
            break;
        case "ECONNREFUSED":
            msg += `\n  curl: (7) Failed to connect to ${details?.hostname || 'host'} port ${details?.port || 'unknown'}: Connection refused`;
            break;
        case "ETIMEDOUT":
            msg += `\n  curl: (28) Connection timeout`;
            break;
        case "EHOSTUNREACH":
            msg += `\n  curl: (7) Failed to connect: Host unreachable`;
            break;
        case "ENETUNREACH":
            msg += `\n  curl: (7) Failed to connect: Network unreachable`;
            break;
        default:
            if (code) {
                msg += `\n  Error code: ${code}`;
            }
    }
    
    return msg;
}

/**
 * Format HTTP-related errors
 */
function formatHttpError(error) {
    const { message, statusCode, url } = error;
    let msg = `404ping: ${message}`;
    
    if (statusCode) {
        const statusText = getHttpStatusText(statusCode);
        msg += `\n  HTTP ${statusCode} ${statusText}`;
    }
    
    if (url) {
        msg += `\n  URL: ${url}`;
    }
    
    return msg;
}

/**
 * Format SSL/TLS-related errors
 */
function formatSslError(error) {
    const { message, code, details } = error;
    let msg = `404ping: ${message}`;
    
    if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "CERT_HAS_EXPIRED") {
        msg += `\n  curl: (60) SSL certificate problem: ${details || code}`;
        msg += `\n  More details here: https://curl.se/docs/sslcerts.html`;
    } else if (code === "SELF_SIGNED_CERT_IN_CHAIN") {
        msg += `\n  curl: (60) SSL certificate problem: self signed certificate`;
    } else if (code) {
        msg += `\n  SSL Error: ${code}`;
    }
    
    return msg;
}

/**
 * Format timeout errors
 */
function formatTimeoutError(error) {
    const { message, details } = error;
    let msg = `404ping: ${message}`;
    
    if (details?.timeout) {
        msg += `\n  Timeout after ${details.timeout}ms`;
    }
    
    msg += `\n  curl: (28) Operation timeout`;
    
    return msg;
}

/**
 * Format DNS errors
 */
function formatDnsError(error) {
    const { message, code, details } = error;
    let msg = `404ping: ${message}`;
    
    if (code === "ENOTFOUND") {
        msg += `\n  curl: (6) Could not resolve host: ${details?.hostname || 'unknown'}`;
    } else {
        msg += `\n  DNS Error: ${code || 'unknown'}`;
    }
    
    return msg;
}

/**
 * Format file-related errors
 */
function formatFileError(error) {
    const { message, code, details } = error;
    let msg = `404ping: ${message}`;
    
    switch (code) {
        case "ENOENT":
            msg += `\n  File not found: ${details?.path || 'unknown'}`;
            break;
        case "EACCES":
            msg += `\n  Permission denied: ${details?.path || 'unknown'}`;
            break;
        case "EISDIR":
            msg += `\n  Is a directory: ${details?.path || 'unknown'}`;
            break;
        default:
            if (code) {
                msg += `\n  File error: ${code}`;
            }
    }
    
    return msg;
}

/**
 * Format validation errors
 */
function formatValidationError(error) {
    const { message, details } = error;
    let msg = `404ping: ${message}`;
    
    if (details) {
        if (typeof details === 'string') {
            msg += `\n  ${details}`;
        } else if (Array.isArray(details)) {
            details.forEach(detail => {
                msg += `\n  - ${detail}`;
            });
        }
    }
    
    return msg;
}

/**
 * Get HTTP status text
 */
function getHttpStatusText(statusCode) {
    const statusTexts = {
        200: "OK",
        201: "Created",
        202: "Accepted",
        204: "No Content",
        301: "Moved Permanently",
        302: "Found",
        303: "See Other",
        304: "Not Modified",
        307: "Temporary Redirect",
        308: "Permanent Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        413: "Payload Too Large",
        414: "URI Too Long",
        415: "Unsupported Media Type",
        429: "Too Many Requests",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported"
    };
    
    return statusTexts[statusCode] || "Unknown";
}

/**
 * Categorize unknown errors based on error codes
 */
function categorizeUnknownError(error) {
    if (!error) return null;
    
    const code = error.code;
    const message = error.message || "Unknown error";
    
    // Network errors
    if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN"].includes(code)) {
        return new CliError({
            isKnown: true,
            message: message,
            code: code,
            category: code === "ENOTFOUND" || code === "EAI_AGAIN" ? "dns" : "network",
            originalError: error
        });
    }
    
    // SSL/TLS errors
    if (code && (code.includes("CERT") || code.includes("SSL") || code.includes("TLS") || 
                 code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "SELF_SIGNED_CERT_IN_CHAIN")) {
        return new CliError({
            isKnown: true,
            message: `SSL/TLS error: ${message}`,
            code: code,
            category: "ssl",
            originalError: error
        });
    }
    
    // File system errors
    if (["ENOENT", "EACCES", "EISDIR", "EMFILE", "ENFILE", "ENOSPC"].includes(code)) {
        return new CliError({
            isKnown: true,
            message: message,
            code: code,
            category: "file",
            details: { path: error.path },
            originalError: error
        });
    }
    
    // URL errors
    if (code === "ERR_INVALID_URL" || code === "ERR_INVALID_ARG_TYPE") {
        return new CliError({
            isKnown: true,
            message: `Invalid URL: ${message}`,
            code: code,
            category: "validation",
            originalError: error
        });
    }
    
    return null;
}

export default errorHandler;