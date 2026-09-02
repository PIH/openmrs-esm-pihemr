# @pih/esm-audit-app

An audit trail for patient encounters and observations in the PIH EMR.

This is the OpenMRS 3 replacement for the legacy `admin/encounters` pages, which let an auditor
search for a patient and then read, for any one of their encounters, everything that had been
entered, changed or deleted on it and by whom. It reads the same data through the OpenMRS REST API.

## The audit trail

The dashboard is a three step drill-down. Each step keeps its position in the page's query string,
so a particular encounter's audit trail can be linked to and the browser's back button walks back
up the drill-down.

1. **Patient search** — find the patient by name or identifier
   (`GET /ws/rest/v1/patient?q=…`).
2. **Encounter list** — every encounter recorded for that patient, most recent first
   (`GET /ws/rest/v1/encounter?patient=…&order=desc`, paged by the server through
   `useOpenmrsPagination`), narrowable by encounter type and by the date the encounter happened. The type dropdown offers only the types this patient's own encounters
   use, read from a scan of their encounters with a rep that carries nothing but the type, so it
   never offers a type that would return nothing. Deleted encounters are hidden by default; see the
   caveat below.
3. **Encounter audit** — how the encounter itself was recorded (created by, changed by, deleted by,
   with the reason), its providers, and the full history of its observations
   (`GET /ws/rest/v1/encounter/{uuid}` and `GET /ws/rest/v1/obs?encounter={uuid}&includeAll=true`).

The patient step has a second tab, **Record activity**, which answers "who touched this record":
one row per user with what they created, edited and deleted, and the individual events behind those
counts, each linking to the encounter it happened on. Clicking a user's name narrows the activity
log to that user, and clicking it again — or dismissing the tag beside the log's heading — widens
it back out. The tab reads the same filters as the encounter list, so narrowing by type or date
narrows the activity too.

### How each observation is classified

OpenMRS never overwrites an obs: editing one voids the old row and saves a new row that points back
at it through `previousVersion`. The obs search with `includeAll=true` returns every obs row for the
encounter — group members and voided rows included — which is enough to reconstruct what happened.
`src/audit/obs-audit.ts` derives one status per obs, and the table tags them accordingly:

| Status            | What it means                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| _(no tag)_        | Entered when the encounter was first saved, and untouched since.                                                 |
| **Edited**        | The obs points at a `previousVersion`, so its value was changed after it was first recorded.                     |
| **Added later**   | The obs's `dateCreated` differs from the encounter's, so it was saved in a later transaction than the encounter. |
| **Deleted**       | The obs is voided and nothing replaced it — the value was removed from the encounter.                            |
| **Previous value**| The obs is voided and a surviving obs names it as its `previousVersion` — this is the value an edit replaced.     |

Deleted and superseded obs are struck through, as they were on the legacy page, and each version of
a value is listed directly beneath the version that replaced it. Obs group members are indented
under their group.

### Caveat: deleted encounters

The REST API's encounter-by-patient search always excludes voided encounters and does not honour
`includeAll`. Listing deleted encounters therefore falls back to the free-text encounter search,
which does honour it, using the patient's preferred identifier as the search phrase; because that
search matches any patient whose name or identifier contains the phrase, the results are narrowed
back down to the patient in hand and paginated on the client — the one list that has to be read in
full rather than a page at a time. A patient with no identifier at all cannot have their deleted
encounters listed, and the page says so.

That search also takes no filter parameters, so the encounter type and date range are applied by
the server on the normal path (`encounterType`, `fromdate` and `todate`, which the API compares
against `encounterDatetime` inclusively) and on the client on the deleted-encounter path.
`src/audit/encounter-filters.ts` holds both, so the two paths cannot drift apart. Dates are sent to
the server without a time zone, so it reads them as the facility's own day rather than as UTC
instants.

Because that search is the only way to see deleted encounters, it is also where the encounter types
come from once deleted encounters are shown — otherwise a type used only by a deleted encounter
would be missing from the dropdown. Both hooks build the same url, so SWR serves the second one
from cache rather than reading it twice.

### Caveat: what the activity view costs

Encounters carry their own `auditInfo`, so who created, changed or deleted each one comes free with
the encounter list.

Observations do not. Each encounter's observations need their own request, because the
obs-by-encounter search is the only one that honours `includeAll` and so the only one that can see
deleted observations. The view reads every encounter the filters match, which makes it complete but
means **one request per encounter** — five in flight at a time, with the running count shown while
it works. On a long record over a slow link that is a real wait, and filtering by encounter type or
date is the way to keep it short.

This is a deliberate choice to favour completeness over speed while the view is new; a cap is the
obvious lever if it proves too slow in the field.

## Enabling the app

Because `audit-dashboard-link` is declared against `homepage-dashboard-slot` in
`routes.json`, it is attached automatically for every implementation that loads
this module — no `add` entry is needed. The shared `base-config.json` in the
[pihemr](https://github.com/PIH/pihemr) repo only pins where the link sits in
the home nav, via that slot's `order` list.

A site that does *not* want the dashboard adds `audit-dashboard-link` to the
slot's `remove` list in its own `config.json`. Note that `remove` wins over
`add` when an id appears in both, and that config arrays are replaced rather
than merged, so such an override must repeat the whole `remove` list from
`base-config.json`.

Reading the audit trail needs the `View Encounters` and `View Observations` privileges, the same
ones the legacy pages required.

## Configuration

See the [openmrs-esm-module-config docs](https://wiki.openmrs.org/display/projects/openmrs-esm-module-config)
for information about how to provide configuration files.

| Key                     | Default                                            | Description                                        |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `patientSearchPageSize` | `10`                                               | Patients per page of search results.               |
| `encountersPageSize`    | `10`                                               | Encounters per page of a patient's encounter list.  |
| `patientChartUrl`       | `${openmrsSpaBase}/patient/${patientUuid}/chart`   | Where the patient's name in the encounter audit links to. |
