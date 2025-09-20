# Coding Standards

- **TS strict**; no `any` in exported types.
- Folder per app: `src/{routes,controllers,services,repos,lib,config}`.
- Errors → JSON with `code`, `message`, `details?`; no stack traces in responses.
- Logging → structured JSON; include `reqId`; never log request bodies.
- Shared validation in `/packages/schemas`; do not re-declare shapes in services.
- Feature flags via environment variables only when documented in `ENV.md`.
