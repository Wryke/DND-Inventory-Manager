const db = require("../db/connection")

// --- Report State ---

let warningCount = 0

function section(title) {
    console.log(`\n--- ${title} ---`)
}

function success(message) {
    console.log(`PASS: ${message}`)
}

function warning(message) {
    warningCount++
    console.log(`WARNING: ${message}`)
}

function countRows(tableName) {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM ${tableName}
    `).get().count
}

// --- Database Header ---

console.log("\n================================")
console.log("       Database V2 Health")
console.log("================================")

// --- Foreign Key Integrity ---

section("Foreign Key Integrity")

const foreignKeyErrors = db.prepare(`
    PRAGMA foreign_key_check
`).all()

if (foreignKeyErrors.length === 0) {
    success("No foreign key violations")
}
else {
    warning(
        `${foreignKeyErrors.length} foreign key violation(s) found`
    )

    console.log(foreignKeyErrors)
}

// --- Core Table Counts ---

section("Core Data")

const coreCounts = {
    items: countRows("items"),
    categories: countRows("categories_lookup"),
    itemCategoryLinks: countRows("item_to_category")
}

console.log(`Items:               ${coreCounts.items}`)
console.log(`Categories:          ${coreCounts.categories}`)
console.log(`Item/category links: ${coreCounts.itemCategoryLinks}`)

if (coreCounts.items === 182) {
    success("Expected 182 equipment items found")
}
else {
    warning(
        `Expected 182 equipment items but found ${coreCounts.items}`
    )
}

// --- Lookup Tables ---

section("Lookup Tables")

const lookupCounts = {
    itemTypes: countRows("item_type_lookup"),
    currencies: countRows("currency_lookup"),
    damageTypes: countRows("damage_type_lookup"),
    abilities: countRows("ability_lookup"),
    weaponMasteries: countRows("weapon_mastery_lookup"),
    weaponProperties: countRows("weapon_property_lookup")
}

console.log(`Item types:        ${lookupCounts.itemTypes}`)
console.log(`Currencies:        ${lookupCounts.currencies}`)
console.log(`Damage types:      ${lookupCounts.damageTypes}`)
console.log(`Abilities:         ${lookupCounts.abilities}`)
console.log(`Weapon masteries:  ${lookupCounts.weaponMasteries}`)
console.log(`Weapon properties: ${lookupCounts.weaponProperties}`)

const expectedLookupCounts = {
    itemTypes: 6,
    currencies: 5,
    damageTypes: 13,
    abilities: 6,
    weaponMasteries: 8,
    weaponProperties: 10
}

for (const [lookup, expected] of Object.entries(expectedLookupCounts)) {
    if (lookupCounts[lookup] !== expected) {
        warning(
            `${lookup} expected ${expected} rows but found ${lookupCounts[lookup]}`
        )
    }
}

// --- Item Type Distribution ---

section("Item Types")

const itemTypeCounts = db.prepare(`
    SELECT
        COALESCE(
            item_type_lookup.item_type_name,
            'none'
        ) AS item_type,
        COUNT(*) AS count
    FROM items
    LEFT JOIN item_type_lookup
        ON items.item_type_id =
           item_type_lookup.item_type_id
    GROUP BY item_type_lookup.item_type_name
    ORDER BY item_type
`).all()

for (const row of itemTypeCounts) {
    console.log(
        `${row.item_type.padEnd(15)} ${row.count}`
    )
}

// --- Subtype Table Counts ---

section("Subtype Tables")

const subtypeCounts = {
    weapons: countRows("weapons"),
    armor: countRows("armor"),
    containers: countRows("containers"),
    ammunition: countRows("ammunition"),
    tools: countRows("tools"),
    equipmentPacks: countRows("equipment_packs")
}

console.log(`Weapons:         ${subtypeCounts.weapons}`)
console.log(`Armor:           ${subtypeCounts.armor}`)
console.log(`Containers:      ${subtypeCounts.containers}`)
console.log(`Ammunition:      ${subtypeCounts.ammunition}`)
console.log(`Tools:           ${subtypeCounts.tools}`)
console.log(`Equipment packs: ${subtypeCounts.equipmentPacks}`)

// --- Typed Items Missing Subtype Rows ---

section("Subtype Integrity")

const subtypeChecks = [
    {
        type: "weapon",
        table: "weapons"
    },
    {
        type: "armor",
        table: "armor"
    },
    {
        type: "container",
        table: "containers"
    },
    {
        type: "ammunition",
        table: "ammunition"
    },
    {
        type: "tool",
        table: "tools"
    },
    {
        type: "equipment_pack",
        table: "equipment_packs"
    }
]

for (const check of subtypeChecks) {
    const missing = db.prepare(`
        SELECT
            items.item_index,
            items.name
        FROM items
        JOIN item_type_lookup
            ON items.item_type_id =
               item_type_lookup.item_type_id
        LEFT JOIN ${check.table}
            ON items.item_id =
               ${check.table}.item_id
        WHERE item_type_lookup.item_type_name = ?
          AND ${check.table}.item_id IS NULL
    `).all(check.type)

    if (missing.length === 0) {
        success(
            `Every ${check.type} item has a ${check.table} row`
        )
    }
    else {
        warning(
            `${missing.length} ${check.type} item(s) are missing ${check.table} rows`
        )

        console.log(missing)
    }
}

// --- Subtype Rows Assigned to Wrong Item Type ---

section("Subtype Type Matching")

for (const check of subtypeChecks) {
    const incorrect = db.prepare(`
        SELECT
            items.item_index,
            items.name,
            item_type_lookup.item_type_name
        FROM ${check.table}
        JOIN items
            ON ${check.table}.item_id =
               items.item_id
        LEFT JOIN item_type_lookup
            ON items.item_type_id =
               item_type_lookup.item_type_id
        WHERE item_type_lookup.item_type_name IS NULL
           OR item_type_lookup.item_type_name != ?
    `).all(check.type)

    if (incorrect.length === 0) {
        success(
            `${check.table} rows match item type "${check.type}"`
        )
    }
    else {
        warning(
            `${incorrect.length} ${check.table} row(s) have incorrect item types`
        )

        console.log(incorrect)
    }
}

// --- Weapon Health ---

section("Weapon Details")

const weaponDamageCount =
    countRows("weapon_damage_components")

const weaponPropertyCount =
    countRows("weapon_to_property")

console.log(`Damage components:     ${weaponDamageCount}`)
console.log(`Weapon/property links: ${weaponPropertyCount}`)

const weaponsWithoutDamage = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM weapons
    JOIN items
        ON weapons.item_id = items.item_id
    LEFT JOIN weapon_damage_components
        ON weapons.item_id =
           weapon_damage_components.item_id
    WHERE weapon_damage_components.item_id IS NULL
`).all()

