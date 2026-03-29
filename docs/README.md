# Execora Documentation

Docs are organised into **domain folders**. Each domain has one `MASTER.md` as the canonical entry point, with feature subfolders for detail.

---

## Domain Entry Points

| Domain | MASTER | Purpose |
|--------|--------|---------|
| **Backend** | [backend/MASTER.md](backend/MASTER.md) | API, services, DB schema, billing/GST |
| **Web** | [web/MASTER.md](web/MASTER.md) | React frontend, pages, components |
| **Mobile** | [mobile/MASTER.md](mobile/MASTER.md) | React Native + Expo, screens, sprints |
| **Infrastructure** | [infra/MASTER.md](infra/MASTER.md) | Docker, monitoring, CI/CD, security |
| **Product** | [product/RESEARCH_MASTER.md](product/RESEARCH_MASTER.md) | Strategy, PRD, research, kirana market |

---

## Task Ledgers (root-level)

- [TASKS_PENDING.md](TASKS_PENDING.md) — active backlog
- [TASKS_COMPLETED.md](TASKS_COMPLETED.md) — completed work log
- [DOCS_FLOW.md](DOCS_FLOW.md) — governance rules

---

## Backend Subfolders

| Folder | Contents |
|--------|----------|
| [backend/billing/](backend/billing/) | GST docs, invoice requirements, compliance audit, QR/barcode |
| [backend/inventory/](backend/inventory/) | Inventory sprint plan, stock research |
| [backend/auth/](backend/auth/) | Auth flows, JWT, role middleware |
| [backend/api/](backend/api/) | OpenAPI spec, REST API reference |
| [backend/architecture/](backend/architecture/) | System architecture diagrams |

## Infra Subfolders

| Folder | Contents |
|--------|----------|
| [infra/monitoring/](infra/monitoring/) | Prometheus, Loki, Grafana, logging guide |
| [infra/ops/](infra/ops/) | Commands cheat sheet, troubleshooting, env mgmt |
| [infra/cicd/](infra/cicd/) | GitHub Actions setup |
| [infra/production/](infra/production/) | Deployment SOP, launch checklist, production strategy |
| [infra/security/](infra/security/) | Security hardening guide |

## Other Folders

| Folder | Contents |
|--------|----------|
| [testing/](testing/) | Testing guide, regression testing |
| [implementation/](implementation/) | Developer guide, implementation details |
| [archive/](archive/) | Immutable historical docs — do not edit |

---

## Archive Policy

- All historical and merged docs live in [archive/legacy/](archive/legacy/)
- Archive content is **immutable** — never edited for active work
- Files not in a domain folder (and not explicitly kept at root) are candidates for archive
