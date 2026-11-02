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
    findInventoryEntryById,
    findAllInventoryByCharacterId,
    findRootInventoryByCharacterId,
    findInventoryChildren,
    createInventoryEntry,
    updateInventoryQuantity,
    moveInventoryEntry,
    updateInventoryEntry,
    deleteInventoryEntry,
 } = require("../db/inventoryQueries.js")
const { findItemByIndex } = require("../db/itemQueries.js")

// --- Inventory Routes ---
// GET /characters/:name/inventory/all - Returns a character's entire inventory
// GET /characters/:name/inventory/root - Return a character's root inventory entries
// GET /characters/:name/inventory/:inventoryId - Return an inventory entry
// GET /characters/:name/inventory/:inventoryId/children - Return the direct children of an inventory entry
// POST /characters/:name/inventory - Create an inventory entry
// PATCH /characters/:name/inventory/:inventoryId - Update an inventory entry
// DELETE /characters/:name/inventory/:inventoryId - Delete an inventory entry
// --- ---------------- ---

// --- Inventory Routes ---

// GET /characters/:name/inventory/all - Returns a character's entire inventory
router.get("/:name/inventory/all", requireAuth, (req, res) => {
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
            error: "A valid character name is required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const inventory = findAllInventoryByCharacterId(character.character_id)

    return res.status(200).json(inventory)
})

// GET /characters/:name/inventory/root - Return a character's root inventory entries
router.get("/:name/inventory/root", requireAuth, (req, res) => {

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
            error: "A valid character name is required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const rootInventory = findRootInventoryByCharacterId(character.character_id)

    return res.status(200).json(rootInventory)
})

