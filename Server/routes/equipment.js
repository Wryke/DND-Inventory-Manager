const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")

const { 
    findUserById
 } = require("../db/userQueries.js")

const {
    findCharacterByUserIdAndName
} = require("../db/characterQueries.js")

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
router.get("/:name/equipment", requireAuth, (req, res) => {
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name

    if (
        typeof name !== "string" ||
        name.trim().length === 0
    ) {
        return res.status(400).json({
            error: "Invalid character name"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if(!character){
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const equipment = findAllEquipment(character.character_id)

    return res.status(200).json(equipment)
})

// GET characters/:name/equipment/compatible/:slotId - Return all a characters inventory items that are compatible with selected slot
router.get("/:name/equipment/compatible/:slotId", requireAuth, (req, res) => {
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const slotId = Number(req.params.slotId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(slotId)
    ) {
        return res.status(400).json({
            error: "Invalid character name or equipment slot ID"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if(!character){
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const validSlot = findEquipmentSlotById(slotId)

    if(!validSlot){
        return res.status(404).json({
            error: "Invalid slot ID"
        })
    }

    const compatibleInventory = findCompatibleInventory(character.character_id, slotId)

    return res.status(200).json(compatibleInventory)
})

// GET characters/:name/equipment/:equipmentId - Returns a specific equipped item
router.get("/:name/equipment/:equipmentId", requireAuth, (req, res) => {
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }
    const name = req.params.name
    const equipmentId = Number(req.params.equipmentId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(equipmentId)
    ) {
        return res.status(400).json({
            error: "Invalid character name or equipment ID"
        })
    }  

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if(!character){
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const equipmentEntry = findEquipmentEntryById(character.character_id, equipmentId)

    if(!equipmentEntry){
        return res.status(404).json({
            error: "Equipment entry not found"
        })
    }

    return res.status(200).json(equipmentEntry)
})

// POST characters/:name/equipment - Create an equipment entry
router.post("/:name/equipment", requireAuth, (req, res) => {
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }
    const name = req.params.name
    const { inventory_id, equipment_slot_id } = req.body

    if (
        typeof name !== "string" ||
        name.trim().length === 0
    ) {
        return res.status(400).json({
            error: "A valid character name is required"
        })
    }

    const character = findCharacterByUserIdAndName(
        userId, 
        name.trim()
    )

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    if (
        !Number.isInteger(inventory_id) || 
        !Number.isInteger(equipment_slot_id)
    ) {
        return res.status(400).json({
            error: "Inventory ID and Slot ID must both be an integer"
        })
    }

    // Ensure inventory entry exists
    const inventoryEntry = findInventoryEntryById(
        character.character_id, 
        inventory_id
    )

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
    if(isInventoryItemEquipped(character.character_id, inventory_id)){
        return res.status(409).json({
            "error": "Item is already equipped somewhere else"
        })
    }

    // Ensure the current slot isnt already being used
    const currentSlot = findEquipmentEntryBySlot(
        character.character_id, 
        equipment_slot_id
    )

    if(currentSlot) {
        return res.status(409).json({
            error: "Current slot is occupied"
        })
    }

    try {
        const entry = createEquipmentEntry(
            character.character_id,
            inventory_id,
            equipment_slot_id
        )

        return res.status(201).json(entry)
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    }

})

// PATCH ??

// DELETE characters/:name/equipment/:equipmentId - Delete an equipment entry
router.delete("/:name/equipment/:equipmentId", requireAuth, (req, res) => {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const equipmentId = Number(req.params.equipmentId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(equipmentId)
    ) {
        return res.status(400).json({
            error: "A valid character name and equipment ID are required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const existingEntry = findEquipmentEntryById(
        character.character_id, 
        equipmentId
    )

    if (!existingEntry) {
        return res.status(404).json({
            error: "Equipment entry not found"
        })
    }

    try {
        const deleted = deleteEquipmentEntryById(
            character.character_id, 
            equipmentId
        )

        if (!deleted) {
            return res.status(500).json({
                error: "Entry could not be deleted"
            })
        }

        const updatedEquipment = findAllEquipment(character.character_id)

        return res.status(200).json({
            deleted: true,
            equipment: updatedEquipment
        })
    } catch(error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

module.exports = router