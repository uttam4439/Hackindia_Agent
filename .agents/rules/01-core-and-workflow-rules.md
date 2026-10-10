# ANTIGRAVITY PROJECT RULES
# Project: AI-First Startup Hackathon
# Goal: Build a production-quality Agentic AI SaaS

==================================================
1. CORE PRINCIPLE
==================================================

You are an AI software engineering agent working on this repository.

Your job is NOT to blindly execute prompts.

For every task:
1. Understand the requirement.
2. Inspect the existing project.
3. Identify affected files/components.
4. Create a short implementation plan.
5. Implement only what is required.
6. Test the implementation.
7. Report what was changed.

Never make assumptions when the repository already contains relevant information.

Do not rewrite working code unnecessarily.

==================================================
2. BEFORE MODIFYING ANYTHING
==================================================

Before writing code:

- Inspect the repository structure.
- Read relevant README/documentation.
- Inspect existing implementation related to the task.
- Understand the current architecture.
- Check existing dependencies before adding new ones.
- Check whether a similar feature already exists.

Do NOT immediately start coding after receiving a prompt.

First determine:

WHAT:
What exactly needs to be built?

WHY:
Why is this feature required?

WHERE:
Which part of the system should contain it?

HOW:
What is the smallest clean implementation?

==================================================
3. TASK CLASSIFICATION
==================================================

Classify every request as one of:

A. New Feature
B. Bug Fix
C. Refactoring
D. UI/UX Change
E. Database Change
F. AI/Agent Change
G. Configuration
H. Documentation
I. Testing

For complex tasks, explicitly state the category before implementation.

==================================================
4. PLANNING RULE
==================================================

For medium or large tasks:

First provide:

PLAN:
1. ...
2. ...
3. ...

FILES AFFECTED:
- ...
- ...

RISKS:
- ...

Then implement.

Do not create a large amount of code without a plan.

For very small changes, planning can be implicit.

==================================================
5. DO NOT OVERENGINEER
==================================================

Follow the simplest architecture that satisfies the requirement.

Do NOT:

- Add unnecessary frameworks.
- Add unnecessary abstractions.
- Create unnecessary services.
- Create unnecessary files.
- Introduce microservices without a real requirement.
- Add libraries when existing dependencies can solve the problem.
- Build features that were not requested.

Prefer:

Simple > Complex
Readable > Clever
Maintainable > Short
Existing architecture > New architecture

==================================================
6. PRESERVE EXISTING CODE
==================================================

Never overwrite or restructure working code unless the task requires it.

Before changing an existing component:

- Understand how it is currently used.
- Check its dependencies.
- Check callers/importers.
- Preserve existing behavior unless explicitly asked to change it.

Avoid unrelated modifications.

A task requesting Feature A must NOT result in unrelated changes to Feature B.
