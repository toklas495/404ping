import Request from "../utils/asyncRequestHandle.mjs";
import { URL as URLBUILDER } from "url";
import {variableParser,loadFile,saveRequestInCollection} from '../utils/fileHandle.mjs';
import CliError from "../utils/Error.mjs";
import PrintOutput from "../utils/printOutput.mjs";
import http from 'http';
import https from 'https';
import fileParser from "../utils/fileParser.mjs";
import theme from "../utils/theme.mjs";
import runAssertions from "../utils/assertionEngine.mjs";
import runFilter from "../utils/filterEngine.mjs";
import extractValues from "../utils/extractionEngine.mjs";
import { summarizeBenchmarks, formatBenchmarkSummary } from "../utils/benchmarkReporter.mjs";
import { runHook, buildHookContext } from "../utils/scriptRunner.mjs";



async function fetchWithRedirect(options, res, debug=false,maxRedirect = 4) {
    let redirect = 0;
    let payload = options.body || null;


    while (true) {
        if (redirect >= maxRedirect) {
            throw new CliError({
                isKnown: true,
                message: `Maximum redirects (${maxRedirect}) exceeded`,
                category: "http",
                code: "MAX_REDIRECTS",
                details: { maxRedirects: maxRedirect, current: redirect }
            });
        }

        const status = res.meta.status;

        if (![301, 302, 303, 307, 308].includes(status)) {
            return res; // no redirect → return final response
        }

        redirect++;

        // --------------------------------------
        // location header check
        // --------------------------------------
        const location = res.response.headers.location;
        if (!location) {
            throw new CliError({
                isKnown: true,
                message: "Redirect status but no location header",
                category: "http",
                code: "MISSING_LOCATION_HEADER",
                statusCode: status
            });
        }

        // --------------------------------------
        // Resolve new URL
        // --------------------------------------
        const redirectUrl = new URL(location, `${options.protocol}//${options.host}`);

        // --------------------------------------
        // Update request options
        // --------------------------------------
        if(debug) console.log(`↪ Redirect (${status}): ${options.protocol}//${options.host} -> ${redirectUrl.href}`)

        options = {
            protocol: redirectUrl.protocol.replace(':',''),
            host: redirectUrl.hostname,
            port: redirectUrl.port || (redirectUrl.protocol === "https:" ? 443 : 80),
            path: redirectUrl.pathname + redirectUrl.search,
            method: options.method,
            headers: { ...options.headers },
            body: payload
        };

        // --------------------------------------
        // Change method based on redirect type
        // --------------------------------------
        if ([301, 302, 303].includes(status)) {
            options.method = "GET";
            options.body = null;
            payload = null;
        }

        // For 307 & 308 → keep method + body

        // --------------------------------------
        // Send the new request
        // --------------------------------------
        const httpModule = options.protocol === "https" ? https : http;
        const request = new Request(httpModule);

        request.addMethod(options.method);
        request.addHeaders(options.headers);
        request.addHost(options.host);
        request.addPort(options.port);
        request.addPath(options.path);

        if (options.body) request.addBody(options.body);

        res = await request.send(); // ★ send again
    }
}



const VALID_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const REDIRECT_STATUS = [301, 302, 303, 307, 308];
const DEFAULT_BENCHMARK_RUNS = 5;

function determineOutputMode({s_header, raw, size, info, debug, connection, tls}) {
    return s_header ? "header" :
           raw ? "raw" :
           size ? "size" :
           info ? "info" :
           debug ? "debug" :
           connection ? "connection" :
           tls ? "tls" :
           "body";
}

function looksLikeJson(value) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
           (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function normalizeList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function resolveBenchmarkRuns(value) {
    if (value === true) return DEFAULT_BENCHMARK_RUNS;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 1) return 1;
    return Math.floor(numeric);
}

function buildHeadersObject(headerList = []) {
    const headers = {};
    headerList.forEach((h) => {
        if (!h || typeof h !== "string") return;
        if (!h.includes(":")) {
            throw new CliError({
                isKnown:true,
                message:`Invalid header format: "${h}". Must be "Key: Value"`,
                type:"warn",
                category:"validation"
            });
        }
        const [keyRaw, ...rest] = h.split(":");
        const key = keyRaw.trim();
        const value = rest.join(":").trim();
        if (!key || !value) {
            throw new CliError({
                isKnown:true,
                message:`Invalid header: "${h}". Key and Value cannot be empty`,
                type:"warn",
                category:"validation"
            });
        }
        if (!/^[a-zA-Z0-9_\-]+$/.test(key)) {
            throw new CliError({
                isKnown:true,
                message:`Invalid header key: "${key}". Contains invalid characters`,
                type:"warn",
                category:"validation"
            });
        }
        headers[key] = value;
    });
    return headers;
}

