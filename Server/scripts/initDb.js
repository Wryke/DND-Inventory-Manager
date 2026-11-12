const fs = require("fs")
const path = require("path")
const Database = require("better-sqlite3")

// Select the database to rebuild, matching Server/db/connection.js
const databaseName = process.env.NODE_ENV === "test"
    ? "test.db"
    : "dnd.db"

// File paths used to recreate the database
const databasePath = path.join(
    __dirname,
    "../../Database",
    databaseName
)

const schemaPath = path.join(
    __dirname,
    "../../Database/schema.sql"
)

const referencePath = path.join(
    __dirname,
    "../../Database/referenceSeed.sql"
)

const seedPath = path.join(
    __dirname,
    "../../Database/seed.sql"
)

const testValuesPath = path.join(
    __dirname,
    "../../Database/testValues.sql"
)

// Remove the previous database so each run starts fresh
if (fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath)
}

// Create a new SQLite database and enable foreign key enforcement
const db = new Database(databasePath)
db.pragma("foreign_keys = ON")

// Build the database schema
const schema = fs.readFileSync(schemaPath, "utf8")
db.exec(schema)

// Populate lookup/reference data
const reference = fs.readFileSync(referencePath, "utf8")
db.exec(reference)

// Populate seeded item data
const seed = fs.readFileSync(seedPath, "utf8")
db.exec(seed)

// Populate test data
const testValues = fs.readFileSync(testValuesPath, "utf8")
db.exec(testValues)

// Close the database connection
db.close()

console.log(`Database ${databaseName} created successfully`)
