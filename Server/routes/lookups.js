const express = require("express")
const router = express.Router()

const {
    findAllClasses,
    findSubclassByClassId,
    findAllSpecies,
    findAllBackgrounds,
    findAllProficiencies,
    findAllSkills,
    findAllWeaponMasteries
} = require("../db/characterQueries.js")

// --- Lookup Routes ---
// GET /lookups/backgrounds - Return all available backgrounds
// GET /lookups/classes - Return all available classes
// GET /lookups/classes/:classId/subclasses - Return all subclasses associated with a class ID
// GET /lookups/proficiencies - Return all available proficiencies
// GET /lookups/skills - Return all available skills
// GET /lookups/species - Return all available species
// GET /lookups/weapon-masteries - Return all available weapon masteries
// --- ----------- ---

// GET /lookups/backgrounds - Return all available backgrounds
router.get("/backgrounds", (req, res) => {
    const backgrounds = findAllBackgrounds()

    return res.status(200).json(backgrounds)
})

// GET /lookups/classes - Return all available classes
router.get("/classes", (req, res) => {
    const classes = findAllClasses()

    return res.status(200).json(classes)
})

// GET /lookups/classes/:classId/subclasses - Return all subclasses associated with a class ID
router.get("/classes/:classId/subclasses", (req, res) => {
    const classId = Number(req.params.classId)

    if (!Number.isInteger(classId)) {
        return res.status(400).json({
            error: "A valid class ID is required"
        })
    }

    const validSubclasses = findSubclassByClassId(classId)

    if (validSubclasses.length === 0) {
        return res.status(404).json({
            error: "Class not found"
        })
    }

    return res.status(200).json(validSubclasses)
})

// GET /lookups/proficiencies - Return all available proficiencies
router.get("/proficiencies", (req, res) => {
    const proficiencies = findAllProficiencies()

    return res.status(200).json(proficiencies)
})

// GET /lookups/skills - Return all available skills
router.get("/skills", (req, res) => {
    const skills = findAllSkills()

    return res.status(200).json(skills)
})

// GET /lookups/species - Return all available species
router.get("/species", (req, res) => {
    const species = findAllSpecies()

    return res.status(200).json(species)
})

// GET /lookups/weapon-masteries - Return all available weapon masteries
router.get("/weapon-masteries", (req, res) => {
    const masteries = findAllWeaponMasteries()

    return res.status(200).json(masteries)
})

module.exports = router