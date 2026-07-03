# Contributing to Hive

Thank you for your interest in contributing to Hive! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/hive-platform.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Set up environment variables (see [README.md](README.md#setup))

## Development Workflow

### Branch Naming

- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring

### Before Submitting a PR

1. **Run type checking**: `npm run typecheck`
2. **Run linting**: `npm run lint`
3. **Run the build**: `npm run build`
4. **Test your changes** in both the customer and admin apps

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add product search filtering by category
fix: resolve cart quantity update race condition
docs: update environment variable documentation
refactor: extract payment validation into shared utility
```

## Code Style

- **TypeScript** is required for all source files
- **Tailwind CSS** for styling — use the design tokens from `@hive/ui`
- **Convex** conventions for backend functions — use validators for all arguments
- Keep files focused — prefer smaller, single-responsibility modules
- Use the shared packages (`@hive/types`, `@hive/ui`, `@hive/utils`) instead of duplicating logic

## Project Architecture

- `apps/customer/` — Customer-facing storefront
- `apps/admin/` — Seller Center and Admin Console
- `convex/` — All backend logic (schema, functions, webhooks)
- `packages/` — Shared code consumed by both apps

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Include screenshots for UI issues

## Code of Conduct

Be respectful, constructive, and inclusive. We are building something meaningful — let's do it together.
