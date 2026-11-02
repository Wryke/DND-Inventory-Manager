const db = require("./connection")

// --- Item Queries ---

// Shared SELECT for item rows, including currency and item type names
const itemSelect = `
    SELECT
        items.item_id,
        items.item_index,
        items.name,
        items.description,
        items.weight,
        items.cost_quantity,

        currency_lookup.currency_code,
        currency_lookup.currency_name,

        item_type_lookup.item_type_name
    FROM items
    LEFT JOIN currency_lookup
        ON items.currency_unit_id = currency_lookup.currency_unit_id
    LEFT JOIN item_type_lookup
        ON items.item_type_id = item_type_lookup.item_type_id
`

// Joins that restrict items to a category, for use after itemSelect
const itemCategoryJoin = `
    JOIN item_to_category
        ON items.item_id = item_to_category.item_id
    JOIN categories_lookup
        ON item_to_category.category_id = categories_lookup.category_id
`

const findAllItemsStmt = db.prepare(`
    ${itemSelect}
    ORDER BY items.name
`)

function findAllItems() {
    return findAllItemsStmt.all()
}

const findItemsByCategoryStmt = db.prepare(`
    ${itemSelect}
    ${itemCategoryJoin}
    WHERE categories_lookup.category_index = ?
    ORDER BY items.name
`)

function findItemsByCategory(categoryIndex) {
    return findItemsByCategoryStmt.all(categoryIndex)
}

const findItemByIndexStmt = db.prepare(`
    ${itemSelect}
    WHERE items.item_index = ?
`)

function findItemByIndex(itemIndex) {
    return findItemByIndexStmt.get(itemIndex)
}

const findItemByNameStmt = db.prepare(`
    ${itemSelect}
    WHERE items.name = ? COLLATE NOCASE
`)

function findItemByName(name) {
    return findItemByNameStmt.all(name)
}

const findAllItemCategoriesStmt = db.prepare(`
    SELECT
        category_id,
        category_index,
        category_name
    FROM categories_lookup
    ORDER BY category_name
`)

function findAllItemCategories() {
    return findAllItemCategoriesStmt.all()
}

const findItemByIndexAndCategoryStmt = db.prepare(`
    ${itemSelect}
    ${itemCategoryJoin}
    WHERE items.item_index = ?
        AND categories_lookup.category_index = ?
`)

function findItemByIndexAndCategory(itemIndex, categoryIndex) {
    return findItemByIndexAndCategoryStmt.get(itemIndex, categoryIndex)
}

const findItemByNameAndCategoryStmt = db.prepare(`
    ${itemSelect}
    ${itemCategoryJoin}
    WHERE items.name = ? COLLATE NOCASE
        AND categories_lookup.category_index = ?
    ORDER BY items.name
`)

function findItemByNameAndCategory(name, categoryIndex) {
    return findItemByNameAndCategoryStmt.all(name, categoryIndex)
}

// --- Item Equipment Details

const findItemEquipmentDataStmt = db.prepare(`
    SELECT
        items.item_id,
        items.item_index,
        items.name,
        weapons.item_id AS weapon_item_id,
        armor.armor_category,
        containers.item_id AS container_item_id
    FROM items
    LEFT JOIN weapons
        ON items.item_id = weapons.item_id
    LEFT JOIN armor
        ON items.item_id = armor.item_id
    LEFT JOIN containers
        ON items.item_id = containers.item_id
    WHERE items.item_id = ?
`)

const findItemEquipmentCategoriesStmt = db.prepare(`
    SELECT
        categories_lookup.category_index
    FROM item_to_category
    JOIN categories_lookup
        ON item_to_category.category_id =
            categories_lookup.category_id
    WHERE item_to_category.item_id = ?
`)

function findItemEquipmentData(itemId) {
    const item = findItemEquipmentDataStmt.get(itemId)

    if (!item) {
        return undefined
    }

    const categories =
        findItemEquipmentCategoriesStmt.all(itemId).map((category) => {
            return category.category_index
        })

    return {
        item_id: item.item_id,
        item_index: item.item_index,
        name: item.name,
        is_weapon: item.weapon_item_id !== null,
        armor_category: item.armor_category,
        is_container: item.container_item_id !== null,
        categories
    }
}

// --- Item Detail Queries ---

const findWeaponDetailsStmt = db.prepare(`
    SELECT
        w.item_id,
        w.range_normal,
        w.range_long,
        w.throw_range_normal,
        w.throw_range_long,

        t.weapon_type_id,
        t.weapon_type_index,
        t.weapon_type_name,
        t.weapon_category,
        
        m.mastery_id,
        m.mastery_index,
        m.mastery_name
    FROM weapons AS w
    JOIN weapon_type_lookup AS t
        ON w.weapon_type_id = t.weapon_type_id
    JOIN weapon_mastery_lookup AS m
        ON t.mastery_id = m.mastery_id
    WHERE w.item_id = ?
`)

