# Purchase Invoice Sales Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Purchase Invoice` fully match `Sales Invoice` for persisted product selection, order-to-invoice product hydration, and responsive action/footer behavior.

**Architecture:** Extend `PurchaseInvoiceItem` with an optional product relation, route all purchase invoice persistence back through `PurchaseInvoiceService`, and align the purchase invoice form state/rendering with the existing sales invoice pattern. Keep the change minimal by updating existing types, services, tests, and form layout rather than introducing new modules.

**Tech Stack:** Next.js, React, TypeScript, Prisma, Vitest, Testing Library

---

### Task 1: Add purchase invoice product relation in schema and persistence tests

**Files:**
- Modify: `prisma/schema/06_purchasing.prisma`
- Create: `prisma/migrations/20260602113000_add_product_to_purchase_invoice_item/migration.sql`
- Modify: `modules/purchase/services/purchase-invoice.service.test.ts`

- [ ] Write failing tests for purchase invoice item `productId` persistence in service create/update.
- [ ] Run the targeted test file and confirm the new assertions fail for missing `productId` persistence.
- [ ] Update Prisma schema and service expectations so `PurchaseInvoiceItem` can store `productId`.
- [ ] Re-run the targeted test file and confirm it passes.

### Task 2: Align purchase invoice types, service, and actions with sales invoice

**Files:**
- Modify: `app/[locale]/(dashboard)/purchase/invoices/types.ts`
- Modify: `modules/purchase/services/purchase-invoice.service.ts`
- Modify: `app/[locale]/(dashboard)/purchase/invoices/actions.ts`

- [ ] Update `PurchaseInvoiceItemInput` to carry optional `productId`.
- [ ] Persist `productId` in purchase invoice service item mapping for create/update.
- [ ] Simplify purchase invoice actions to reuse `PurchaseInvoiceService.update/delete` like sales invoice.
- [ ] Run the targeted purchase invoice action/service tests.

### Task 3: Make purchase invoice form match sales invoice behavior

**Files:**
- Modify: `app/[locale]/(dashboard)/purchase/invoices/_components/purchase-invoice-form.tsx`
- Create: `app/[locale]/(dashboard)/purchase/invoices/_components/purchase-invoice-form.test.tsx`

- [ ] Write a failing component test covering product selection auto-fill behavior.
- [ ] Run the component test and confirm it fails before implementation.
- [ ] Update the form to store `productId`, hydrate from purchase order, and use `productId`-driven selection like sales invoice.
- [ ] Align item footer actions/summary layout with the sales invoice responsive pattern.
- [ ] Re-run the component test and confirm it passes.

### Task 4: Update docs and verify

**Files:**
- Modify: `docs/architecture.md`
- Modify: `CHANGELOG.md`

- [ ] Add a brief architecture note for purchase invoice product relation parity.
- [ ] Add a changelog entry with scope, summary, and impact.
- [ ] Run fresh verification commands for the touched test files, `pnpm typecheck`, and any required Prisma generation.
