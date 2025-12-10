# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-10

### Added
- **Stable API**: All modules are now production-ready with a stable API
- Comprehensive documentation including Getting Started, API Reference, and Advanced Usage guides
- CONTRIBUTING.md for open-source collaboration guidelines
- SECURITY.md for vulnerability reporting policy
- MIGRATION.md guide for upgrading from alpha versions

### Changed
- **Production Ready**: SDK is now ready for production use
- Improved error messages and error handling
- Enhanced TypeScript type definitions

### Fixed
- Various stability improvements from alpha testing feedback

---

## [0.1.0-alpha.7] - 2024-12-09

### Changed
- Updated API documentation to reflect changes in staging and development environment URLs
- Ensured consistency across README, API reference, and getting started guide

## [0.1.0-alpha.6] - 2024-12-08

### Changed
- Updated documentation to reflect new environment configuration options
- Replaced `baseUrl` with `environment` in examples and API reference
- Introduced `ChaindocEnvironment` type to standardize environment handling

## [0.1.0-alpha.5] - 2024-12-07

### Added
- LICENSE file (MIT)
- Updated .gitignore with comprehensive rules
- Created documentation files structure (`docs/` folder)

## [0.1.0-alpha.4] - 2024-12-06

### Changed
- Enhanced README.md with version and license badges
- Updated README.md to include license details and support information

## [0.1.0-alpha.3] - 2024-12-05

### Added
- Advanced usage documentation (`docs/ADVANCED_USAGE.md`)
- Document workflows and versioning guide
- Webhook handling documentation
- Rate limiting and retry documentation

## [0.1.0-alpha.2] - 2024-12-04

### Added
- API Reference documentation (`docs/API_REFERENCE.md`)
- Getting Started guide (`docs/GETTING_STARTED.md`)
- Express.js and Next.js integration examples

## [0.1.0-alpha.1] - 2024-12-03

### Added
- Initial SDK implementation
- Core `Chaindoc` class with configuration options
- HTTP client with retry logic and exponential backoff
- `ChaindocError` class for error handling

#### Modules
- **Documents**: Create, update, verify documents on blockchain
- **Signatures**: Create signature requests, track status, sign documents
- **Embedded**: Create embedded sessions for frontend signing integration
- **Media**: Upload media files (PDF, DOC, images, videos)
- **KYC**: Share KYC data via Sumsub integration

#### Features
- TypeScript support with full type definitions
- Dual format output (CommonJS + ESM)
- Zero runtime dependencies (uses Node.js 18+ native APIs)
- Automatic retry with exponential backoff and jitter
- Request timeout handling
- Multi-environment support (production, staging, development)

[1.0.0]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.7...v1.0.0
[0.1.0-alpha.7]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.6...v0.1.0-alpha.7
[0.1.0-alpha.6]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.5...v0.1.0-alpha.6
[0.1.0-alpha.5]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.4...v0.1.0-alpha.5
[0.1.0-alpha.4]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.3...v0.1.0-alpha.4
[0.1.0-alpha.3]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.2...v0.1.0-alpha.3
[0.1.0-alpha.2]: https://github.com/ChaindocIO/server-sdk/compare/v0.1.0-alpha.1...v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/ChaindocIO/server-sdk/releases/tag/v0.1.0-alpha.1
