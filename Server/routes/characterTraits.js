const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")
const loadCharacter = require("../middleware/loadCharacter")

const {
    findCharacterSheet,

    findCharacterClasses,
    addCharacterClass,
    updateCharacterClass,
    removeCharacterClass,

    findCharacterProficiencies,
    addCharacterProficiency,
    removeCharacterProficiency,

    findCharacterSkills,
    addCharacterSkill,
    updateCharacterSkillExpertise,
    removeCharacterSkill,

    findCharacterWeaponMasteries,
    addCharacterWeaponMastery,
    removeCharacterWeaponMastery
} = require("../db/characterQueries.js")

// --- Character Trait Routes ---
// GET /characters/:name/sheet - Returns all of a characters core attributes and extended attributes

// POST /characters/:name/classes - Create a new class entry for a character (body: class_id, subclass_id?, class_level)
// PATCH /characters/:name/classes/:classId - Update a characters class entry
// DELETE /characters/:name/classes/:classId - Delete a characters class entry

// POST /characters/:name/skills - Create a new skill entry for a character (body: skill_id, expertise?)
// PATCH /characters/:name/skills/:skillId - Update a skill entry
// DELETE /characters/:name/skills/:skillId - Delete a skill entry

// POST /characters/:name/proficiencies - Create a new proficiency entry (body: proficiency_id)
// DELETE /characters/:name/proficiencies/:proficiencyId - Delete a proficiency entry

// POST /characters/:name/weapon-masteries - Create a new weapon mastery entry (body: weapon_type_id)
// DELETE /characters/:name/weapon-masteries/:weaponTypeId - Delete a weapon mastery entry
// --- ---------------------- ---

// --- Helpers ---

function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0
}

function isValidClassLevel(value) {
    return Number.isInteger(value) && value >= 1 && value <= 20
}

// Expertise is stored as 0/1; accept booleans or 0/1 from the client.
// Returns undefined for anything else.
function toExpertise(value) {
    if (value === true || value === 1) {
        return 1
    }

    if (value === false || value === 0) {
        return 0
    }

    return undefined
}

// Map database constraint errors from trait writes to responses
function handleTraitWriteError(error, res, { duplicate, notFound }) {
    if (error.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({
            error: duplicate
        })
    }

    if (error.message.includes("FOREIGN KEY constraint failed")) {
        return res.status(400).json({
            error: notFound
        })
    }

    if (error.message.includes("CHECK constraint failed")) {
        return res.status(400).json({
            error: "One or more fields are out of range"
        })
    }

    console.error(error)

    return res.status(500).json({
        error: "Internal server error"
    })
}

// --- Character Sheet Routes ---

// GET /characters/:name/sheet - Returns all of a characters core attributes and extended attributes
router.get("/:name/sheet", requireAuth, loadCharacter, (req, res) => {
    const sheet = findCharacterSheet(req.character.character_id)

    if (!sheet) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    return res.status(200).json(sheet)
})

// --- Class Routes ---

// POST /characters/:name/classes - Create a new class entry for a character (body: class_id, subclass_id?, class_level)
router.post("/:name/classes", requireAuth, loadCharacter, (req, res) => {

    const { class_id, subclass_id, class_level } = req.body

    if (!isPositiveInteger(class_id) || !isValidClassLevel(class_level)) {
        return res.status(400).json({
            error: "A valid class ID and a class level from 1 to 20 are required"
        })
    }

    if (subclass_id !== undefined && subclass_id !== null && !isPositiveInteger(subclass_id)) {
        return res.status(400).json({
            error: "Subclass ID must be a positive integer or null"
        })
    }

    try {
        const classes = addCharacterClass({
            character_id: req.character.character_id,
            class_id,
            subclass_id: subclass_id ?? null,
            class_level
        })

        return res.status(201).json(classes)
    }
    catch (error) {
        return handleTraitWriteError(error, res, {
            duplicate: "This character already has that class",
            notFound: "Class not found, or the subclass does not belong to that class"
        })
    }
})

// PATCH /characters/:name/classes/:classId - Update a characters class entry
router.patch("/:name/classes/:classId", requireAuth, loadCharacter, (req, res) => {

    const classId = Number(req.params.classId)
    const { subclass_id, class_level } = req.body

    if (!isPositiveInteger(classId)) {
        return res.status(400).json({
            error: "A valid class ID is required"
        })
    }

    const hasSubclass = subclass_id !== undefined
    const hasClassLevel = class_level !== undefined

    if (!hasSubclass && !hasClassLevel) {
        return res.status(400).json({
            error: "At least one field must be provided"
        })
    }

    if (hasSubclass && !isPositiveInteger(subclass_id)) {
        return res.status(400).json({
            error: "Subclass ID must be a positive integer"
        })
    }

    if (hasClassLevel && !isValidClassLevel(class_level)) {
        return res.status(400).json({
            error: "Class level must be an integer from 1 to 20"
        })
    }

    try {
        const classes = updateCharacterClass(
            req.character.character_id,
            classId,
            { subclass_id, class_level }
        )

        if (!classes) {
            return res.status(404).json({
                error: "This character does not have that class"
            })
        }

        return res.status(200).json(classes)
    }
    catch (error) {
        return handleTraitWriteError(error, res, {
            duplicate: "This character already has that class",
            notFound: "The subclass does not belong to that class"
        })
    }
})

