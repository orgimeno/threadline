# Threadline canonical context schema

> Status: **implemented as an MVP specification**. The application skeleton is **in progress**; runtime schema validation remains **planned**.

## Purpose

This document defines the canonical intermediate and final representation of one context entry extracted from an imported conversation. The same entry shape is used between backend processing, frontend review, and final JSON export.

The schema is intentionally small. It preserves the information needed for categorization, human review, dates, and source traceability without introducing a permanent memory system.

## Root export document

Every Threadline JSON export has a root object with these fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | Version identifier for the Threadline export contract. The MVP value is always `threadline.v1`. |
| `entries` | array | yes | Context entries included in the document. |

Minimal root shape:

```json
{
  "schemaVersion": "threadline.v1",
  "entries": []
}
```

The final export includes entries with `accepted` or `edited` status. Pending and rejected entries can exist in an intermediate review result but are not part of the approved final context.

## Context entry

Each entry has the following required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Temporary unique identifier for the entry within the current document or session. |
| `type` | enum string | High-level meaning of the entry. Allowed values are `fact`, `event`, `preference`, `instruction`, `project`, and `other`. |
| `content` | string | The current human-readable statement represented by the entry. It may be the model proposal or the user's edited version. |
| `date` | object | Date information, including the original expression and any safe normalization. |
| `status` | enum string | Review state: `pending`, `accepted`, `edited`, or `rejected`. |
| `sourceReferences` | array | One or more locations in the imported sources that support the entry. |

### `id`

The identifier is local to the Threadline document or temporary session. It is not a user identity, database key, or permanent cross-export identifier. The backend assigns it after validating a model proposal; the MVP may use a readable value such as `entry-001`.

### `type`

The initial controlled vocabulary is:

- `fact`: a stable statement or attribute.
- `event`: something that happened or is planned.
- `preference`: a choice or preference.
- `instruction`: guidance that should affect future interactions.
- `project`: information about an ongoing or named project.
- `other`: meaningful context that does not fit the initial categories.

The model must select one of these values; it must not invent new categories in an MVP response.

### `content`

This is the current statement shown to the reviewer and used for the final export. Threadline does not add an `originalContent` field or an edit-history structure in this version. Source references provide the audit path back to the imported material.

### `date`

The date object has four fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `original` | string or `null` | The date expression as found in the source, preserving its wording. |
| `normalized` | string or `null` | A safe normalized value, or `null` when normalization is not possible. |
| `precision` | enum string | The precision supported by the evidence: `minute`, `hour`, `day`, `month`, `year`, or `unknown`. |
| `timezone` | string or `null` | An explicit IANA time-zone name such as `Europe/Madrid`, or `null` when the source does not establish a time zone. |

Normalized values use ISO-like local date-time forms appropriate to their precision: `YYYY-MM-DDTHH:MM` for `minute`, `YYYY-MM-DDTHH` for `hour`, `YYYY-MM-DD` for `day`, `YYYY-MM` for `month`, and `YYYY` for `year`. The MVP does not infer missing components, resolve relative expressions without evidence, or assume UTC. A normalized time without an explicit source time zone remains a local wall-clock value with `timezone: null`.

Examples:

```json
{
  "original": "March 2026",
  "normalized": "2026-03",
  "precision": "month",
  "timezone": null
}
```

```json
{
  "original": "sometime during the early project",
  "normalized": null,
  "precision": "unknown",
  "timezone": null
}
```

An unknown or incomplete date is valid. The absence of a date must never be silently converted into a guessed date.

### Minimal date examples

These three small examples cover the MVP cases we want to validate before designing the API:

#### 1. Date and time known to the minute

```json
{
  "original": "September 14, 2031 at 16:30 in Madrid",
  "normalized": "2031-09-14T16:30",
  "precision": "minute",
  "timezone": "Europe/Madrid"
}
```

#### 2. Incomplete or unknown date

```json
{
  "original": "sometime during the early project",
  "normalized": null,
  "precision": "unknown",
  "timezone": null
}
```

#### 3. Entry supported by multiple sources

```json
{
  "id": "entry-003",
  "type": "event",
  "content": "The fictional North Star demonstration is planned for September 14, 2031.",
  "date": {
    "original": "September 14, 2031",
    "normalized": "2031-09-14",
    "precision": "day",
    "timezone": null
  },
  "status": "pending",
  "sourceReferences": [
    {
      "file": "fictional-project-notes.md",
      "location": "lines 9-9"
    },
    {
      "file": "fictional-preferences.json",
      "location": "/messages/2/content"
    }
  ]
}
```

### `status`

The review lifecycle is deliberately small:

- `pending`: extracted and waiting for the user to review.
- `accepted`: approved without content changes.
- `edited`: approved after the user changes the content or another reviewable field.
- `rejected`: excluded from the final context.

Only `accepted` and `edited` entries are included in the approved final export.

### `sourceReferences`

Each reference identifies where the entry came from:

| Field | Type | Meaning |
| --- | --- | --- |
| `file` | string | Imported filename or temporary source name. |
| `location` | string | Verifiable source locator: an RFC 6901 JSON Pointer for JSON, or a one-based `lines START-END` range for Markdown. |

The MVP requires at least one reference for every extracted entry. JSON references use pointers such as `/messages/42/content`; Markdown references use ranges such as `lines 12-15`. The backend must verify that the referenced value or line range exists. Hashes, quoted evidence, byte offsets, and source relationship graphs are intentionally out of scope.

## Complete fictional example

The following export is valid and contains no real personal data:

```json
{
  "schemaVersion": "threadline.v1",
  "entries": [
    {
      "id": "entry-001",
      "type": "event",
      "content": "The first North Star demonstration is planned for September 14, 2031.",
      "date": {
        "original": "September 14, 2031",
        "normalized": "2031-09-14",
        "precision": "day",
        "timezone": null
      },
      "status": "accepted",
      "sourceReferences": [
        {
          "file": "fictional-project-notes.md",
          "location": "lines 9-9"
        }
      ]
    },
    {
      "id": "entry-002",
      "type": "preference",
      "content": "Weekly project reports will be written in Markdown.",
      "date": {
        "original": null,
        "normalized": null,
        "precision": "unknown",
        "timezone": null
      },
      "status": "pending",
      "sourceReferences": [
        {
          "file": "fictional-preferences.json",
          "location": "/messages/2/content"
        }
      ]
    }
  ]
}
```

## Explicit MVP limits

This is Threadline's own MVP contract. It does not implement Portable AI Memory (PAM), a PAM mapping, persistent identifiers, hashes, embeddings, semantic relationships, confidence scoring, edit history, or companion files. These can be considered only after the import, review, and export workflow is validated.

Future compatibility with Portable AI Memory may be possible through an optional adapter or export format. That compatibility is not implemented and must not be presented as an existing feature.
