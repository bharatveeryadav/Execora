# Platform Packaging and Entitlements

## Purpose

This document defines how Execora should package products, plans, add-ons, and feature access in one shared platform layer.

## Platform Responsibilities

Platform exists so all products can run on one backend with different access levels, branding, and navigation.

Platform owns:

- pricing plans
- subscriptions
- usage limits and quotas
- feature toggles and product manifests
- AI feature toggles and AI add-on controls
- add-ons and industry packs
- sync policy and device conflict rules
- runtime access resolution for API, web, mobile, and future desktop

## Product Manifest Rules

Products are manifest-driven overlays.

- manifests configure enablement only
- manifests do not hold business calculations
- backend, web, mobile, and desktop use the same manifest semantics
- cross-cutting features such as OCR and e-invoicing are entitlements or add-ons
- AI capabilities are separate toggleable modules and must not be embedded into core product logic without explicit platform control

## Commercial Model

`Platform Plan -> included products and limits -> add-ons and industry packs -> resolved entitlements`

### Design Principles

- core operational value should not be artificially withheld
- industry behavior should be sold as a pack, not as a code fork
- metering should be predictable and visible
- upgrades should feel operationally meaningful, not just quota bumps

## Plan Tiers

- free
- solo
- business
- pro
- scale
- enterprise

## Included Product Strategy

Every plan resolves the same entitlement object used everywhere.

`plan + addOns + industryPacks -> resolvedCapabilities`

The backend should make access decisions from this object. Clients should only render based on it.

## Industry Packs

Industry packs enable specialized behavior on top of shared domains.

- pharmacy
- grocery
- restaurant
- jewellery
- apparel

Each industry pack should unlock:

- product-specific fields
- API validation rules
- specialized reports
- workflow automations

## AI Add-On Strategy

AI capabilities should be packaged as separately controllable platform features.

Recommended AI toggle groups:

- aiAssistant
- voiceAssistant
- aiDocumentExtraction
- aiAutofill
- aiInsights

Rules:

- AI toggles can be enabled or disabled per tenant
- AI toggles can be bundled by plan or sold as add-ons
- AI toggles must be enforced at API boundary, not only in UI
- core workflows must still work when every AI toggle is off

## Required Entitlement Model

Every tenant session should resolve one platform contract containing:

- plan ID
- businesses, users, CA seats, counters
- enabled products
- industry packs
- hard limits such as documents, OCR volume, messaging credits, storage
- feature flags such as e-invoice, multi-godown, recurring billing, custom reports, SSO
- AI feature flags such as assistant, voice, extraction, autofill, and insights
- support tier
- active add-ons

## Engineering Rules

- industry packs are checked at API boundary, not just in UI
- AI packs and AI feature toggles are checked at API boundary, not just in UI
- all upgrades and downgrades emit a subscription-changed event
- downgrade enforcement should move over-limit resources to read-only after grace handling
- promo overrides must be time-boxed and auditable

## Packaging Strategy for Multiple Product Experiences

To support a Vyapar-like general product and a Petpooja-like restaurant product on one backend:

- keep one shared backend runtime
- use product manifests to expose Billing, Invoicing, POS, Accounting, Inventory
- use the restaurant pack to enable table, KOT, service-mode, and kitchen workflows
- allow separate app shells and branding without creating backend forks

## Runtime Resolution Model

The platform layer must resolve entitlements once and share them across all surfaces.

Recommended resolution order:

1. read subscription plan
2. merge add-ons and industry packs
3. apply valid promotional overrides
4. return resolved entitlements
5. cache per tenant session and invalidate on subscription change
