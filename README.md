# @chaindoc_io/server-sdk

**Server-side SDK for Chaindoc API - document management, signatures, and embedded sessions.**

[![npm version](https://img.shields.io/npm/v/@chaindoc_io/server-sdk.svg)](https://www.npmjs.com/package/@chaindoc_io/server-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm install @chaindoc_io/server-sdk
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

## Full Example: Document Signing Flow

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

// 2. Create document
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
  // isKycRequired: true, // Enable KYC verification
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

## API Reference

### Chaindoc

```typescript
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx", // Required
  environment: "production", // Optional: 'production' | 'staging' | 'development'
  timeout: 30000, // Optional, default: 30000ms
});
```

### Environments

| Environment   | API URL                                |
| ------------- | -------------------------------------- |
| `production`  | `https://api.chaindoc.io` (default)    |
| `staging`     | `https://api-dev-chaindoc.idealogic.dev` |
| `development` | `https://api-dev-chaindoc.idealogic.dev` |

### Documents

```typescript
// Create document
await chaindoc.documents.create({
  name: string;
  description: string;
  media: Media;
  hashtags: string[];
  status: 'draft' | 'published';
  meta?: MetaTag[];
  isForSigning?: boolean;
  accessType?: 'private' | 'public' | 'restricted';
  accessEmails?: AccessEmail[];
  accessRoles?: AccessRole[];
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
  recipients: Recipient[];      // [{ email, shareToken? }]
  deadline: Date;
  message?: string;
  embeddedFlow?: boolean;       // true for embedded signing
  isKycRequired?: boolean;      // Validate KYC via shareToken
  meta?: MetaTag[];
});

// Get request status
await chaindoc.signatures.getRequestStatus(requestId);

// Get all requests
await chaindoc.signatures.getMyRequests({ pageNumber: 1, pageSize: 10 });

// Sign document (if API key owner is signatory)
await chaindoc.signatures.sign({
  requestId: string;
  signatureId: number;
});

// Get user's signatures
await chaindoc.signatures.getSignatures();
```

### Embedded Sessions

```typescript
// Create session (sends OTP to email)
await chaindoc.embedded.createSession({
  email: 'signer@example.com',
  metadata: {
    documentId: string;          // Required
    signatureRequestId?: string;
    returnUrl?: string;
    [key: string]: unknown;
  },
});

// Response includes sessionId for frontend SDK
```

### Media

```typescript
// Upload files
const { media } = await chaindoc.media.upload([file1, file2]);

// Use media[0] when creating documents
```

### KYC

```typescript
// Share KYC data (for pre-verification)
await chaindoc.kyc.share({
  email: "user@example.com",
  shareToken: "sumsub_share_token", // Optional
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

## Requirements

- Node.js 18+ (uses native fetch)
- Secret API key (sk_xxx) from Chaindoc

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- GitHub Issues: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- Documentation: https://chaindoc.io/docs

---

Made with ❤️ by the Chaindoc team
