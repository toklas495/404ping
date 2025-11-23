import theme from "./theme.mjs";

class PrintOutput {
    constructor(response) {
        this.res = response;
    }

    // ─────────────────────────────────────────────
    // HEADER FORMATTER
    // ─────────────────────────────────────────────
    formatHeaders() {
        const { httpVersion, status, message, rawHeaders } = this.res;

        let output = `${theme.info(`HTTP/${httpVersion} ${status} ${message}`)}\n`;

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
        if (this.res.json) {
            console.log(theme.success(JSON.stringify(this.res.json, null, 2)));
        } else {
            console.log(theme.success(this.res.body));
        }
    }

    // raw mode
    r_showRawBody() {
        console.log(this.res.body);
    }

    // header + body
    r_showHeaderAndBody() {
        const h = this.formatHeaders();
        const b = this.res.json 
          ? JSON.stringify(this.res.json, null, 2) 
          : this.res.body;

        console.log(`${h}\n\n${b}`);
    }

    // size mode
    r_showSize() {
        const { bodyBytes, headersBytes, totalBytes } = this.res.size;

        console.log(theme.info(
`Body:   ${bodyBytes} bytes
Header: ${headersBytes} bytes
Total:  ${totalBytes} bytes`));
    }

    // NEW: info (summary)
    r_showInfo() {
        const { status, message, duration, request } = this.res;

        console.log(theme.info(
`Method:   ${request.method}
URL:      ${request.url}
Status:   ${status} ${message}
Time:     ${duration} ms`));
    }

    // NEW: Debug (full dump)
    r_showDebug() {
        console.log(theme.debug(JSON.stringify(this.res, null, 2)));
    }

    // ─────────────────────────────────────────────
    // MAIN DISPATCHER
    // ─────────────────────────────────────────────
    print(mode = "body") {
        switch (mode) {
            case "header":
                return this.r_showHeaderAndBody();
            case "size":
                return this.r_showSize();
            case "raw":
                return this.r_showRawBody();
            case "info":
                return this.r_showInfo();
            case "debug":
                return this.r_showDebug();
            case "body":
            default:
                return this.r_showOnlyBody();
        }
    }
}

export default PrintOutput;
