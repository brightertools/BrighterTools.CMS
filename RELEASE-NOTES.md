# React 0.1.1

Publishes the unchanged React runtime through the GitHub trusted publisher, with
npm provenance. This validates the publisher after the initial 0.1.0 maintainer
bootstrap. JavaScript, declarations, styles, public contracts and dependencies
are unchanged. The .NET package remains 0.1.0 and is not republished.

# 0.1.0

First public release of collections and structured pages. Preserves existing
contracts, POST mutation methods, draft isolation, UK scheduling, safe rich text,
media/gallery controls, optimistic concurrency and independent listed ordering.
The standalone headless slot application and its SDK are not included.

## Published 12 November 2026

Source commit: `8d6a103e429ca3d64e9e8ba7000f32949bb9d7e1`.
NuGet release workflow: https://github.com/brightertools/BrighterTools.CMS/actions/runs/43258704530

- NuGet `BrighterTools.Cms.Collections` 0.1.0: registry signature verified;
  SHA-256 `d167259847e2f929e1ec774ce23e2464b3de1ee72219cbd1e4eb3d4bcbc0de51`.
- npm `@brightertools/cms-collections-react` 0.1.0: maintainer bootstrap from the
  tested archive; downloaded bytes match exactly;
  SHA-256 `772d5677572f0c84818c6b4677c2d17f9c93ff7df0d1c393454f2061df34147f`.

Standalone backend (13) and React (3) tests, dependency audits, archive inspection
and installed .NET/Node consumers passed locally and on GitHub. The first npm
bootstrap has registry integrity/signatures; subsequent GitHub releases use trusted
publishing and provenance after the package owner configures its trusted publisher.
