
const {
    createUser,
    deleteUserById
} = require("./userQueries")

const {
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
    addCharacterSkill,
    updateCharacterSkillExpertise,
    removeCharacterSkill,
    findAllSpecies,
    findAllBackgrounds,
    findCharacterProficiencies,
    findSkills,
    findCharacterSkills,
    findAllWeaponMasteries,
    findCharacterWeaponMasteries
} = require("./characterQueries")

// Integration tests: use a dedicated SQLite test database.
describe("Database Character Queries", () => {
    let testUser
    let testCharacter
    let additionalUserIds = []

    beforeEach(() => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        testUser = createUser({
            username: `TestUser_${uniqueSuffix}`,
            email: `test_${uniqueSuffix}@example.com`,
            passwordHash: `test-hash-${uniqueSuffix}`
        })

        testCharacter = createCharacter({
            user_id: testUser.user_id,
            name: `TestCharacter_${uniqueSuffix}`,
            max_weight: 100
        })

        additionalUserIds = []
    })

    afterEach(() => {
        deleteUserById(testUser.user_id)

        for (const userId of additionalUserIds) {
            deleteUserById(userId)
        }
    })

    describe("findCharactersByUserId", () => {
        test("returns the user's characters", () => {
            const characters =
                findCharactersByUserId(testUser.user_id)

            expect(Array.isArray(characters)).toBe(true)

            expect(
                characters.some(character =>
                    character.character_id ===
                    testCharacter.character_id
                )
            ).toBe(true)
        })

        test("returns standardized character data", () => {
            const characters =
                findCharactersByUserId(testUser.user_id)

            const character = characters.find(character =>
                character.character_id ===
                testCharacter.character_id
            )

            expect(character).toHaveProperty("character_id")
            expect(character).toHaveProperty("user_id")
            expect(character).toHaveProperty("name")
            expect(character).toHaveProperty("max_weight")
        })

        test("returns characters ordered by name", () => {
            createCharacter({
                user_id: testUser.user_id,
                name: "AAA Test Character",
                max_weight: 100
            })

            const characters =
                findCharactersByUserId(testUser.user_id)

            const names = characters.map(character => character.name)

            const sortedNames = [...names].sort(
                (a, b) => a.localeCompare(b)
            )

            expect(names).toEqual(sortedNames)
        })

        test("returns an empty array for a user with no characters", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const additionalUser = createUser({
                username: `EmptyUser_${uniqueSuffix}`,
                email: `empty_${uniqueSuffix}@example.com`,
                passwordHash: "test-hash"
            })

            additionalUserIds.push(additionalUser.user_id)

            const characters =
                findCharactersByUserId(additionalUser.user_id)

            expect(characters).toEqual([])
        })
    })

    describe("findCharacterByUserIdAndName", () => {
        test("returns an existing character", () => {
            const character = findCharacterByUserIdAndName(
                testUser.user_id,
                testCharacter.name
            )

            expect(character).toBeDefined()
            expect(character.character_id).toBe(testCharacter.character_id)
            expect(character.user_id).toBe(testUser.user_id)
            expect(character.name).toBe(testCharacter.name)
            expect(character.max_weight).toBe(testCharacter.max_weight)
        })

        test("returns undefined for a missing character", () => {
            const character = findCharacterByUserIdAndName(
                testUser.user_id,
                "MissingCharacter"
            )

            expect(character).toBeUndefined()
        })

        test("does not return another user's character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const additionalUser = createUser({
                username: `OtherUser_${uniqueSuffix}`,
                email: `other_${uniqueSuffix}@example.com`,
                passwordHash: "test-hash"
            })

            additionalUserIds.push(additionalUser.user_id)

            const character = findCharacterByUserIdAndName(
                additionalUser.user_id,
                testCharacter.name
            )

            expect(character).toBeUndefined()
        })
    })

    describe("createCharacter", () => {
        test("creates a character", () => {
            const character = createCharacter({
                user_id: testUser.user_id,
                name: `AdditionalCharacter_${Date.now()}`,
                max_weight: 120
            })

            expect(character).toHaveProperty("character_id")
            expect(character.user_id).toBe(testUser.user_id)
            expect(character.max_weight).toBe(120)

            const storedCharacter = findCharacterByUserIdAndName(
                testUser.user_id,
                character.name
            )

            expect(storedCharacter).toBeDefined()
            expect(storedCharacter.character_id).toBe(character.character_id)
        })

        test("defaults ability scores to 10 and species/background to null", () => {
            expect(testCharacter).toMatchObject({
                species_id: null,
                species_name: null,
                background_id: null,
                background_name: null,
                strength_score: 10,
                dexterity_score: 10,
                constitution_score: 10,
                intelligence_score: 10,
                wisdom_score: 10,
                charisma_score: 10
            })
        })

        test("creates a character with species, background, and ability scores", () => {
            const character = createCharacter({
                user_id: testUser.user_id,
                name: `DetailedCharacter_${Date.now()}`,
                max_weight: 150,
                species_id: 4,
                background_id: 4,
                dexterity_score: 17,
                intelligence_score: 13
            })

            expect(character).toMatchObject({
                species_id: 4,
                species_name: "Elf",
                background_id: 4,
                background_name: "Criminal",
                strength_score: 10,
                dexterity_score: 17,
                intelligence_score: 13
            })
        })
    })

    describe("findCharacterById", () => {
        test("returns an existing character", () => {
            const character = findCharacterById(testCharacter.character_id)

            expect(character).toEqual(testCharacter)
        })

        test("returns undefined for a missing character", () => {
            expect(findCharacterById(999999999)).toBeUndefined()
        })
    })

    describe("updateCharacterById", () => {
        test("updates an existing character", () => {
            const newName = `${testCharacter.name}_Updated`

            const result = updateCharacterById(
                testCharacter.character_id,
                {
                    name: newName,
                    max_weight: 150
                }
            )

            expect(result).toMatchObject({
                character_id: testCharacter.character_id,
                name: newName,
                max_weight: 150
            })

            const storedCharacter = findCharacterByUserIdAndName(
                testUser.user_id,
                newName
            )

            expect(storedCharacter).toBeDefined()
            expect(storedCharacter.max_weight).toBe(150)
        })

        test("updates species, background, and ability scores", () => {
            const result = updateCharacterById(
                testCharacter.character_id,
                {
                    species_id: 8,
                    background_id: 15,
                    strength_score: 16,
                    charisma_score: 8
                }
            )

            expect(result).toMatchObject({
                species_id: 8,
                species_name: "Human",
                background_id: 15,
                background_name: "Soldier",
                strength_score: 16,
                charisma_score: 8
            })
        })

        test("leaves omitted fields unchanged", () => {
            updateCharacterById(
                testCharacter.character_id,
                { strength_score: 15 }
            )

            const result = updateCharacterById(
                testCharacter.character_id,
                { max_weight: 200 }
            )

            expect(result).toMatchObject({
                name: testCharacter.name,
                max_weight: 200,
                strength_score: 15,
                dexterity_score: 10
            })
        })

        test("returns undefined for a missing character", () => {
            const result = updateCharacterById(
                999999999,
                {
                    name: "MissingCharacter",
                    max_weight: 100
                }
            )

            expect(result).toBeUndefined()
        })
    })

    describe("deleteCharacterById", () => {
        test("deletes an existing character", () => {
            const deleted =
                deleteCharacterById(testCharacter.character_id)

            expect(deleted).toBe(true)

            expect(
                findCharacterByUserIdAndName(
                    testUser.user_id,
                    testCharacter.name
                )
            ).toBeUndefined()
        })

        test("returns false for a missing character", () => {
            const deleted = deleteCharacterById(999999999)

            expect(deleted).toBe(false)
        })
    })
})


