# 🚀 CI/CD Documentation

This directory contains CI/CD pipeline setup, GitHub Actions workflows, and deployment automation.

## Contents

- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** (Complete Reference)
  - GitHub Actions workflow setup
  - 5 production workflows:
    - `ci.yml` - Testing & linting on every PR
    - `deploy.yml` - Production deployment
    - `staging.yml` - Staging environment
    - `backup.yml` - Daily database backups
    - `load-test.yml` - Weekly performance testing
  - Environment secrets configuration
  - Troubleshooting guide

- **[CICD_QUICK_START.md](CICD_QUICK_START.md)** (15-Minute Setup)
  - Quick setup for GitHub Actions
  - Essential configuration
  - First deployment walkthrough
  - Common issues and fixes

## Workflow Overview

### Continuous Integration (on every PR)
- TypeScript compilation check
- ESLint validation
- Unit tests
- Integration tests

### Staging Deployment (on `staging` branch)
- Build Docker image
- Push to registry
- Deploy to staging
- Run smoke tests

### Production Deployment (manual via workflow dispatch)
- Build and test
- Push to production registry
- Deploy to production
- Health checks
- Rollback on failure

### Maintenance
- Daily database backups to S3
- Weekly load testing
- Automated performance reports

## Quick Links

- **Setup Guide:** [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- **Quick Start:** [CICD_QUICK_START.md](CICD_QUICK_START.md)
- **Environment Setup:** [../ops/ENVIRONMENT_MANAGEMENT.md](../ops/ENVIRONMENT_MANAGEMENT.md)
- **Production Strategy:** [../production/README.md](../production/README.md)

---

Generated: February 2025