// GET /characters/:name/inventory/:inventoryId - Return an inventory entry
router.get("/:name/inventory/:inventoryId", requireAuth, (req, res) => {
    
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const inventoryId = Number(req.params.inventoryId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(inventoryId)
    ) {
        return res.status(400).json({
            error: "A valid character name and inventory ID are required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const inventory = findInventoryEntryById(character.character_id, inventoryId)

    if (!inventory) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    return res.status(200).json(inventory)
})

// GET /characters/:name/inventory/:inventoryId/children - Return the direct children of an inventory entry
router.get("/:name/inventory/:inventoryId/children", requireAuth, (req, res) => {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const inventoryId = Number(req.params.inventoryId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(inventoryId)
    ) {
        return res.status(400).json({
            error: "A valid character name and inventory ID are required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const parentEntry = findInventoryEntryById(character.character_id, inventoryId)

    if (!parentEntry) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    const inventory = findInventoryChildren(character.character_id, inventoryId)

    return res.status(200).json(inventory)
})

// POST /characters/:name/inventory - Create an inventory entry
router.post("/:name/inventory", requireAuth, (req, res) => {
    
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const { item_index, parent_inventory_id, quantity } = req.body

    if (
        typeof name !== "string" ||
        name.trim().length === 0
    ) {
        return res.status(400).json({
            error: "A valid character name is required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    if (
        typeof item_index !== "string" || 
        item_index.trim().length === 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        return res.status(400).json({
            error: "A valid item index and positive quantity are required"
        })
    }

    const parentInventoryId = parent_inventory_id ?? null

    if (parentInventoryId !== null && !Number.isInteger(parentInventoryId)) {
        return res.status(400).json({
            error: "Parent inventory ID must be an integer or null"
        })
    }

    // Ensure parent exists
    if (parentInventoryId !== null) {
        const parentEntry = findInventoryEntryById(character.character_id, parentInventoryId)

        if (!parentEntry) {
            return res.status(404).json({
                error: "Parent inventory entry not found"
            })
        }
    }

    // Ensure new item exists
    const newItem = findItemByIndex(item_index.trim())
    if(!newItem) {
        return res.status(404).json({
            error: "Item not found"
        })
    }

    try {
        const entry = createInventoryEntry({
            character_id: character.character_id,
            item_id: newItem.item_id,
            parent_inventory_id: parentInventoryId,
            quantity
        })

        return res.status(201).json(entry)
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

// PATCH /characters/:name/inventory/:inventoryId - Update an inventory entry
router.patch("/:name/inventory/:inventoryId", requireAuth, (req, res) => {
    
    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const inventoryId = Number(req.params.inventoryId)
    const { quantity, parent_inventory_id } = req.body

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(inventoryId)
    ) {
        return res.status(400).json({
            error: "A valid character name and inventory ID are required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const existingEntry = findInventoryEntryById( character.character_id, inventoryId)

    if (!existingEntry) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    const hasQuantity = quantity !== undefined
    const hasParentInventoryId = parent_inventory_id !== undefined

    // No arguments provided
    if (!hasQuantity && !hasParentInventoryId) {
        return res.status(400).json({
            error: "At least one update field is required"
        })
    }

    // Invalid quantity arg
    if (hasQuantity && (!Number.isInteger(quantity) || quantity <= 0)) {
        return res.status(400).json({
            error: "Quantity must be a positive integer"
        })
    }

    // Invalid parentId arg
    if (hasParentInventoryId && parent_inventory_id !== null && !Number.isInteger(parent_inventory_id)) {
        return res.status(400).json({
            error: "Parent inventory ID must be an integer or null"
        })
    }

    // Invalid self reference
    if (parent_inventory_id === inventoryId) {
        return res.status(400).json({
            error: "An inventory entry cannot contain itself"
        })
    }

    // Check if the new parent entry exists
    if (hasParentInventoryId && parent_inventory_id !== null) {
        const parentEntry = findInventoryEntryById(character.character_id, parent_inventory_id)

        if (!parentEntry) {
            return res.status(404).json({
                error: "Parent inventory entry not found"
            })
        }
    }

    // Check to ensure no descendants can be parents of their ancestors
    if (
        wouldCreateInventoryCycle(character.character_id, inventoryId, parent_inventory_id)
    ) {
        return res.status(400).json({
            error: "An inventory entry cannot be moved into one of its descendants"
        })
    }

    try {
        const characterId = character.character_id
        let updatedEntry

        if(hasQuantity && hasParentInventoryId) {
            updatedEntry = updateInventoryEntry(characterId, inventoryId, {quantity, parent_inventory_id})
        } else if (hasQuantity) {
            updatedEntry = updateInventoryQuantity(characterId, inventoryId, quantity)
        } else {
            updatedEntry = moveInventoryEntry(characterId, inventoryId, parent_inventory_id)
        }

        if (!updatedEntry) {
            return res.status(404).json({
                error: "Inventory entry not found"
            })
        }

        return res.status(200).json(updatedEntry)
    }
    catch (error) {
        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

// Helper for patch route to ensure decendant inventory cannot be parent of any ancestor
function wouldCreateInventoryCycle(characterId, inventoryId, proposedParentId) {
    
    let currentParentId = proposedParentId

    while (currentParentId !== null) {
        if (currentParentId === inventoryId) {
            return true
        }

        const currentEntry = findInventoryEntryById(
            characterId,
            currentParentId
        )

        if (!currentEntry) {
            return false
        }

        currentParentId = currentEntry.parent_inventory_id
    }

    return false
}

// DELETE /characters/:name/inventory/:inventoryId - Delete an inventory entry
router.delete("/:name/inventory/:inventoryId", requireAuth, (req, res) => {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name
    const inventoryId = Number(req.params.inventoryId)

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !Number.isInteger(inventoryId)
    ) {
        return res.status(400).json({
            error: "A valid character name and inventory ID are required"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    const existingEntry = findInventoryEntryById( character.character_id, inventoryId)

    if (!existingEntry) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    try {
        const deleted = deleteInventoryEntry(character.character_id, inventoryId)

        if (!deleted) {
            return res.status(500).json({
                error: "Entry could not be deleted"
            })
        }

        const updatedInventory = findAllInventoryByCharacterId(
            character.character_id
        )

        return res.status(200).json({
            deleted: true,
            inventory: updatedInventory
        })
    } catch(error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

module.exports = router