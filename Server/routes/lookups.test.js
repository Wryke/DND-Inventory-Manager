const request = require("supertest")
const app = require("../app")


// Lookup data comes from referenceSeed.sql and is the same for every user.
describe("Lookup Routes", () => {

    const expectAlphabetical = (rows, field) => {
        const names = rows.map(row => row[field])
        const sortedNames = [...names].sort(
            (a, b) => a.localeCompare(b)
        )
        expect(names).toEqual(sortedNames)
    }


    // --- GET /lookups/backgrounds ---

    describe("GET /lookups/backgrounds", () => {

        test("returns all sixteen backgrounds", async () => {
            const response = await request(app)
                .get("/lookups/backgrounds")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(16)
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    background_id: 15,
                    background_index: "soldier",
                    background_name: "Soldier"
                })
            ]))
        })


        test("returns backgrounds ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/backgrounds")

            expectAlphabetical(response.body, "background_name")
        })

    })


    // --- GET /lookups/classes ---

    describe("GET /lookups/classes", () => {

        test("returns all twelve classes", async () => {
            const response = await request(app)
                .get("/lookups/classes")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(12)
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({ class_id: 5, class_name: "Fighter" }),
                expect.objectContaining({ class_id: 9, class_name: "Rogue" })
            ]))
        })


        test("returns classes ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/classes")

            expectAlphabetical(response.body, "class_name")
        })

    })


    // --- GET /lookups/classes/:classId/subclasses ---

    describe("GET /lookups/classes/:classId/subclasses", () => {

        test("returns the subclasses for a class", async () => {
            const response = await request(app)
                .get("/lookups/classes/5/subclasses")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(4)
            expect(
                response.body.every(subclass => subclass.class_id === 5)
            ).toBe(true)
            expect(
                response.body.map(subclass => subclass.subclass_name)
            ).toContain("Champion")
        })


        test("returns subclasses ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/classes/5/subclasses")

            expectAlphabetical(response.body, "subclass_name")
        })


        test("returns 400 when the class ID is not an integer", async () => {
            const response = await request(app)
                .get("/lookups/classes/fighter/subclasses")

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "A valid class ID is required"
            )
        })


        test("returns 404 for a class that does not exist", async () => {
            const response = await request(app)
                .get("/lookups/classes/999999/subclasses")

            expect(response.status).toBe(404)
            expect(response.body.error).toBe("Class not found")
        })

    })


    // --- GET /lookups/skills ---

    describe("GET /lookups/skills", () => {

        test("returns all eighteen skills with their abilities", async () => {
            const response = await request(app)
                .get("/lookups/skills")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(18)
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    skill_id: 17,
                    skill_name: "Stealth",
                    ability_index: "dex"
                }),
                expect.objectContaining({
                    skill_name: "Athletics",
                    ability_index: "str"
                })
            ]))
        })


        test("returns skills ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/skills")

            expectAlphabetical(response.body, "skill_name")
        })

    })


    // --- GET /lookups/species ---

    describe("GET /lookups/species", () => {

        test("returns all ten species", async () => {
            const response = await request(app)
                .get("/lookups/species")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(10)
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    species_id: 8,
                    species_index: "human",
                    species_name: "Human"
                })
            ]))
        })


        test("returns species ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/species")

            expectAlphabetical(response.body, "species_name")
        })

    })


    // --- GET /lookups/weapon-masteries ---

    describe("GET /lookups/weapon-masteries", () => {

        test("returns all 38 weapon types with their mastery", async () => {
            const response = await request(app)
                .get("/lookups/weapon-masteries")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(38)
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    weapon_type_id: 22,
                    weapon_type_name: "Longsword",
                    weapon_category: "martial",
                    mastery_name: "Sap"
                })
            ]))
        })


        test("returns weapon types ordered by name", async () => {
            const response = await request(app)
                .get("/lookups/weapon-masteries")

            expectAlphabetical(response.body, "weapon_type_name")
        })

    })


    // --- Authentication ---

    describe("authentication", () => {

        test("does not require a logged-in user", async () => {
            const paths = [
                "/lookups/backgrounds",
                "/lookups/classes",
                "/lookups/classes/5/subclasses",
                "/lookups/skills",
                "/lookups/species",
                "/lookups/weapon-masteries"
            ]

            for (const path of paths) {
                const response = await request(app).get(path)

                expect(response.status).toBe(200)
            }
        })

    })

})
