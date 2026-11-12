const request = require("supertest")
const app = require("../app")
const db = require("../db/connection.js")


// Reference ids come from referenceSeed.sql:
// Fighter 5 (Champion 18), Paladin subclass Oath of Devotion 25, Rogue 9,
// skills Athletics 4 and Stealth 17, proficiencies Martial Weapons 7 and
// Saving Throw: STR 58, weapon types Dagger 2 and Longsword 22.
describe("Character Trait Routes", () => {
    let testUser
    let testCharacter
    let agent

    const TEST_PASSWORD = "testpass"

    const characterPath = (suffix) =>
        `/characters/${encodeURIComponent(testCharacter.name)}${suffix}`

    beforeEach(async () => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        agent = request.agent(app)

        const userResponse = await agent
            .post("/users")
            .send({
                username: `TraitTestUser_${uniqueSuffix}`,
                email: `traittest_${uniqueSuffix}@example.com`,
                password: TEST_PASSWORD
            })

        expect(userResponse.status).toBe(201)

        testUser = userResponse.body

        const loginResponse = await agent
            .post("/auth/login")
            .send({
                email: testUser.email,
                password: TEST_PASSWORD
            })

        expect(loginResponse.status).toBe(200)

        const characterResponse = await agent
            .post("/characters")
            .send({
                name: `TraitTestCharacter_${uniqueSuffix}`,
                max_weight: 100
            })

        expect(characterResponse.status).toBe(201)

        testCharacter = characterResponse.body
    })


    afterEach(() => {
        /*
         * Deleting the test user cascades through the character
         * and all of its trait rows.
         */
        db.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).run(testUser.user_id)
    })


    // --- Authentication and ownership ---

    describe("authentication and ownership", () => {

        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(characterPath("/sheet"))

            expect(response.status).toBe(401)
            expect(response.body.error).toBe("Not authenticated")
        })


        test("returns 404 for a character the user does not own", async () => {
            const response = await agent
                .post("/characters/CharacterThatDoesNotExist/classes")
                .send({
                    class_id: 5,
                    class_level: 1
                })

            expect(response.status).toBe(404)
            expect(response.body.error).toBe("Character not found")
        })

    })


    // --- GET /characters/:name/sheet ---

    describe("GET /characters/:name/sheet", () => {

        test("returns an empty sheet for a new character", async () => {
            const response = await agent
                .get(characterPath("/sheet"))

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject({
                character_id: testCharacter.character_id,
                name: testCharacter.name,
                classes: [],
                proficiencies: [],
                skills: [],
                weapon_masteries: []
            })
        })


        test("includes traits after they are added", async () => {
            await agent.post(characterPath("/classes")).send({ class_id: 5, subclass_id: 18, class_level: 3 })
            await agent.post(characterPath("/skills")).send({ skill_id: 4 })
            await agent.post(characterPath("/proficiencies")).send({ proficiency_id: 7 })
            await agent.post(characterPath("/weapon-masteries")).send({ weapon_type_id: 22 })

            const response = await agent
                .get(characterPath("/sheet"))

            expect(response.status).toBe(200)
            expect(response.body.classes).toEqual([
                expect.objectContaining({ class_name: "Fighter", subclass_name: "Champion", class_level: 3 })
            ])
            expect(response.body.skills).toEqual([
                expect.objectContaining({ skill_name: "Athletics", expertise: 0 })
            ])
            expect(response.body.proficiencies).toEqual([
                expect.objectContaining({ proficiency_index: "martial-weapons" })
            ])
            expect(response.body.weapon_masteries).toEqual([
                expect.objectContaining({ weapon_type_name: "Longsword" })
            ])
        })

    })


    // --- Classes ---

    describe("POST /characters/:name/classes", () => {

        test("adds a class with a subclass", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 5,
                    subclass_id: 18,
                    class_level: 3
                })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({
                    class_id: 5,
                    class_name: "Fighter",
                    subclass_id: 18,
                    subclass_name: "Champion",
                    class_level: 3
                })
            ])
        })


        test("adds a class without a subclass", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 9,
                    class_level: 1
                })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({ class_name: "Rogue", subclass_id: null })
            ])
        })


        test("rejects a missing class level", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 5
                })

            expect(response.status).toBe(400)
        })


        test("rejects a level above 20", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 5,
                    class_level: 21
                })

            expect(response.status).toBe(400)
        })


        test("rejects a class that does not exist", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 999999,
                    class_level: 1
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Class not found, or the subclass does not belong to that class"
            )
        })


        test("rejects a subclass from a different class", async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({
                    class_id: 5,
                    subclass_id: 25,
                    class_level: 3
                })

            expect(response.status).toBe(400)
        })


        test("rejects a duplicate class", async () => {
            await agent
                .post(characterPath("/classes"))
                .send({ class_id: 5, class_level: 1 })

            const response = await agent
                .post(characterPath("/classes"))
                .send({ class_id: 5, class_level: 2 })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe(
                "This character already has that class"
            )
        })

    })


    describe("PATCH /characters/:name/classes/:classId", () => {

        beforeEach(async () => {
            const response = await agent
                .post(characterPath("/classes"))
                .send({ class_id: 5, class_level: 3 })

            expect(response.status).toBe(201)
        })


        test("updates the class level", async () => {
            const response = await agent
                .patch(characterPath("/classes/5"))
                .send({ class_level: 4 })

            expect(response.status).toBe(200)
            expect(response.body).toEqual([
                expect.objectContaining({ class_id: 5, class_level: 4, subclass_id: null })
            ])
        })


        test("sets a subclass", async () => {
            const response = await agent
                .patch(characterPath("/classes/5"))
                .send({ subclass_id: 18 })

            expect(response.status).toBe(200)
            expect(response.body).toEqual([
                expect.objectContaining({ subclass_name: "Champion", class_level: 3 })
            ])
        })


        test("rejects an empty update", async () => {
            const response = await agent
                .patch(characterPath("/classes/5"))
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.error).toBe("At least one field must be provided")
        })


        test("rejects a subclass from a different class", async () => {
            const response = await agent
                .patch(characterPath("/classes/5"))
                .send({ subclass_id: 25 })

            expect(response.status).toBe(400)
        })


        test("returns 404 for a class the character does not have", async () => {
            const response = await agent
                .patch(characterPath("/classes/9"))
                .send({ class_level: 2 })

            expect(response.status).toBe(404)
        })


        test("returns 400 for a class ID that is not an integer", async () => {
            const response = await agent
                .patch(characterPath("/classes/fighter"))
                .send({ class_level: 2 })

            expect(response.status).toBe(400)
        })

    })


    describe("DELETE /characters/:name/classes/:classId", () => {

        test("removes a class and returns the remaining classes", async () => {
            await agent.post(characterPath("/classes")).send({ class_id: 5, class_level: 2 })
            await agent.post(characterPath("/classes")).send({ class_id: 9, class_level: 1 })

            const response = await agent
                .delete(characterPath("/classes/5"))

            expect(response.status).toBe(200)
            expect(response.body.deleted).toBe(true)
            expect(response.body.classes).toEqual([
                expect.objectContaining({ class_id: 9 })
            ])
        })


        test("returns 404 for a class the character does not have", async () => {
            const response = await agent
                .delete(characterPath("/classes/5"))

            expect(response.status).toBe(404)
        })

    })


    // --- Skills ---

    describe("POST /characters/:name/skills", () => {

        test("adds a skill without expertise by default", async () => {
            const response = await agent
                .post(characterPath("/skills"))
                .send({ skill_id: 4 })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({ skill_id: 4, skill_name: "Athletics", expertise: 0 })
            ])
        })


        test("accepts boolean expertise", async () => {
            const response = await agent
                .post(characterPath("/skills"))
                .send({ skill_id: 17, expertise: true })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({ skill_name: "Stealth", expertise: 1 })
            ])
        })


        test("rejects an invalid expertise value", async () => {
            const response = await agent
                .post(characterPath("/skills"))
                .send({ skill_id: 4, expertise: "yes" })

            expect(response.status).toBe(400)
        })


        test("rejects a skill that does not exist", async () => {
            const response = await agent
                .post(characterPath("/skills"))
                .send({ skill_id: 999999 })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe("Skill not found")
        })


        test("rejects a duplicate skill", async () => {
            await agent.post(characterPath("/skills")).send({ skill_id: 4 })

            const response = await agent
                .post(characterPath("/skills"))
                .send({ skill_id: 4 })

            expect(response.status).toBe(409)
        })

    })


    describe("PATCH /characters/:name/skills/:skillId", () => {

        test("toggles expertise", async () => {
            await agent.post(characterPath("/skills")).send({ skill_id: 17 })

            const on = await agent
                .patch(characterPath("/skills/17"))
                .send({ expertise: true })

            expect(on.status).toBe(200)
            expect(on.body).toEqual([
                expect.objectContaining({ skill_id: 17, expertise: 1 })
            ])

            const off = await agent
                .patch(characterPath("/skills/17"))
                .send({ expertise: false })

            expect(off.status).toBe(200)
            expect(off.body).toEqual([
                expect.objectContaining({ skill_id: 17, expertise: 0 })
            ])
        })


        test("rejects a missing expertise value", async () => {
            await agent.post(characterPath("/skills")).send({ skill_id: 17 })

            const response = await agent
                .patch(characterPath("/skills/17"))
                .send({})

            expect(response.status).toBe(400)
        })


        test("returns 404 for a skill the character does not have", async () => {
            const response = await agent
                .patch(characterPath("/skills/17"))
                .send({ expertise: true })

            expect(response.status).toBe(404)
        })

    })


    describe("DELETE /characters/:name/skills/:skillId", () => {

        test("removes a skill and returns the remaining skills", async () => {
            await agent.post(characterPath("/skills")).send({ skill_id: 4 })
            await agent.post(characterPath("/skills")).send({ skill_id: 17 })

            const response = await agent
                .delete(characterPath("/skills/4"))

            expect(response.status).toBe(200)
            expect(response.body.deleted).toBe(true)
            expect(response.body.skills).toEqual([
                expect.objectContaining({ skill_id: 17 })
            ])
        })


        test("returns 404 for a skill the character does not have", async () => {
            const response = await agent
                .delete(characterPath("/skills/4"))

            expect(response.status).toBe(404)
        })

    })


    // --- Proficiencies ---

    describe("POST /characters/:name/proficiencies", () => {

        test("adds a proficiency", async () => {
            const response = await agent
                .post(characterPath("/proficiencies"))
                .send({ proficiency_id: 7 })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({
                    proficiency_id: 7,
                    proficiency_index: "martial-weapons",
                    type_index: "weapon"
                })
            ])
        })


        test("rejects a missing proficiency ID", async () => {
            const response = await agent
                .post(characterPath("/proficiencies"))
                .send({})

            expect(response.status).toBe(400)
        })


        test("rejects a proficiency that does not exist", async () => {
            const response = await agent
                .post(characterPath("/proficiencies"))
                .send({ proficiency_id: 999999 })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe("Proficiency not found")
        })


        test("rejects a duplicate proficiency", async () => {
            await agent.post(characterPath("/proficiencies")).send({ proficiency_id: 7 })

            const response = await agent
                .post(characterPath("/proficiencies"))
                .send({ proficiency_id: 7 })

            expect(response.status).toBe(409)
        })

    })


    describe("DELETE /characters/:name/proficiencies/:proficiencyId", () => {

        test("removes a proficiency and returns the remaining proficiencies", async () => {
            await agent.post(characterPath("/proficiencies")).send({ proficiency_id: 7 })
            await agent.post(characterPath("/proficiencies")).send({ proficiency_id: 58 })

            const response = await agent
                .delete(characterPath("/proficiencies/7"))

            expect(response.status).toBe(200)
            expect(response.body.deleted).toBe(true)
            expect(response.body.proficiencies).toEqual([
                expect.objectContaining({ proficiency_id: 58 })
            ])
        })


        test("returns 404 for a proficiency the character does not have", async () => {
            const response = await agent
                .delete(characterPath("/proficiencies/7"))

            expect(response.status).toBe(404)
        })

    })


    // --- Weapon masteries ---

    describe("POST /characters/:name/weapon-masteries", () => {

        test("adds a weapon mastery", async () => {
            const response = await agent
                .post(characterPath("/weapon-masteries"))
                .send({ weapon_type_id: 22 })

            expect(response.status).toBe(201)
            expect(response.body).toEqual([
                expect.objectContaining({
                    weapon_type_id: 22,
                    weapon_type_name: "Longsword",
                    mastery_name: "Sap"
                })
            ])
        })


        test("rejects a weapon type that does not exist", async () => {
            const response = await agent
                .post(characterPath("/weapon-masteries"))
                .send({ weapon_type_id: 999999 })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe("Weapon type not found")
        })


        test("rejects a duplicate weapon mastery", async () => {
            await agent.post(characterPath("/weapon-masteries")).send({ weapon_type_id: 22 })

            const response = await agent
                .post(characterPath("/weapon-masteries"))
                .send({ weapon_type_id: 22 })

            expect(response.status).toBe(409)
        })

    })


    describe("DELETE /characters/:name/weapon-masteries/:weaponTypeId", () => {

        test("removes a weapon mastery and returns the remaining masteries", async () => {
            await agent.post(characterPath("/weapon-masteries")).send({ weapon_type_id: 22 })
            await agent.post(characterPath("/weapon-masteries")).send({ weapon_type_id: 2 })

            const response = await agent
                .delete(characterPath("/weapon-masteries/22"))

            expect(response.status).toBe(200)
            expect(response.body.deleted).toBe(true)
            expect(response.body.weapon_masteries).toEqual([
                expect.objectContaining({ weapon_type_id: 2 })
            ])
        })


        test("returns 404 for a mastery the character does not have", async () => {
            const response = await agent
                .delete(characterPath("/weapon-masteries/22"))

            expect(response.status).toBe(404)
        })

    })

})
