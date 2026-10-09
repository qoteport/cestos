# Database workspace

Your workspace lists supported application collection endpoints permitted by the current account. View as sheets loads records into a new workbook; the optional related-table toggle includes direct foreign-key targets with permitted collection endpoints. Each sheet retains its source path, columns, and baseline record values in offline storage.

The catalog at `/api/v1/workbook-connections/workspace` describes permitted POST Create and PATCH Update contracts. Update actions require a readable detail endpoint. Endpoints with required external context, unsupported collection responses, and security-management routes are not exposed by the existing source discovery. This is an application-table browser, not unrestricted raw SQL access.

Review database changes compares cells by record ID, shows before/after values, and requires confirmation for each record. Before PATCH, current server values are compared with the loaded baseline. Original application endpoints enforce permissions and validation. This preflight check is not an atomic optimistic-concurrency guarantee: edits arriving between GET and PATCH depend on the original endpoint's concurrency support. Saves are independent, not a multi-record transaction. Deleted sheet rows never delete database records. Unknown/duplicate IDs and changed headers prevent saving.

New record uses the original Create schema, supports scalar fields and JSON for nested fields, and requires review before POST. Writes never enter offline queues or autosave. Ambiguous write outcomes are not automatically retried; verify the database before retrying. Copies retain source links but clear record IDs/baselines so they create new records.

Deploy both frontend and backend catalog changes. Existing snapshots without baseline metadata must be loaded again before record updates can be reviewed. No database migration is needed.
