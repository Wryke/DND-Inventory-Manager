const fs = require("fs")
const path = require("path")
const db = require("../db/connection")

const equipmentPath = path.join(
    __dirname,
    "../../Database/Equipment.json"
)

// Read the source equipment data
const equipment = JSON.parse(
    fs.readFileSync(equipmentPath, "utf8")
)

// Containers do not have a consistent structural field in the source JSON
const containerIndexes = new Set([
    "backpack",
    "barrel",
    "basket",
    "bottle-glass",
    "bucket",
    "case-crossbow-bolt",
    "case-map-or-scroll",
    "chest",
    "component-pouch",
    "flask",
    "jug",
    "pot-iron",
    "pouch",
    "quiver",
    "sack",
    "vial",
    "waterskin"
])

// --- Insert Statements ---

const insertItemStmt = db.prepare(`
    INSERT OR IGNORE INTO items (
        item_index,
        name,
        description,
        weight,
        cost_quantity,
        currency_unit_id,
        item_type_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const insertCategoryStmt = db.prepare(`
    INSERT OR IGNORE INTO categories_lookup (
        category_index,
        category_name
    )
    VALUES (?, ?)
`)

const insertItemCategoryStmt = db.prepare(`
    INSERT OR IGNORE INTO item_to_category (
        item_id,
        category_id
    )
    VALUES (?, ?)
`)

const insertWeaponStmt = db.prepare(`
    INSERT INTO weapons (
        item_id,
        range_normal,
        range_long,
        throw_range_normal,
        throw_range_long,
        weapon_type_id
    )
    VALUES (?, ?, ?, ?, ?, ?)
`)

const insertWeaponDamageComponentStmt = db.prepare(`
    INSERT INTO weapon_damage_components (
        item_id,
        damage_dice,
        damage_type_id,
        damage_mode
    )
    VALUES (?, ?, ?, ?)
`)

const insertWeaponPropertyStmt = db.prepare(`
    INSERT INTO weapon_to_property (
        item_id,
        property_id
    )
    VALUES (?, ?)
`)

const insertArmorStmt = db.prepare(`
    INSERT INTO armor (
        item_id,
        armor_category,
        base_ac,
        dex_bonus,
        max_bonus,
        strength_minimum,
        stealth_disadvantage,
        don_time,
        don_time_unit,
        doff_time,
        doff_time_unit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertContainerStmt = db.prepare(`
    INSERT INTO containers (
        item_id,
        max_volume,
        max_carry_weight,
        max_item_count
    )
    VALUES (?, ?, ?, ?)
`)

const insertAmmunitionStmt = db.prepare(`
    INSERT INTO ammunition (
        item_id,
        bundle_quantity,
        storage_item_id
    )
    VALUES (?, ?, ?)
`)

const insertToolStmt = db.prepare(`
    INSERT INTO tools (
        item_id,
        ability_score_id
    )
    VALUES (?, ?)
`)

const insertToolUtilizeStmt = db.prepare(`
    INSERT INTO tool_utilize (
        item_id,
        name,
        ability_score_id,
        dc_value,
        success_type
    )
    VALUES (?, ?, ?, ?, ?)
`)

const insertToolCraftStmt = db.prepare(`
    INSERT OR IGNORE INTO tool_craft (
        item_id,
        crafted_item_id
    )
    VALUES (?, ?)
`)

const insertEquipmentPackStmt = db.prepare(`
    INSERT INTO equipment_packs (
        item_id
    )
    VALUES (?)
`)

const insertPackContentStmt = db.prepare(`
    INSERT OR IGNORE INTO pack_contents (
        pack_item_id,
        contained_item_id,
        quantity
    )
    VALUES (?, ?, ?)
`)

const insertItemEquipmentSlotStmt = db.prepare(`
    INSERT OR IGNORE INTO item_to_equipment_slot (
        item_id,
        equipment_slot_id
    )
    VALUES (?, ?)
`)

// --- Lookup Statements ---

const findItemByIndexStmt = db.prepare(`
    SELECT
        item_id
    FROM items
    WHERE item_index = ?
`)

const findItemTypeByNameStmt = db.prepare(`
    SELECT
        item_type_id
    FROM item_type_lookup
    WHERE item_type_name = ?
`)

const findCurrencyByCodeStmt = db.prepare(`
    SELECT
        currency_unit_id
    FROM currency_lookup
    WHERE currency_code = ?
`)

const findDamageTypeByIndexStmt = db.prepare(`
    SELECT
        damage_type_id
    FROM damage_type_lookup
    WHERE damage_index = ?
`)

const findWeaponPropertyByIndexStmt = db.prepare(`
    SELECT
        property_id
    FROM weapon_property_lookup
    WHERE property_index = ?
`)

const findWeaponTypeByIndexStmt = db.prepare(`
    SELECT
        weapon_type_id
    FROM weapon_type_lookup
    WHERE weapon_type_index = ?
`)

const findAbilityByIndexStmt = db.prepare(`
    SELECT
        ability_score_id
    FROM ability_lookup
    WHERE ability_index = ?
`)

const findCategoryByIndexStmt = db.prepare(`
    SELECT
        category_id
    FROM categories_lookup
    WHERE category_index = ?
`)

const findEquipmentSlotByIndexStmt = db.prepare(`
    SELECT equipment_slot_id
    FROM equipment_slot_lookup
    WHERE equipment_slot_index = ?
`)
// --- General Helpers ---

function getCategoryIndexes(item) {
    return item.equipment_categories?.map(
        category => category.index
    ) ?? []
}

function determineItemType(item) {
    const categoryIndexes = getCategoryIndexes(item)

    if (item.damage) {
        return "weapon"
    }

    if (item.armor_class) {
        return "armor"
    }

    if (item.contents) {
        return "equipment_pack"
    }

    if (categoryIndexes.includes("ammunition")) {
        return "ammunition"
    }

    if (
        item.ability ||
        item.utilize ||
        item.craft ||
        categoryIndexes.includes("tools")
    ) {
        return "tool"
    }

    if (containerIndexes.has(item.index)) {
        return "container"
    }

    return null
}

function getItemId(itemIndex) {
    const itemRow = findItemByIndexStmt.get(itemIndex)

    if (!itemRow) {
        throw new Error(
            `Item not found after base seeding: ${itemIndex}`
        )
    }

    return itemRow.item_id
}

function getAbilityId(abilityIndex) {
    if (!abilityIndex) {
        return null
    }

    const ability =
        findAbilityByIndexStmt.get(abilityIndex)

    return ability?.ability_score_id ?? null
}

function toSqliteBoolean(value) {
    if (value === null || value === undefined) {
        return null
    }

    return value ? 1 : 0
}

// --- Base Item Seeding ---

function seedBaseItem(item) {
    const itemType = determineItemType(item)

    const itemTypeRow = itemType
        ? findItemTypeByNameStmt.get(itemType)
        : undefined

    const itemTypeId =
        itemTypeRow?.item_type_id ?? null

    const currency = item.cost
        ? findCurrencyByCodeStmt.get(item.cost.unit)
        : undefined

    const currencyUnitId =
        currency?.currency_unit_id ?? null

    insertItemStmt.run(
        item.index,
        item.name,
        item.description ?? null,
        item.weight ?? null,
        item.cost?.quantity ?? null,
        currencyUnitId,
        itemTypeId
    )
}

// --- Category Seeding ---

function seedCategories(item, itemId) {
    for (const category of item.equipment_categories ?? []) {
        insertCategoryStmt.run(
            category.index,
            category.name
        )

        const categoryRow =
            findCategoryByIndexStmt.get(category.index)

        insertItemCategoryStmt.run(
            itemId,
            categoryRow.category_id
        )
    }
}

// --- EquipmentSlot Seeding
function seedEquipmentSlots(item, itemId) {
    const itemType = determineItemType(item)

    let slotIndexes = []

    if (itemType === "weapon") {
        slotIndexes = ["main_hand", "off_hand"]
    }

    if (itemType === "armor") {
        const armorCategory = getArmorCategory(item)

        if (armorCategory === "shield") {
            slotIndexes = ["main_hand", "off_hand"]
        } else {
            slotIndexes = ["body"]
        }
    }

    for (const slotIndex of slotIndexes) {
        const slot = findEquipmentSlotByIndexStmt.get(slotIndex)

        if (!slot) {
            throw new Error(
                `Equipment slot not found: ${slotIndex}`
            )
        }

        insertItemEquipmentSlotStmt.run(
            itemId,
            slot.equipment_slot_id
        )
    }
}

// --- Weapon Seeding ---

function seedWeapon(item, itemId) {
    const weaponType =
        findWeaponTypeByIndexStmt.get(item.index)

    if (!weaponType) {
        throw new Error(
            `Missing weapon type: ${item.index}`
        )
    }

    insertWeaponStmt.run(
        itemId,
        item.range?.normal ?? null,
        item.range?.long ?? null,
        item.throw_range?.normal ?? null,
        item.throw_range?.long ?? null,
        weaponType.weapon_type_id
    )

    seedWeaponDamageComponents(item, itemId)
    seedWeaponProperties(item, itemId)
}

function seedWeaponDamageComponents(item, itemId) {
    const standardDamageType =
        findDamageTypeByIndexStmt.get(
            item.damage.damage_type.index
        )

    if (!standardDamageType) {
        throw new Error(
            `Missing damage type: ${item.damage.damage_type.index}`
        )
    }

    insertWeaponDamageComponentStmt.run(
        itemId,
        item.damage.damage_dice,
        standardDamageType.damage_type_id,
        "standard"
    )

    if (!item.two_handed_damage) {
        return
    }

    const twoHandedDamageType =
        findDamageTypeByIndexStmt.get(
            item.two_handed_damage.damage_type.index
        )

    if (!twoHandedDamageType) {
        throw new Error(
            `Missing two-handed damage type: ${item.two_handed_damage.damage_type.index}`
        )
    }

    insertWeaponDamageComponentStmt.run(
        itemId,
        item.two_handed_damage.damage_dice,
        twoHandedDamageType.damage_type_id,
        "two-handed"
    )
}

function seedWeaponProperties(item, itemId) {
    for (const property of item.properties ?? []) {
        const propertyRow =
            findWeaponPropertyByIndexStmt.get(
                property.index
            )

        if (!propertyRow) {
            console.log(
                `Missing weapon property lookup: ${property.index} (${item.index})`
            )

            continue
        }

        insertWeaponPropertyStmt.run(
            itemId,
            propertyRow.property_id
        )
    }
}

// --- Armor Seeding ---

function getArmorCategory(item) {
    const categoryIndexes = getCategoryIndexes(item)

    if (categoryIndexes.includes("light-armor")) {
        return "light"
    }

    if (categoryIndexes.includes("medium-armor")) {
        return "medium"
    }

    if (categoryIndexes.includes("heavy-armor")) {
        return "heavy"
    }

    if (categoryIndexes.includes("shields")) {
        return "shield"
    }

    return null
}

function parseArmorTime(time) {
    if (!time) {
        return {
            value: null,
            unit: null
        }
    }

    const [value, ...unitParts] =
        time.trim().split(/\s+/)

    return {
        value: Number(value),
        unit: unitParts.join(" ")
    }
}

function seedArmor(item, itemId) {
    const armorCategory =
        getArmorCategory(item)

    if (armorCategory === null) {
        console.log(
            `Missing armor category: ${item.index}`
        )
    }

    const donTime =
        parseArmorTime(item.don_time)

    const doffTime =
        parseArmorTime(item.doff_time)

    insertArmorStmt.run(
        itemId,
        armorCategory,
        item.armor_class.base,
        toSqliteBoolean(item.armor_class.dex_bonus),
        item.armor_class.max_bonus ?? null,
        item.str_minimum ?? null,
        toSqliteBoolean(item.stealth_disadvantage),
        donTime.value,
        donTime.unit,
        doffTime.value,
        doffTime.unit
    )
}

// --- Container Seeding ---

function getContainerDetails(item) {
    const description =
        item.description ?? ""

    let maxVolume = null
    let maxCarryWeight = null
    let maxItemCount = null

    const weightMatch = description.match(
        /holds up to (\d+(?:\.\d+)?) pounds?/i
    )

    if (weightMatch) {
        maxCarryWeight = Number(weightMatch[1])
    }

    const itemCountMatch = description.match(
        /holds up to (\d+) (?:sheets?|bolts?|arrows?|items?)/i
    )

    if (itemCountMatch) {
        maxItemCount = Number(itemCountMatch[1])
    }

    const volumeMatch = description.match(
        /holds up to ([^.]*?(?:cubic foot|cubic feet|gallon|gallons|pint|pints|ounce|ounces))/i
    )

    if (volumeMatch) {
        maxVolume = volumeMatch[1]
    }

    return {
        maxVolume,
        maxCarryWeight,
        maxItemCount
    }
}

function seedContainer(item, itemId) {
    const {
        maxVolume,
        maxCarryWeight,
        maxItemCount
    } = getContainerDetails(item)

    insertContainerStmt.run(
        itemId,
        maxVolume,
        maxCarryWeight,
        maxItemCount
    )
}

// --- Ammunition Seeding ---

function seedAmmunition(item, itemId) {
    const storageItemId = item.storage
        ? getItemId(item.storage.index)
        : null

    insertAmmunitionStmt.run(
        itemId,
        item.quantity ?? null,
        storageItemId
    )
}

// --- Tool Seeding ---

function seedTool(item, itemId) {
    const abilityScoreId =
        getAbilityId(item.ability?.index)

    insertToolStmt.run(
        itemId,
        abilityScoreId
    )

    seedToolUtilize(item, itemId)
    seedToolCraft(item, itemId)
}

function seedToolUtilize(item, itemId) {
    for (const utilize of item.utilize ?? []) {
        const abilityScoreId =
            getAbilityId(
                utilize.dc?.dc_type?.index
            )

        insertToolUtilizeStmt.run(
            itemId,
            utilize.name,
            abilityScoreId,
            utilize.dc?.dc_value ?? null,
            utilize.dc?.success_type ?? null
        )
    }
}

function seedToolCraft(item, itemId) {
    for (const craftedItem of item.craft ?? []) {
        const craftedItemRow =
            findItemByIndexStmt.get(
                craftedItem.index
            )

        if (!craftedItemRow) {
            console.log(
                `Crafted item not found: ${craftedItem.index} (${item.index})`
            )

            continue
        }

        insertToolCraftStmt.run(
            itemId,
            craftedItemRow.item_id
        )
    }
}

// --- Equipment Pack Seeding ---

function seedEquipmentPack(item, itemId) {
    insertEquipmentPackStmt.run(itemId)

    for (const content of item.contents ?? []) {
        const containedItemRow =
            findItemByIndexStmt.get(
                content.item.index
            )

        if (!containedItemRow) {
            console.log(
                `Pack item not found: ${content.item.index} (${item.index})`
            )

            continue
        }

        insertPackContentStmt.run(
            itemId,
            containedItemRow.item_id,
            content.quantity
        )
    }
}

// --- Seed Database ---

const seedEquipment = db.transaction(() => {
    // Pass 1: create every base item first
    for (const item of equipment) {
        seedBaseItem(item)
    }

    // Pass 2: populate categories, subtype rows, and relationships
    for (const item of equipment) {
        const itemId =
            getItemId(item.index)

        const itemType =
            determineItemType(item)

        seedCategories(item, itemId)
        seedEquipmentSlots(item, itemId)

        switch (itemType) {
            case "weapon":
                seedWeapon(item, itemId)
                break

            case "armor":
                seedArmor(item, itemId)
                break

            case "container":
                seedContainer(item, itemId)
                break

            case "ammunition":
                seedAmmunition(item, itemId)
                break

            case "tool":
                seedTool(item, itemId)
                break

            case "equipment_pack":
                seedEquipmentPack(item, itemId)
                break
        }
    }
})

seedEquipment()

console.log("Items seeded.")