function applyAuthHeaders(headers = {}, { bearer, basic }) {
    if (bearer) {
        headers["Authorization"] = `Bearer ${bearer}`;
    }
    if (basic) {
        headers["Authorization"] = `Basic ${Buffer.from(String(basic)).toString("base64")}`;
    }
    return headers;
}

function ensureJsonContentType(headers = {}, body) {
    if (body === undefined || body === null) return;
    const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === "content-type");
    if (hasContentType) return;
    if (typeof body === "object" || looksLikeJson(body)) {
        headers["Content-Type"] = "application/json";
    }
}

function setRuntimeVariable(runtimeScopes, scopeName = "runtime", key, value) {
    if (!runtimeScopes[scopeName]) runtimeScopes[scopeName] = {};
    runtimeScopes[scopeName][key] = value;
}

async function executeHttpRequest(baseArgs = {}, runtimeScopes = {}) {
    let { method = "GET", url, data, header = [], timeout, insecure, redirect, debug, preScript, postScript, bearer, basic } = baseArgs;

    let headersArray = Array.isArray(header) ? header : (header ? [header] : []);

    url = await variableParser(url, runtimeScopes);
    method = await variableParser(method, runtimeScopes);
    if (typeof data === "string") {
        data = await variableParser(data, runtimeScopes);
    }
    headersArray = await Promise.all(headersArray.map((h) => variableParser(h, runtimeScopes)));

    if (!/^https?:\/\//i.test(url)) {
        url = `http://${url}`;
    }

    let urlparams;
    try {
        urlparams = new URLBUILDER(url);
    } catch (urlError) {
        throw new CliError({
            isKnown:true,
            message:`Invalid URL format: "${url}"`,
            code:urlError.code || "ERR_INVALID_URL",
            category:"validation",
            url
        });
    }

    const protocol = urlparams.protocol.slice(0, -1).toLowerCase();
    if (!["http","https"].includes(protocol)) {
        throw new CliError({
            isKnown:true,
            message:`Unsupported protocol: "${protocol}". Only http and https are supported`,
            category:"validation",
            url
        });
    }

    const headers = applyAuthHeaders(buildHeadersObject(headersArray), { bearer, basic });

    const runtimeSetter = (scope, key, value) => setRuntimeVariable(runtimeScopes, scope || (runtimeScopes.sequence ? "sequence" : "runtime"), key, value);
    if (preScript) {
        const hookContext = buildHookContext({
            request: { url, method, headers: { ...headers }, body: data },
            runtimeScopes,
            setRuntimeVar: runtimeSetter
        });
        await runHook(preScript, hookContext, { label: "pre-script" });
        url = hookContext.request?.url || url;
        method = hookContext.request?.method || method;
        data = hookContext.request?.body ?? data;
        Object.assign(headers, hookContext.request?.headers || {});
        if (!/^https?:\/\//i.test(url)) {
            url = `http://${url}`;
        }
        try {
            urlparams = new URLBUILDER(url);
        } catch (urlError) {
            throw new CliError({
                isKnown:true,
                message:`Invalid URL format: "${url}"`,
                code:urlError.code || "ERR_INVALID_URL",
                category:"validation",
                url
            });
        }
    }

    const upperMethod = method.toUpperCase();
    if (!VALID_METHODS.includes(upperMethod)) {
        throw new CliError({
            isKnown:true,
            message:`Invalid HTTP method: "${method}". Allowed methods: ${VALID_METHODS.join(", ")}`,
            type:"warn",
            category:"validation"
        });
    }

    const httpModule = protocol === "https" ? https : http;
    const request = new Request(httpModule, { insecure: insecure || false });
    request.addMethod(upperMethod);

    let bodyPayload = data;
    if (typeof bodyPayload === "string") {
        try {
            bodyPayload = JSON.parse(bodyPayload);
        } catch {
            if (looksLikeJson(bodyPayload)) {
                console.warn(theme.warning(`Warning: Data looks like JSON but failed to parse. Sending as string.`));
            }
        }
    }

    ensureJsonContentType(headers, bodyPayload);
    if (Object.keys(headers).length) {
        request.addHeaders(headers);
    }
    if (bodyPayload !== undefined && bodyPayload !== null && bodyPayload !== "") {
        request.addBody(bodyPayload);
    }

    request.addHost(urlparams.hostname);
    if (urlparams.port) request.addPort(Number(urlparams.port));
    if (timeout) request.addTimeout(timeout);
    request.addPath(urlparams.pathname + urlparams.search);

    let response = await request.send();

    const statusCode = response.meta.status;
    if (statusCode >= 400) {
        if (statusCode >= 500) {
            console.error(theme.warning(`Warning: Server error (${statusCode})`));
        } else if (statusCode === 401) {
            console.error(theme.warning(`Warning: Unauthorized - Authentication required`));
        } else if (statusCode === 403) {
            console.error(theme.warning(`Warning: Forbidden - Access denied`));
        } else if (statusCode === 404) {
            console.error(theme.warning(`Warning: Not Found - Resource does not exist`));
        }
    }

    if (redirect && REDIRECT_STATUS.includes(statusCode)) {
        response = await fetchWithRedirect({
            protocol: urlparams.protocol,
            method: upperMethod,
            headers,
            host: urlparams.hostname,
            port: urlparams.port || (protocol === "https" ? 443 : 80),
            body: bodyPayload
        }, response, debug);
    }

    if (postScript) {
        const hookContext = buildHookContext({
            request: { url, method: upperMethod, headers, body: bodyPayload },
            response,
            runtimeScopes,
            setRuntimeVar: runtimeSetter
        });
        await runHook(postScript, hookContext, { label: "post-script" });
    }

    return response;
}

