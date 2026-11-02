# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A D&D character and inventory manager. Users register, create characters, and manage each character's inventory (including nested containers) and equipped items. It has three parts: a React/Vite client (`Client/`), an Express 5 API (`Server/`), and a SQLite database (`Database/`), accessed synchronously through `better-sqlite3`.

## Commands

The server's `package.json` and `node_modules` are at the **repo root**, not in `Server/`. Run server commands from the root. The npm scripts use Windows `set NODE_ENV=...&&` syntax, so they assume a Windows shell. Node version is in `.nvmrc` (24.x).

```bash
npm start                  # API on http://localhost:3000 (NODE_ENV=development, loads .env)
npm test                   # Jest, --runInBand, NODE_ENV=test
npm test -- Server/routes/characters.test.js     # single test file
npm test -- -t "name of test"                    # single test by name
npm run init-db            # delete and rebuild Database/dnd.db
npm run init-test-db       # delete and rebuild Database/test.db
npm run check-db           # inspect dev DB (check-test-db for the test DB)
```

Client (from `Client/`): `npm run dev` (Vite, port 5173), `npm run build`, `npm run lint`.

`.env` must define `SESSION_SECRET` (it is used by `express-session`).

## Database

- **`Database/schema.sql` is the source of truth** for tables and constraints. `docs/schemaDiagram.jpg` is a historical V1–V3 design overview and is not exact.
- `init-db` / `init-test-db` delete the DB file and then run four SQL files in order: `schema.sql` → `referenceSeed.sql` (lookup tables: classes, species, skills, slots, etc.) → `seed.sql` (item data) → `testValues.sql` (sample users/characters). Any schema change means updating these SQL files and re-running init. There are no migrations.
- `seed.sql` is **generated**, so don't hand-edit it. `Server/db/seedItems.js` loads `Database/Equipment.json` into `dnd.db`. `npm run generate-seed` then dumps the item tables from `dnd.db` back into `seed.sql`, in foreign-key dependency order (the table list is in `generateSeed.js`).
- `Server/db/connection.js` chooses the DB from `NODE_ENV` (`test` → `test.db`, otherwise `dnd.db`) and turns on `PRAGMA foreign_keys`. Many relationships depend on `ON DELETE CASCADE` (user → characters → inventory/equipment).
- Table naming: `*_lookup` tables hold reference data. `character_to_*` and `item_to_*` are join tables. Item subtypes (`weapons`, `armor`, `containers`, `ammunition`, `tools`, `equipment_packs`) extend `items`. `inventory.parent_inventory_id` models items inside containers.

## Server architecture

- `Server/app.js` builds the Express app (CORS for `http://localhost:5173` with credentials, session middleware, routers). `server.js` only calls `listen`. Tests import `app` directly through supertest.
- **Layering:** `routes/*.js` handle HTTP, validation and ownership checks. `db/*Queries.js` hold the SQL. Each query module prepares statements once at module load (`const fooStmt = db.prepare(...)`) and exports small wrapper functions (`function foo(...) { return fooStmt.get(...) }`). Follow this pattern when adding queries.
- Auth is session-based: `POST /auth/login` sets `req.session.userId`, and `middleware/requireAuth.js` rejects requests without it. Passwords are hashed with Argon2.
- Characters are addressed **by name within the logged-in user**, not by ID: `/characters/:name`, `/characters/:name/inventory/...`, `/characters/:name/equipment/...`. The inventory and equipment routers are mounted on `/characters` too. Routes usually look up the user, then the character via `findCharacterByUserIdAndName`, then act.

## Tests

- Jest `globalSetup` (`Server/jest.setup.js`) runs `npm run init-test-db` before every test run, so `test.db` is always rebuilt from the SQL files.
- Test files sit next to their source (`*.test.js`). `db/*.test.js` are integration tests that call the query functions against `test.db`. `routes/*.test.js` use `supertest` `request.agent(app)`: they register a user, log in, and create a character, using a unique `Date.now()`/random suffix so tests don't collide.

## Client architecture

- `Client/src/App.jsx` owns nearly all application state (current user, characters, selected character, inventory, equipment) and the handlers. It passes these down as props to `pages/*`. There's no router or state library; the page is switched with state and the `Sidebar`.
- `src/api/apiHelpers.js` `apiRequest()` adds `http://localhost:3000` to the endpoint, always sends `credentials: "include"` for the session cookie, and throws `data.error` on responses that aren't OK. The other `api/*.js` modules wrap it, one per resource.
- `src/utils/currency.js` handles coin conversion (e.g. `convertToGold`). `src/utils/inventory.js` holds inventory helpers.
