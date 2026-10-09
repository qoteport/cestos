# Workbook mapping assistant

Optional assistance inside Connect to Database Table. Manual mapping and offline label suggestions remain available.

## Usage

1. Choose an available table and open Mapping assistant.
2. Optionally describe what one destination record represents.
3. Ask mapping assistant. This explicitly sends a bounded sample and guidance to the configured OpenAI service.
4. Review the proposed layout, reasons, confidence hints, warnings and extracted records. Low-confidence fields start unchecked.
5. Apply selected suggestions to the editor. Fill unmapped fields only is available when record-layout settings agree; existing field mappings take precedence.
6. Use the existing database validation and mapping-save controls. Neither assistance nor applying a proposal creates database records.

## Deployment

Deploy the frontend and backend endpoint POST /api/v1/workbook-connections/assist. Reuses backend OPENAI_API_KEY and OPENAI_MODEL. No credentials are included in the browser bundle. The configured model must support Chat Completions strict JSON Schema outputs. Missing configuration, provider errors and invalid proposals leave the manual mapping usable.

## Data and validation

- Maximum 1,200 nonempty cell samples, 160 characters each, plus up to 500 merge ranges, dimensions and bold hints. Representative rows and columns are sampled; partial coverage is disclosed.
- Sends only the active sheet sample, optional guidance and the server-discovered destination schema. Original Excel bytes, other sheets and source-file metadata are excluded.
- Suggestions are explicitly requested online and never queued for later transmission. No live provider calls are made by the automated test suite.
- The backend rechecks table permissions before contacting the provider, treats workbook content as untrusted, and validates returned field names, coordinates, layout and observed fixed-cell references.
- The model has no tools, SQL access or write capability. Provider requests set store=false; application code does not log cell samples or model prompts.
- Responses arriving after a sheet, table or mapping change are ignored. Applying a proposal clears old validation; it does not save the workbook.

API format reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).
