const db = require("./connection")


// --- Character Queries ---

// Shared SELECT for character rows, including species and background names
const characterSelect = `
    SELECT
        c.*,
        s.species_name,
        b.background_name
    FROM characters AS c
    LEFT JOIN species_lookup AS s
        ON c.species_id = s.species_id
    LEFT JOIN background_lookup AS b
        ON c.background_id = b.background_id
`

const findCharactersByUserIdStmt = db.prepare(`
    ${characterSelect}
    WHERE c.user_id = ?
    ORDER BY c.name
`)

function findCharactersByUserId (userId) {
    return findCharactersByUserIdStmt.all(userId)
}

const findCharacterByUserIdAndNameStmt = db.prepare(`
    ${characterSelect}
    WHERE c.user_id = ? AND c.name = ?
`)

function findCharacterByUserIdAndName (userId, name) {
    return findCharacterByUserIdAndNameStmt.get(userId, name)
}

const findCharacterByIdStmt = db.prepare(`
    ${characterSelect}
    WHERE c.character_id = ?
`)

function findCharacterById (characterId) {
    return findCharacterByIdStmt.get(characterId)
}

// Ability scores fall back to the schema default of 10 when omitted
const createCharacterStmt = db.prepare(`
    INSERT INTO characters (
        user_id,
        name,
        max_weight,
        species_id,
        background_id,
        strength_score,
        dexterity_score,
        constitution_score,
        intelligence_score,
        wisdom_score,
        charisma_score
    )
    VALUES (
        @user_id,
        @name,
        @max_weight,
        @species_id,
        @background_id,
        COALESCE(@strength_score, 10),
        COALESCE(@dexterity_score, 10),
        COALESCE(@constitution_score, 10),
        COALESCE(@intelligence_score, 10),
        COALESCE(@wisdom_score, 10),
        COALESCE(@charisma_score, 10)
    )
`)

function createCharacter ({
    user_id,
    name,
    max_weight,
    species_id = null,
    background_id = null,
    strength_score = null,
    dexterity_score = null,
    constitution_score = null,
    intelligence_score = null,
    wisdom_score = null,
    charisma_score = null
}) {
    const result = createCharacterStmt.run({
        user_id,
        name,
        max_weight,
        species_id,
        background_id,
        strength_score,
        dexterity_score,
        constitution_score,
        intelligence_score,
        wisdom_score,
        charisma_score
    })

    return findCharacterById(result.lastInsertRowid)
}

// Omitted fields keep their current value. Note: COALESCE means
// species_id and background_id cannot currently be cleared back to NULL.
const updateCharacterByIdStmt = db.prepare(`
    UPDATE characters
    SET
        name = COALESCE(@name, name),
        max_weight = COALESCE(@max_weight, max_weight),
        species_id = COALESCE(@species_id, species_id),
        background_id = COALESCE(@background_id, background_id),
        strength_score = COALESCE(@strength_score, strength_score),
        dexterity_score = COALESCE(@dexterity_score, dexterity_score),
        constitution_score = COALESCE(@constitution_score, constitution_score),
        intelligence_score = COALESCE(@intelligence_score, intelligence_score),
        wisdom_score = COALESCE(@wisdom_score, wisdom_score),
        charisma_score = COALESCE(@charisma_score, charisma_score)
    WHERE character_id = @character_id
`)

function updateCharacterById(characterId, updates = {}) {
    const fields = [
        "name",
        "max_weight",
        "species_id",
        "background_id",
        "strength_score",
        "dexterity_score",
        "constitution_score",
        "intelligence_score",
        "wisdom_score",
        "charisma_score"
    ]

    const params = { character_id: characterId }

    for (const field of fields) {
        params[field] = updates[field] ?? null
    }

    const result = updateCharacterByIdStmt.run(params)

    if (result.changes === 0) {
        return undefined
    }

    return findCharacterById(characterId)
}

const deleteCharacterByIdStmt = db.prepare(`
    DELETE FROM characters
    WHERE character_id = ?
`)

function deleteCharacterById (characterId) {
    const result = deleteCharacterByIdStmt.run(characterId)
    return result.changes === 1
}

// --- Class Queries ---
const findAllClassesStmt = db.prepare(`
    SELECT *
    FROM class_lookup
    ORDER BY class_name
`)

function findAllClasses () {
    return findAllClassesStmt.all()
}

const findSubclassByClassIdStmt = db.prepare(`
    SELECT *
    FROM subclass_lookup
    WHERE class_id = ?
    ORDER BY subclass_name
`)

function findSubclassByClassId (classId) {
    return findSubclassByClassIdStmt.all(classId)
}

const findCharacterClassesStmt = db.prepare(`
    SELECT
        c.character_id,

        cl.class_id,
        cl.class_index,
        cl.class_name,

        sub.subclass_id,
        sub.subclass_index,
        sub.subclass_name,

        c.class_level
    FROM character_to_class AS c
    JOIN class_lookup AS cl
        ON c.class_id = cl.class_id
    LEFT JOIN subclass_lookup AS sub
        ON c.subclass_id = sub.subclass_id
    WHERE c.character_id = ?
    ORDER BY cl.class_name
`)

function findCharacterClasses (characterId) {
    return findCharacterClassesStmt.all(characterId)
}

const addCharacterClassStmt = db.prepare(`
    INSERT INTO character_to_class (character_id, class_id, subclass_id, class_level)
    VALUES (@character_id, @class_id, @subclass_id, @class_level)
`)

// Add a class (and optional subclass) to a character at a given level
function addCharacterClass ({ character_id, class_id, subclass_id = null, class_level }) {
    addCharacterClassStmt.run({ character_id, class_id, subclass_id, class_level })

    return findCharacterClasses(character_id)
}

