# D&D Character & Inventory Manager

A full-stack web application for managing tabletop RPG characters,
inventories, and equipped items. Built as a learning-driven project, it
combines a React client, a Node.js/Express API, and a relational SQLite
database.

> **Project status:** Active development (V3). The server and database
> now support full character data (species, background, ability scores,
> classes, skills, proficiencies, and weapon masteries). The client
> covers accounts, characters, inventory, and equipment, and does not yet
> use the newer character endpoints. The application is not yet a
> complete digital D&D character sheet.

## Features

### Accounts

-   Register and sign in with an account.
-   Session-based authentication and protected API routes.
-   Update account details and delete an account.
-   Store password hashes rather than plaintext passwords.

### Characters

-   Create characters with a name and maximum carrying weight.
-   View and select characters.
-   Edit and delete characters, including deletion confirmation.
-   Responsive character cards with a visual selected state.
-   Character editing through a reusable modal.
-   Set a character's species, background, and six ability scores
    (API).
-   Add classes with subclasses and levels, skills with optional
    expertise, proficiencies, and weapon masteries (API).
-   Fetch a full character sheet that combines the character with all of
    its classes, proficiencies, skills, and weapon masteries (API).

### Reference data

-   Read-only lookup endpoints for classes, subclasses, species,
    backgrounds, skills, proficiencies, and weapon masteries.
-   Item catalog with categories and type-specific details for weapons,
    armor, tools, ammunition, containers, and equipment packs.

### Inventory and equipment

-   Associate inventory entries with a specific character.
-   Track quantities and support nested containers through parent
    inventory references. Only container items can hold other items,
    and a container cannot be placed inside itself.
-   Store item metadata, including weight, cost, and item type.
-   Associate inventory entries with equipment slots.
-   Support item-specific reference data for weapons, armor, tools,
    ammunition, containers, and equipment packs in the database.

> Some equipment and inventory improvements remain planned, including
> clearer equipped-item indicators, improved weight accounting, and
> equipping individual units from stacks.

## Technology stack

  Layer               Technology
  ------------------- --------------------------------------------
  Frontend            React, Vite, JavaScript, CSS
  Backend             Node.js, Express
  Database            SQLite, `better-sqlite3`
  Authentication      `express-session`, Argon2 password hashing
  API communication   Fetch API with session cookies

## Database schema

The diagram below documents the project's database evolution across its
V1, V2, and V3 designs.

![D&D database schema diagram](docs/schemaDiagram.jpg)

**Note:** This diagram is a historical/design overview, not a guaranteed
exact snapshot of the current database. The SQL schema is the source of
truth for column definitions and constraints. For example, the current
`users` table has `email` and `password_hash` fields, while the
diagram's V1 account section shows an earlier design.

### Key relationships

-   **Users → Characters:** One user can own multiple characters.
    Deleting a user cascades to their characters.
-   **Characters → Reference data:** Each character can reference a
    species and a background, and links to classes (with subclass and
    level), proficiencies, skills, and weapon masteries through
    `character_to_*` join tables. Deleting a character removes these
    links.
-   **Characters → Inventory:** Each inventory entry belongs to a
    character. Entries can refer to a parent inventory entry owned by
    the same character to represent items inside containers.
-   **Inventory → Items:** Inventory entries reference shared item
    definitions and store character-specific quantities.
-   **Inventory → Equipment:** Equipment records link character-owned
    inventory entries to equipment slots.
-   **Items → Item details:** Reference and subtype tables describe item
    categories and specialized properties such as weapon damage, armor,
    tools, and pack contents.

The SQL schema also defines foreign keys, uniqueness constraints, and
checks to help maintain data integrity.

## Project organization

``` text
.
├── Client/
│   └── src/
│       ├── api/           # Frontend API helpers and requests
│       ├── components/    # Shared and feature-specific UI components
│       ├── pages/         # Page-level React components
│       ├── styles/        # CSS stylesheets
│       └── App.jsx        # Main application state and page coordination
├── Server/
│   ├── db/                # SQLite connection and query functions (+ tests)
│   ├── middleware/        # requireAuth and loadCharacter
│   ├── routes/            # Express API routes (+ tests)
│   ├── scripts/           # Database setup, seeding, and health-check scripts
│   ├── app.js             # Express app (used by server.js and the tests)
│   └── server.js          # Starts the API on port 3000
├── Database/              # schema.sql, seed SQL, source JSON, SQLite files
├── docs/
│   └── schemaDiagram.jpg
└── package.json           # Server dependencies and npm scripts
```

