# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
24. HACKATHON PRIORITY
==================================================

The project must prioritize:

1. Working MVP
2. Strong Agentic AI demonstration
3. Clear business problem
4. Reliable demo
5. Clean UX
6. Explainable decisions
7. Startup scalability
8. Documentation

Do NOT spend most of the hackathon building infrastructure that is not visible or valuable to the user.

==================================================
25. DEMO-FIRST THINKING
==================================================

Every major feature should answer:

"Can we demonstrate this clearly to a judge?"

The demo should show:

USER REQUEST
      ↓
AGENT
      ↓
PLAN / INVESTIGATION
      ↓
TOOLS
      ↓
REAL DATA
      ↓
REASONING
      ↓
DECISION
      ↓
ACTION / HUMAN REVIEW

Avoid fake AI behavior.

If demo data is simulated, clearly structure it as realistic test data and do not present fabricated production data as real.

==================================================
26. STARTUP THINKING
==================================================

Do not optimize only for technical complexity.

For every major feature consider:

- Who pays?
- What problem is being solved?
- How frequently does it occur?
- What does the problem cost the customer?
- Why does AI/agentic AI provide an advantage?
- Why can't a simple rule solve it?
- What is the competitive advantage?
- Can the solution scale to other customers/industries?

The product should solve a real business workflow.

==================================================
27. WHEN REQUIREMENTS ARE AMBIGUOUS
==================================================

Do NOT guess when ambiguity can materially affect architecture, security, data, or business logic.

Ask a concise clarification.

However, if a reasonable assumption is safe and reversible:

- State the assumption.
- Proceed.
- Make the assumption easy to change.

Do not repeatedly ask for confirmation for trivial decisions.

==================================================
28. WHEN SOMETHING IS BROKEN
==================================================

Do not immediately rewrite the feature.

Follow:

1. Reproduce the issue.
2. Identify the root cause.
3. Inspect logs/errors.
4. Make the smallest fix.
5. Test the fix.
6. Check for regression.

Fix root causes, not symptoms.

==================================================
29. FINAL RESPONSE AFTER EVERY TASK
==================================================

After completing a task, report:

IMPLEMENTED
- What changed.

FILES
- Files created/modified.

TESTED
- What was actually tested.

RESULT
- Current behavior.

ISSUES
- Any remaining issue.

NEXT
- Recommended next step, if necessary.

Keep the final response concise.

==================================================
30. ABSOLUTE RULE
==================================================

DO NOT:
- Hallucinate
- Overengineer
- Rewrite unrelated code
- Claim tests were run when they were not
- Claim tools were executed when they were not
- Expose secrets
- Make unsupported fraud accusations
- Add AI where deterministic code is better
- Remove existing functionality without instruction

ALWAYS:
- Inspect
- Plan
- Implement
- Test
- Explain
- Preserve
- Verify

The repository is the source of truth.
Existing working code should be respected.
User requirements take priority.
Security and correctness take priority over speed.
