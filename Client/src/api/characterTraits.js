import { apiRequest } from "./apiHelpers"

// Base URL for one character's routes
function characterUrl(characterName) {
    return `/characters/${encodeURIComponent(characterName)}`
}

// --- Character Sheet ---

async function getCharacterSheet(characterName) {
    const url = `${characterUrl(characterName)}/sheet`

    return apiRequest(url)
}

// --- Classes ---

async function addCharacterClass(characterName, classId, classLevel, subclassId = null) {
    const url = `${characterUrl(characterName)}/classes`

    const newClass = {
        class_id: classId,
        subclass_id: subclassId,
        class_level: classLevel
    }

    const options =
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newClass)
        }

    return apiRequest(url, options)
}

// updatedFields: { class_level?, subclass_id? }
async function updateCharacterClass(characterName, classId, updatedFields) {
    const url = `${characterUrl(characterName)}/classes/${classId}`

    const options =
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedFields)
        }

    return apiRequest(url, options)
}

async function removeCharacterClass(characterName, classId) {
    const url = `${characterUrl(characterName)}/classes/${classId}`

    const options =
        {
            method: "DELETE"
        }

    return apiRequest(url, options)
}

// --- Skills ---

async function addCharacterSkill(characterName, skillId, expertise = false) {
    const url = `${characterUrl(characterName)}/skills`

    const newSkill = {
        skill_id: skillId,
        expertise: expertise
    }

    const options =
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newSkill)
        }

    return apiRequest(url, options)
}

async function updateCharacterSkillExpertise(characterName, skillId, expertise) {
    const url = `${characterUrl(characterName)}/skills/${skillId}`

    const options =
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ expertise: expertise })
        }

    return apiRequest(url, options)
}

async function removeCharacterSkill(characterName, skillId) {
    const url = `${characterUrl(characterName)}/skills/${skillId}`

    const options =
        {
            method: "DELETE"
        }

    return apiRequest(url, options)
}

// --- Proficiencies ---

async function addCharacterProficiency(characterName, proficiencyId) {
    const url = `${characterUrl(characterName)}/proficiencies`

    const options =
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ proficiency_id: proficiencyId })
        }

    return apiRequest(url, options)
}

async function removeCharacterProficiency(characterName, proficiencyId) {
    const url = `${characterUrl(characterName)}/proficiencies/${proficiencyId}`

    const options =
        {
            method: "DELETE"
        }

    return apiRequest(url, options)
}

// --- Weapon Masteries ---

async function addCharacterWeaponMastery(characterName, weaponTypeId) {
    const url = `${characterUrl(characterName)}/weapon-masteries`

    const options =
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ weapon_type_id: weaponTypeId })
        }

    return apiRequest(url, options)
}

async function removeCharacterWeaponMastery(characterName, weaponTypeId) {
    const url = `${characterUrl(characterName)}/weapon-masteries/${weaponTypeId}`

    const options =
        {
            method: "DELETE"
        }

    return apiRequest(url, options)
}

export {
    getCharacterSheet,

    addCharacterClass,
    updateCharacterClass,
    removeCharacterClass,

    addCharacterSkill,
    updateCharacterSkillExpertise,
    removeCharacterSkill,

    addCharacterProficiency,
    removeCharacterProficiency,

    addCharacterWeaponMastery,
    removeCharacterWeaponMastery
}