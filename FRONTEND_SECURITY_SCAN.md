# Frontend security scan (brief)

**Scope:** Static review of `public/`, `packages/grafana-*` TypeScript/TSX patterns (March 2026).  
**Not covered:** Backend APIs, Go templates, full dependency audit, or penetration testing.

## Summary

The codebase follows common mitigations (DOMPurify via `sanitize` / `sanitizeTextPanelContent` in `packages/grafana-data`, `textUtil.sanitize` in several panels). A few areas warrant closer review or hardening.

## Findings (ordered by severity)

### 1. Potential HTML injection in trace key/value rendering

**File:** `public/app/features/explore/TraceView/components/TraceTimelineViewer/SpanDetail/KeyValuesTable.tsx`

For `row.type === 'code'` and `row.type === 'text'`, `row.value` is interpolated into HTML strings without entity-encoding before `dangerouslySetInnerHTML`. Malicious span attribute values from an upstream trace could break out of `<pre>` / `<span>` and inject markup or scripts (browser-dependent). The JSON branch uses `jsonMarkup`, which is structured differently.

**Suggestion:** Encode text for HTML context (e.g. escape `<`, `>`, `&`, quotes) or render as text nodes instead of raw HTML strings.

### 2. Optional markdown sanitization bypass in table cells

**File:** `packages/grafana-ui/src/components/Table/TableNG/Cells/MarkdownCell.tsx`

`renderMarkdown(..., { noSanitize: disableSanitizeHtml })` allows unsanitized HTML when `disableSanitizeHtml` is true. Risk depends entirely on whether callers can enable this for untrusted or query-derived data.

**Suggestion:** Restrict `disableSanitizeHtml` to trusted/static scenarios; document the security contract; add tests for misuse.

### 3. Dynamic code execution (`new Function`)

Several locations build functions from strings (e.g. `public/app/features/dashboard/services/DashboardLoaderSrv.ts` for script dashboards, table filter expressions in `packages/grafana-ui`, transforms in `packages/grafana-data`). These are powerful and appropriate only when inputs are strictly controlled (e.g. admin-only features).

**Suggestion:** Confirm server-side authorization and that end users cannot supply arbitrary expressions where not intended.

### 4. `postMessage` with wildcard target origin

**File:** `public/app/app.ts`

`window.parent.postMessage('GrafanaAppInit', '*')` notifies any embedding parent. Message content is minimal; risk is mainly information disclosure / fingerprinting to arbitrary embedders, not token exfiltration.

**Suggestion:** If product requirements allow, replace `*` with an explicit allowlist of parent origins.

### 5. Third-party script loading

**File:** `public/app/core/services/echo/utils.ts` — `loadScript(url)` sets `script.src` from a parameter. Security depends on all call sites passing only trusted URLs.

### 6. `target="_blank"` without consistent `rel`

Many links use `rel="noopener noreferrer"` (also enforced for `_blank` links in DOMPurify’s sanitize hook). Some components use `target="_blank"` without `rel`, which can enable [tabnabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing) when opening untrusted sites.

## Positive patterns observed

- Central sanitization for markdown via `renderMarkdown` / `sanitizeTextPanelContent` (see `packages/grafana-data/src/text/markdown.ts`, `sanitize.ts`).
- `RenderUserContentAsHTML` wraps content with `textUtil.sanitize`.
- Community dashboard helpers explicitly flag `eval` / `new Function` in uploaded JSON (`communityDashboardHelpers.ts`).

## Recommended follow-ups

- Run `yarn npm audit` / SCA in CI and track critical advisories.
- Validate **Content-Security-Policy** and other security headers on the HTTP layer (not in this frontend-only pass).

---

*This document is an informal triage artifact, not a formal security assessment.*
