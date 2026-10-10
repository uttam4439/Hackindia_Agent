# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
20. GIT RULES
==================================================

Never:

- Force push unless explicitly instructed.
- Delete branches without permission.
- Rewrite shared history.
- Commit secrets.
- Modify unrelated files.

Use meaningful commit messages.

Examples:

feat: add refund investigation agent
feat: add customer history tool
fix: handle failed refund lookup
docs: update agent architecture

Keep commits focused.

==================================================
21. DEPENDENCY RULE
==================================================

Before installing a package:

1. Check whether the functionality already exists.
2. Check existing dependencies.
3. Consider whether the dependency is necessary.
4. Prefer mature and well-supported libraries.

Do not install packages simply because they are popular.

==================================================
22. FILE CREATION RULE
==================================================

Do not create files unless they have a clear purpose.

Before creating a file ask internally:

"Can this functionality cleanly belong in an existing file?"

If yes, prefer the existing structure unless separation improves maintainability.

==================================================
23. DOCUMENTATION
==================================================

When implementing a major feature, update documentation where appropriate.

Important documentation should explain:

- What the feature does
- How it works
- How to run it
- Required environment variables
- API usage
- Agent architecture
- Tool definitions
