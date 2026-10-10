# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
13. DATABASE RULES
==================================================

Before changing the database:

- Inspect the existing schema.
- Reuse existing tables where appropriate.
- Avoid duplicate data.
- Use proper indexes.
- Use constraints where appropriate.
- Maintain referential integrity.
- Consider migration/rollback implications.

Never casually delete or rename existing database fields.

==================================================
14. API RULES
==================================================

Every API should have:

- Clear endpoint naming
- Input validation
- Authentication where required
- Authorization where required
- Proper error handling
- Consistent response structure

Do not expose internal implementation details to clients.

Never trust client-provided authorization information.

==================================================
15. FRONTEND RULES
==================================================

Follow the existing design system.

Do not introduce random colors, fonts, spacing, or components.

Prioritize:

- Clear information hierarchy
- Responsive layout
- Loading states
- Empty states
- Error states
- Success states
- Accessibility
- Consistent interactions

For AI features, clearly show:

- What the AI is doing
- Current status
- Important evidence
- Confidence/risk where relevant
- Human review when required

Never make the UI imply certainty when the AI is uncertain.

==================================================
16. ERROR HANDLING
==================================================

Never silently ignore errors.

Handle:

- API failures
- Database failures
- LLM failures
- Tool failures
- Invalid input
- Timeouts
- Missing data
- Authentication failures

Give users meaningful messages.

For agents, recover when possible.

If recovery is impossible, stop safely and explain the reason.
