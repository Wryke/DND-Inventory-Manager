const db = require("./connection")


// --- Inventory Queries ---

// Shared SELECT for inventory rows, including item, currency, and item type details
const inventorySelect = `
    SELECT
        inventory.inventory_id,
        inventory.character_id,
        inventory.item_id,
        inventory.parent_inventory_id,
        inventory.quantity,

        items.item_index,
        items.name,
        items.description,
        items.weight,
        items.cost_quantity,

        currency_lookup.currency_code,
        currency_lookup.currency_name,
        item_type_lookup.item_type_name
    FROM inventory
    JOIN items
        ON inventory.item_id = items.item_id
    LEFT JOIN currency_lookup
        ON items.currency_unit_id = currency_lookup.currency_unit_id
    LEFT JOIN item_type_lookup
        ON items.item_type_id = item_type_lookup.item_type_id
`

const findInventoryEntryByIdStmt = db.prepare(`
    ${inventorySelect}
    WHERE inventory.character_id = ?
      AND inventory.inventory_id = ?
`)

function findInventoryEntryById(characterId, inventoryId) {
    return findInventoryEntryByIdStmt.get(characterId, inventoryId)
}

const findAllInventoryByCharacterIdStmt = db.prepare(`
    ${inventorySelect}
    WHERE inventory.character_id = ?
    ORDER BY items.name
`)

function findAllInventoryByCharacterId(characterId) {
    return findAllInventoryByCharacterIdStmt.all(characterId)
}

const findRootInventoryByCharacterIdStmt = db.prepare(`
    ${inventorySelect}
    WHERE inventory.character_id = ?
      AND inventory.parent_inventory_id IS NULL
    ORDER BY items.name
`)

function findRootInventoryByCharacterId (characterId) {
    return findRootInventoryByCharacterIdStmt.all(characterId)
}

const findInventoryChildrenStmt = db.prepare(`
    ${inventorySelect}
    WHERE inventory.character_id = ?
      AND inventory.parent_inventory_id = ?
    ORDER BY items.name
`)

function findInventoryChildren(characterId, parentInventoryId) {
    return findInventoryChildrenStmt.all(characterId, parentInventoryId)
}

// Total carried weight, including items inside containers.
// Items without a weight count as 0.
const findInventoryWeightByCharacterIdStmt = db.prepare(`
    SELECT
        COALESCE(SUM(inventory.quantity * COALESCE(items.weight, 0)), 0) AS total_weight
    FROM inventory
    JOIN items
        ON inventory.item_id = items.item_id
    WHERE inventory.character_id = ?
`)

function findInventoryWeightByCharacterId(characterId) {
    return findInventoryWeightByCharacterIdStmt.get(characterId).total_weight
}

const createInventoryEntryStmt = db.prepare(`
    INSERT INTO inventory (
        character_id,
        item_id,
        parent_inventory_id,
        quantity
    )
    VALUES (?, ?, ?, ?)
`)

function createInventoryEntry( { character_id, item_id, parent_inventory_id = null, quantity } ) {
    const result = createInventoryEntryStmt.run(character_id, item_id, parent_inventory_id, quantity)

    return findInventoryEntryById(character_id, result.lastInsertRowid)
}

const updateInventoryQuantityStmt = db.prepare(`
    UPDATE inventory
    SET quantity = ?
    WHERE character_id = ?
      AND inventory_id = ?
`)

function updateInventoryQuantity(characterId, inventoryId, quantity) {
    const result = updateInventoryQuantityStmt.run(quantity, characterId, inventoryId)

    if (result.changes === 0) {
        return undefined
    }

    return findInventoryEntryById(characterId, inventoryId)
}

const moveInventoryEntryStmt = db.prepare(`
    UPDATE inventory
    SET parent_inventory_id = ?
    WHERE character_id = ?
      AND inventory_id = ?
`)

function moveInventoryEntry(characterId, inventoryId, parentInventoryId) {
    const result = moveInventoryEntryStmt.run(parentInventoryId, characterId, inventoryId)

    if (result.changes === 0) {
        return undefined
    }

    return findInventoryEntryById(characterId, inventoryId)
}

// Atomically update an inventory entry's quantity and parent
const updateInventoryEntryTransaction = db.transaction(
    (characterId, inventoryId, { quantity, parent_inventory_id }) => {

        const quantityResult = updateInventoryQuantityStmt.run(quantity, characterId, inventoryId)

        if (quantityResult.changes === 0) {
            return undefined
        }

        moveInventoryEntryStmt.run(parent_inventory_id, characterId, inventoryId)

        return findInventoryEntryById(characterId, inventoryId)
    }
)

function updateInventoryEntry(characterId, inventoryId, { quantity, parent_inventory_id }) {
    return updateInventoryEntryTransaction(characterId, inventoryId, { quantity, parent_inventory_id })
}

const deleteInventoryEntryStmt = db.prepare(`
    DELETE FROM inventory
    WHERE character_id = ?
      AND inventory_id = ?
`)

// Promote direct children to the root before deleting a container.
// Required: the parent foreign key has no ON DELETE action (see schema.sql).
const moveChildrenToRootStmt = db.prepare(`
    UPDATE inventory
    SET parent_inventory_id = NULL
    WHERE character_id = ?
      AND parent_inventory_id = ?
`)

// Atomically delete an inventory entry while promoting its children
const deleteInventoryEntryTransaction = db.transaction(
    (characterId, inventoryId) => {
        moveChildrenToRootStmt.run(characterId, inventoryId)

        const result = deleteInventoryEntryStmt.run(characterId, inventoryId)

        return result.changes === 1
    }
)

function deleteInventoryEntry (characterId, inventoryId) {
    return deleteInventoryEntryTransaction(characterId, inventoryId)
}

module.exports = {
    findInventoryEntryById,
    findAllInventoryByCharacterId,
    findRootInventoryByCharacterId,
    findInventoryChildren,
    findInventoryWeightByCharacterId,
    createInventoryEntry,
    updateInventoryQuantity,
    moveInventoryEntry,
    updateInventoryEntry,
    deleteInventoryEntry
}
