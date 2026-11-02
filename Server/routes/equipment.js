const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")
const loadCharacter = require("../middleware/loadCharacter")

const {
    findInventoryEntryById
} = require("../db/inventoryQueries.js")

const {
    findEquipmentSlotById,
    findEquipmentEntryBySlot,
    findAllEquipment,
    findEquipmentEntryById,
    createEquipmentEntry,
    deleteEquipmentEntryById,
    isInventoryItemCompatibleWithSlot,
    findCompatibleInventory,
    isInventoryItemEquipped
} = require("../db/equipmentQueries.js")

// --- Equipment Routes ---
// GET characters/:name/equipment - Returns all of a characters equipped items
// GET characters/:name/equipment/compatible/:slotId - Return all a characters inventory items that are compatible with selected slot
// GET characters/:name/equipment/:equipmentId - Returns a specific equipped item
// POST characters/:name/equipment - Create an equipment entry
// PATCH ??
// DELETE characters/:name/equipment/:equipmentId - Delete an equipment entry
// --- -------------------------- ---

// --- Equipment Routes ---

// GET characters/:name/equipment - Returns all of a characters equipped items
router.get("/:name/equipment", requireAuth, loadCharacter, (req, res) => {
    const equipment = findAllEquipment(req.character.character_id)

    return res.status(200).json(equipment)
})

// GET characters/:name/equipment/compatible/:slotId - Return all a characters inventory items that are compatible with selected slot
router.get("/:name/equipment/compatible/:slotId", requireAuth, loadCharacter, (req, res) => {

    const slotId = Number(req.params.slotId)

    if (!Number.isInteger(slotId)) {
        return res.status(400).json({
            error: "Invalid character name or equipment slot ID"
        })
    }

    const validSlot = findEquipmentSlotById(slotId)

    if(!validSlot){
        return res.status(404).json({
            error: "Invalid slot ID"
        })
    }

    const compatibleInventory = findCompatibleInventory(req.character.character_id, slotId)

    return res.status(200).json(compatibleInventory)
})

// GET characters/:name/equipment/:equipmentId - Returns a specific equipped item
router.get("/:name/equipment/:equipmentId", requireAuth, loadCharacter, (req, res) => {

    const equipmentId = Number(req.params.equipmentId)

    if (!Number.isInteger(equipmentId)) {
        return res.status(400).json({
            error: "Invalid character name or equipment ID"
        })
    }

    const equipmentEntry = findEquipmentEntryById(req.character.character_id, equipmentId)

    if(!equipmentEntry){
        return res.status(404).json({
            error: "Equipment entry not found"
        })
    }

    return res.status(200).json(equipmentEntry)
})

// POST characters/:name/equipment - Create an equipment entry
router.post("/:name/equipment", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const { inventory_id, equipment_slot_id } = req.body

    if (
        !Number.isInteger(inventory_id) ||
        !Number.isInteger(equipment_slot_id)
    ) {
        return res.status(400).json({
            error: "Inventory ID and Slot ID must both be an integer"
        })
    }

    // Ensure inventory entry exists
    const inventoryEntry = findInventoryEntryById(characterId, inventory_id)

    if(!inventoryEntry) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    // Ensure equipment slot exists
    const validSlot = findEquipmentSlotById(equipment_slot_id)

    if(!validSlot){
        return res.status(404).json({
            error: "Invalid slot ID"
        })
    }

    // Ensure item is compatible with said slot
    if(!isInventoryItemCompatibleWithSlot(inventory_id, equipment_slot_id)){
        return res.status(400).json({
            "error": "Item is not compatible with this equipment slot"
        })
    }

    // Ensure the item isn't already equipped somewhere else
    if(isInventoryItemEquipped(characterId, inventory_id)){
        return res.status(409).json({
            "error": "Item is already equipped somewhere else"
        })
    }

    // Ensure the current slot isnt already being used
    const currentSlot = findEquipmentEntryBySlot(characterId, equipment_slot_id)

    if(currentSlot) {
        return res.status(409).json({
            error: "Current slot is occupied"
        })
    }

    try {
        const entry = createEquipmentEntry(
            characterId,
            inventory_id,
            equipment_slot_id
        )

        return res.status(201).json(entry)
    }
    catch (error) {
        // The slot can still be filled between the checks above and the insert
        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                error: "Current slot is occupied"
            })
        }

        if (error.message.includes("FOREIGN KEY constraint failed")) {
            return res.status(400).json({
                error: "Inventory entry or slot not found"
            })
        }

        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }

})

// PATCH ??

// DELETE characters/:name/equipment/:equipmentId - Delete an equipment entry
router.delete("/:name/equipment/:equipmentId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const equipmentId = Number(req.params.equipmentId)

    if (!Number.isInteger(equipmentId)) {
        return res.status(400).json({
            error: "A valid character name and equipment ID are required"
        })
    }

    try {
        // deleteEquipmentEntryById only matches this character's entries
        const deleted = deleteEquipmentEntryById(characterId, equipmentId)

        if (!deleted) {
            return res.status(404).json({
                error: "Equipment entry not found"
            })
        }

        const updatedEquipment = findAllEquipment(characterId)

        return res.status(200).json({
            deleted: true,
            equipment: updatedEquipment
        })
    } catch(error) {
        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

module.exports = router
