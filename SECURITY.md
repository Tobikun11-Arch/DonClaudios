# Security Policy

DonClaudio's Lechon House handles customer accounts, passwords, email
verification, and order data, so we take security reports seriously.

## Supported Versions

Security fixes are applied to the following branches:

| Branch        | Supported |
| ------------- | --------- |
| `production`  | Yes       |
| `development` | Yes (latest commit only) |
| Other branches | No       |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately using either option:

1. **GitHub private vulnerability reporting** - go to the repository's
   **Security** tab and choose **Report a vulnerability**.
2. **Email** - **joenelsevellejo831@gmail.com**, with the subject line
   `[SECURITY] DonClaudios`.

Please include:

- A description of the issue and its potential impact
- Steps to reproduce (URLs, requests, payloads, screenshots)
- The affected area (`backend/` API, `frontend/` app, or deployment config)
- Any suggested fix, if you have one

## What to Expect

- Acknowledgement of your report within **5 business days**
- An assessment and a plan for a fix or a reason it is out of scope
- Credit in the release notes if you want it, once the issue is fixed

Please give us reasonable time to fix the issue before any public disclosure.

## Scope

In scope: authentication and sessions, role-based access (customer, owner,
cashier), order and inventory handling, password reset and email
verification flows, and exposed secrets.

Out of scope: social engineering, denial-of-service through volume, and
issues in third-party services we do not control.

## For Contributors

- Never commit `.env` files, API keys, database URLs, or other secrets.
  Use `.env.example` with placeholder values only.
- Enforce role checks (customer, owner, cashier) on the **backend**, never
  only in the frontend.
- If you accidentally commit a secret, tell a maintainer right away so it can
  be rotated. Deleting the commit is not enough.
