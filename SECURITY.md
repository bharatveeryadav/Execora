# Security Policy

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report security issues privately with:

- A clear description of impact
- Reproduction steps
- Affected files/endpoints
- Suggested fix (if available)

Until a dedicated security contact address is published, use your standard private maintainer channel for this repository.

## Security Baseline

- Use strong secrets in production (`JWT_SECRET`, admin/API keys, provider tokens)
- Restrict CORS in production
- Enforce authentication on protected API and WebSocket paths
- Validate webhook signatures for external providers
- Monitor logs and metrics for abuse patterns

Reference implementation and hardening notes are in:

- `docs/README.md`
