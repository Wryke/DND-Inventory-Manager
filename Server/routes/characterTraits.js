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

// POST /characters/:name/classes - Create a new class entry for a character
// PATCH /characters/:name/classes/:classId - Update a characters class entry
// DELETE /characters/:name/classes/:classId - Delete a characters class entry

// POST /characters/:name/skills - Create a new skill entry for a character
// PATCH /characters/:name/skills/:skillId - Update a skill entry
// DELETE /characters/:name/skills/:skillId - Delete a skill entry

// POST /characters/:name/proficiencies/:proficiencyId - Create a new proficiency entry
// DELETE /characters/:name/proficiencies/:proficiencyId - Delete a proficiency entry

// POST /characters/:name/weapon-masteries/:weaponTypeId - Create a new weapon mastery entry
// DELETE /characters/:name/weapon-masteries/:weaponTypeId - Delete a weapon mastery entry
// --- ---------------------- ---

module.exports = router