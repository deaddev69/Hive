# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Hive, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **support@hivenow.in**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: Within 30 days for critical issues

## Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- Data exposure or leakage
- Payment processing vulnerabilities
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Injection vulnerabilities
- Secrets or credentials in source code

## Out of Scope

- Issues in third-party services (Clerk, Convex, Razorpay) — report to those vendors directly
- Social engineering attacks
- Denial of service attacks
- Issues requiring physical access

## Recognition

We appreciate responsible disclosure and will acknowledge security researchers who report valid vulnerabilities (with your permission).

## Supported Versions

| Version | Supported |
|---|---|
| Latest on `main` | ✅ |
| Older releases | ❌ |
