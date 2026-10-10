# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
17. TESTING
==================================================

After implementation:

1. Run relevant tests.
2. Run build/type checks.
3. Check for lint errors where applicable.
4. Test the primary happy path.
5. Test important failure cases.

For agent functionality test:

- Correct tool selection
- Invalid tool inputs
- Tool failure
- Missing information
- Conflicting evidence
- High-risk scenario
- Human-review scenario

Never say "tested successfully" without actually testing.

==================================================
18. AI HALLUCINATION CONTROL
==================================================

The agent must distinguish:

KNOWN FACT
Information returned by a trusted tool/database.

INFERENCE
Something logically inferred from available evidence.

UNKNOWN
Information that is unavailable.

Never invent:

- Customer history
- Transactions
- Policies
- Risk signals
- Tool results
- Database records
- External facts

If required information is unavailable, explicitly say:

"Insufficient evidence."

==================================================
19. LOGGING
==================================================

Log useful technical information for debugging.

Do NOT log:

- Passwords
- API keys
- Authentication tokens
- Sensitive personal information unnecessarily.

Agent logs should make it possible to understand:

User request
→ Agent decision
→ Tool called
→ Tool result
→ Next decision
→ Final outcome
