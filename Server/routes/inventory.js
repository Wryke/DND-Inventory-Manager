const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")
const loadCharacter = require("../middleware/loadCharacter")

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

// Check that a proposed parent exists and is a container.
// Returns an error response, or null when the parent is valid.
function checkParentContainer(res, characterId, parentInventoryId) {
    const parentEntry = findInventoryEntryById(characterId, parentInventoryId)

    if (!parentEntry) {
        return res.status(404).json({
            error: "Parent inventory entry not found"
        })
    }

    if (parentEntry.item_type_name !== "container") {
        return res.status(400).json({
            error: "Parent inventory entry is not a container"
        })
    }

    return null
}

// Map database constraint errors from inventory writes to responses
function handleInventoryWriteError(error, res) {
    if (error.message.includes("FOREIGN KEY constraint failed")) {
        return res.status(400).json({
            error: "Parent inventory entry not found"
        })
    }

    if (error.message.includes("CHECK constraint failed")) {
        return res.status(400).json({
            error: "Quantity must be a positive integer"
        })
    }

    console.error(error)

    return res.status(500).json({
        error: "Internal server error"
    })
}

// --- Inventory Routes ---

// GET /characters/:name/inventory/all - Returns a character's entire inventory
router.get("/:name/inventory/all", requireAuth, loadCharacter, (req, res) => {
    const inventory = findAllInventoryByCharacterId(req.character.character_id)

    return res.status(200).json(inventory)
})

// GET /characters/:name/inventory/root - Return a character's root inventory entries
router.get("/:name/inventory/root", requireAuth, loadCharacter, (req, res) => {
    const rootInventory = findRootInventoryByCharacterId(req.character.character_id)

    return res.status(200).json(rootInventory)
})

// GET /characters/:name/inventory/:inventoryId - Return an inventory entry
router.get("/:name/inventory/:inventoryId", requireAuth, loadCharacter, (req, res) => {

    const inventoryId = Number(req.params.inventoryId)

    if (!Number.isInteger(inventoryId)) {
        return res.status(400).json({
            error: "A valid inventory ID is required"
        })
    }

    const inventory = findInventoryEntryById(req.character.character_id, inventoryId)

    if (!inventory) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    return res.status(200).json(inventory)
})

// GET /characters/:name/inventory/:inventoryId/children - Return the direct children of an inventory entry
router.get("/:name/inventory/:inventoryId/children", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const inventoryId = Number(req.params.inventoryId)

    if (!Number.isInteger(inventoryId)) {
        return res.status(400).json({
            error: "A valid inventory ID is required"
        })
    }

    const parentEntry = findInventoryEntryById(characterId, inventoryId)

    if (!parentEntry) {
        return res.status(404).json({
            error: "Inventory entry not found"
        })
    }

    const inventory = findInventoryChildren(characterId, inventoryId)

    return res.status(200).json(inventory)
})

// POST /characters/:name/inventory - Create an inventory entry
router.post("/:name/inventory", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const { item_index, parent_inventory_id, quantity } = req.body

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

    // Ensure parent exists and can hold items
    if (parentInventoryId !== null) {
        const parentError = checkParentContainer(res, characterId, parentInventoryId)

        if (parentError) {
            return parentError
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
            character_id: characterId,
            item_id: newItem.item_id,
            parent_inventory_id: parentInventoryId,
            quantity
        })

        return res.status(201).json(entry)
    }
    catch (error) {
        return handleInventoryWriteError(error, res)
    }
})

// PATCH /characters/:name/inventory/:inventoryId - Update an inventory entry
router.patch("/:name/inventory/:inventoryId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const inventoryId = Number(req.params.inventoryId)
    const { quantity, parent_inventory_id } = req.body

    if (!Number.isInteger(inventoryId)) {
        return res.status(400).json({
            error: "A valid inventory ID is required"
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

    // Check the new parent exists and can hold items
    if (hasParentInventoryId && parent_inventory_id !== null) {
        const parentError = checkParentContainer(res, characterId, parent_inventory_id)

        if (parentError) {
            return parentError
        }

        // Check to ensure no descendants can be parents of their ancestors
        if (wouldCreateInventoryCycle(characterId, inventoryId, parent_inventory_id)) {
            return res.status(400).json({
                error: "An inventory entry cannot be moved into one of its descendants"
            })
        }
    }

    try {
        let updatedEntry

        if(hasQuantity && hasParentInventoryId) {
            updatedEntry = updateInventoryEntry(characterId, inventoryId, {quantity, parent_inventory_id})
        } else if (hasQuantity) {
            updatedEntry = updateInventoryQuantity(characterId, inventoryId, quantity)
        } else {
            updatedEntry = moveInventoryEntry(characterId, inventoryId, parent_inventory_id)
        }

        // The update queries only match this character's entries
        if (!updatedEntry) {
            return res.status(404).json({
                error: "Inventory entry not found"
            })
        }

        return res.status(200).json(updatedEntry)
    }
    catch (error) {
        return handleInventoryWriteError(error, res)
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
router.delete("/:name/inventory/:inventoryId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const inventoryId = Number(req.params.inventoryId)

    if (!Number.isInteger(inventoryId)) {
        return res.status(400).json({
            error: "A valid inventory ID is required"
        })
    }

    try {
        // deleteInventoryEntry only matches this character's entries
        const deleted = deleteInventoryEntry(characterId, inventoryId)

        if (!deleted) {
            return res.status(404).json({
                error: "Inventory entry not found"
            })
        }

        const updatedInventory = findAllInventoryByCharacterId(characterId)

        return res.status(200).json({
            deleted: true,
            inventory: updatedInventory
        })
    } catch(error) {
        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

module.exports = router
