# Getting Started with Chaindoc Server SDK

This guide walks you through setting up the Chaindoc Server SDK and creating your first document signing workflow.

---

## Prerequisites

- [ ] Node.js 18 or higher
- [ ] Chaindoc account with API access
- [ ] Secret API key (`sk_live_...` or `sk_test_...`)

---

## Step 1: Install the SDK

```bash
npm install @chaindoc_io/server-sdk
```

---

## Step 2: Initialize the SDK

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});
```

> **Security:** Never commit your secret key. Use environment variables.

---

## Step 3: Verify Connection

```typescript
const health = await chaindoc.healthCheck();

if (health.status === "ok" && health.apiKeyValid) {
  console.log("Connected to Chaindoc API");
} else {
  console.error("Connection failed");
}
```

---

## Step 4: Upload a Document

```typescript
import { readFile } from "fs/promises";

// Read file from disk
const buffer = await readFile("./contract.pdf");
const file = new Blob([buffer], { type: "application/pdf" });

// Upload to Chaindoc
const { media } = await chaindoc.media.upload([file]);

console.log("Uploaded:", media[0].url);
```

---

## Step 5: Create a Document Record

```typescript
const doc = await chaindoc.documents.create({
  name: "Service Agreement",
  description: "Contract for consulting services",
  media: media[0],
  status: "published", // Triggers blockchain verification
  hashtags: ["#contract", "#2024"],
  meta: [
    { key: "client", value: "Acme Corp" },
    { key: "value", value: "$50,000" },
  ],
});

console.log("Document ID:", doc.documentId);
console.log("Version UUID:", doc.document.versions[0].uuid);
```

---

## Step 6: Create a Signature Request

```typescript
const sigRequest = await chaindoc.signatures.createRequest({
  versionId: doc.document.versions[0].uuid,
  recipients: [{ email: "john@acme.com" }, { email: "jane@partner.com" }],
  deadline: new Date("2024-12-31"),
  message: "Please review and sign this agreement",
  embeddedFlow: true, // Enable embedded signing
});

console.log("Request ID:", sigRequest.signatureRequest.uuid);
```

---

## Step 7: Create Embedded Session for Frontend

```typescript
// For each signer, create a session
const session = await chaindoc.embedded.createSession({
  email: "john@acme.com",
  metadata: {
    documentId: doc.documentId,
    signatureRequestId: sigRequest.signatureRequest.uuid,
    returnUrl: "https://yourapp.com/signed",
  },
});

// Return this to your frontend
console.log("Session ID:", session.sessionId);
```

---

## Step 8: Track Signing Progress

```typescript
const status = await chaindoc.signatures.getRequestStatus(
  sigRequest.signatureRequest.uuid
);

console.log(`Signed: ${status.signedCount}/${status.totalSigners}`);

if (status.isCompleted) {
  console.log("All signatures collected!");
}
```

---

## Complete Express.js Example

```typescript
// server.ts
import express from "express";
import { Chaindoc, ChaindocError } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";
import multer from "multer";

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

// Upload and create document
app.post("/api/documents", upload.single("file"), async (req, res) => {
  try {
    const file = new Blob([req.file!.buffer], { type: req.file!.mimetype });
    const { media } = await chaindoc.media.upload([file]);

    const doc = await chaindoc.documents.create({
      name: req.body.name,
      description: req.body.description || "",
      media: media[0],
      status: "published",
      hashtags: req.body.hashtags || [],
      meta: req.body.meta || [],
    });

    res.json({ documentId: doc.documentId });
  } catch (error) {
    handleError(res, error);
  }
});

// Create signature request
app.post("/api/documents/:id/signature-request", async (req, res) => {
  try {
    const { versionId, recipients, deadline } = req.body;

    const sigRequest = await chaindoc.signatures.createRequest({
      versionId,
      recipients: recipients.map((email: string) => ({ email })),
      deadline: new Date(deadline),
      embeddedFlow: true,
    });

    res.json({ requestId: sigRequest.signatureRequest.uuid });
  } catch (error) {
    handleError(res, error);
  }
});

// Create embedded session for signer
app.post("/api/signing/session", async (req, res) => {
  try {
    const { email, documentId, signatureRequestId } = req.body;

    const session = await chaindoc.embedded.createSession({
      email,
      metadata: { documentId, signatureRequestId },
    });

    res.json({ sessionId: session.sessionId });
  } catch (error) {
    handleError(res, error);
  }
});

// Check signature status
app.get("/api/signature-requests/:id/status", async (req, res) => {
  try {
    const status = await chaindoc.signatures.getRequestStatus(req.params.id);
    res.json(status);
  } catch (error) {
    handleError(res, error);
  }
});

function handleError(res: express.Response, error: unknown) {
  if (error instanceof ChaindocError) {
    res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.statusCode,
    });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

## Next.js API Routes Example

```typescript
// app/api/signing/create-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Chaindoc, ChaindocError } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { email, documentId, signatureRequestId } = await request.json();

    const session = await chaindoc.embedded.createSession({
      email,
      metadata: {
        documentId,
        signatureRequestId,
      },
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof ChaindocError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## Error Handling

Always wrap API calls in try-catch:

```typescript
import { ChaindocError } from "@chaindoc_io/server-sdk";

try {
  const doc = await chaindoc.documents.create({
    /* ... */
  });
} catch (error) {
  if (error instanceof ChaindocError) {
    console.error("API Error:", error.message);
    console.error("Status Code:", error.statusCode);
    console.error("Response:", error.response);

    // Handle specific errors
    switch (error.statusCode) {
      case 400:
        // Bad request - check parameters
        break;
      case 401:
        // Unauthorized - check API key
        break;
      case 404:
        // Not found - resource doesn't exist
        break;
      case 429:
        // Rate limited - SDK will auto-retry
        break;
    }
  }
}
```

---

## Environment Configuration

The SDK supports three environments:

| Environment   | API URL                                |
| ------------- | -------------------------------------- |
| `production`  | `https://api.chaindoc.io` (default)    |
| `staging`     | `https://api-dev-chaindoc.idealogic.dev` |
| `development` | `https://api-dev-chaindoc.idealogic.dev` |

### Development

```typescript
const chaindoc = new Chaindoc({
  secretKey: "sk_test_xxxxxxxxxxxxx",
  environment: "development",
});
```

### Staging

```typescript
const chaindoc = new Chaindoc({
  secretKey: "sk_test_xxxxxxxxxxxxx",
  environment: "staging",
});
```

### Production

```typescript
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
  // environment defaults to 'production'
});
```

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Embed SDK](../../chaindoc-websdk-core/docs/API_REFERENCE.md)** - Frontend integration
- **[Framework Guides](../../chaindoc-websdk-core/docs/FRAMEWORK_GUIDES.md)** - React, Vue, Angular

---

## Support

Need help?

- **Documentation**: [docs.chaindoc.io](https://docs.chaindoc.io)
- **GitHub Issues**: [Report a bug](https://github.com/chaindoc-io/chaindoc-websdk-server-sdk/issues)
- **Email**: support@chaindoc.io
