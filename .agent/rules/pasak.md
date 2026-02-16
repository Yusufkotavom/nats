---
trigger: model_decision
---

---
description: Design Guidelines for Developing Module 
---
- Do not make new manual type, always infers prisma generated type or prisma function return type if you need data definition that interact with database
- Dont reinvent the wheel, use existing general function in lib/utils if needed
- When you make Table, always include pagination
- Do not import @prisma/client instead of "@/prisma/generated/prisma/client" when code run in server side, and "@/prisma/generated/prisma/browser" when in browser
- Consider the permission for each action or in view using lib/permission.ts
- STRICTLY,, do not modify files in prisma/generated/\*
- use prisma cli 7
- if you need to run node js, make sure execute ""nvm use 24.11.0"
- Use tan stack query for handling data fetching and state management

## Security & Integrity (Post-Audit Standards)
- **Ledger Integrity**: For any operation that affects the General Ledger (Invoices, Payments, Journals), you MUST use `JournalService` (`@/lib/accounting/journal-service`). NEVER manually create `JournalEntry` records or update account balances directly.
- **Input Validation**: All Server Actions MUST validate input using Zod schemas. Define reusable schemas in `@/lib/validation/schemas.ts`.
- **Financial Precision**: ALWAYS use `Decimal.js` for financial calculations to prevent floating-point errors. Use `CalculationService` (`@/lib/utils/calculation-service`) for standardized tax, discount, and total calculations. NEVER use JavaScript's native `number` for currency math.
- **Authorization**: Ensure all server actions are wrapped with `authorizedAction` to enforce permission checks.