if (weaponsWithoutDamage.length === 0) {
    success("Every weapon has at least one damage component")
}
else {
    warning(
        `${weaponsWithoutDamage.length} weapon(s) have no damage component`
    )

    console.log(weaponsWithoutDamage)
}

const invalidDamageModes = db.prepare(`
    SELECT
        items.item_index,
        weapon_damage_components.damage_mode
    FROM weapon_damage_components
    JOIN items
        ON weapon_damage_components.item_id =
           items.item_id
    WHERE weapon_damage_components.damage_mode
        NOT IN ('standard', 'two-handed')
`).all()

if (invalidDamageModes.length === 0) {
    success("All weapon damage modes are valid")
}
else {
    warning(
        `${invalidDamageModes.length} invalid weapon damage mode(s)`
    )

    console.log(invalidDamageModes)
}

// --- Armor Health ---

section("Armor Details")

const armorWithoutCategory = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM armor
    JOIN items
        ON armor.item_id = items.item_id
    WHERE armor.armor_category IS NULL
`).all()

if (armorWithoutCategory.length === 0) {
    success("Every armor row has an armor category")
}
else {
    warning(
        `${armorWithoutCategory.length} armor row(s) have no category`
    )

    console.log(armorWithoutCategory)
}

const invalidArmorCategories = db.prepare(`
    SELECT
        items.item_index,
        armor.armor_category
    FROM armor
    JOIN items
        ON armor.item_id = items.item_id
    WHERE armor.armor_category
        NOT IN ('light', 'medium', 'heavy', 'shield')
`).all()

if (invalidArmorCategories.length === 0) {
    success("All armor categories are valid")
}
else {
    warning(
        `${invalidArmorCategories.length} invalid armor category value(s)`
    )

    console.log(invalidArmorCategories)
}

console.log(
    `Armor resistance links: ${countRows("armor_to_resistance")}`
)

// --- Container Health ---

section("Container Details")

const containerCount =
    countRows("containers")

const containersWithoutCapacity = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM containers
    JOIN items
        ON containers.item_id = items.item_id
    WHERE containers.max_volume IS NULL
      AND containers.max_carry_weight IS NULL
      AND containers.max_item_count IS NULL
`).all()

console.log(`Containers: ${containerCount}`)

if (containersWithoutCapacity.length === 0) {
    success("Every container has parsed capacity data")
}
else {
    warning(
        `${containersWithoutCapacity.length} container(s) have no parsed capacity data`
    )

    console.log(containersWithoutCapacity)
}

// --- Ammunition Health ---

section("Ammunition Details")

const ammunitionWithoutBundle = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM ammunition
    JOIN items
        ON ammunition.item_id = items.item_id
    WHERE ammunition.bundle_quantity IS NULL
`).all()

if (ammunitionWithoutBundle.length === 0) {
    success("Every ammunition entry has a bundle quantity")
}
else {
    warning(
        `${ammunitionWithoutBundle.length} ammunition row(s) have no bundle quantity`
    )

    console.log(ammunitionWithoutBundle)
}

const ammunitionWithoutStorage = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM ammunition
    JOIN items
        ON ammunition.item_id = items.item_id
    WHERE ammunition.storage_item_id IS NULL
`).all()

