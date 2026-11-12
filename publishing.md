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
5. Run the workflow with publication explicitly enabled for the unpublished target.
   It uploads artifacts even when publication is disabled. Never overwrite versions.
6. Independently download the registry artifacts into an empty cache, verify source
   commit, dependency graph and contents (NuGet may add its repository signature),
   then run the consumer acceptance suites. Update the release handoff.

GitHub and registry account configuration requires the package owner's access.
No application deployment is performed by this workflow. No static credentials are
required for ongoing trusted publishing. GitHub npm releases must keep provenance
enabled; the one-time local bootstrap uses the verified archive and maintainer 2FA.
