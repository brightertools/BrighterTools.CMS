# BrighterTools CMS collections

Reusable .NET 10 content contracts and React 19 editors, licensed MIT-0.

- NuGet: `BrighterTools.Cms.Collections` 0.1.0.
- npm: `@brightertools/cms-collections-react` 0.1.0.

Supports listed items, independent manual ordering, structured pages and grouped
blocks, draft/publication transitions, validated Lexical rich text, UK scheduling,
media selection and galleries. This repository contains libraries, not a hosted CMS.
Hosts own persistence, authentication, authorization, transactions, endpoints,
media storage, migrations and public renderers. No Mosaio dependency is required.

Import `@brightertools/cms-collections-react/styles.css` alongside your host styles.
Editors use Bootstrap 5 class names; hosts supply Bootstrap or equivalent styles.
See package READMEs for API contracts and `examples/` for a minimal consumer.

Build/test: `dotnet test BrighterTools.CMS.slnx -c Release`; in
`packages/collections-react`, run `npm ci`, `npm test`, `npm run build`.
See `publishing.md` for release steps and artifact inspection.
