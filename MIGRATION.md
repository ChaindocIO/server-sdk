# Migration Guide

This guide helps you upgrade from alpha versions to the stable 1.0.0 release.

## Upgrading from 0.1.0-alpha.x to 1.0.0

### Installation

```bash
npm install @chaindoc_io/server-sdk@1.0.0
```

### Breaking Changes

**There are no breaking changes in 1.0.0.** The API is fully backwards compatible with all alpha versions.

### Environment Configuration

If you were using `baseUrl` (alpha.1-alpha.4), update to `environment`:

```typescript
// Before (alpha.1 - alpha.4)
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  baseUrl: "https://api-demo.chaindoc.io",
});

// After (alpha.5+ and 1.0.0)
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  environment: "staging", // 'production' | 'staging' | 'development'
});
```

### Environment URLs

| Environment   | API URL                        |
| ------------- | ------------------------------ |
| `production`  | `https://api.chaindoc.io`      |
| `staging`     | `https://api-demo.chaindoc.io` |
| `development` | `https://api-demo.chaindoc.io` |

### What's New in 1.0.0

- **Stable API**: All modules are now production-ready with a stable API
- **Improved Documentation**: Comprehensive guides and API reference
- **Enhanced TypeScript**: Improved type definitions
- **Better Error Messages**: More descriptive error handling

### Checklist

- [ ] Update package version to `1.0.0`
- [ ] Replace `baseUrl` with `environment` if applicable
- [ ] Review error handling (no changes required, but improvements available)
- [ ] Update API keys for production if moving from test environment

### Support

If you encounter any issues during migration:

- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **Email**: support@chaindoc.io
