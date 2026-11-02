const db = require("./connection")


// --- Equipment Queries ---

const findAllEquipmentSlotsStmt = db.prepare(`
    SELECT
        equipment_slot_id,
        equipment_slot_index,
        equipment_slot_name
    FROM equipment_slot_lookup
    ORDER BY equipment_slot_id
`)

function findAllEquipmentSlots() {
    return findAllEquipmentSlotsStmt.all()
}


const findEquipmentSlotByIdStmt = db.prepare(`
    SELECT
        equipment_slot_id,
        equipment_slot_index,
        equipment_slot_name
    FROM equipment_slot_lookup
    WHERE equipment_slot_id = ?
`)

function findEquipmentSlotById(equipmentSlotId) {
    return findEquipmentSlotByIdStmt.get(equipmentSlotId)
}


// Shared SELECT for equipment rows, including the item and slot details
const equipmentSelect = `
    SELECT
        equipment.equipment_id,
        equipment.character_id,
        equipment.inventory_id,

        items.item_id,
        items.item_index,
        items.name,

        equipment.equipment_slot_id,
        equipment_slot_lookup.equipment_slot_index,
        equipment_slot_lookup.equipment_slot_name
    FROM equipment
    JOIN inventory
        ON equipment.inventory_id = inventory.inventory_id
    JOIN equipment_slot_lookup
        ON equipment.equipment_slot_id = equipment_slot_lookup.equipment_slot_id
    JOIN items
        ON inventory.item_id = items.item_id
`

const findEquipmentEntryBySlotStmt = db.prepare(`
    ${equipmentSelect}
    WHERE equipment.character_id = ?
        AND equipment.equipment_slot_id = ?
`)

function findEquipmentEntryBySlot(characterId, equipmentSlotId) {
    return findEquipmentEntryBySlotStmt.get(
        characterId,
        equipmentSlotId
    )
}


const findAllEquipmentStmt = db.prepare(`
    ${equipmentSelect}
    WHERE equipment.character_id = ?
    ORDER BY equipment.equipment_slot_id
`)

function findAllEquipment(characterId) {
    return findAllEquipmentStmt.all(characterId)
}


const findEquipmentEntryByIdStmt = db.prepare(`
    ${equipmentSelect}
    WHERE equipment.character_id = ?
        AND equipment.equipment_id = ?
`)

function findEquipmentEntryById(characterId, equipmentId) {
    return findEquipmentEntryByIdStmt.get(
        characterId,
        equipmentId
    )
}


const createEquipmentEntryStmt = db.prepare(`
    INSERT INTO equipment (
        character_id,
        inventory_id,
        equipment_slot_id
    )
    VALUES (?, ?, ?)
`)

function createEquipmentEntry(characterId, inventoryId, equipmentSlotId) {
    const result = createEquipmentEntryStmt.run(
        characterId,
        inventoryId,
        equipmentSlotId
    )

    return findEquipmentEntryById(characterId, result.lastInsertRowid)
}


const deleteEquipmentEntryByIdStmt = db.prepare(`
    DELETE FROM equipment
    WHERE character_id = ?
        AND equipment_id = ?
`)

function deleteEquipmentEntryById(characterId, equipmentId) {
    const result = deleteEquipmentEntryByIdStmt.run(
        characterId,
        equipmentId
    )

    return result.changes === 1
}

const isInventoryItemCompatibleWithSlotStmt = db.prepare(`
    SELECT EXISTS (
        SELECT 1
        FROM inventory
        JOIN item_to_equipment_slot
            ON inventory.item_id = item_to_equipment_slot.item_id
        WHERE inventory.inventory_id = ?
        AND item_to_equipment_slot.equipment_slot_id = ?
    ) AS is_compatible;
`)

function isInventoryItemCompatibleWithSlot(inventoryId, equipmentSlotId) {
    const row = isInventoryItemCompatibleWithSlotStmt.get(
        inventoryId,
        equipmentSlotId
    )

    return row.is_compatible === 1
}

const findCompatibleInventoryStmt = db.prepare(`
    SELECT
        inventory.inventory_id,

        items.item_id,
        items.item_index,
        items.name
    FROM inventory
    JOIN items
        ON inventory.item_id = items.item_id
    JOIN item_to_equipment_slot
        ON inventory.item_id = item_to_equipment_slot.item_id
    WHERE inventory.character_id = ?
        AND item_to_equipment_slot.equipment_slot_id = ?
        AND NOT EXISTS (
            SELECT 1
            FROM equipment
            WHERE equipment.character_id = inventory.character_id
                AND equipment.inventory_id = inventory.inventory_id
        )
`)

function findCompatibleInventory(characterId, equipmentSlotId) {
    return findCompatibleInventoryStmt.all(characterId, equipmentSlotId)
}

const isInventoryItemEquippedStmt = db.prepare(`
    SELECT EXISTS (
        SELECT 1
        FROM equipment
        WHERE equipment.character_id = ?
            AND equipment.inventory_id = ?
    ) AS is_equipped;
`)

function isInventoryItemEquipped(characterId, inventoryId){
    const row = isInventoryItemEquippedStmt.get(
        characterId,
        inventoryId
    )

    return row.is_equipped === 1
}

module.exports = {
    findAllEquipmentSlots,
    findEquipmentSlotById,
    findEquipmentEntryBySlot,
    findAllEquipment,
    findEquipmentEntryById,
    createEquipmentEntry,
    deleteEquipmentEntryById,
    isInventoryItemCompatibleWithSlot,
    findCompatibleInventory,
    isInventoryItemEquipped
}
