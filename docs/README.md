# Execora Documentation

> Last updated: March 12, 2026  
> Active docs: 33 · Archived: 16

---

## Codebase Structure

```
apps/
  api/          Fastify backend API
  web/          React/Vite desktop web app
  mobile/       Expo/React Native Android-first app
  worker/       Background job worker
packages/
  shared/       Shared business logic, types, API client
  infrastructure/
  modules/
  types/
prisma/         Database schema + migrations
monitoring/     Prometheus, Grafana, Loki config
```

---

## Start Here

| Doc                                                    | Purpose                        |
| ------------------------------------------------------ | ------------------------------ |
| [../README.md](../README.md)                           | Project overview               |
| [../START_HERE.md](../START_HERE.md)                   | Onboarding guide               |
| [QUICKSTART.md](QUICKSTART.md)                         | Local setup steps              |
| [AGENT_CODING_STANDARDS.md](AGENT_CODING_STANDARDS.md) | Coding standards for this repo |

---

## Architecture

| Doc                                                          | Purpose                         |
| ------------------------------------------------------------ | ------------------------------- |
| [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | System architecture overview    |
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)           | Product requirements (PRD v2.6) |
| [PRODUCTION_READINESS_SOP.md](PRODUCTION_READINESS_SOP.md)   | Production readiness checklist  |

---

## API & Auth

| Doc                      | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| [api/API.md](api/API.md) | REST API reference                            |
| [AUTH.md](AUTH.md)       | Authentication architecture (admin key + JWT) |

---

## Features

| Doc                                                                        | Purpose                          |
| -------------------------------------------------------------------------- | -------------------------------- |
| [FEATURES.md](FEATURES.md)                                                 | Feature overview                 |
| [features/AUDIO_INTEGRATION.md](features/AUDIO_INTEGRATION.md)             | Audio / STT / TTS integration    |
| [features/CONVERSATION_MEMORY.md](features/CONVERSATION_MEMORY.md)         | Conversation memory architecture |
| [features/ERROR_HANDLING.md](features/ERROR_HANDLING.md)                   | Error handling patterns          |
| [features/INDIAN_FUZZY_MATCHING.md](features/INDIAN_FUZZY_MATCHING.md)     | Hindi/Devanagari fuzzy matching  |
| [features/LLM_BASED_CACHING_GUIDE.md](features/LLM_BASED_CACHING_GUIDE.md) | LLM response caching             |
| [features/MULTITASK_REALTIME.md](features/MULTITASK_REALTIME.md)           | Multi-task parallel execution    |

---

## Development

| Doc                                                                                  | Purpose                 |
| ------------------------------------------------------------------------------------ | ----------------------- |
| [implementation/DEVELOPER_GUIDE.md](implementation/DEVELOPER_GUIDE.md)               | Developer onboarding    |
| [implementation/IMPLEMENTATION_DETAILS.md](implementation/IMPLEMENTATION_DETAILS.md) | Implementation patterns |

---

## Testing

| Doc                                                            | Purpose                    |
| -------------------------------------------------------------- | -------------------------- |
| [testing/README.md](testing/README.md)                         | Testing overview           |
| [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md)           | Test setup and commands    |
| [testing/REGRESSION_TESTING.md](testing/REGRESSION_TESTING.md) | Regression test procedures |

---

## Deployment & CI/CD

| Doc                                                                                  | Purpose                        |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| [DEPLOYMENT.md](DEPLOYMENT.md)                                                       | Docker deployment guide        |
| [cicd/GITHUB_ACTIONS_SETUP.md](cicd/GITHUB_ACTIONS_SETUP.md)                         | CI/CD pipeline setup           |
| [production/PRODUCTION_STRATEGY.md](production/PRODUCTION_STRATEGY.md)               | Production deployment strategy |
| [production/PRODUCTION_DASHBOARD_GUIDE.md](production/PRODUCTION_DASHBOARD_GUIDE.md) | Grafana dashboard setup        |

---

## Monitoring & Observability

| Doc                                                                      | Purpose                      |
| ------------------------------------------------------------------------ | ---------------------------- |
| [monitoring/README.md](monitoring/README.md)                             | Monitoring overview          |
| [monitoring/LOGGING_GUIDE.md](monitoring/LOGGING_GUIDE.md)               | Logging setup and patterns   |
| [monitoring/METRICS_SETUP.md](monitoring/METRICS_SETUP.md)               | Prometheus metrics config    |
| [monitoring/OBSERVABILITY_ACCESS.md](monitoring/OBSERVABILITY_ACCESS.md) | Grafana/Prometheus/Loki URLs |

---

## Operations

| Doc                                                              | Purpose                       |
| ---------------------------------------------------------------- | ----------------------------- |
| [ops/README.md](ops/README.md)                                   | Ops overview                  |
| [ops/COMMANDS_REFERENCE.md](ops/COMMANDS_REFERENCE.md)           | Command reference             |
| [ops/ENVIRONMENT_MANAGEMENT.md](ops/ENVIRONMENT_MANAGEMENT.md)   | Environment variables         |
| [ops/QUICK_CHEAT_SHEET.md](ops/QUICK_CHEAT_SHEET.md)             | Daily commands cheat sheet    |
| [ops/TAILSCALE_PUBLIC_ACCESS.md](ops/TAILSCALE_PUBLIC_ACCESS.md) | Tailscale public access setup |
| [ops/TROUBLESHOOTING.md](ops/TROUBLESHOOTING.md)                 | Troubleshooting guide         |

---

## Security

| Doc                                                                          | Purpose                      |
| ---------------------------------------------------------------------------- | ---------------------------- |
| [security/README.md](security/README.md)                                     | Security overview            |
| [security/SECURITY_HARDENING_GUIDE.md](security/SECURITY_HARDENING_GUIDE.md) | Security hardening checklist |

---

## Archive

Historical docs that are no longer current but kept for reference:

- [archive/](archive/) — Old audits, migration plans, cleanup records
- [archive/audit/](archive/audit/) — Point-in-time audit snapshots (pre-monorepo)

---

## Scripts

- Manual test scripts: [../scripts/manual-tests/](../scripts/manual-tests/)
- Test runners: [../scripts/testing/](../scripts/testing/)
