const request = require("supertest")
const app = require("../app")
const db = require("../db/connection.js")


describe("Character Routes", () => {
    let testUser
    let testCharacter
    let agent

    const TEST_PASSWORD = "testpass"

    beforeEach(async () => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        agent = request.agent(app)

        const userResponse = await agent
            .post("/users")
            .send({
                username: `CharacterTestUser_${uniqueSuffix}`,
                email: `charactertest_${uniqueSuffix}@example.com`,
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
                name: `TestCharacter_${uniqueSuffix}`,
                max_weight: 100
            })

        expect(characterResponse.status).toBe(201)

        testCharacter = characterResponse.body
    })


    afterEach(() => {
        /*
         * Deleting the test user also deletes owned characters
         * through the database's cascading foreign keys.
         *
         * Some tests may already delete the character.
         */
        db.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).run(testUser.user_id)
    })


    // --- GET /characters ---

    describe("GET /characters", () => {

        test("returns the authenticated user's characters", async () => {
            const response = await agent
                .get("/characters")

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)

            const character = response.body.find(
                character =>
                    character.character_id ===
                    testCharacter.character_id
            )

            expect(character).toBeDefined()
            expect(character.name).toBe(testCharacter.name)
            expect(character.max_weight).toBe(100)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get("/characters")

            expect(response.status).toBe(401)

            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("does not return another user's characters", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondAgent = request.agent(app)

            const secondUserResponse = await secondAgent
                .post("/users")
                .send({
                    username: `SecondCharacterUser_${uniqueSuffix}`,
                    email: `secondcharacter_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            const secondUser = secondUserResponse.body

            const secondLoginResponse = await secondAgent
                .post("/auth/login")
                .send({
                    email: secondUser.email,
                    password: TEST_PASSWORD
                })

            expect(secondLoginResponse.status).toBe(200)

            const secondCharacterResponse = await secondAgent
                .post("/characters")
                .send({
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 200
                })

            expect(secondCharacterResponse.status).toBe(201)

            const response = await agent
                .get("/characters")

            expect(response.status).toBe(200)

            const otherCharacter = response.body.find(
                character =>
                    character.character_id ===
                    secondCharacterResponse.body.character_id
            )

            expect(otherCharacter).toBeUndefined()

            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(secondUser.user_id)
        })

    })


    // --- GET /characters/:name ---

    describe("GET /characters/:name", () => {

        test("returns the requested character", async () => {
            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )

            expect(response.status).toBe(200)

            expect(response.body.character_id)
                .toBe(testCharacter.character_id)

            expect(response.body.name)
                .toBe(testCharacter.name)

            expect(response.body.max_weight)
                .toBe(100)
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .get("/characters/CharacterThatDoesNotExist")

            expect(response.status).toBe(404)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )

            expect(response.status).toBe(401)

            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("does not allow access to another user's character", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondAgent = request.agent(app)

            const secondUserResponse = await secondAgent
                .post("/users")
                .send({
                    username: `SecondCharacterUser_${uniqueSuffix}`,
                    email: `secondcharacter_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            const secondUser = secondUserResponse.body

            const secondLoginResponse = await secondAgent
                .post("/auth/login")
                .send({
                    email: secondUser.email,
                    password: TEST_PASSWORD
                })

            expect(secondLoginResponse.status).toBe(200)

            const secondCharacterResponse = await secondAgent
                .post("/characters")
                .send({
                    name: `PrivateCharacter_${uniqueSuffix}`,
                    max_weight: 150
                })

            expect(secondCharacterResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}`
                )

            expect(response.status).toBe(404)

            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(secondUser.user_id)
        })

    })


    // --- POST /characters ---

    describe("POST /characters", () => {

        test("creates a valid character for the authenticated user", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const name =
                `AdditionalCharacter_${uniqueSuffix}`

            const response = await agent
                .post("/characters")
                .send({
                    name,
                    max_weight: 250
                })

            expect(response.status).toBe(201)
            expect(response.body).toHaveProperty("character_id")
            expect(response.body.name).toBe(name)
            expect(response.body.max_weight).toBe(250)

            const storedCharacter = db.prepare(`
                SELECT *
                FROM characters
                WHERE character_id = ?
            `).get(response.body.character_id)

            expect(storedCharacter).toBeDefined()
            expect(storedCharacter.user_id)
                .toBe(testUser.user_id)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .post("/characters")
                .send({
                    name: "UnauthorizedCharacter",
                    max_weight: 100
                })

            expect(response.status).toBe(401)

            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("rejects a missing name", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    max_weight: 100
                })

            expect(response.status).toBe(400)
        })


        test("rejects a missing max weight", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: "MissingWeightCharacter"
                })

            expect(response.status).toBe(400)
        })


        test("rejects a duplicate character name for the same user", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: testCharacter.name,
                    max_weight: 200
                })

            expect(response.status).toBe(409)
        })


        test("accepts a decimal max weight", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: `DecimalWeight_${Date.now()}`,
                    max_weight: 120.5
                })

            expect(response.status).toBe(201)
            expect(response.body.max_weight).toBe(120.5)
        })


        test("creates a character with species, background, and ability scores", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: `DetailedCharacter_${Date.now()}`,
                    max_weight: 150,
                    species_id: 8,
                    background_id: 15,
                    strength_score: 16,
                    wisdom_score: 12
                })

            expect(response.status).toBe(201)
            expect(response.body).toMatchObject({
                species_name: "Human",
                background_name: "Soldier",
                strength_score: 16,
                dexterity_score: 10,
                wisdom_score: 12
            })
        })


        test("rejects an invalid ability score", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: `BadScore_${Date.now()}`,
                    max_weight: 100,
                    strength_score: 0
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "strength_score must be a positive integer"
            )
        })


        test("returns 400 for a species that does not exist", async () => {
            const response = await agent
                .post("/characters")
                .send({
                    name: `BadSpecies_${Date.now()}`,
                    max_weight: 100,
                    species_id: 999999
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Species or background not found"
            )
        })


        test("allows different users to use the same character name", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondAgent = request.agent(app)

            const secondUserResponse = await secondAgent
                .post("/users")
                .send({
                    username: `SameNameUser_${uniqueSuffix}`,
                    email: `samename_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            const secondUser = secondUserResponse.body

            const loginResponse = await secondAgent
                .post("/auth/login")
                .send({
                    email: secondUser.email,
                    password: TEST_PASSWORD
                })

            expect(loginResponse.status).toBe(200)

            const response = await secondAgent
                .post("/characters")
                .send({
                    name: testCharacter.name,
                    max_weight: 150
                })

            expect(response.status).toBe(201)
            expect(response.body.name).toBe(testCharacter.name)

            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(secondUser.user_id)
        })

    })


    // --- PATCH /characters/:name ---

    describe("PATCH /characters/:name", () => {

        test("updates the character name", async () => {
            const newName =
                `${testCharacter.name}_Updated`

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    name: newName
                })

            expect(response.status).toBe(200)
            expect(response.body.name).toBe(newName)

            const storedCharacter = db.prepare(`
                SELECT *
                FROM characters
                WHERE character_id = ?
            `).get(testCharacter.character_id)

            expect(storedCharacter.name).toBe(newName)
        })


        test("updates the character max weight", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    max_weight: 300
                })

            expect(response.status).toBe(200)
            expect(response.body.max_weight).toBe(300)

            const storedCharacter = db.prepare(`
                SELECT *
                FROM characters
                WHERE character_id = ?
            `).get(testCharacter.character_id)

            expect(storedCharacter.max_weight).toBe(300)
        })


        test("updates name and max weight together", async () => {
            const newName =
                `${testCharacter.name}_Updated`

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    name: newName,
                    max_weight: 350
                })

            expect(response.status).toBe(200)
            expect(response.body.name).toBe(newName)
            expect(response.body.max_weight).toBe(350)
        })


        test("updates species, background, and ability scores", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    species_id: 4,
                    background_id: 4,
                    dexterity_score: 17
                })

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject({
                name: testCharacter.name,
                max_weight: testCharacter.max_weight,
                species_name: "Elf",
                background_name: "Criminal",
                dexterity_score: 17,
                strength_score: 10
            })
        })


        test("accepts a decimal max weight", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    max_weight: 99.5
                })

            expect(response.status).toBe(200)
            expect(response.body.max_weight).toBe(99.5)
        })


        test("rejects an empty update", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "At least one field must be provided"
            )
        })


        test("returns 400 for a background that does not exist", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    background_id: 999999
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Species or background not found"
            )
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .patch("/characters/CharacterThatDoesNotExist")
                .send({
                    name: "UpdatedName"
                })

            expect(response.status).toBe(404)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )
                .send({
                    name: "UnauthorizedUpdate"
                })

            expect(response.status).toBe(401)

            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("does not allow updating another user's character", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondAgent = request.agent(app)

            const secondUserResponse = await secondAgent
                .post("/users")
                .send({
                    username: `SecondUpdateUser_${uniqueSuffix}`,
                    email: `secondupdate_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            const secondUser = secondUserResponse.body

            const loginResponse = await secondAgent
                .post("/auth/login")
                .send({
                    email: secondUser.email,
                    password: TEST_PASSWORD
                })

            expect(loginResponse.status).toBe(200)

            const secondCharacterResponse = await secondAgent
                .post("/characters")
                .send({
                    name: `PrivateUpdateCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            expect(secondCharacterResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}`
                )
                .send({
                    name: "StolenCharacter"
                })

            expect(response.status).toBe(404)

            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(secondUser.user_id)
        })

    })


    // --- DELETE /characters/:name ---

    describe("DELETE /characters/:name", () => {

        test("deletes the authenticated user's character", async () => {
            const response = await agent
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )

            expect(response.status).toBe(200)

            const storedCharacter = db.prepare(`
                SELECT *
                FROM characters
                WHERE character_id = ?
            `).get(testCharacter.character_id)

            expect(storedCharacter).toBeUndefined()
        })


        test("trims the character name before deleting", async () => {
            const response = await agent
                .delete(
                    `/characters/${encodeURIComponent(` ${testCharacter.name} `)}`
                )

            expect(response.status).toBe(200)
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .delete("/characters/CharacterThatDoesNotExist")

            expect(response.status).toBe(404)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}`
                )

            expect(response.status).toBe(401)

            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("does not allow deleting another user's character", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondAgent = request.agent(app)

            const secondUserResponse = await secondAgent
                .post("/users")
                .send({
                    username: `SecondDeleteUser_${uniqueSuffix}`,
                    email: `seconddelete_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            const secondUser = secondUserResponse.body

            const loginResponse = await secondAgent
                .post("/auth/login")
                .send({
                    email: secondUser.email,
                    password: TEST_PASSWORD
                })

            expect(loginResponse.status).toBe(200)

            const secondCharacterResponse = await secondAgent
                .post("/characters")
                .send({
                    name: `PrivateDeleteCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            expect(secondCharacterResponse.status).toBe(201)

            const response = await agent
                .delete(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}`
                )

            expect(response.status).toBe(404)

            const storedCharacter = db.prepare(`
                SELECT *
                FROM characters
                WHERE character_id = ?
            `).get(
                secondCharacterResponse.body.character_id
            )

            expect(storedCharacter).toBeDefined()

            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(secondUser.user_id)
        })

    })

})