const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")
const loadCharacter = require("../middleware/loadCharacter")

const {
    findUserById
 } = require("../db/userQueries.js")

 const {
    findCharactersByUserId,
    createCharacter,
    updateCharacterById,
    deleteCharacterById
 } = require("../db/characterQueries.js")

// --- Character Routes ---
// GET /characters/ - Return all characters owned by a user
// GET /characters/:name - Return a character by name
// POST /characters/ - Create a character for a user
// PATCH /characters/:name - Update a character's core attributes
// DELETE /characters/:name - Delete a character and everything it owns
// --- ---------------- ---

// Optional character fields accepted by POST and PATCH
const lookupFields = ["species_id", "background_id"]

const abilityScoreFields = [
    "strength_score",
    "dexterity_score",
    "constitution_score",
    "intelligence_score",
    "wisdom_score",
    "charisma_score"
]

// Return an error message for any invalid optional field, or null
function validateOptionalFields(body) {
    for (const field of lookupFields) {
        if (body[field] !== undefined && (!Number.isInteger(body[field]) || body[field] <= 0)) {
            return `${field} must be a positive integer`
        }
    }

    for (const field of abilityScoreFields) {
        if (body[field] !== undefined && (!Number.isInteger(body[field]) || body[field] <= 0)) {
            return `${field} must be a positive integer`
        }
    }

    return null
}

function isValidMaxWeight(maxWeight) {
    return typeof maxWeight === "number" && Number.isFinite(maxWeight) && maxWeight > 0
}

// Copy only the optional fields that were supplied
function pickOptionalFields(body) {
    const fields = {}

    for (const field of [...lookupFields, ...abilityScoreFields]) {
        if (body[field] !== undefined) {
            fields[field] = body[field]
        }
    }

    return fields
}

// Map database constraint errors from character writes to responses
function handleCharacterWriteError(error, res) {
    if (error.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({
            error: "This user already has a character with that name"
        })
    }

    if (error.message.includes("FOREIGN KEY constraint failed")) {
        return res.status(400).json({
            error: "Species or background not found"
        })
    }

    if (error.message.includes("CHECK constraint failed")) {
        return res.status(400).json({
            error: "One or more character fields are out of range"
        })
    }

    return res.status(500).json({
        error: "Internal server error"
    })
}

// --- Character Routes ---

// GET /characters/ - Return all characters owned by a user
router.get("/", requireAuth, (req, res) => {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const characters = findCharactersByUserId(userId)

    return res.status(200).json(characters)
})

// GET /characters/:name - Return a character by name
router.get("/:name", requireAuth, loadCharacter, (req, res) => {
    return res.status(200).json(req.character)
})

// POST /characters/ - Create a character for a user
router.post("/", requireAuth, (req, res) => {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const { name, max_weight } = req.body

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        !isValidMaxWeight(max_weight)
    ) {
        return res.status(400).json({
            error: "Name and a positive max weight are required"
        })
    }

    const fieldError = validateOptionalFields(req.body)

    if (fieldError) {
        return res.status(400).json({
            error: fieldError
        })
    }

    try {
        const character = createCharacter({
            user_id: userId,
            name: name.trim(),
            max_weight,
            ...pickOptionalFields(req.body)
        })

        return res.status(201).json(character)
    }
    catch (error) {
        return handleCharacterWriteError(error, res)
    }
})

// PATCH /characters/:name - Update a character
router.patch("/:name", requireAuth, loadCharacter, (req, res) => {

    const { name: newName, max_weight } = req.body

    const hasName = newName !== undefined
    const hasMaxWeight = max_weight !== undefined
    const optionalFields = pickOptionalFields(req.body)

    if (!hasName && !hasMaxWeight && Object.keys(optionalFields).length === 0) {
        return res.status(400).json({
            error: "At least one field must be provided"
        })
    }

    if (hasName && (typeof newName !== "string" || newName.trim().length === 0)) {
        return res.status(400).json({
            error: "Name must be a non-empty string"
        })
    }

    if (hasMaxWeight && !isValidMaxWeight(max_weight)) {
        return res.status(400).json({
            error: "Max weight must be a positive number"
        })
    }

    const fieldError = validateOptionalFields(req.body)

    if (fieldError) {
        return res.status(400).json({
            error: fieldError
        })
    }

    try {
        // Omitted fields keep their current value in updateCharacterById
        const updated = updateCharacterById(
            req.character.character_id,
            {
                name: hasName ? newName.trim() : undefined,
                max_weight,
                ...optionalFields
            })

        if (!updated) {
            return res.status(404).json({
                error: "Character not found"
            })
        }

        return res.status(200).json(updated)
    }
    catch (error) {
        return handleCharacterWriteError(error, res)
    }
})

// DELETE /characters/:name - Delete a character and everything it owns
router.delete("/:name", requireAuth, loadCharacter, (req,res) => {

    const deleted = deleteCharacterById(req.character.character_id)

    if (!deleted) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    return res.status(200).json({
        deleted: true
    })
})

module.exports = router
