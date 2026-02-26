# Firestore indexes

Composite indexes used by the app are defined in **`firestore.indexes.json`** at the project root.

## Deploy indexes

From the project root, with the Firebase CLI installed and logged in:

```bash
firebase use cartage-agent-builder-dev   # if not already default
firebase deploy --only firestore:indexes
```

Or with bunx: `bunx firebase-tools deploy --only firestore:indexes`

Indexes may take a few minutes to build. Check status in [Firebase Console → Firestore → Indexes](https://console.firebase.google.com/project/cartage-agent-builder-dev/firestore/indexes).

## Adding new indexes

1. Edit `firestore.indexes.json` (add an entry to the `indexes` array).
2. Run `firebase deploy --only firestore:indexes` again.

When a query fails with "The query requires an index", the error message includes a link that pre-fills the index in the console; you can create it there once, then run `firebase firestore:indexes` to export the current indexes and merge the new one into `firestore.indexes.json` for version control.
