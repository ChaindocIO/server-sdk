# Getting Started with Chaindoc Server SDK

> Upgrading from 2.x? See [MIGRATION.md](../MIGRATION.md).

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

A file becomes a text document by **conversion**: upload it into Storage in chunks and start the conversion in one call.
The answer is `202` with a conversion; wait for it (or subscribe to `document.conversion.completed`).

```typescript
import { readFile } from "fs/promises";

const file = new Blob([await readFile("./contract.pdf")], { type: "application/pdf" });

const { conversion } = await chaindoc.documents.createFromFile(
  file,
  { name: "Service Agreement", description: "Contract for consulting services" },
  { filename: "contract.pdf" },
);

// Polls with backoff; throws ChaindocConversionFailedError / ChaindocConversionTimeoutError
const ready = await chaindoc.conversions.wait(conversion.id);

console.log("Document ID:", ready.documentId);
```

A document made from a file always lands as a draft. To make a text yourself, pass `content` to `documents.create`
(see the README).

---

## Step 5: Give the Text Its Signer Roles

Signature places are chips in the text. A converted text has none yet: add a role per signer, each with its Signature and
Date signed chips. The answer is the new version, which holds them.

```typescript
const { versionId } = await chaindoc.documents.addSignatureBlock(ready.documentId, {
  roles: [
    { key: "client", name: "Client" },
    { key: "provider", name: "Provider" },
  ],
});

// A text that already holds roles: read them
const { roles } = await chaindoc.documents.getContent(ready.documentId); // roles[].key
```

---

## Step 6: Create a Signature Request

Each recipient is bound to a role of the text (`recipients[].role`); every role stands for exactly one recipient.

```typescript
const sigRequest = await chaindoc.signatures.createRequest({
  versionId,
  recipients: [
    { email: "john@acme.com", role: "client" },
    { email: "jane@partner.com", role: "provider" },
  ],
  deadline: new Date("2027-12-31"),
  message: "Please review and sign this agreement",
  embeddedFlow: true, // Enable embedded signing
});

console.log("Request ID:", sigRequest.requestId);
```

---

## Step 7: Create Embedded Session for Frontend

```typescript
// For each signer, create a session
const session = await chaindoc.embedded.createSession({
  email: "john@acme.com",
  metadata: {
    documentId: ready.documentId,
    signatureRequestId: sigRequest.requestId,
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
  sigRequest.requestId
);

console.log(`Signed: ${status.signedCount}/${status.totalSigners}`);

if (status.isCompleted) {
  console.log("All signatures collected!");
}
```

---

## Step 9: Render a Published Template

If your team already manages templates in the Chaindoc app, you can use the
published template UUID directly from the API:

```typescript
const draftDocument = await chaindoc.templates.createDocument("template_uuid", {
  documentName: "Generated NDA",
  documentDescription: "Rendered from the legal team's published template",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
});

console.log("Document ID:", draftDocument.documentId);
```

To render and immediately create a signature request:

```typescript
const signingFlow = await chaindoc.templates.sendForSigning("template_uuid", {
  documentName: "Generated NDA",
  documentDescription: "Ready for external signature",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
  slotAssignments: [{ signerKey: "party_a", email: "john@acme.com" }],
  deadline: new Date("2027-12-31"),
});

console.log("Signature Request ID:", signingFlow.requestId);
```

For contract-backed template flows:

```typescript
const templateContract = await chaindoc.templates.createContract("template_uuid", {
  title: "Generated MSA",
  description: "Contract rendered from a published template",
  variables: {
    company_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
  contragent: {
    email: "jane@partner.com",
    name: "Partner Corp",
  },
  slotAssignments: [
    { signerKey: "party_a", role: "business" },
    { signerKey: "party_b", role: "contragent" },
  ],
  deadline: new Date("2027-12-31"),
});

console.log("Contract ID:", templateContract.contractId);
console.log("Signing Request ID:", templateContract.signingRequestId);
```

---

## Step 10: Add Billing to an Active Contract

Once a contract becomes `active`, you can create invoices and inspect payment transactions:

