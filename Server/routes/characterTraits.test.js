const request = require("supertest")
const app = require("../app")


// Placeholder until the character trait routes are implemented
describe("Character Trait Routes", () => {

    test("the app loads with the character trait router mounted", () => {
        expect(app).toBeDefined()
    })

    test("trait routes are not implemented yet", async () => {
        const response = await request(app)
            .get("/characters/AnyCharacter/sheet")

        // Unauthenticated requests are rejected or not found; neither is a 500
        expect(response.status).not.toBe(500)
    })

    describe("GET /characters/:name/sheet", () => {
        test.todo("returns the character with classes, proficiencies, skills, and weapon masteries")
    })

    describe("classes", () => {
        test.todo("POST adds a class")
        test.todo("PATCH updates a class level or subclass")
        test.todo("DELETE removes a class")
    })

    describe("skills", () => {
        test.todo("POST adds a skill")
        test.todo("PATCH updates skill expertise")
        test.todo("DELETE removes a skill")
    })

    describe("proficiencies", () => {
        test.todo("POST adds a proficiency")
        test.todo("DELETE removes a proficiency")
    })

    describe("weapon masteries", () => {
        test.todo("POST adds a weapon mastery")
        test.todo("DELETE removes a weapon mastery")
    })

})
