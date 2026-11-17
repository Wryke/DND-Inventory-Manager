import { apiRequest } from "./apiHelpers"

// Reference data shared by every user; these routes do not need a session

async function getClasses() {
    return apiRequest("/lookups/classes")
}

async function getSubclasses(classId) {
    const url = `/lookups/classes/${classId}/subclasses`

    return apiRequest(url)
}

async function getSpecies() {
    return apiRequest("/lookups/species")
}

async function getBackgrounds() {
    return apiRequest("/lookups/backgrounds")
}

async function getSkills() {
    return apiRequest("/lookups/skills")
}

async function getProficiencies() {
    return apiRequest("/lookups/proficiencies")
}

async function getWeaponMasteries() {
    return apiRequest("/lookups/weapon-masteries")
}

export {
    getClasses,
    getSubclasses,
    getSpecies,
    getBackgrounds,
    getSkills,
    getProficiencies,
    getWeaponMasteries
}