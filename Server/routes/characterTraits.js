const express = require("express")
const router = express.Router()

const requireAuth = require("../middleware/requireAuth")
const loadCharacter = require("../middleware/loadCharacter")

const {
    findUserById
 } = require("../db/userQueries.js")

 const {
    findCharacterSheet,

    addCharacterClass,
    updateCharacterClass,
    removeCharacterClass,

    addCharacterProficiency,
    removeCharacterProficiency,

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

// Placeholder response for routes that are not implemented yet
function notImplemented(res) {
    return res.status(501).json({
        error: "Not implemented"
    })
}

// --- Character Sheet Routes ---

// GET /characters/:name/sheet - Returns all of a characters core attributes and extended attributes
router.get("/:name/sheet", requireAuth, loadCharacter, (req, res) => {
    // TODO: return findCharacterSheet(req.character.character_id)
    return notImplemented(res)
})

// --- Class Routes ---

// POST /characters/:name/classes - Create a new class entry for a character (body: class_id, subclass_id?, class_level)
router.post("/:name/classes", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate body, then addCharacterClass
    return notImplemented(res)
})

// PATCH /characters/:name/classes/:classId - Update a characters class entry
router.patch("/:name/classes/:classId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate classId and body, then updateCharacterClass
    return notImplemented(res)
})

// DELETE /characters/:name/classes/:classId - Delete a characters class entry
router.delete("/:name/classes/:classId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate classId, then removeCharacterClass
    return notImplemented(res)
})

// --- Skill Routes ---

// POST /characters/:name/skills - Create a new skill entry for a character (body: skill_id, expertise?)
router.post("/:name/skills", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate body, convert expertise to 0/1, then addCharacterSkill
    return notImplemented(res)
})

// PATCH /characters/:name/skills/:skillId - Update a skill entry
router.patch("/:name/skills/:skillId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate skillId and expertise, then updateCharacterSkillExpertise
    return notImplemented(res)
})

// DELETE /characters/:name/skills/:skillId - Delete a skill entry
router.delete("/:name/skills/:skillId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate skillId, then removeCharacterSkill
    return notImplemented(res)
})

// --- Proficiency Routes ---

// POST /characters/:name/proficiencies - Create a new proficiency entry (body: proficiency_id)
router.post("/:name/proficiencies", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate body, then addCharacterProficiency
    return notImplemented(res)
})

// DELETE /characters/:name/proficiencies/:proficiencyId - Delete a proficiency entry
router.delete("/:name/proficiencies/:proficiencyId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate proficiencyId, then removeCharacterProficiency
    return notImplemented(res)
})

// --- Weapon Mastery Routes ---

// POST /characters/:name/weapon-masteries - Create a new weapon mastery entry (body: weapon_type_id)
router.post("/:name/weapon-masteries", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate body, then addCharacterWeaponMastery
    return notImplemented(res)
})

// DELETE /characters/:name/weapon-masteries/:weaponTypeId - Delete a weapon mastery entry
router.delete("/:name/weapon-masteries/:weaponTypeId", requireAuth, loadCharacter, (req, res) => {
    // TODO: validate weaponTypeId, then removeCharacterWeaponMastery
    return notImplemented(res)
})

module.exports = router