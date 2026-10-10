# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
7. AI / AGENTIC AI RULES
==================================================

This project is an Agentic AI SaaS.

AI must be used where it provides actual value.

Do NOT add an LLM merely to claim that the project uses AI.

An agent should:

1. Understand the user's goal.
2. Determine what information is required.
3. Select appropriate tools.
4. Execute tools.
5. Observe tool results.
6. Reason over the results.
7. Decide the next action.
8. Continue until the task is complete or human intervention is required.

The agent must NOT hallucinate tool results.

The agent must NOT claim an action was performed if the tool was not actually executed.

==================================================
8. AGENT VS NORMAL BACKEND LOGIC
==================================================

Use deterministic backend code for:

- Authentication
- Authorization
- Validation
- Calculations
- Database operations
- Security
- Transaction processing
- Risk thresholds
- Rate limiting
- Billing

Use the AI agent for:

- Understanding natural language
- Investigation
- Reasoning
- Selecting tools
- Summarization
- Evidence analysis
- Handling ambiguous cases
- Generating explanations

Never rely on an LLM for security-critical deterministic validation when normal code can perform it.

==================================================
9. AGENT TOOL RULES
==================================================

Every agent tool must have:

- Clear name
- Clear purpose
- Defined input
- Defined output
- Validation
- Error handling
- Permission checks where required

Tools should perform one meaningful operation.

Example:

GOOD:

get_order()
get_customer_history()
check_refund_policy()
calculate_risk()
create_review_case()

BAD:

do_everything()

The agent should receive structured tool results whenever possible.

==================================================
10. REFUND / FRAUD LOGIC
==================================================

For refund/fraud decisions:

NEVER allow the LLM alone to declare a customer fraudulent.

The system should combine:

- Transaction data
- Customer history
- Refund history
- Order/service information
- Policy
- Behavioral signals
- Rule-based signals
- Risk indicators
- Agent reasoning

The agent must distinguish between:

LEGITIMATE
SUSPICIOUS
HIGH RISK
INSUFFICIENT EVIDENCE

"High risk" does NOT automatically mean "fraud."

Avoid unsupported accusations.

Use evidence-based explanations.

==================================================
11. HUMAN-IN-THE-LOOP
==================================================

Actions with significant financial, legal, account, or irreversible consequences should support human review.

Examples:

- Large refunds
- Account suspension
- Permanent rejection
- High-value transactions
- Deletion of important data

The agent should be able to produce:

Decision
Risk
Evidence
Reasoning
Recommended Action

Example:

Risk: HIGH
Confidence: 87%
Recommendation: MANUAL_REVIEW

Evidence:
- ...
- ...
- ...

==================================================
12. DATA PRIVACY & SECURITY
==================================================

NEVER:

- Hardcode API keys.
- Commit passwords.
- Commit tokens.
- Commit private credentials.
- Expose secrets in logs.
- Put credentials in frontend code.

Use environment variables or the project's existing secret-management approach.

Never expose sensitive customer information unnecessarily.

Follow least-privilege principles.
