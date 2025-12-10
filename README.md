# @chaindoc_io/server-sdk

**Official server-side SDK for Chaindoc API - document management, digital signatures, and blockchain verification.**

[![npm version](https://img.shields.io/npm/v/@chaindoc_io/server-sdk.svg)](https://www.npmjs.com/package/@chaindoc_io/server-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## Features

- **Document Management** - Create, update, and version documents with blockchain verification
- **Digital Signatures** - Request and collect legally-binding electronic signatures
- **Embedded Signing** - Seamless in-app signing experience with frontend SDK integration
- **Blockchain Verification** - Immutable document verification on blockchain
- **KYC Integration** - Built-in Sumsub KYC verification for signers
- **Zero Dependencies** - Uses native Node.js 18+ APIs (fetch, FormData)
- **TypeScript First** - Full type definitions included
- **Automatic Retries** - Built-in retry logic with exponential backoff

## Installation

```bash
npm install @chaindoc_io/server-sdk
```

```bash
yarn add @chaindoc_io/server-sdk
```

```bash
pnpm add @chaindoc_io/server-sdk
```

## Quick Start

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

// Create embedded session for document signing
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: "doc_xxx",
    signatureRequestId: "req_xxx",
  },
});

// Use session.sessionId on frontend with @chaindoc_io/embed-sdk
console.log(session.sessionId);
```

## Complete Example: Document Signing Flow

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

// 1. Upload document
const buffer = await readFile("./contract.pdf");
const file = new Blob([buffer], { type: "application/pdf" });
const { media } = await chaindoc.media.upload([file]);

// 2. Create document with blockchain verification
const doc = await chaindoc.documents.create({
  name: "Service Agreement",
  description: "Contract for services",
  media: media[0],
  hashtags: ["#contract", "#agreement"],
  status: "published", // Verify in blockchain
});

// 3. Create signature request
const request = await chaindoc.signatures.createRequest({
  versionId: doc.document.versions[0].uuid,
  recipients: [
    { email: "signer@example.com" },
    // With KYC verification:
    // { email: 'signer@example.com', shareToken: 'sumsub_share_token' }
  ],
  deadline: new Date("2025-12-31"),
  embeddedFlow: true,
});

// 4. Create embedded session for signer
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: doc.documentId,
    signatureRequestId: request.signatureRequest.uuid,
    returnUrl: "https://yourapp.com/signing-complete",
  },
});

// 5. Send sessionId to frontend
// Frontend uses: @chaindoc_io/embed-sdk
// sdk.openSignatureFlow({ sessionId: session.sessionId })
```

## Configuration

```typescript
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",           // Required - Your secret API key
  environment: "production",      // Optional: 'production' | 'staging' | 'development'
  timeout: 30000,                 // Optional: Request timeout in ms (default: 30000)
  retry: {                        // Optional: Retry configuration
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  },
});
```

### Environments

| Environment   | API URL                             | Use Case                |
| ------------- | ----------------------------------- | ----------------------- |
| `production`  | `https://api.chaindoc.io` (default) | Live production traffic |
| `staging`     | `https://api-demo.chaindoc.io`      | Pre-release testing     |
| `development` | `https://api-demo.chaindoc.io`      | Development & debugging |

## API Overview

### Documents

```typescript
// Create document
await chaindoc.documents.create({
  name: string;
  description: string;
  media: Media;
  hashtags: string[];
  status: 'draft' | 'published';
  accessType?: 'private' | 'public' | 'restricted';
});

// Update document (creates new version)
await chaindoc.documents.update(documentId, params);

// Update access rights
await chaindoc.documents.updateRights(documentId, {
  accessType: 'restricted',
  accessEmails: [{ email: 'user@example.com', level: 'read' }],
});

// Verify document in blockchain
await chaindoc.documents.verify({ versionHash: '0x...' });

// Get verification status
await chaindoc.documents.getVerificationStatus(versionId);
```

### Signatures

```typescript
// Create signature request
await chaindoc.signatures.createRequest({
  versionId: string;
  recipients: [{ email: string, shareToken?: string }];
  deadline: Date;
  embeddedFlow?: boolean;
  isKycRequired?: boolean;
});

// Get request status
await chaindoc.signatures.getRequestStatus(requestId);

// Get all requests
await chaindoc.signatures.getMyRequests({ pageNumber: 1, pageSize: 10 });

// Sign document
await chaindoc.signatures.sign({ requestId, signatureId });
```

### Embedded Sessions

```typescript
// Create session for frontend signing (sends OTP to email)
const session = await chaindoc.embedded.createSession({
  email: 'signer@example.com',
  metadata: {
    documentId: string;
    signatureRequestId?: string;
    returnUrl?: string;
  },
});
// Returns sessionId for @chaindoc_io/embed-sdk
```

### Media

```typescript
// Upload files (PDF, DOC, images, videos)
const { media } = await chaindoc.media.upload([file1, file2]);
```

### KYC

```typescript
// Share KYC data for pre-verification
await chaindoc.kyc.share({
  email: "user@example.com",
  shareToken: "sumsub_share_token",
});
```

### Utility

```typescript
// Get API key info
await chaindoc.getApiKeyInfo();

// Health check
await chaindoc.healthCheck();
```

## Error Handling

```typescript
import { Chaindoc, ChaindocError } from '@chaindoc_io/server-sdk';

try {
  await chaindoc.documents.create({ ... });
} catch (error) {
  if (error instanceof ChaindocError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Response:', error.response);
  }
}
```

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) - Step-by-step setup guide
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [Advanced Usage](docs/ADVANCED_USAGE.md) - Workflows, webhooks, and best practices
- [Migration Guide](MIGRATION.md) - Upgrading from alpha versions
- [Changelog](CHANGELOG.md) - Version history

## Requirements

- Node.js 18+ (uses native fetch API)
- Secret API key (`sk_xxx`) from [Chaindoc Dashboard](https://chaindoc.io)

## Related Packages

- [`@chaindoc_io/embed-sdk`](https://www.npmjs.com/package/@chaindoc_io/embed-sdk) - Frontend SDK for embedded signing

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Documentation](https://chaindoc.io/docs)
- [GitHub Issues](https://github.com/ChaindocIO/server-sdk/issues)
- [Email Support](mailto:support@chaindoc.io)

---

Made with ❤️ by the [Chaindoc](https://chaindoc.io) team
