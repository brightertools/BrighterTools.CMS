# CMS collections core

Dependency-free .NET 10 contracts and publishing transitions for listed content.
No dependency on the standalone CMS application, Mosaio, persistence or host routes.

Hosts persist `ListedItem` and immutable `ListedRevision` records. SaveDraft creates
a revision; Publish swaps the public revision number. Use `Revision` as an
optimistic concurrency token and persist each transition plus its media references
in one database transaction. Scope all operations to the authenticated host tenant.

Public queries must join the published revision, exclude disabled/deleted items,
and enforce inclusive Start/exclusive End on every list, detail and media request.
The host owns private/public response shaping, URLs, media authorization, scheduling
input conversion, database migrations and publication metadata. The first host is the
first adapter; existing headless CMS slot APIs remain independent and unchanged.

Structured pages use `ContentPage`, `PageBlock`, immutable `PageBlockRevision` and
`PageLayoutRevision` contracts and `StructuredPageWorkflow` validation. Introduction
and header/closing quote slots are singletons; items may belong to a single-level
group. Page layout revisions isolate manual ordering and membership from content
publishing. Hosts own the supported page-key registry, transaction/concurrency
boundaries, parent visibility, fixed imagery, rendering and import adapters.
The first host supplies the first implementation without adding its page names or
routes to these shared contracts. Persist page/block Revision as concurrency tokens.