// DELETE /characters/:name/classes/:classId - Delete a characters class entry
router.delete("/:name/classes/:classId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const classId = Number(req.params.classId)

    if (!isPositiveInteger(classId)) {
        return res.status(400).json({
            error: "A valid class ID is required"
        })
    }

    const deleted = removeCharacterClass(characterId, classId)

    if (!deleted) {
        return res.status(404).json({
            error: "This character does not have that class"
        })
    }

    return res.status(200).json({
        deleted: true,
        classes: findCharacterClasses(characterId)
    })
})

// --- Skill Routes ---

// POST /characters/:name/skills - Create a new skill entry for a character (body: skill_id, expertise?)
router.post("/:name/skills", requireAuth, loadCharacter, (req, res) => {

    const { skill_id } = req.body
    const expertise = req.body.expertise === undefined
        ? 0
        : toExpertise(req.body.expertise)

    if (!isPositiveInteger(skill_id)) {
        return res.status(400).json({
            error: "A valid skill ID is required"
        })
    }

    if (expertise === undefined) {
        return res.status(400).json({
            error: "Expertise must be true, false, 1, or 0"
        })
    }

    try {
        const skills = addCharacterSkill(req.character.character_id, skill_id, expertise)

        return res.status(201).json(skills)
    }
    catch (error) {
        return handleTraitWriteError(error, res, {
            duplicate: "This character already has that skill",
            notFound: "Skill not found"
        })
    }
})

// PATCH /characters/:name/skills/:skillId - Update a skill entry
router.patch("/:name/skills/:skillId", requireAuth, loadCharacter, (req, res) => {

    const skillId = Number(req.params.skillId)
    const expertise = toExpertise(req.body.expertise)

    if (!isPositiveInteger(skillId)) {
        return res.status(400).json({
            error: "A valid skill ID is required"
        })
    }

    if (expertise === undefined) {
        return res.status(400).json({
            error: "Expertise must be true, false, 1, or 0"
        })
    }

    const skills = updateCharacterSkillExpertise(req.character.character_id, skillId, expertise)

    if (!skills) {
        return res.status(404).json({
            error: "This character does not have that skill"
        })
    }

    return res.status(200).json(skills)
})

// DELETE /characters/:name/skills/:skillId - Delete a skill entry
router.delete("/:name/skills/:skillId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const skillId = Number(req.params.skillId)

    if (!isPositiveInteger(skillId)) {
        return res.status(400).json({
            error: "A valid skill ID is required"
        })
    }

    const deleted = removeCharacterSkill(characterId, skillId)

    if (!deleted) {
        return res.status(404).json({
            error: "This character does not have that skill"
        })
    }

    return res.status(200).json({
        deleted: true,
        skills: findCharacterSkills(characterId)
    })
})

// --- Proficiency Routes ---

// POST /characters/:name/proficiencies - Create a new proficiency entry (body: proficiency_id)
router.post("/:name/proficiencies", requireAuth, loadCharacter, (req, res) => {

    const { proficiency_id } = req.body

    if (!isPositiveInteger(proficiency_id)) {
        return res.status(400).json({
            error: "A valid proficiency ID is required"
        })
    }

    try {
        const proficiencies = addCharacterProficiency(req.character.character_id, proficiency_id)

        return res.status(201).json(proficiencies)
    }
    catch (error) {
        return handleTraitWriteError(error, res, {
            duplicate: "This character already has that proficiency",
            notFound: "Proficiency not found"
        })
    }
})

// DELETE /characters/:name/proficiencies/:proficiencyId - Delete a proficiency entry
router.delete("/:name/proficiencies/:proficiencyId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const proficiencyId = Number(req.params.proficiencyId)

    if (!isPositiveInteger(proficiencyId)) {
        return res.status(400).json({
            error: "A valid proficiency ID is required"
        })
    }

    const deleted = removeCharacterProficiency(characterId, proficiencyId)

    if (!deleted) {
        return res.status(404).json({
            error: "This character does not have that proficiency"
        })
    }

    return res.status(200).json({
        deleted: true,
        proficiencies: findCharacterProficiencies(characterId)
    })
})

// --- Weapon Mastery Routes ---

// POST /characters/:name/weapon-masteries - Create a new weapon mastery entry (body: weapon_type_id)
router.post("/:name/weapon-masteries", requireAuth, loadCharacter, (req, res) => {

    const { weapon_type_id } = req.body

    if (!isPositiveInteger(weapon_type_id)) {
        return res.status(400).json({
            error: "A valid weapon type ID is required"
        })
    }

    try {
        const masteries = addCharacterWeaponMastery(req.character.character_id, weapon_type_id)

        return res.status(201).json(masteries)
    }
    catch (error) {
        return handleTraitWriteError(error, res, {
            duplicate: "This character already has that weapon mastery",
            notFound: "Weapon type not found"
        })
    }
})

// DELETE /characters/:name/weapon-masteries/:weaponTypeId - Delete a weapon mastery entry
router.delete("/:name/weapon-masteries/:weaponTypeId", requireAuth, loadCharacter, (req, res) => {

    const characterId = req.character.character_id
    const weaponTypeId = Number(req.params.weaponTypeId)

    if (!isPositiveInteger(weaponTypeId)) {
        return res.status(400).json({
            error: "A valid weapon type ID is required"
        })
    }

    const deleted = removeCharacterWeaponMastery(characterId, weaponTypeId)

    if (!deleted) {
        return res.status(404).json({
            error: "This character does not have that weapon mastery"
        })
    }

    return res.status(200).json({
        deleted: true,
        weapon_masteries: findCharacterWeaponMasteries(characterId)
    })
})

module.exports = router
