import theme from "./theme.mjs";

class PrintOutput {
    constructor(response) {
        this.res = response;
    }

    // ─────────────────────────────────────────────
    // HEADER FORMATTER
    // ─────────────────────────────────────────────
    formatHeaders() {
        const { httpVersion, status, statusText } = this.res.meta;
        const rawHeaders = this.res.response.rawHeaders;

        let output = `${theme.info(`HTTP/${httpVersion} ${status} ${statusText}`)}\n`;

        for (let i = 0; i < rawHeaders.length; i += 2) {
            const key = rawHeaders[i];
            const value = rawHeaders[i + 1];
            output += `${theme.debug(key)}: ${value}\n`;
        }

        return output.trim();
    }

    // ─────────────────────────────────────────────
    // MODES
    // ─────────────────────────────────────────────

    // Default body mode
    r_showOnlyBody() {
        const body = this.res.response;

        if (body.json) {
            console.log(theme.success(JSON.stringify(body.json, null, 2)));
        } else {
            console.log(theme.success(body.body));
        }
    }

    // Raw mode
    r_showRawBody() {
        console.log(this.res.response.body);
    }

    // Header + Body
    r_showHeaderAndBody() {
        const header = this.formatHeaders();
        const body = this.res.response.json
            ? JSON.stringify(this.res.response.json, null, 2)
            : this.res.response.body;

        console.log(`${header}\n\n${body}`);
    }

    // Size mode
    r_showSize() {
        const { bodyBytes, headersBytes, totalBytes } = this.res.response.size;

        console.log(
            theme.info(
`Body:   ${bodyBytes} bytes
Header: ${headersBytes} bytes
Total:  ${totalBytes} bytes`
            )
        );
    }

    // Info mode — simplified summary
    r_showInfo() {
        const { method, url } = this.res.request;
        const { status, statusText, durationMs } = this.res.meta;

        console.log(
            theme.info(
`Method:   ${method}
URL:      ${url}
Status:   ${status} ${statusText}
Time:     ${durationMs} ms`
            )
        );
    }

    // Connection mode — show connection details
    r_showConnection() {
        if (!this.res.connection) {
            return console.log(theme.error("No connection info available"));
        }

        console.log(theme.info(JSON.stringify(this.res.connection, null, 2)));
    }

    // TLS mode — show HTTPS details
    r_showTLS() {
        if (!this.res.tls) {
            return console.log(theme.error("TLS data only available for HTTPS requests"));
        }

        console.log(theme.info(JSON.stringify(this.res.tls, null, 2)));
    }

    // Debug mode — full dump
    r_showDebug() {
        console.log(theme.debug(JSON.stringify(this.res, null, 2)));
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