// Reference-data tests require referenceSeed.sql.
// Seeded-character tests additionally require the three characters from testValues.sql.
describe("Character Reference and Relationship Queries", () => {
    describe("seeded character lookups", () => {
        test("returns species and background names", () => {
            expect(findCharacterById(1)).toMatchObject({
                name: "Test Character 1",
                species_id: 8,
                species_name: "Human",
                background_id: 15,
                background_name: "Soldier"
            })
        })
    })

    describe("findAllClasses", () => {
        test("returns all 12 classes alphabetically", () => {
            const classes = findAllClasses()
            expect(classes).toHaveLength(12)
            expect(classes.map(c => c.class_name)).toEqual(
                [...classes.map(c => c.class_name)].sort((a, b) => a.localeCompare(b))
            )
            expect(classes).toEqual(expect.arrayContaining([
                expect.objectContaining({ class_id: 5, class_name: "Fighter" }),
                expect.objectContaining({ class_id: 9, class_name: "Rogue" })
            ]))
        })
    })

    describe("findSubclassByClassId", () => {
        test("returns the four Fighter subclasses", () => {
            const subclasses = findSubclassByClassId(5)
            expect(subclasses).toHaveLength(4)
            expect(subclasses.every(s => s.class_id === 5)).toBe(true)
            expect(subclasses.map(s => s.subclass_name)).toContain("Champion")
        })

        test("returns an empty array for a nonexistent class", () => {
            expect(findSubclassByClassId(999999)).toEqual([])
        })
    })

    describe("findCharacterClasses", () => {
        test("returns seeded Fighter's class, subclass, and level", () => {
            expect(findCharacterClasses(1)).toEqual([
                expect.objectContaining({
                    character_id: 1,
                    class_id: 5,
                    class_name: "Fighter",
                    subclass_id: 18,
                    subclass_name: "Champion",
                    class_level: 3
                })
            ])
        })

        test("returns an empty array when no classes are assigned", () => {
            expect(findCharacterClasses(999999)).toEqual([])
        })
    })

    describe("findAllSpecies", () => {
        test("returns the ten seeded species", () => {
            const species = findAllSpecies()
            expect(species).toHaveLength(10)
            expect(species).toEqual(expect.arrayContaining([
                expect.objectContaining({ species_index: "human", species_name: "Human" })
            ]))
        })
    })

    describe("findAllBackgrounds", () => {
        test("returns the sixteen seeded backgrounds", () => {
            const backgrounds = findAllBackgrounds()
            expect(backgrounds).toHaveLength(16)
            expect(backgrounds).toEqual(expect.arrayContaining([
                expect.objectContaining({ background_index: "soldier", background_name: "Soldier" })
            ]))
        })
    })

    describe("findCharacterProficiencies", () => {
        test("returns Fighter's weapon and saving throw proficiencies", () => {
            const proficiencies = findCharacterProficiencies(1)
            expect(proficiencies).toHaveLength(3)
            expect(proficiencies.map(p => p.proficiency_index).sort()).toEqual([
                "martial-weapons", "saving-throw-con", "saving-throw-str"
            ])
            expect(proficiencies).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    proficiency_index: "saving-throw-str",
                    type_index: "saving-throw",
                    ability_index: "str"
                }),
                expect.objectContaining({
                    proficiency_index: "martial-weapons",
                    type_index: "weapon",
                    ability_index: null
                })
            ]))
        })

        test("returns no proficiencies for an unassigned character", () => {
            expect(findCharacterProficiencies(999999)).toEqual([])
        })
    })

    describe("findSkills", () => {
        test("returns all 18 skills with their abilities", () => {
            const skills = findSkills()
            expect(skills).toHaveLength(18)
            expect(skills).toEqual(expect.arrayContaining([
                expect.objectContaining({ skill_name: "Athletics", ability_index: "str" }),
                expect.objectContaining({ skill_name: "Stealth", ability_index: "dex" }),
                expect.objectContaining({ skill_name: "Persuasion", ability_index: "cha" })
            ]))
        })
    })

    describe("findCharacterSkills", () => {
        test("returns seeded Rogue's Stealth expertise", () => {
            expect(findCharacterSkills(3)).toEqual([
                expect.objectContaining({
                    character_id: 3,
                    skill_id: 17,
                    skill_name: "Stealth",
                    expertise: 1,
                    ability_index: "dex"
                })
            ])
        })

        test("returns no skills for an unassigned character", () => {
            expect(findCharacterSkills(999999)).toEqual([])
        })
    })

    describe("findAllWeaponMasteries", () => {
        test("returns all 38 weapon types and their mastery properties", () => {
            const weapons = findAllWeaponMasteries()
            expect(weapons).toHaveLength(38)
            expect(weapons).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    weapon_type_id: 22,
                    weapon_type_name: "Longsword",
                    weapon_category: "martial",
                    mastery_name: "Sap"
                }),
                expect.objectContaining({
                    weapon_type_id: 2,
                    weapon_type_name: "Dagger",
                    weapon_category: "simple",
                    mastery_name: "Nick"
                })
            ]))
        })
    })

    describe("findCharacterWeaponMasteries", () => {
        test("returns the seeded Fighter's Longsword mastery", () => {
            expect(findCharacterWeaponMasteries(1)).toEqual([
                expect.objectContaining({
                    character_id: 1,
                    weapon_type_id: 22,
                    weapon_type_name: "Longsword",
                    mastery_name: "Sap"
                })
            ])
        })

        test("returns no masteries for an unassigned character", () => {
            expect(findCharacterWeaponMasteries(999999)).toEqual([])
        })
    })
})