const findWeaponPropertyStmt = db.prepare(`
    SELECT
        weapon_property_lookup.property_index,
        weapon_property_lookup.property_name
    FROM weapon_to_property
    JOIN weapon_property_lookup
        ON weapon_to_property.property_id = weapon_property_lookup.property_id
    WHERE weapon_to_property.item_id = ?
`)

const findWeaponDamageComponentsStmt = db.prepare(`
    SELECT 
        weapon_damage_components.damage_dice,
        weapon_damage_components.damage_mode,
        damage_type_lookup.damage_index,
        damage_type_lookup.damage_name
    FROM weapon_damage_components
    JOIN damage_type_lookup
        ON weapon_damage_components.damage_type_id = damage_type_lookup.damage_type_id
    WHERE weapon_damage_components.item_id = ?
`)

function findWeaponDetails(itemId) {
    const weapon = findWeaponDetailsStmt.get(itemId)

    if (!weapon) {
        return undefined
    }

    const properties = findWeaponPropertyStmt.all(itemId)

    const damage = findWeaponDamageComponentsStmt.all(itemId)

    return {
        ...weapon,
        properties,
        damage
    }
}

const findArmorDetailsStmt = db.prepare(`
    SELECT
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
    FROM armor
    WHERE item_id = ?
`)

const findArmorResistancesStmt = db.prepare(`
    SELECT
        damage_type_lookup.damage_index,
        damage_type_lookup.damage_name
    FROM armor_to_resistance
    JOIN damage_type_lookup
        ON armor_to_resistance.damage_type_id =
            damage_type_lookup.damage_type_id
    WHERE armor_to_resistance.item_id = ?
`)

function findArmorDetails(itemId) {
    const armor = findArmorDetailsStmt.get(itemId)

    if (!armor) {
        return undefined
    }

    const resistances = findArmorResistancesStmt.all(itemId)

    return {
        ...armor,
        resistances
    }
}

const findContainerDetailsStmt = db.prepare(`
    SELECT
        item_id,
        max_volume,
        max_carry_weight,
        max_item_count
    FROM containers
    WHERE item_id = ?
`)

function findContainerDetails(itemId) {
    return findContainerDetailsStmt.get(itemId)
}

const findAmmunitionDetailsStmt = db.prepare(`
    SELECT
        ammunition.item_id,
        ammunition.bundle_quantity,
        items.item_index AS storage_item_index,
        items.name AS storage_item_name
    FROM ammunition
    LEFT JOIN items
        ON ammunition.storage_item_id = items.item_id
    WHERE ammunition.item_id = ?
`)

function findAmmunitionDetails(itemId) {
    return findAmmunitionDetailsStmt.get(itemId)
}

const findToolDetailsStmt = db.prepare(`
    SELECT
        tools.item_id,
        ability_lookup.ability_index,
        ability_lookup.ability_name
    FROM tools
    LEFT JOIN ability_lookup
        ON tools.ability_score_id = ability_lookup.ability_score_id
    WHERE tools.item_id = ?
`)

const findToolCraftsStmt = db.prepare(`
    SELECT
        tool_craft.crafted_item_id,
        items.item_index,
        items.name
    FROM tool_craft
    JOIN items
        ON tool_craft.crafted_item_id = items.item_id
    WHERE tool_craft.item_id = ?
`)

const findToolUtilizeStmt = db.prepare(`
    SELECT
        tool_utilize.name,
        ability_lookup.ability_index,
        ability_lookup.ability_name,
        tool_utilize.dc_value,
        tool_utilize.success_type
    FROM tool_utilize
    JOIN ability_lookup
        ON tool_utilize.ability_score_id = ability_lookup.ability_score_id
    WHERE tool_utilize.item_id = ?
`)

function findToolDetails(itemId) {
    const tool = findToolDetailsStmt.get(itemId)

    if (!tool) {
        return undefined
    }

    const crafts = findToolCraftsStmt.all(itemId)

    const utilizes = findToolUtilizeStmt.all(itemId)

    return {
        ...tool,
        crafts,
        utilizes
    }
}

const findEquipmentPackDetailsStmt = db.prepare(`
    SELECT
        item_id
    FROM equipment_packs
    WHERE item_id = ?
`)

const findEquipmentPackContentsStmt = db.prepare(`
    SELECT
        pack_contents.contained_item_id,
        items.item_index,
        items.name,
        pack_contents.quantity
    FROM pack_contents
    JOIN items
        ON pack_contents.contained_item_id = items.item_id
    WHERE pack_contents.pack_item_id = ?
`)

function findEquipmentPackDetails(itemId) {
    const pack = findEquipmentPackDetailsStmt.get(itemId)

    if (!pack) {
        return undefined
    }

    const contents = findEquipmentPackContentsStmt.all(itemId)

    return {
        ...pack,
        contents
    }
}

module.exports = {
    findAllItems,
    findItemsByCategory,
    findItemByIndex,
    findItemByName,
    findAllItemCategories,
    findItemByIndexAndCategory,
    findItemByNameAndCategory,

    findWeaponDetails,
    findArmorDetails,
    findContainerDetails,
    findAmmunitionDetails,
    findToolDetails,
    findEquipmentPackDetails,
    
    findItemEquipmentData
}