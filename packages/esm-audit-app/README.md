# @pih/esm-audit-app

An audit trail for patient encounters and observations in the PIH EMR.

This is the OpenMRS 3 replacement for the legacy `admin/encounters` pages, which let an auditor
search for a patient and then read, for any one of their encounters, everything that had been
entered, changed or deleted on it and by whom. It reads the same data through the OpenMRS REST API.

## The audit trail

The dashboard is a three step drill-down. Each step keeps its position in the page's query string,
so a particular encounter's audit trail can be linked to and the browser's back button walks back
up the drill-down.

1. **Find the record** — three tabs:
   - **Patients** — by name or identifier (`GET /ws/rest/v1/patient?q=…`).
   - **Users** — by username, system id or the person's name (`GET /ws/rest/v1/user?q=…`), then the
     encounters whose observations that account recorded or deleted. This is the one view that
     genuinely answers "what did this account change", and it depends on pihcore — see below.
   - **Providers** — by name or provider identifier (`GET /ws/rest/v1/provider?q=…`), then the
     encounters that provider is recorded on. See the caveat below on what that does and does not
     mean.

   Every tab drills into the same encounter audit trail at step 3.
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

### The Users tab depends on pihcore

The core REST API cannot search observations by the account that touched them: neither the obs
resource, the observation search handler, core's own `ObsSearchCriteria` nor FHIR's
`ObservationSearchParams` has a creator or voidedBy field. Those columns can be read off an
observation but not searched on.

`openmrs-module-pihcore` adds the endpoint that can:

```
GET /ws/rest/v1/pihcore/obsaudit?createdBy=<user>&voidedBy=<user>&startDate=<date>&endDate=<date>
```

`createdBy` and `voidedBy` accept a user uuid, username or system id, and results come back paged
in the standard obs representation, most recent audit action first. `startDate` and `endDate` bound
when the change was made rather than when the observation was taken, and are what the tab's
**Changed between** picker sends — as bare calendar dates, since the endpoint reads a date-only
`endDate` as the whole of that day. Narrowing the range narrows the trail on the server, so it is
also the way to make a long-serving account's history quick to read.

The tab's **Encounter type** filter is different in kind: the endpoint takes no encounter type, so
it is applied after the merge. It offers every type in the system rather than only those the trail
holds, because lazy discovery means the types in a trail are unknown until all of it has been read.
Filling a page of a rare type therefore reads further than filling a page of any type; when the
scan gives up before the trail runs out, the view says so and suggests narrowing the dates. **The Users tab is inert without
a pihcore version that provides it**, and it requires the `App: coreapps.systemAdministration`
privilege that endpoint is gated on.

Two consequences shape the tab. The endpoint's two filters narrow rather than widen, so "touched"
takes two searches — one for each parameter. And it answers in observations while an auditor reads a
record in encounters, so the observations have to be collapsed into one row per encounter.

The collapse is done lazily rather than by reading the whole trail. Both searches return
observations by audit date descending, which means the first time an encounter appears in the merged
stream is its most recent change — so encounters come out of the merge already in the order the list
wants, and reading can stop as soon as enough of them are certain to fill the page on screen. Paging
forward reads further; paging back costs nothing, because what has been read is kept.

"Certain" is the subtle part, and `src/audit/user-encounters.ts` is where it lives. An observation
not yet read can only be older than the last row read from its search, so an encounter is safe to
show only once its most recent change is later than both searches' positions; a search that has not
been read at all constrains everything, which is why it is tracked separately from one that is
exhausted. Getting this wrong would make the first page reshuffle as the second was read.

The per-encounter counts cannot come from that scan, since an encounter's other observations may sit
far further down the trail. They are read per row instead — `obs?encounter=…&includeAll=true`,
attributed by creator and voiding user — so they are exact, and cost one small request per row
actually on screen.

Because the number of encounters an account has touched is unknown until its whole trail has been
read, which is the very thing being avoided, the list has no total to page against: it shows the
range on screen with previous and next buttons rather than a page count.

### Caveat: searching by provider is not searching by who edited

The Providers tab lists the encounters a provider is **recorded on**, which is not the same as the
ones that account entered or changed — an encounter someone entered without being a provider on it
will not appear. The view says as much and names the entering user per row, and the Users tab is
what answers the other question.

Both go through pihcore, since core cannot search encounters by either. `EncounterSearchCriteria`
carries a providers field but no webservices search handler exposes it, the free-text encounter
search only matches patient name and identifier when no patient is given, and there is no `doGetAll`
to enumerate and filter client-side:

```
GET /ws/rest/v1/pihcore/encounteraudit?provider=<uuid or identifier>
GET /ws/rest/v1/pihcore/encounteraudit?createdBy=<user>&changedBy=<user>&voidedBy=<user>
```

Filters narrow, at least one user or provider is required, and results are paged in the standard
encounter representation — including `auditInfo`, which is why one paged request serves a whole page
with nothing read per row. `encounterType`, `startDate` and `endDate` narrow it further;
`encounterType` accepts a uuid or a type name, and the dates bound whatever the search is about: the
named audit action's column where there is one, and the encounter's own datetime for a provider
search.

The Providers tab's encounter type and date filters are those parameters, so the page count and
totals stay right — which is also why its type dropdown offers every type in the system rather than
only those on screen. The Patients tab shares the same filter bar but supplies the patient's own
types, since there they can be known.

This replaced an earlier route through FHIR (`Encounter?participant=`), which worked but needed a
`_tag` to avoid a paging crash in fhir2's combined encounter-and-visit bundle provider, and a
follow-up REST read per row because FHIR carries no `auditInfo`.

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
| `patientDashboardUrl`   | `${openmrsBase}/pihcore/router/programDashboard.page?patientId=${patientUuid}` | Where the patient's name in the encounter audit links to. Points at the OpenMRS 2.x clinician dashboard, so it is a full page load. |
