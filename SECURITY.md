# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **security@chaindoc.io**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### What to Expect

1. **Acknowledgment**: We will confirm receipt of your report
2. **Investigation**: Our team will investigate the issue
3. **Updates**: We will keep you informed of our progress
4. **Resolution**: We will work on a fix and coordinate disclosure
5. **Credit**: With your permission, we will credit you in our release notes

## Security Best Practices

When using the Chaindoc Server SDK:

### API Key Security

```typescript
// DO: Use environment variables
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

// DON'T: Hardcode API keys
const chaindoc = new Chaindoc({
  secretKey: "sk_live_xxxxx", // Never do this!
});
```

### Environment Variables

- Store API keys in environment variables
- Use `.env` files for local development (add to `.gitignore`)
- Use secrets management in production (AWS Secrets Manager, HashiCorp Vault, etc.)

### Key Rotation

- Rotate API keys periodically
- Rotate immediately if a key is compromised
- Use separate keys for development and production

### Network Security

- Always use HTTPS (SDK enforces this)
- Configure firewalls to allow only necessary outbound connections
- Use VPNs or private networks when possible

### Error Handling

```typescript
// DO: Handle errors without exposing sensitive data
try {
  await chaindoc.documents.create({ ... });
} catch (error) {
  if (error instanceof ChaindocError) {
    // Log internally with details
    logger.error('API Error', { statusCode: error.statusCode });

    // Return generic message to users
    return { error: 'Document creation failed' };
  }
}

// DON'T: Expose error details to end users
catch (error) {
  return { error: error.message, response: error.response }; // Exposes internals
}
```

### Input Validation

Always validate user input before passing to the SDK:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

const validated = schema.parse(userInput);
await chaindoc.embedded.createSession({ email: validated.email, ... });
```

## Vulnerability Disclosure Policy

We follow responsible disclosure practices:

1. **Private Disclosure**: Report vulnerabilities privately first
2. **Coordination**: We work with reporters to understand and fix issues
3. **Public Disclosure**: After a fix is available, we may publish an advisory
4. **Credit**: We credit reporters who follow responsible disclosure

## Contact

- **Security Issues**: security@chaindoc.io
- **General Questions**: support@chaindoc.io
- **GitHub**: [github.com/ChaindocIO/server-sdk](https://github.com/ChaindocIO/server-sdk)
