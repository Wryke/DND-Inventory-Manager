const db = require("./connection")


// --- Character Queries ---

const findCharactersByUserIdStmt = db.prepare(`
    SELECT *
    FROM characters
    WHERE user_id = ?
    ORDER BY name
`)

function findCharactersByUserId (userId) {
    return findCharactersByUserIdStmt.all(userId)
}

const findCharacterByUserIdAndNameStmt = db.prepare(`
    SELECT *
    FROM characters
    WHERE user_id = ? AND name = ?
`)

function findCharacterByUserIdAndName (userId, name) {
    return findCharacterByUserIdAndNameStmt.get(userId, name)
}

const createCharacterStmt = db.prepare(`
    INSERT INTO characters (user_id, name, max_weight)
    VALUES (?, ?, ?)
`)

function createCharacter ({ user_id, name, max_weight }) {
    const result = createCharacterStmt.run(user_id, name, max_weight)

    return {
        character_id: result.lastInsertRowid,
        user_id,
        name,
        max_weight
    }
}

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

    return db.prepare(`
        SELECT *
        FROM characters
        WHERE character_id = ?
    `).get(characterId)
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
`)

function findCharacterClasses (characterId) {
    return findCharacterClassesStmt.all(characterId)
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
    SELECT *
    FROM character_to_skill
    WHERE character_id = ? 
`)

function findCharacterSkills (characterId) {
    return findCharacterSkillsStmt.all(characterId)
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

module.exports = {
    findCharactersByUserId,
    findCharacterByUserIdAndName,
    createCharacter,
    updateCharacterById,
    deleteCharacterById,

    findAllClasses, 
    findSubclassByClassId, 
    findCharacterClasses, 
    findAllSpecies, 
    findAllBackgrounds, 
    findCharacterProficiencies, 
    findSkills, 
    findCharacterSkills,
    findAllWeaponMasteries,
    findCharacterWeaponMasteries
}