// Change a character's level and/or subclass for a class they have
function updateCharacterClass (characterId, classId, { subclass_id, class_level }) {
    throw new Error("Not implemented")
}

// Remove a class from a character
function removeCharacterClass (characterId, classId) {
    throw new Error("Not implemented")
}

// --- Species Queries ---
const findAllSpeciesStmt = db.prepare(`
    SELECT *
    FROM species_lookup
    ORDER BY species_name
`)

function findAllSpecies () {
    return findAllSpeciesStmt.all()
}

// --- Background Queries ---
const findAllBackgroundsStmt = db.prepare(`
    SELECT *
    FROM background_lookup
    ORDER BY background_name
`)

function findAllBackgrounds () {
    return findAllBackgroundsStmt.all()
}

// --- Proficiency Queries ---
const findCharacterProficienciesStmt = db.prepare(`
    SELECT
        c.character_id,

        c.proficiency_id,
        p.proficiency_index,
        p.proficiency_name,

        t.proficiency_type_id,
        t.type_index,
        t.type_name,
        
        a.ability_index,
        a.ability_name
    FROM character_to_proficiency AS c
    JOIN proficiency_lookup AS p
        ON c.proficiency_id = p.proficiency_id
    JOIN proficiency_type_lookup AS t
        ON p.proficiency_type_id = t.proficiency_type_id
    LEFT JOIN ability_lookup AS a
        ON p.ability_score_id = a.ability_score_id
    WHERE c.character_id = ?
`)

function findCharacterProficiencies(characterId) {
    return findCharacterProficienciesStmt.all(characterId)
}

// Grant a proficiency to a character
function addCharacterProficiency (characterId, proficiencyId) {
    throw new Error("Not implemented")
}

// Remove a proficiency from a character
function removeCharacterProficiency (characterId, proficiencyId) {
    throw new Error("Not implemented")
}

// --- Skills Queries ---
const findSkillsStmt = db.prepare(`
    SELECT
        s.skill_id,
        s.skill_index,
        s.skill_name,

        a.ability_index,
        a.ability_name
    FROM skill_lookup AS s
    JOIN ability_lookup AS a
        ON s.ability_score_id = a.ability_score_id
    ORDER BY s.skill_name
`)

function findSkills () {
    return findSkillsStmt.all()
}

const findCharacterSkillsStmt = db.prepare(`
    SELECT
        c.character_id,

        s.skill_id,
        s.skill_index,
        s.skill_name,

        c.expertise,

        a.ability_index,
        a.ability_name
    FROM character_to_skill AS c
    JOIN skill_lookup AS s
        ON c.skill_id = s.skill_id
    JOIN ability_lookup AS a
        ON s.ability_score_id = a.ability_score_id
    WHERE c.character_id = ?
    ORDER BY s.skill_name
`)

function findCharacterSkills (characterId) {
    return findCharacterSkillsStmt.all(characterId)
}

// Give a character proficiency in a skill, optionally with expertise
function addCharacterSkill (characterId, skillId, expertise = 0) {
    throw new Error("Not implemented")
}

// Toggle expertise on a skill a character is proficient in
function updateCharacterSkillExpertise (characterId, skillId, expertise) {
    throw new Error("Not implemented")
}

// Remove a skill proficiency from a character
function removeCharacterSkill (characterId, skillId) {
    throw new Error("Not implemented")
}

// --- Mastery Queries ---
const findAllWeaponMasteriesStmt = db.prepare(`
    SELECT
        w.weapon_type_id,
        w.weapon_type_index,
        w.weapon_type_name,
        w.weapon_category,
        
        m.mastery_id,
        m.mastery_index,
        m.mastery_name
    FROM weapon_type_lookup AS w
    JOIN weapon_mastery_lookup AS m
        ON w.mastery_id = m.mastery_id
    ORDER BY w.weapon_type_name
`)

function findAllWeaponMasteries () {
    return findAllWeaponMasteriesStmt.all()
}

const findCharacterWeaponMasteriesStmt = db.prepare(`
    SELECT
        c.character_id,
        
        w.weapon_type_id,
        w.weapon_type_index,
        w.weapon_type_name,
        w.weapon_category,
        
        m.mastery_id,
        m.mastery_index,
        m.mastery_name
    FROM character_to_weapon_mastery AS c
    JOIN weapon_type_lookup AS w
        ON c.weapon_type_id = w.weapon_type_id
    JOIN weapon_mastery_lookup AS m
        ON w.mastery_id = m.mastery_id
    WHERE c.character_id = ?
`)

function findCharacterWeaponMasteries (characterId) {
    return findCharacterWeaponMasteriesStmt.all(characterId)
}

// Give a character mastery of a weapon type
function addCharacterWeaponMastery (characterId, weaponTypeId) {
    throw new Error("Not implemented")
}

// Remove a weapon mastery from a character
function removeCharacterWeaponMastery (characterId, weaponTypeId) {
    throw new Error("Not implemented")
}

module.exports = {
    findCharactersByUserId,
    findCharacterByUserIdAndName,
    findCharacterById,
    createCharacter,
    updateCharacterById,
    deleteCharacterById,

    findAllClasses,
    findSubclassByClassId,
    findCharacterClasses,
    addCharacterClass,
    updateCharacterClass,
    removeCharacterClass,

    findAllSpecies,
    findAllBackgrounds,

    findCharacterProficiencies,
    addCharacterProficiency,
    removeCharacterProficiency,

    findSkills,
    findCharacterSkills,
    addCharacterSkill,
    updateCharacterSkillExpertise,
    removeCharacterSkill,

    findAllWeaponMasteries,
    findCharacterWeaponMasteries,
    addCharacterWeaponMastery,
    removeCharacterWeaponMastery
}