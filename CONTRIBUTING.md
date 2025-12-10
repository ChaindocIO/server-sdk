# Contributing to Chaindoc Server SDK

Thank you for your interest in contributing to the Chaindoc Server SDK! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [GitHub Issues](https://github.com/ChaindocIO/server-sdk/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - SDK version and Node.js version
   - Code samples (if applicable)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the "feature request" label
3. Describe the feature and its use case
4. Explain why it would benefit other users

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests and linting: `npm run typecheck && npm run lint`
5. Commit with a clear message
6. Push to your fork
7. Create a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/ChaindocIO/server-sdk.git
cd server-sdk
npm install
```

### Scripts

| Script          | Description                    |
| --------------- | ------------------------------ |
| `npm run build` | Build the SDK                  |
| `npm run dev`   | Build with watch mode          |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint`  | Run ESLint                     |
| `npm run test`  | Run tests                      |

### Project Structure

```
src/
├── index.ts          # Entry point and exports
├── chaindoc.ts       # Main SDK class
├── client.ts         # HTTP client with retry logic
├── types/
│   └── index.ts      # TypeScript type definitions
└── modules/
    ├── documents.ts  # Documents API
    ├── signatures.ts # Signatures API
    ├── embedded.ts   # Embedded sessions
    ├── media.ts      # Media upload
    └── kyc.ts        # KYC integration
```

## Code Style

### TypeScript

- Use strict TypeScript
- Export all public types
- Document public APIs with JSDoc comments
- Prefer `interface` over `type` for object shapes

### Naming Conventions

- **Files**: kebab-case (`my-module.ts`)
- **Classes**: PascalCase (`MyClass`)
- **Functions/Variables**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`MyInterface`)

### Code Guidelines

- Keep functions small and focused
- Handle errors explicitly
- Write self-documenting code
- Avoid any types when possible

## Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(documents): add batch upload support
fix(client): handle timeout errors correctly
docs(readme): update installation instructions
```

## Testing

### Running Tests

```bash
npm run test
```

### Writing Tests

- Place tests next to source files or in `__tests__` directory
- Use descriptive test names
- Cover edge cases and error scenarios
- Mock external dependencies

## Documentation

When adding new features:

1. Update JSDoc comments in source code
2. Update [API_REFERENCE.md](docs/API_REFERENCE.md) if adding new public APIs
3. Add examples to [GETTING_STARTED.md](docs/GETTING_STARTED.md) if applicable
4. Update [ADVANCED_USAGE.md](docs/ADVANCED_USAGE.md) for complex features

## Release Process

Releases are managed by the Chaindoc team. Contributors don't need to update version numbers.

## Questions?

- Open a [GitHub Discussion](https://github.com/ChaindocIO/server-sdk/discussions)
- Email: dev@chaindoc.io

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
