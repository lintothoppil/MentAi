# Contributing to MentAi

Thank you for contributing to MentAi. Changes should be focused, reviewable, secure, and compatible with the existing academic workflows.

## Before you start

1. Create a working branch from the current default branch.
2. Review the relevant service and route before making changes.
3. Confirm that your change does not expose or require real student data.
4. Keep secrets and local environment files out of commits.

## Development workflow

Install the dependencies for the area you are changing:

```bash
npm install
npm run dev
```

For Python services, use an isolated virtual environment and install:

```bash
pip install -r student_module/requirements.txt
```

Use the smallest relevant validation command while iterating, then run the complete applicable checks before opening a pull request:

```bash
npm run lint
npm test
npm run build
```

Python changes should include the relevant tests from `student_module/tests/` and a focused manual check of the affected route when practical.

## Code standards

- Use TypeScript types instead of broad casts.
- Follow existing component, hook, route, service, and model naming patterns.
- Keep authorization checks close to the server-side operation they protect.
- Validate user input at the API boundary.
- Return consistent error responses and avoid silent fallbacks.
- Keep UI states clear for loading, empty, success, and failure conditions.
- Do not include personal data, credentials, database dumps, or generated logs in a pull request.

## Pull requests

Each pull request should:

- Explain the user or operational problem being solved.
- Describe the implementation and any schema or configuration changes.
- Include tests or commands run.
- Call out migrations, environment variables, breaking API changes, and rollout concerns.
- Include screenshots for meaningful UI changes.

Keep pull requests focused. Separate refactors, formatting-only changes, and unrelated fixes from the feature or bug being reviewed.

## Commit messages

Use short, imperative commit subjects, for example:

```text
Add attendance export validation
Fix mentor session authorization
```

## Reporting issues

Do not include credentials, private student records, or exploit details in public issues. For security-sensitive reports, follow [`SECURITY.md`](SECURITY.md).

