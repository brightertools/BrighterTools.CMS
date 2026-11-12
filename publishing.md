# Release procedure

Repository: `brightertools/BrighterTools.CMS` (public). Workflow: `publish-tool.yml`.
GitHub environment: `production`. NuGet owner: `brightertools`; package policy:
`BrighterTools.Cms.Collections`. npm scope: `@brightertools`.

1. Run backend/frontend tests and dependency audits. Build packages and inspect
   contents with `python scripts/inspect-release.py`. Review the source diff.
2. Commit the reviewed source. Rebuild release artifacts from that exact commit.
   Run clean package-consumer checks; record source SHA and artifact SHA-256 values.
3. Configure NuGet's trusted publisher for owner `brightertools`, repository
   `BrighterTools.CMS`, workflow `publish-tool.yml`, environment `production`.
4. Bootstrap npm 0.1.0 from the tested tarball using the maintainer's authenticated
   session and 2FA: `npm publish <verified-tarball> --access public`. Never put a
   token in this repository. Configure that package's GitHub trusted publisher
   with the same owner/repository/workflow/environment for subsequent releases.
   Allow `npm publish`; separate `npm dist-tag` access is unnecessary. Require 2FA
   and disallow traditional tokens; OIDC still works. A new npm trust policy must
   complete its first successful workflow publish within two days, so create it
   immediately before that next release. Existing versions cannot be republished;
   a first follow-up patch can validate the publisher without changing runtime code.
   See https://docs.npmjs.com/trusted-publishers/#trusted-publisher-configuration-expiry.
5. Run the workflow with publication explicitly enabled for the unpublished target.
   It uploads artifacts even when publication is disabled. Never overwrite versions.
6. Independently download the registry artifacts into an empty cache, verify source
   commit, dependency graph and contents (NuGet may add its repository signature),
   then run the consumer acceptance suites. Update the release handoff.

GitHub and registry account configuration requires the package owner's access.
No application deployment is performed by this workflow. No static credentials are
required for ongoing trusted publishing. GitHub npm releases must keep provenance
enabled; the one-time local bootstrap uses the verified archive and maintainer 2FA.

## Verified publisher

React 0.1.1 successfully used the GitHub trusted publisher on 12 November 2026.
The package permission **Allow npm publish** must be enabled; its absence caused
an npm PUT permission-related 404 until corrected. No extra connection or static
token was needed. Registry download integrity and provenance were verified; see
`RELEASE-NOTES.md` for source, workflow and archive hash.