export default async function RequestHandler(args = {}) {
    const {
        method = "GET",
        url,
        data,
        header = [],
        s_header,
        size,
        info,
        raw,
        debug,
        connection,
        tls,
        redirect,
        timeout,
        insecure,
        save,
        assert: assertionRules = [],
        assertFormat = "tap",
        filter,
        extract = [],
        benchmark = 1,
        preScript,
        postScript,
        bearer,
        basic,
        runtimeScopes = {}
    } = args;

    if (!url) {
        throw new CliError({
            isKnown: true,
            message: "URL is required",
            type: "warn",
            category: "validation"
        });
    }

    const rawRequest = {
        url,
        method,
        header: Array.isArray(header) ? [...header] : (header ? [header] : []),
        data
    };

    let workingArgs = { method, url, data, header };

    if (typeof url === "string" && url.startsWith("@")) {
        const reqFromFile = await loadFile(url);
        const { url: get_url, method: get_method, header: get_header, data: get_data } = await fileParser(reqFromFile);
        workingArgs.url = get_url;
        workingArgs.method = method || get_method;
        workingArgs.header = header.length ? header : (get_header || []);
        workingArgs.data = data || get_data;
        rawRequest.url = get_url;
        rawRequest.method = workingArgs.method;
        rawRequest.header = get_header || [];
        rawRequest.data = get_data;
    }

    const benchmarkRuns = resolveBenchmarkRuns(benchmark);
    const durationSamples = [];
    let lastResponse = null;

    try {
        for (let i = 0; i < benchmarkRuns; i++) {
            const response = await executeHttpRequest({
                ...workingArgs,
                timeout,
                insecure,
                redirect,
                debug,
                preScript,
                postScript,
                bearer,
                basic
            }, runtimeScopes);
            durationSamples.push(response.meta?.durationMs || 0);
            lastResponse = response;
        }

        if (!lastResponse) {
            throw new CliError({
                isKnown: true,
                message: "Request did not return a response",
                category: "network"
            });
        }

        const mode = determineOutputMode({ s_header, raw, size, info, debug, connection, tls });
        new PrintOutput(lastResponse).print(mode);

        let filterResult;
        if (filter) {
            const payload = lastResponse.response?.json ?? (() => {
                try {
                    return lastResponse.response?.body ? JSON.parse(lastResponse.response.body) : null;
                } catch {
                    return null;
                }
            })();
            if (!payload) {
                throw new CliError({
                    isKnown: true,
                    message: "--filter requires a JSON response body",
                    category: "validation"
                });
            }
            filterResult = runFilter(payload, filter);
            console.log(theme.info(JSON.stringify(filterResult, null, 2)));
        }

        const assertionList = normalizeList(assertionRules);
        const normalizedFormat = (assertFormat || "tap").toLowerCase() === "junit" ? "junit" : "tap";
        let assertionResult = { passed: true, output: "", results: [] };
        if (assertionList.length) {
            assertionResult = runAssertions(lastResponse, assertionList, normalizedFormat);
            if (assertionResult.output) {
                console.log(assertionResult.output);
            }
            if (!assertionResult.passed) {
                throw new CliError({
                    isKnown: true,
                    message: "Assertions failed",
                    category: "validation",
                    type: "error"
                });
            }
        }

        const extractList = normalizeList(extract);
        const extractionResult = extractValues(lastResponse, extractList, { filterResult });
        if (extractionResult.printed.length) {
            console.log(theme.info("Extracted Variables:"));
            extractionResult.printed.forEach(({ name, value }) => {
                console.log(theme.default(`  ${name}: ${JSON.stringify(value)}`));
            });
        }
        if (Object.keys(extractionResult.extracted).length) {
            const targetScope = runtimeScopes.sequence ? "sequence" : "runtime";
            if (!runtimeScopes[targetScope]) runtimeScopes[targetScope] = {};
            Object.assign(runtimeScopes[targetScope], extractionResult.extracted);
        }
        if (filterResult !== undefined) {
            runtimeScopes.filter = { result: filterResult };
        }

        let benchmarkSummary = null;
        if (benchmarkRuns > 1) {
            const filteredSamples = durationSamples.filter((value) => Number.isFinite(value));
            benchmarkSummary = summarizeBenchmarks(filteredSamples);
            if (benchmarkSummary) {
                console.log(theme.info(formatBenchmarkSummary(benchmarkSummary)));
            }
        }

        if (save) {
            if (!save.includes('.')) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Must be "collection.request"`,
                    type: "warn",
                    category: "validation"
                });
            }

            const [collection_name, request_name] = save.split('.').map(s => s.trim());

            if (!collection_name || !request_name) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Collection and request names cannot be empty`,
                    type: "warn",
                    category: "validation"
                });
            }

            if (!/^[a-zA-Z0-9_\-]+$/.test(collection_name) || !/^[a-zA-Z0-9_\-]+$/.test(request_name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid --save format: "${save}". Collection and request names must contain only alphanumeric characters, underscores, and hyphens`,
                    type: "warn",
                    category: "validation"
                });
            }

            const request_body = {
                url: rawRequest.url,
                method: rawRequest.method,
                header: rawRequest.header,
                data: rawRequest.data
            };

            await saveRequestInCollection(collection_name, request_name, request_body);
            console.log(theme.success(`\n✓ Request saved to collection "${collection_name}" as "${request_name}"`));
        }

        return {
            ...lastResponse,
            request: {
                method: rawRequest.method,
                url: args?.url,
                header: rawRequest.header,
                data: rawRequest.data
            },
            assertions: assertionResult,
            benchmark: benchmarkSummary,
            filterResult,
            extracted: extractionResult.extracted
        };
    } catch (error) {
        if (error instanceof CliError) {
            throw error;
        }

        if (error.response && error.response.meta) {
            const statusCode = error.response.meta.status;
            if (statusCode >= 400) {
                throw new CliError({
                    isKnown: true,
                    message: `HTTP Error ${statusCode}`,
                    category: "http",
                    statusCode,
                    url: url,
                    details: {
                        statusText: error.response.meta.message,
                        body: error.response.response?.body
                    }
                });
            }
        }

        const code = error.code;
        switch (code) {
            case "ENOTFOUND":
                throw new CliError({
                    isKnown: true,
                    message: "Could not resolve host",
                    code,
                    category: "dns",
                    url
                });
            case "ERR_INVALID_URL":
                throw new CliError({
                    isKnown: true,
                    message: `Invalid URL format: "${url}"`,
                    code,
                    category: "validation",
                    url
                });
            case "ECONNREFUSED":
                throw new CliError({
                    isKnown: true,
                    message: "Connection refused",
                    code,
                    category: "network",
                    url
                });
            case "ETIMEDOUT":
                throw new CliError({
                    isKnown: true,
                    message: "Connection timeout",
                    code,
                    category: "timeout",
                    url,
                    details: { timeout }
                });
            case "EHOSTUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Host unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            case "ENETUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Network unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            default:
                // For unknown errors, wrap them
                throw new CliError({
                    message: error.message || "Request failed",
                    code: code,
                    originalError: error,
                    url: url
                });
        }
    }
}