if (ammunitionWithoutStorage.length === 0) {
    success("Every ammunition entry has a storage item")
}
else {
    warning(
        `${ammunitionWithoutStorage.length} ammunition row(s) have no storage item`
    )

    console.log(ammunitionWithoutStorage)
}

// --- Tool Health ---

section("Tool Details")

const toolUtilizeCount =
    countRows("tool_utilize")

const toolCraftCount =
    countRows("tool_craft")

console.log(`Utilize entries: ${toolUtilizeCount}`)
console.log(`Craft links:     ${toolCraftCount}`)

const toolsWithoutAbility = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM tools
    JOIN items
        ON tools.item_id = items.item_id
    WHERE tools.ability_score_id IS NULL
`).all()

if (toolsWithoutAbility.length === 0) {
    success("Every tool has an associated ability")
}
else {
    warning(
        `${toolsWithoutAbility.length} tool(s) have no ability`
    )

    console.log(toolsWithoutAbility)
}

const utilizeWithoutAbility = db.prepare(`
    SELECT
        items.item_index,
        tool_utilize.name
    FROM tool_utilize
    JOIN items
        ON tool_utilize.item_id = items.item_id
    WHERE tool_utilize.ability_score_id IS NULL
`).all()

if (utilizeWithoutAbility.length === 0) {
    success("Every tool-utilize entry has an associated ability")
}
else {
    warning(
        `${utilizeWithoutAbility.length} utilize entry/entries have no ability`
    )

    console.log(utilizeWithoutAbility)
}

// --- Equipment Pack Health ---

section("Equipment Pack Details")

const packContentCount =
    countRows("pack_contents")

console.log(`Pack content rows: ${packContentCount}`)

const emptyPacks = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM equipment_packs
    JOIN items
        ON equipment_packs.item_id =
           items.item_id
    LEFT JOIN pack_contents
        ON equipment_packs.item_id =
           pack_contents.pack_item_id
    WHERE pack_contents.pack_item_id IS NULL
`).all()

if (emptyPacks.length === 0) {
    success("Every equipment pack contains at least one item")
}
else {
    warning(
        `${emptyPacks.length} equipment pack(s) have no contents`
    )

    console.log(emptyPacks)
}

// --- Category Health ---

section("Category Relationships")

const itemsWithoutCategories = db.prepare(`
    SELECT
        items.item_index,
        items.name
    FROM items
    LEFT JOIN item_to_category
        ON items.item_id =
           item_to_category.item_id
    WHERE item_to_category.item_id IS NULL
`).all()

if (itemsWithoutCategories.length === 0) {
    success("Every item belongs to at least one D&D category")
}
else {
    warning(
        `${itemsWithoutCategories.length} item(s) have no category relationship`
    )

    console.log(itemsWithoutCategories)
}

// --- Orphan Checks ---

section("Relationship Integrity")

const orphanChecks = [
    {
        name: "weapon damage components",
        query: `
            SELECT COUNT(*) AS count
            FROM weapon_damage_components
            LEFT JOIN weapons
                ON weapon_damage_components.item_id =
                   weapons.item_id
            WHERE weapons.item_id IS NULL
        `
    },
    {
        name: "weapon property links",
        query: `
            SELECT COUNT(*) AS count
            FROM weapon_to_property
            LEFT JOIN weapons
                ON weapon_to_property.item_id =
                   weapons.item_id
            WHERE weapons.item_id IS NULL
        `
    },
    {
        name: "armor resistance links",
        query: `
            SELECT COUNT(*) AS count
            FROM armor_to_resistance
            LEFT JOIN armor
                ON armor_to_resistance.item_id =
                   armor.item_id
            WHERE armor.item_id IS NULL
        `
    },
    {
        name: "tool utilize rows",
        query: `
            SELECT COUNT(*) AS count
            FROM tool_utilize
            LEFT JOIN tools
                ON tool_utilize.item_id =
                   tools.item_id
            WHERE tools.item_id IS NULL
        `
    },
    {
        name: "tool craft links",
        query: `
            SELECT COUNT(*) AS count
            FROM tool_craft
            LEFT JOIN tools
                ON tool_craft.item_id =
                   tools.item_id
            WHERE tools.item_id IS NULL
        `
    },
    {
        name: "pack content rows",
        query: `
            SELECT COUNT(*) AS count
            FROM pack_contents
            LEFT JOIN equipment_packs
                ON pack_contents.pack_item_id =
                   equipment_packs.item_id
            WHERE equipment_packs.item_id IS NULL
        `
    }
]

for (const check of orphanChecks) {
    const result =
        db.prepare(check.query).get()

    if (result.count === 0) {
        success(`No orphaned ${check.name}`)
    }
    else {
        warning(
            `${result.count} orphaned ${check.name}`
        )
    }
}

// --- Final Status ---

console.log("\n================================")

if (warningCount === 0) {
    console.log("DATABASE STATUS: HEALTHY")
    console.log("No problems detected.")
}
else {
    console.log(
        `DATABASE STATUS: ${warningCount} WARNING(S)`
    )
    console.log(
        "Review the warnings above before continuing."
    )
}

console.log("================================\n")