```typescript
const invoice = await chaindoc.invoices.create("contract_uuid", {
  title: "April Retainer",
  amount: "1500.00",
  dueDate: "2026-04-30T00:00:00.000Z",
});

const invoiceId = invoice.invoiceId ?? invoice.invoice.id;

await chaindoc.invoices.send("contract_uuid", invoiceId, {
  autoCharge: false,
});

await chaindoc.invoices.charge("contract_uuid", invoiceId);

const transactions = await chaindoc.transactions.listByContract("contract_uuid");

console.log(transactions.transactions.map((transaction) => transaction.status));
```

If you settle an invoice outside Chaindoc, use `markPaid()` instead of `charge()`:

```typescript
await chaindoc.invoices.markPaid("contract_uuid", invoiceId, {
  note: "Wire received on bank account",
  paidAt: new Date().toISOString(),
});
```

---

## Step 11: Verify Webhooks Before Processing

Use the built-in helper instead of hand-rolling HMAC logic:

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const verification = Chaindoc.webhooks.verify(
  rawBody,
  req.headers["x-chaindoc-signature"] as string,
  req.headers["x-chaindoc-timestamp"] as string,
  process.env.CHAINDOC_WEBHOOK_SECRET!
);

if (!verification.valid || !verification.envelope) {
  throw new Error("Invalid webhook delivery");
}

switch (verification.envelope.type) {
  case "contract.signed":
  case "invoice.created":
  case "invoice.sent":
  case "invoice.paid":
  case "transaction.created":
  case "transaction.updated":
    console.log(verification.envelope.data);
    break;
}
```

---

## Complete Express.js Example

```typescript
// server.ts
import express from "express";
import { Chaindoc, ChaindocError } from "@chaindoc_io/server-sdk";
import multer from "multer";

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

// Upload a file: it is converted into a text document (202); the client polls the conversion
app.post("/api/documents", upload.single("file"), async (req, res) => {
  try {
    const file = new Blob([req.file!.buffer], { type: req.file!.mimetype });
    const { conversion } = await chaindoc.documents.createFromFile(
      file,
      { name: req.body.name, description: req.body.description || undefined },
      { filename: req.file!.originalname },
    );

    res.status(202).json({ conversionId: conversion.id });
  } catch (error) {
    handleError(res, error);
  }
});

// Where a conversion stands: `ready` carries the documentId
app.get("/api/conversions/:id", async (req, res) => {
  try {
    const { conversion } = await chaindoc.conversions.get(req.params.id);
    res.json(conversion);
  } catch (error) {
    handleError(res, error);
  }
});

// Give the text its signer roles, then send it: recipients = [{ email, role }]
app.post("/api/documents/:id/signature-request", async (req, res) => {
  try {
    const { roles, recipients, deadline } = req.body;

    const { versionId } = await chaindoc.documents.addSignatureBlock(req.params.id, {
      roles, // [{ key: "client", name: "Client" }, ...]
    });

    const sigRequest = await chaindoc.signatures.createRequest({
      versionId,
      recipients,
      deadline: new Date(deadline),
      embeddedFlow: true,
    });

    res.json({ requestId: sigRequest.requestId });
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
      errorKey: error.errorKey,
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

## Base URL

The SDK calls the production API, `https://api.chaindoc.io`, unless you pass `baseUrl`. A key works only against the
backend that issued it: to call a non-production backend, pass its base URL (and a key issued there) as `baseUrl`.

`environment` is **deprecated and switches nothing**: `production`, `staging` and `development` all call
`https://api.chaindoc.io`, the production API, with your key (earlier docs pointed `staging` and `development` at a demo
host that no longer answers). Remove `environment` from your config, or keep it — it has no effect.

### Production (default)

```typescript
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});
```

### Another backend

```typescript
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!, // a key issued by that backend
  baseUrl: process.env.CHAINDOC_API_BASE_URL!,
});
```

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Advanced Usage](./ADVANCED_USAGE.md)** - Workflows, webhooks, and best practices
- **[Embed SDK](https://www.npmjs.com/package/@chaindoc_io/embed-sdk)** - Frontend integration

---

## Support

Need help?

- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Email**: support@chaindoc.io