// Write queries run against a fresh character so seeded data is untouched.
// Remaining test.todo entries are for stubbed queries.
describe("Character Relationship Write Queries", () => {
    let testUser
    let testCharacter

    beforeEach(() => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        testUser = createUser({
            username: `WriteTestUser_${uniqueSuffix}`,
            email: `writetest_${uniqueSuffix}@example.com`,
            passwordHash: `test-hash-${uniqueSuffix}`
        })

        testCharacter = createCharacter({
            user_id: testUser.user_id,
            name: `WriteTestCharacter_${uniqueSuffix}`,
            max_weight: 100
        })
    })

    afterEach(() => {
        deleteUserById(testUser.user_id)
    })

    describe("addCharacterClass", () => {
        test("adds a class with a subclass and level", () => {
            const classes = addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                subclass_id: 18,
                class_level: 3
            })

            expect(classes).toEqual([
                expect.objectContaining({
                    character_id: testCharacter.character_id,
                    class_id: 5,
                    class_name: "Fighter",
                    subclass_id: 18,
                    subclass_name: "Champion",
                    class_level: 3
                })
            ])
        })

        test("adds a class without a subclass", () => {
            const classes = addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 9,
                class_level: 1
            })

            expect(classes).toEqual([
                expect.objectContaining({
                    class_id: 9,
                    class_name: "Rogue",
                    subclass_id: null,
                    class_level: 1
                })
            ])
        })

        test("returns every class for a multiclassed character", () => {
            addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                class_level: 2
            })

            const classes = addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 9,
                class_level: 1
            })

            expect(classes.map(c => c.class_name)).toEqual(["Fighter", "Rogue"])
        })

        test("rejects a subclass that belongs to a different class", () => {
            // Oath of Devotion (25) is a Paladin subclass, not Fighter
            expect(() => addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                subclass_id: 25,
                class_level: 3
            })).toThrow("FOREIGN KEY constraint failed")
        })

        test("rejects a duplicate class for the same character", () => {
            addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                class_level: 1
            })

            expect(() => addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                class_level: 2
            })).toThrow("UNIQUE constraint failed")
        })

        test("rejects a level outside 1-20", () => {
            expect(() => addCharacterClass({
                character_id: testCharacter.character_id,
                class_id: 5,
                class_level: 21
            })).toThrow("CHECK constraint failed")
        })
    })

    describe("updateCharacterClass", () => {
        test.todo("updates a class level")
        test.todo("sets a subclass on an existing class")
    })

    describe("removeCharacterClass", () => {
        test.todo("removes a class from a character")
        test.todo("returns false for a class the character does not have")
    })

    describe("addCharacterProficiency", () => {
        test.todo("grants a proficiency")
        test.todo("rejects a duplicate proficiency")
    })

    describe("removeCharacterProficiency", () => {
        test.todo("removes a proficiency")
    })

    describe("addCharacterSkill", () => {
        test("adds a skill without expertise by default", () => {
            const skills = addCharacterSkill(testCharacter.character_id, 4)

            expect(skills).toEqual([
                expect.objectContaining({
                    character_id: testCharacter.character_id,
                    skill_id: 4,
                    skill_name: "Athletics",
                    expertise: 0,
                    ability_index: "str"
                })
            ])
        })

        test("adds a skill with expertise", () => {
            const skills = addCharacterSkill(testCharacter.character_id, 17, 1)

            expect(skills).toEqual([
                expect.objectContaining({
                    skill_id: 17,
                    skill_name: "Stealth",
                    expertise: 1
                })
            ])
        })

        test("returns every skill alphabetically", () => {
            addCharacterSkill(testCharacter.character_id, 17)
            const skills = addCharacterSkill(testCharacter.character_id, 4)

            expect(skills.map(s => s.skill_name)).toEqual(["Athletics", "Stealth"])
        })

        test("rejects a duplicate skill", () => {
            addCharacterSkill(testCharacter.character_id, 4)

            expect(() => addCharacterSkill(testCharacter.character_id, 4))
                .toThrow("UNIQUE constraint failed")
        })

        test("rejects a nonexistent skill", () => {
            expect(() => addCharacterSkill(testCharacter.character_id, 999999))
                .toThrow("FOREIGN KEY constraint failed")
        })

        test("rejects an expertise value other than 0 or 1", () => {
            expect(() => addCharacterSkill(testCharacter.character_id, 4, 2))
                .toThrow("CHECK constraint failed")
        })
    })

    describe("updateCharacterSkillExpertise", () => {
        test("toggles expertise on an existing skill", () => {
            addCharacterSkill(testCharacter.character_id, 17)

            const withExpertise =
                updateCharacterSkillExpertise(testCharacter.character_id, 17, 1)

            expect(withExpertise).toEqual([
                expect.objectContaining({ skill_id: 17, expertise: 1 })
            ])

            const withoutExpertise =
                updateCharacterSkillExpertise(testCharacter.character_id, 17, 0)

            expect(withoutExpertise).toEqual([
                expect.objectContaining({ skill_id: 17, expertise: 0 })
            ])
        })

        test("returns undefined for a skill the character does not have", () => {
            expect(
                updateCharacterSkillExpertise(testCharacter.character_id, 17, 1)
            ).toBeUndefined()
        })
    })

    describe("removeCharacterSkill", () => {
        test("removes a skill", () => {
            addCharacterSkill(testCharacter.character_id, 4)
            addCharacterSkill(testCharacter.character_id, 17)

            expect(removeCharacterSkill(testCharacter.character_id, 4)).toBe(true)

            expect(findCharacterSkills(testCharacter.character_id)).toEqual([
                expect.objectContaining({ skill_id: 17 })
            ])
        })

        test("returns false for a skill the character does not have", () => {
            expect(removeCharacterSkill(testCharacter.character_id, 4)).toBe(false)
        })
    })

    describe("addCharacterWeaponMastery", () => {
        test.todo("adds a weapon mastery")
        test.todo("rejects a duplicate weapon mastery")
    })

    describe("removeCharacterWeaponMastery", () => {
        test.todo("removes a weapon mastery")
    })
})
