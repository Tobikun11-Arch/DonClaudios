# Commit Message Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Read this before writing any commit message.

## Format

<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

## Types

| Type       | Use for                                                     |
| ---------- | ----------------------------------------------------------- |
| `feat`     | A new feature                                               |
| `fix`      | A bug fix                                                   |
| `docs`     | Documentation-only changes                                  |
| `style`    | Formatting, missing semicolons, etc. (no code logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature     |
| `perf`     | Performance improvement                                     |
| `test`     | Adding or correcting tests                                  |
| `build`    | Changes to build system or dependencies                     |
| `ci`       | Changes to CI configuration/scripts                         |
| `chore`    | Other changes that don't modify src or test files           |
| `revert`   | Reverts a previous commit                                   |

## Scope (optional)

A noun in parentheses describing the section of the codebase affected:

feat(auth): add login rate limiting
fix(api): correct null check on user endpoint

## Description

- Short summary of the change, present tense, lowercase, no period at the end.
- Example: `fix: prevent race condition on retries`

## Body (optional)

- Add after a blank line following the description.
- Explain _what_ and _why_, not _how_.

## Footer (optional)

- Reference issues: `Closes #123`
- Note breaking changes: `BREAKING CHANGE: <description>`

## Breaking Changes

Indicate a breaking change in one of two ways:

1. Add `!` after the type/scope: `feat(api)!: remove deprecated endpoint`
2. Add a `BREAKING CHANGE:` footer with details.

Either form triggers a MAJOR version bump under semantic versioning.

## Examples

feat: add dark mode toggle

fix(parser): handle empty input without throwing

docs: update README with setup instructions

feat(auth)!: require MFA for all admin logins

BREAKING CHANGE: admin accounts must enroll in MFA before next login

## Rules Summary

1. Every commit must have a type and description.
2. Use `!` or `BREAKING CHANGE:` footer for breaking changes only.
3. Scope is optional but encouraged for clarity in larger repos.
4. Keep the description under ~72 characters when possible.
5. Body and footer are optional but recommended for non-trivial changes.