const fs = require("fs")
const path = require("path")
const Database = require("better-sqlite3")

// --- File Paths ---

const developmentDatabasePath = path.join(
    __dirname,
    "../../Database/dnd.db"
)

const seedPath = path.join(
    __dirname,
    "../../Database/seed.sql"
)

// Open the populated development database as read-only
const db = new Database(
    developmentDatabasePath,
    {
        readonly: true
    }
)

// --- SQL Helpers ---

// Safely convert a JavaScript value into a SQL literal
function toSqlValue(value) {
    if (value === null) {
        return "NULL"
    }

    if (typeof value === "number") {
        return String(value)
    }

    const escapedValue =
        String(value).replaceAll("'", "''")

    return `'${escapedValue}'`
}

// Generate an INSERT statement for a table and its rows
function generateInsert(tableName, columns, rows) {
    if (rows.length === 0) {
        return ""
    }

    const lines = [
        `INSERT INTO ${tableName} (`,
        columns
            .map(column => `    ${column}`)
            .join(",\n"),
        ")",
        "VALUES"
    ]

    const valueRows = rows.map((row, index) => {
        const suffix =
            index === rows.length - 1
                ? ";"
                : ","

        const values = columns.map(column =>
            toSqlValue(row[column])
        )

        return [
            "    (",
            values
                .map(value => `        ${value}`)
                .join(",\n"),
            `    )${suffix}`
        ].join("\n")
    })

    return [
        ...lines,
        ...valueRows
    ].join("\n")
}

// Read selected columns from a database table
function readTable(tableName, columns, orderBy) {
    return db.prepare(`
        SELECT
            ${columns.join(",\n            ")}
        FROM ${tableName}
        ORDER BY ${orderBy}
    `).all()
}

// --- Table Definitions ---

// Tables are listed in dependency order so referenced rows
// are inserted before rows containing foreign keys.
const tables = [
    {
        name: "categories_lookup",
        columns: [
            "category_id",
            "category_index",
            "category_name"
        ],
        orderBy: "category_id"
    },
    {
        name: "items",
        columns: [
            "item_id",
            "item_index",
            "name",
            "description",
            "weight",
            "cost_quantity",
            "currency_unit_id",
            "item_type_id"
        ],
        orderBy: "item_id"
    },
    {
        name: "item_to_equipment_slot",
        columns: [
            "item_id",
            "equipment_slot_id"
        ],
        orderBy: "item_id, equipment_slot_id"
    },
    {
        name: "item_to_category",
        columns: [
            "item_id",
            "category_id"
        ],
        orderBy: "item_id, category_id"
    },
    {
        name: "weapons",
        columns: [
            "item_id",
            "range_normal",
            "range_long",
            "throw_range_normal",
            "throw_range_long",
            "weapon_type_id"
        ],
        orderBy: "item_id"
    },
    {
        name: "weapon_damage_components",
        columns: [
            "damage_component_id",
            "item_id",
            "damage_dice",
            "damage_type_id",
            "damage_mode"
        ],
        orderBy: "damage_component_id"
    },
    {
        name: "weapon_to_property",
        columns: [
            "item_id",
            "property_id"
        ],
        orderBy: "item_id, property_id"
    },
    {
        name: "armor",
        columns: [
            "item_id",
            "armor_category",
            "base_ac",
            "dex_bonus",
            "max_bonus",
            "strength_minimum",
            "stealth_disadvantage",
            "don_time",
            "don_time_unit",
            "doff_time",
            "doff_time_unit"
        ],
        orderBy: "item_id"
    },
    {
        name: "armor_to_resistance",
        columns: [
            "item_id",
            "damage_type_id"
        ],
        orderBy: "item_id, damage_type_id"
    },
    {
        name: "containers",
        columns: [
            "item_id",
            "max_volume",
            "max_carry_weight",
            "max_item_count"
        ],
        orderBy: "item_id"
    },
    {
        name: "ammunition",
        columns: [
            "item_id",
            "bundle_quantity",
            "storage_item_id"
        ],
        orderBy: "item_id"
    },
    {
        name: "tools",
        columns: [
            "item_id",
            "ability_score_id"
        ],
        orderBy: "item_id"
    },
    {
        name: "tool_utilize",
        columns: [
            "utilize_id",
            "item_id",
            "name",
            "ability_score_id",
            "dc_value",
            "success_type"
        ],
        orderBy: "utilize_id"
    },
    {
        name: "tool_craft",
        columns: [
            "item_id",
            "crafted_item_id"
        ],
        orderBy: "item_id, crafted_item_id"
    },
    {
        name: "equipment_packs",
        columns: [
            "item_id"
        ],
        orderBy: "item_id"
    },
    {
        name: "pack_contents",
        columns: [
            "pack_item_id",
            "contained_item_id",
            "quantity"
        ],
        orderBy: "pack_item_id, contained_item_id"
    }
]

// --- Generate Seed SQL ---

const seedSections = [
    "-- Generated seed data",
    "-- Run npm run generate-seed to recreate this file",
    "-- Do not edit this file manually",
    "",
    "BEGIN TRANSACTION;",
    ""
]

let totalRows = 0

for (const table of tables) {
    const rows = readTable(
        table.name,
        table.columns,
        table.orderBy
    )

    totalRows += rows.length

    console.log(
        `${table.name}: ${rows.length} rows`
    )

    const insertSql = generateInsert(
        table.name,
        table.columns,
        rows
    )

    if (insertSql) {
        seedSections.push(
            `-- ${table.name}`,
            insertSql,
            ""
        )
    }
}

seedSections.push(
    "COMMIT;",
    ""
)

db.close()

// --- Write seed.sql ---

const seedSql =
    seedSections.join("\n")

fs.writeFileSync(
    seedPath,
    seedSql,
    "utf8"
)

console.log("")
console.log(
    `Generated seed.sql with ${totalRows} total rows`
)