## API overview

All character routes require a logged-in session and only act on the
current user's characters, which are addressed by name.

  Area                 Routes
  -------------------- ---------------------------------------------------
  Auth                 `POST /auth/login`, `GET /auth/me`,
                       `POST /auth/logout`
  Users                `POST /users`, `PATCH /users/me`,
                       `DELETE /users/me`
  Characters           `GET /characters`, `GET/PATCH/DELETE
                       /characters/:name`, `POST /characters`
  Character sheet      `GET /characters/:name/sheet`
  Classes              `POST /characters/:name/classes`,
                       `PATCH/DELETE /characters/:name/classes/:classId`
  Skills               `POST /characters/:name/skills`,
                       `PATCH/DELETE /characters/:name/skills/:skillId`
  Proficiencies        `POST /characters/:name/proficiencies`,
                       `DELETE /characters/:name/proficiencies/:proficiencyId`
  Weapon masteries     `POST /characters/:name/weapon-masteries`,
                       `DELETE /characters/:name/weapon-masteries/:weaponTypeId`
  Inventory            `/characters/:name/inventory/...`
  Equipment            `/characters/:name/equipment/...`
  Items (public)       `/items/...`
  Lookups (public)     `/lookups/classes`, `/lookups/classes/:classId/subclasses`,
                       `/lookups/species`, `/lookups/backgrounds`,
                       `/lookups/skills`, `/lookups/proficiencies`,
                       `/lookups/weapon-masteries`

## Running locally

**Prerequisites:** Node.js 24 (see `.nvmrc`) and npm. The npm scripts
use Windows `set NODE_ENV=...&&` syntax, so run them from a Windows
shell. SQLite's command-line client is useful for inspecting the
database.

1.  Clone the repository and install the server dependencies from the
    repository root:

    ``` bash
    npm install
    ```

2.  Create a `.env` file in the repository root that defines
    `SESSION_SECRET`:

    ``` text
    SESSION_SECRET=replace-with-a-long-random-string
    ```

3.  Build the development database (`Database/dnd.db`) from the SQL
    files:

    ``` bash
    npm run init-db
    ```

4.  Start the API on `http://localhost:3000`:

    ``` bash
    npm start
    ```

5.  In a second terminal, start the Vite client from `Client/`:

    ``` bash
    cd Client
    npm install
    npm run dev
    ```

6.  Open the local URL printed by Vite (`http://localhost:5173`).

### Database scripts

  Command                  Purpose
  ------------------------ ----------------------------------------------
  `npm run init-db`        Delete and rebuild `Database/dnd.db`
  `npm run init-test-db`   Delete and rebuild `Database/test.db`
  `npm run check-db`       Health report for `dnd.db`
  `npm run check-test-db`  Health report for `test.db`
  `npm run seed-items`     Load `Database/Equipment.json` into `dnd.db`
  `npm run generate-seed`  Write the item tables from `dnd.db` to
                           `Database/seed.sql`

`init-db` deletes the existing database, including any accounts and
characters created locally. The `.db` files and `.env` are ignored by
git; avoid committing secrets or a database containing real user
information.

### Tests

``` bash
npm test                                      # all tests
npm test -- Server/routes/characters.test.js  # one file
```

Jest rebuilds `Database/test.db` before every run, so tests never touch
the development database.

## Development roadmap

-   [x] Account registration, login, logout, and account management
-   [x] Character creation, selection, editing, and deletion
-   [x] Character card styling and edit modal
-   [x] Extend characters with species, background, class, and level
    (server)
-   [x] Add six ability scores (server)
-   [x] Skills, proficiencies, and weapon masteries (server)
-   [ ] Client UI for species, classes, skills, proficiencies, and
    weapon masteries
-   [ ] Derived D&D statistics (modifiers, proficiency bonus, etc.)
-   [ ] Improve inventory/equipment interactions and weight calculations
-   [ ] Expand frontend validation, error handling, and automated tests
-   [ ] Continue responsive design and accessibility improvements
-   [ ] Explore character-sheet creation and PDF import/export

## Design goals

-   **Clear separation of concerns:** Keep React presentation, API
    routes, database queries, and persistence distinct.
-   **Relational integrity:** Use SQLite keys and constraints to protect
    character, inventory, and equipment relationships.
-   **Incremental development:** Add features in small, testable steps
    without disrupting existing workflows.
-   **Extensibility:** Leave room for richer D&D character data and
    future rules-based calculations.

## License

No license has been specified yet.
