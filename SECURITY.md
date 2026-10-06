# Security Policy

## Scope

MentAi processes academic, identity, attendance, mentoring, and contact information. Treat all non-public records as confidential.

## Reporting a vulnerability

Do not report security vulnerabilities in a public issue or pull request. Contact the repository maintainers through the organization's private security reporting channel and include:

- A clear description of the affected component
- Reproduction steps or a minimal proof of concept
- The potential impact and affected roles
- Any suggested mitigation

If private reporting is unavailable, contact the repository owner directly and request a confidential channel.

## Security expectations

- Store secrets only in environment variables or the deployment secret manager.
- Use strong, unique production credentials and rotate exposed credentials immediately.
- Never commit `.env` files, database exports, API keys, access tokens, or private student data.
- Enforce authentication and authorization on every protected server endpoint.
- Hash passwords with the approved application helper; never log passwords or tokens.
- Validate uploads, filenames, file size, MIME type, and parsed content before processing.
- Use parameterized database queries and ORM APIs rather than string-built SQL.
- Restrict CORS and session cookies to the deployed domains and required attributes.
- Configure HTTPS, secure cookies, CSRF protection, and appropriate session expiration in production.
- Treat AI prompts and responses as potentially sensitive; minimize submitted personal data and review provider retention settings.

## Data handling

Development and test data must be synthetic or explicitly approved for local use. Before sharing logs or screenshots, remove names, admission numbers, email addresses, phone numbers, marks, and other identifying data.

Diagnostic scripts and generated output files should be reviewed before committing. They can contain database contents or credentials even when their filenames appear harmless.

## Response process

Maintainers should acknowledge a private report, reproduce it safely, assess impact, and coordinate a fix and disclosure timeline. Rotate any exposed credentials before deploying the code fix, and document the affected versions and remediation.
