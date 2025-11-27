import theme from "./theme.mjs";

class PrintOutput {
    constructor(response) {
        this.res = response;
    }

    // ─────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────
    
    /**
     * Get status code color based on HTTP status
     */
    getStatusColor(status) {
        if (status >= 200 && status < 300) return theme.success;
        if (status >= 300 && status < 400) return theme.info;
        if (status >= 400 && status < 500) return theme.warning;
        if (status >= 500) return theme.error;
        return theme.default;
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms.toFixed(2)} ms`;
        return `${(ms / 1000).toFixed(2)} s`;
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp) {
        return new Date(timestamp).toISOString();
    }

    /**
     * Format headers for display
     */
    formatHeaders(headers, rawHeaders = null) {
        if (!headers || Object.keys(headers).length === 0) return '';
        
        let output = '';
        if (rawHeaders) {
            // Use raw headers to preserve order
            for (let i = 0; i < rawHeaders.length; i += 2) {
                const key = rawHeaders[i];
                const value = rawHeaders[i + 1];
                output += `${theme.debug(key)}: ${value}\n`;
            }
        } else {
            // Fallback to object iteration
            for (const [key, value] of Object.entries(headers)) {
                output += `${theme.debug(key)}: ${value}\n`;
            }
        }
        return output.trim();
    }

    /**
     * Get status indicator
     */
    getStatusIndicator(status) {
        if (status >= 200 && status < 300) return '✓';
        if (status >= 300 && status < 400) return '↪';
        if (status >= 400 && status < 500) return '✗';
        if (status >= 500) return '⚠';
        return '?';
    }

    // ─────────────────────────────────────────────
    // OUTPUT MODES
    // ─────────────────────────────────────────────

    /**
     * Default body mode - Clean JSON/body output with minimal status info
     */
    r_showOnlyBody() {
        const { body, json } = this.res.response;
        const { status, statusText, durationMs } = this.res.meta;
        const statusColor = this.getStatusColor(status);
        const indicator = this.getStatusIndicator(status);

        // Show compact status line for non-2xx responses
        if (status >= 400) {
            console.log(statusColor(`${indicator} ${status} ${statusText} (${this.formatDuration(durationMs)})`));
            console.log(''); // Empty line before body
        }

        if (json) {
            console.log(theme.success(JSON.stringify(json, null, 2)));
        } else {
            console.log(theme.success(body));
        }
    }

    /**
     * Raw mode - Unformatted body output
     */
    r_showRawBody() {
        console.log(this.res.response.body);
    }

    /**
     * Header + Body mode - Full response with headers
     */
    r_showHeaderAndBody() {
        const { httpVersion, status, message } = this.res.meta;
        const { headers, rawHeaders, body, json } = this.res.response;
        const statusColor = this.getStatusColor(status);
        const indicator = this.getStatusIndicator(status);

        // Response Status Line
        console.log(statusColor(`\n${indicator} HTTP/${httpVersion} ${status} ${message}\n`));

        // Response Headers
        const headerOutput = this.formatHeaders(headers, rawHeaders);
        if (headerOutput) {
            console.log(theme.info('Response Headers:'));
            console.log(headerOutput);
            console.log(''); // Empty line
        }

        // Response Body
        console.log(theme.info('Response Body:'));
        if (json) {
            console.log(theme.success(JSON.stringify(json, null, 2)));
        } else {
            console.log(theme.success(body));
        }
        console.log(''); // Empty line
    }

    /**
     * Size mode - Response size information
     */
    r_showSize() {
        const { bodyBytes, headersBytes, totalBytes } = this.res.response.size;
        const status = this.res.meta.status;
        const statusColor = this.getStatusColor(status);

        console.log(theme.info('\n┌─ Response Size Information ─┐\n'));
        console.log(`Status:     ${statusColor(`${status}`)}`);
        console.log(`Body:       ${theme.success(bodyBytes.toLocaleString())} bytes (${this.formatBytes(bodyBytes)})`);
        console.log(`Headers:    ${theme.info(headersBytes.toLocaleString())} bytes (${this.formatBytes(headersBytes)})`);
        console.log(`Total:      ${theme.default(totalBytes.toLocaleString())} bytes (${this.formatBytes(totalBytes)})`);
        console.log(theme.info('\n└──────────────────────────────┘\n'));
    }

    /**
     * Info mode - Comprehensive summary (most useful for developers/hunters)
     */
    r_showInfo() {
        const { method, url, headers, payload, host } = this.res.request;
        const { status, statusText, httpVersion, durationMs, timestamp } = this.res.meta;
        const { bodyBytes, headersBytes, totalBytes } = this.res.response.size;
        const statusColor = this.getStatusColor(status);
        const indicator = this.getStatusIndicator(status);

        console.log(theme.info('\n╔═══════════════════════════════════════════════════════════════╗'));
        console.log(theme.info('║                    REQUEST SUMMARY                            ║'));
        console.log(theme.info('╚═══════════════════════════════════════════════════════════════╝\n'));

        // Request Information
        console.log(theme.default('┌─ Request ─────────────────────────────────────────────────┐'));
        console.log(`Method:     ${theme.success(method.toUpperCase())}`);
        console.log(`URL:        ${theme.info(url || 'N/A')}`);
        console.log(`Host:       ${theme.info(host || 'N/A')}`);
        if (headers && Object.keys(headers).length > 0) {
            console.log(`Headers:    ${theme.debug(Object.keys(headers).length + ' header(s)')}`);
        }
        if (payload) {
            const payloadSize = Buffer.byteLength(payload);
            console.log(`Body:       ${theme.debug(payloadSize + ' bytes')}`);
        }
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Response Information
        console.log(theme.default('┌─ Response ──────────────────────────────────────────────────┐'));
        console.log(`Status:     ${statusColor(`${indicator} ${status} ${statusText}`)}`);
        console.log(`Protocol:   ${theme.info(`HTTP/${httpVersion}`)}`);
        console.log(`Duration:   ${theme.success(this.formatDuration(durationMs))}`);
        console.log(`Timestamp:  ${theme.debug(this.formatTimestamp(timestamp))}`);
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Size Information
        console.log(theme.default('┌─ Size ─────────────────────────────────────────────────────┐'));
        console.log(`Body:       ${theme.success(bodyBytes.toLocaleString() + ' bytes')} (${this.formatBytes(bodyBytes)})`);
        console.log(`Headers:    ${theme.info(headersBytes.toLocaleString() + ' bytes')} (${this.formatBytes(headersBytes)})`);
        console.log(`Total:      ${theme.default(totalBytes.toLocaleString() + ' bytes')} (${this.formatBytes(totalBytes)})`);
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Connection Information (if available)
        if (this.res.connection) {
            const conn = this.res.connection;
            console.log(theme.default('┌─ Connection ───────────────────────────────────────────────┐'));
            if (conn.localAddress) {
                console.log(`Local:      ${theme.info(`${conn.localAddress}:${conn.localPort}`)}`);
            }
            if (conn.remoteAddress) {
                console.log(`Remote:     ${theme.info(`${conn.remoteAddress}:${conn.remotePort}`)}`);
            }
            if (conn.reused !== undefined) {
                console.log(`Reused:     ${conn.reused ? theme.success('Yes') : theme.warning('No')}`);
            }
            if (conn.bytesRead !== null) {
                console.log(`Bytes Read: ${theme.info(conn.bytesRead.toLocaleString())}`);
            }
            if (conn.bytesWritten !== null) {
                console.log(`Bytes Sent: ${theme.info(conn.bytesWritten.toLocaleString())}`);
            }
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // TLS Information (if available)
        if (this.res.tls) {
            const tls = this.res.tls;
            console.log(theme.default('┌─ TLS/SSL ─────────────────────────────────────────────────┐'));
            console.log(`Authorized: ${tls.authorized ? theme.success('Yes') : theme.error('No')}`);
            if (tls.protocol) {
                console.log(`Protocol:   ${theme.info(tls.protocol)}`);
            }
            if (tls.cipher) {
                console.log(`Cipher:     ${theme.info(tls.cipher.name || 'N/A')}`);
            }
            if (tls.authorizationError) {
                console.log(`Error:      ${theme.error(tls.authorizationError.message || tls.authorizationError)}`);
            }
            if (tls.certificate) {
                const cert = tls.certificate;
                console.log(`Subject:    ${theme.debug(cert.subject?.CN || 'N/A')}`);
                console.log(`Issuer:     ${theme.debug(cert.issuer?.CN || 'N/A')}`);
                if (cert.valid_from) {
                    console.log(`Valid From: ${theme.debug(cert.valid_from)}`);
                }
                if (cert.valid_to) {
                    console.log(`Valid To:   ${theme.debug(cert.valid_to)}`);
                }
            }
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // Security Warnings
        if (this.res.tls && !this.res.tls.authorized) {
            console.log(theme.warning('⚠  WARNING: SSL certificate verification failed!\n'));
        }
        if (status >= 400 && status < 500) {
            console.log(theme.warning(`⚠  Client Error: ${statusText}\n`));
        }
        if (status >= 500) {
            console.log(theme.error(`⚠  Server Error: ${statusText}\n`));
        }
    }

    /**
     * Connection mode - Detailed connection information
     */
    r_showConnection() {
        if (!this.res.connection) {
            console.log(theme.error('\n✗ No connection information available\n'));
            return;
        }

        const conn = this.res.connection;
        const { method, url, host } = this.res.request;
        const { status, durationMs } = this.res.meta;

        console.log(theme.info('\n╔═══════════════════════════════════════════════════════════════╗'));
        console.log(theme.info('║              CONNECTION DETAILS                                ║'));
        console.log(theme.info('╚═══════════════════════════════════════════════════════════════╝\n'));

        console.log(theme.default('┌─ Request Details ───────────────────────────────────────────┐'));
        console.log(`Method:     ${theme.success(method)}`);
        console.log(`URL:        ${theme.info(url)}`);
        console.log(`Host:       ${theme.info(host)}`);
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        console.log(theme.default('┌─ Network Information ────────────────────────────────────────┐'));
        if (conn.localAddress) {
            console.log(`Local IP:    ${theme.info(conn.localAddress)}`);
            console.log(`Local Port:  ${theme.info(conn.localPort)}`);
        }
        if (conn.remoteAddress) {
            console.log(`Remote IP:   ${theme.info(conn.remoteAddress)}`);
            console.log(`Remote Port: ${theme.info(conn.remotePort)}`);
        }
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        console.log(theme.default('┌─ Connection Metrics ─────────────────────────────────────────┐'));
        console.log(`Reused:      ${conn.reused ? theme.success('Yes (Keep-Alive)') : theme.warning('No (New Connection)')}`);
        if (conn.bytesRead !== null) {
            console.log(`Bytes Read:  ${theme.info(conn.bytesRead.toLocaleString())} (${this.formatBytes(conn.bytesRead)})`);
        }
        if (conn.bytesWritten !== null) {
            console.log(`Bytes Sent:  ${theme.info(conn.bytesWritten.toLocaleString())} (${this.formatBytes(conn.bytesWritten)})`);
        }
        console.log(`Duration:    ${theme.success(this.formatDuration(durationMs))}`);
        console.log(`Status:      ${this.getStatusColor(status)(status)}`);
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Performance indicator
        if (conn.reused) {
            console.log(theme.success('✓ Connection reused (Keep-Alive enabled)\n'));
        } else {
            console.log(theme.info('New connection established\n'));
        }
    }

    /**
     * TLS mode - Detailed SSL/TLS information
     */
    r_showTLS() {
        if (!this.res.tls) {
            console.log(theme.error('\n✗ TLS data only available for HTTPS requests\n'));
            return;
        }

        const tls = this.res.tls;
        const { method, url, host } = this.res.request;

        console.log(theme.info('\n╔═══════════════════════════════════════════════════════════════╗'));
        console.log(theme.info('║              TLS/SSL CERTIFICATE INFORMATION                 ║'));
        console.log(theme.info('╚═══════════════════════════════════════════════════════════════╝\n'));

        console.log(theme.default('┌─ Connection ────────────────────────────────────────────────┐'));
        console.log(`URL:        ${theme.info(url)}`);
        console.log(`Host:       ${theme.info(host)}`);
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        console.log(theme.default('┌─ TLS/SSL Details ──────────────────────────────────────────┐'));
        console.log(`Authorized: ${tls.authorized ? theme.success('✓ Yes') : theme.error('✗ No')}`);
        if (tls.protocol) {
            console.log(`Protocol:   ${theme.info(tls.protocol)}`);
        }
        if (tls.cipher) {
            const cipherInfo = typeof tls.cipher === 'string' ? tls.cipher : 
                              (tls.cipher.name ? `${tls.cipher.name} (${tls.cipher.version || 'N/A'})` : 'N/A');
            console.log(`Cipher:     ${theme.info(cipherInfo)}`);
        }
        if (tls.authorizationError) {
            console.log(`Error:      ${theme.error(tls.authorizationError.message || tls.authorizationError)}`);
        }
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        if (tls.certificate) {
            const cert = tls.certificate;
            console.log(theme.default('┌─ Certificate Information ─────────────────────────────────┐'));
            if (cert.subject) {
                console.log(`Subject:    ${theme.debug(JSON.stringify(cert.subject, null, 2).replace(/\n/g, ' '))}`);
            }
            if (cert.issuer) {
                console.log(`Issuer:     ${theme.debug(JSON.stringify(cert.issuer, null, 2).replace(/\n/g, ' '))}`);
            }
            if (cert.valid_from) {
                console.log(`Valid From: ${theme.debug(cert.valid_from)}`);
            }
            if (cert.valid_to) {
                const validTo = new Date(cert.valid_to);
                const now = new Date();
                const isExpired = validTo < now;
                const daysLeft = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
                console.log(`Valid To:   ${isExpired ? theme.error(cert.valid_to + ' (EXPIRED)') : theme.success(cert.valid_to + ` (${daysLeft} days left)`)}`);
            }
            if (cert.fingerprint) {
                console.log(`Fingerprint: ${theme.debug(cert.fingerprint)}`);
            }
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // Security warnings
        if (!tls.authorized) {
            console.log(theme.error('⚠  SECURITY WARNING: Certificate verification failed!\n'));
            if (tls.authorizationError) {
                console.log(theme.warning(`   Reason: ${tls.authorizationError.message || tls.authorizationError}\n`));
            }
            console.log(theme.warning('   This could indicate:\n'));
            console.log(theme.warning('   • Self-signed certificate\n'));
            console.log(theme.warning('   • Expired certificate\n'));
            console.log(theme.warning('   • Certificate chain issues\n'));
            console.log(theme.warning('   • Man-in-the-middle attack\n'));
        } else {
            console.log(theme.success('✓ Certificate verified successfully\n'));
        }
    }

    /**
     * Debug mode - Complete structured dump
     */
    r_showDebug() {
        const { method, url, headers, payload, host } = this.res.request;
        const { status, statusText, httpVersion, durationMs, timestamp } = this.res.meta;
        const { headers: resHeaders, rawHeaders, body, json, size } = this.res.response;

        console.log(theme.debug('\n╔═══════════════════════════════════════════════════════════════╗'));
        console.log(theme.debug('║                    DEBUG INFORMATION                         ║'));
        console.log(theme.debug('╚═══════════════════════════════════════════════════════════════╝\n'));

        // Request Section
        console.log(theme.default('┌─ REQUEST ────────────────────────────────────────────────────┐'));
        console.log(theme.debug(JSON.stringify({
            method,
            url,
            host,
            headers: headers || {},
            body: payload || null
        }, null, 2)));
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Response Meta
        console.log(theme.default('┌─ RESPONSE META ─────────────────────────────────────────────┐'));
        console.log(theme.debug(JSON.stringify({
            status,
            statusText,
            httpVersion,
            durationMs,
            timestamp: this.formatTimestamp(timestamp)
        }, null, 2)));
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Response Headers
        console.log(theme.default('┌─ RESPONSE HEADERS ──────────────────────────────────────────┐'));
        console.log(theme.debug(JSON.stringify(resHeaders, null, 2)));
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Response Body
        console.log(theme.default('┌─ RESPONSE BODY ──────────────────────────────────────────────┐'));
        if (json) {
            console.log(theme.debug(JSON.stringify(json, null, 2)));
        } else {
            console.log(theme.debug(body));
        }
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Size Information
        console.log(theme.default('┌─ SIZE INFORMATION ──────────────────────────────────────────┐'));
        console.log(theme.debug(JSON.stringify(size, null, 2)));
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));

        // Connection Information
        if (this.res.connection) {
            console.log(theme.default('┌─ CONNECTION ───────────────────────────────────────────────┐'));
            console.log(theme.debug(JSON.stringify(this.res.connection, null, 2)));
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // TLS Information
        if (this.res.tls) {
            console.log(theme.default('┌─ TLS/SSL ─────────────────────────────────────────────────┐'));
            // Remove certificate object if too large, show summary instead
            const tlsCopy = { ...this.res.tls };
            if (tlsCopy.certificate) {
                const cert = tlsCopy.certificate;
                tlsCopy.certificate = {
                    subject: cert.subject,
                    issuer: cert.issuer,
                    valid_from: cert.valid_from,
                    valid_to: cert.valid_to,
                    fingerprint: cert.fingerprint,
                    _note: 'Full certificate object available in response.tls.certificate'
                };
            }
            console.log(theme.debug(JSON.stringify(tlsCopy, null, 2)));
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // Timing Information
        if (this.res.timing) {
            console.log(theme.default('┌─ TIMING ───────────────────────────────────────────────────┐'));
            console.log(theme.debug(JSON.stringify(this.res.timing, null, 2)));
            console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
        }

        // Full Raw Response (for advanced debugging)
        console.log(theme.default('┌─ FULL RESPONSE OBJECT ──────────────────────────────────────┐'));
        console.log(theme.debug(JSON.stringify(this.res, null, 2)));
        console.log(theme.default('└──────────────────────────────────────────────────────────────┘\n'));
    }

    // ─────────────────────────────────────────────
    // MAIN DISPATCHER
    // ─────────────────────────────────────────────
    print(mode = "body") {
        switch (mode) {
            case "header": return this.r_showHeaderAndBody();
            case "size": return this.r_showSize();
            case "raw": return this.r_showRawBody();
            case "info": return this.r_showInfo();
            case "connection": return this.r_showConnection();
            case "tls": return this.r_showTLS();
            case "debug": return this.r_showDebug();
            case "body":
            default: return this.r_showOnlyBody();
        }
    }
}

export default PrintOutput;

