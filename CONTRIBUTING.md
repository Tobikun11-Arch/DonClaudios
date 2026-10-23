# Contributing to DonClaudio's Lechon House

Thanks for your interest in contributing! Please read this guide and our
[Code of Conduct](CODE_OF_CONDUCT.md) before you start.

## Project Layout

```
/
├── backend/    # Express.js REST API
└── frontend/   # Next.js application
```

## Getting Set Up

**Requirements:** Node.js v18+, npm (or yarn), and Git.

```bash
git clone https://github.com/Tobikun11-Arch/DonClaudios.git
cd DonClaudios

# Backend (http://localhost:5000)
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (http://localhost:3000), in a second terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Never commit real `.env` files or secrets.

## Branching Workflow

- `production` is stable, live-ready code.
- `development` is where work is integrated and tested.
- **Never commit directly to `production` or `development`.**

Create your branch from `development`:

| Type    | Pattern                       | Example                     |
| ------- | ----------------------------- | --------------------------- |
| Feature | `feature/<short-description>` | `feature/homepage`          |
| Bug fix | `fix/<short-description>`     | `fix/login-redirect`        |
| Chore   | `chore/<short-description>`   | `chore/update-dependencies` |
| Hotfix  | `hotfix/<short-description>`  | `hotfix/broken-checkout`    |

Hotfixes branch from `production`, are merged into `production`, and are then
back-merged into `development`.

```bash
git checkout development
git pull origin development
git checkout -b feature/homepage
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
chore:    Maintenance, deps, config
style:    Formatting, no logic change
refactor: Code restructure, no behavior change
docs:     Documentation updates
```

Example: `feat: add homepage hero section`

Keep the subject line under 72 characters.

## Pull Requests

1. Branch off `development` and keep the change focused.
2. Run the linter in the folder you changed:
   - `npm run lint` in `backend/` and/or `frontend/`
3. Make sure the app builds (`npm run build` in `frontend/`).
4. Open a pull request into `development` with a clear description of what
   changed and why. Link related issues (for example `Closes #12`).
5. Request a review. A PR needs approval before it is merged.

Releases go through a pull request from `development` into `production`.

## Reporting Bugs and Requesting Features

- Search existing issues first to avoid duplicates.
- For bugs, include steps to reproduce, expected vs. actual behavior, and your
  environment (OS, Node version, browser).
- For features, describe the problem you want solved, not only the solution.
- **Security vulnerabilities:** do not open a public issue. See
  [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
