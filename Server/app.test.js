const request = require("supertest")
const app = require("./app")


// App-wide behavior that is not tied to a single router
describe("App", () => {

    describe("unknown routes", () => {

        test("return 404 JSON for an unknown GET route", async () => {
            const response = await request(app)
                .get("/lookups/clases")

            expect(response.status).toBe(404)
            expect(response.headers["content-type"]).toMatch(/application\/json/)
            expect(response.body.error).toBe(
                "Route not found: GET /lookups/clases"
            )
        })


        test("return 404 JSON for an unknown method on a known path", async () => {
            const response = await request(app)
                .delete("/lookups/classes")

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Route not found: DELETE /lookups/classes"
            )
        })

    })


    describe("malformed request bodies", () => {

        test("return 400 JSON when the body is not valid JSON", async () => {
            const response = await request(app)
                .post("/auth/login")
                .set("Content-Type", "application/json")
                .send("{ not valid json")

            expect(response.status).toBe(400)
            expect(response.headers["content-type"]).toMatch(/application\/json/)
            expect(response.body.error).toBe(
                "Request body is not valid JSON"
            )
        })

    })


    describe("existing routes", () => {

        test("are unaffected by the error handlers", async () => {
            const response = await request(app)
                .get("/lookups/classes")

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(12)
        })

    })

})
