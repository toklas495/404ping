# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-06

### Added
- **Commander-based CLI** with shared flag builders, subcommands for request/collection/run/sequence/postman, and global `--env` / `--env-file` options.
- **Environment loader & runtime scopes** so `.env`, profiles, and extracted variables flow through single requests, sequences, and saved collection runs.
- **Assertion/Filter/Extraction engines** supporting TAP or JUnit output, jq-inspired filters, and variable harvesting for downstream steps.
- **Benchmark reporter** (`--benchmark [runs]`) with min/p50/p95 summaries plus auto Content-Type and auth shorthands (`--bearer`, `--basic`).
- **Sequence runner** that mixes `collection:request` references with ad-hoc URLs, honors shared hooks, and prints per-step summaries.
- **Script hooks** via `--pre-script` / `--post-script` accepting inline JS or `@file` sources.
- **Postman import/export commands** (v2.1 schema) with automatic folder flattening and YAML/JSON collection parsing.

### Fixed
- Sequence command now correctly detects raw URLs instead of treating them as malformed identifiers.
- Postman import honors the `-c/--collection` target, creates missing collections, and saves requests immediately without cache desyncs.
- Collection metadata cache refreshes after create/save so subsequent operations always see new entries.

## [1.1.0] - 2025-11-27

### 🚀 Major Improvements

This release includes comprehensive improvements to error handling, security, output modes, and developer experience.

### Added

#### Error Handling System
- **Comprehensive Error Categories**: Added error categorization system (network, HTTP, SSL/TLS, timeout, DNS, file, validation)
- **curl/postman-like Error Messages**: Detailed error messages with context, error codes, and helpful suggestions
- **Automatic Error Categorization**: Unknown errors are automatically categorized and formatted appropriately
- **Error Context**: All errors now include URLs, status codes, file paths, and other relevant context
- **HTTP Status Code Handling**: Proper handling and warnings for 4xx and 5xx status codes

#### Security Enhancements
- **Secure by Default**: SSL certificate verification enabled by default (was `rejectUnauthorized: false`)
- **Explicit Insecure Mode**: Added `--insecure` (`-k`) flag to bypass certificate verification when needed
- **Path Traversal Protection**: All file operations now validate paths to prevent directory traversal attacks
- **Input Validation**: Comprehensive validation for URLs, headers, HTTP methods, collection names, and variable names
- **Header Validation**: Invalid header keys are rejected with security checks
- **Protocol Validation**: Only HTTP and HTTPS protocols are allowed

#### Enhanced Output Modes
- **`--info` Mode**: Comprehensive summary showing:
  - Request details (method, URL, host, headers, body size)
  - Response details (status, protocol, duration, timestamp)
  - Size information (body, headers, total - human-readable)
  - Connection information (IPs, ports, keep-alive, bytes transferred)
  - TLS/SSL details (certificate info, validity, security warnings)
  - Status indicators with color coding
- **`--connection` Mode**: Detailed network connection information
  - Local and remote IP addresses and ports
  - Connection reuse (keep-alive) status
  - Bytes read/written
  - Connection performance metrics
- **`--tls` Mode**: SSL/TLS certificate inspection
  - Certificate validity and expiration dates
  - Subject and issuer information
  - Protocol and cipher details
  - Security warnings for invalid certificates
- **`--debug` Mode**: Complete structured dump with organized sections
- **Status Code Color Coding**: Visual indicators (✓, ↪, ✗, ⚠) and color coding for different HTTP status codes
- **Human-readable Formats**: Bytes displayed in B, KB, MB format; durations in ms/s format

#### New Features
- **`--save` Flag**: Quick save to collections directly from `request` command
  - Format: `404ping request <url> ... --save collection.request`
  - Stores raw requests with variables (not resolved values)
- **Raw Request Storage**: Both `collection save` and `--save` now store raw requests with variables
  - Variables automatically update when values change
  - No need to manually update saved requests
- **Redirect Following**: Added `--redirect` (`-L`) flag to follow HTTP redirects (301, 302, 303, 307, 308)
- **Timeout Support**: Added `--timeout` option for request timeouts

#### Variable System Improvements
- **Collection-scoped Variables**: Support for `collection.variable:value` format
  - Usage: `{{collection.variable}}` in requests
  - Automatic scope detection based on format
- **Variable Validation**: Enhanced validation for variable names and collection names
- **Better Error Messages**: Clear error messages for invalid variable formats

### Changed

#### Breaking Changes
- **SSL/TLS Default Behavior**: SSL certificate verification is now enabled by default
  - Previously: `rejectUnauthorized: false` (insecure by default)
  - Now: `rejectUnauthorized: true` (secure by default)
  - Use `--insecure` (`-k`) flag to bypass verification if needed

#### Improvements
- **Error Messages**: All error messages now follow curl/postman-style formatting
- **Output Formatting**: Professional, structured output with visual indicators
- **File Operations**: All file operations now include proper error handling and validation
- **Collection Management**: Enhanced validation and error messages for collection operations
- **Request Handler**: Improved error handling with proper categorization
- **Variable Parsing**: Better error handling for variable parsing failures

### Fixed

#### Bug Fixes
- **fileParser.mjs**: Fixed `headers.append()` bug (changed to `headers.push()`)
- **fileParser.mjs**: Fixed cookie header bug (changed `Cookie` to `Cookie:` and fixed map function)
- **Collection Save**: Fixed bug where resolved values were stored instead of raw values with variables
- **Error Handling**: Fixed inconsistent error handling patterns across handlers
- **JSON Parsing**: Added proper error handling for corrupted JSON files
- **Path Validation**: Fixed potential path traversal vulnerabilities in file operations

#### Security Fixes
- **SSL/TLS**: Fixed insecure default SSL configuration
- **Path Traversal**: Fixed potential directory traversal vulnerabilities
- **Input Validation**: Added missing validation in several areas
- **Header Injection**: Added validation to prevent invalid header keys

### Documentation

- **README.md**: Comprehensive update with all new features
- **Command Reference**: Updated with all new options and flags
- **Examples**: Added examples for all new features and output modes
- **Security Section**: Added security features documentation
- **Error Handling Section**: Added error handling documentation
- **Output Modes Section**: Detailed explanation of all output modes
- **Variable System**: Updated documentation to reflect collection-scoped variables

### Code Quality

- **Error Handling**: Consistent error handling patterns throughout codebase
- **Input Validation**: Comprehensive validation added to all handlers
- **Security**: Security-focused implementation with proper validation
- **Code Structure**: Improved organization and maintainability
- **Comments**: Added security and functionality comments where needed

---

## [1.0.0] - Initial Release

### Added
- Basic HTTP request functionality
- Variable system (global variables)
- Collection management
- Request saving and running
- Basic output modes

---

## Version History

- **1.1.0** - Major improvements: error handling, security, output modes, --save flag
- **1.0.0** - Initial release