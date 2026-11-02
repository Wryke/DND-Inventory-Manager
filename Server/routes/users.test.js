const request = require("supertest")
const argon2 = require("argon2")

const app = require("../app")
const db = require("../db/connection.js")


describe("User Routes", () => {
    let testUser
    let agent
    let additionalUserIds

    const TEST_PASSWORD = "testpass"

    beforeEach(async () => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        agent = request.agent(app)
        additionalUserIds = []

        const userResponse = await agent
            .post("/users")
            .send({
                username: `TestUser_${uniqueSuffix}`,
                email: `test_${uniqueSuffix}@example.com`,
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
    })


    afterEach(() => {
        for (const userId of additionalUserIds) {
            db.prepare(`
                DELETE FROM users
                WHERE user_id = ?
            `).run(userId)
        }

        /*
         * Some tests explicitly delete testUser.
         * Deleting it again simply changes zero rows.
         */
        db.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).run(testUser.user_id)
    })


    // --- POST /users ---

    describe("POST /users", () => {

        test("creates a valid user", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const username =
                `TestUser_Additional_${uniqueSuffix}`

            const email =
                `additional_${uniqueSuffix}@example.com`

            const response = await request(app)
                .post("/users")
                .send({
                    username,
                    email,
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(201)
            expect(response.body.username).toBe(username)
            expect(response.body.email).toBe(email)
            expect(response.body).toHaveProperty("user_id")

            additionalUserIds.push(response.body.user_id)
        })


        test("does not return the password or password hash", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const response = await request(app)
                .post("/users")
                .send({
                    username: `TestUser_Secure_${uniqueSuffix}`,
                    email: `secure_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(201)

            expect(response.body.password).toBeUndefined()
            expect(response.body.password_hash).toBeUndefined()

            additionalUserIds.push(response.body.user_id)
        })


        test("stores a hashed password instead of plaintext", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const response = await request(app)
                .post("/users")
                .send({
                    username: `TestUser_Hash_${uniqueSuffix}`,
                    email: `hash_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(201)

            additionalUserIds.push(response.body.user_id)

            const storedUser = db.prepare(`
                SELECT password_hash
                FROM users
                WHERE user_id = ?
            `).get(response.body.user_id)

            expect(storedUser).toBeDefined()
            expect(storedUser.password_hash)
                .not.toBe(TEST_PASSWORD)

            const passwordMatches = await argon2.verify(
                storedUser.password_hash,
                TEST_PASSWORD
            )

            expect(passwordMatches).toBe(true)
        })


        test("rejects a missing username", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    email: "missingusername@example.com",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects an empty username", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "",
                    email: "emptyusername@example.com",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects a whitespace-only username", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "   ",
                    email: "whitespaceusername@example.com",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects a non-string password", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: `NumberPassword_${Date.now()}`,
                    email: `numberpassword_${Date.now()}@example.com`,
                    password: 12345678
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("trims the username and email", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const response = await request(app)
                .post("/users")
                .send({
                    username: `  TrimmedUser_${uniqueSuffix}  `,
                    email: `  trimmed_${uniqueSuffix}@example.com  `,
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(201)
            expect(response.body.username).toBe(`TrimmedUser_${uniqueSuffix}`)
            expect(response.body.email).toBe(`trimmed_${uniqueSuffix}@example.com`)

            additionalUserIds.push(response.body.user_id)
        })


        test("rejects a missing email", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "MissingEmailUser",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects an empty email", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "EmptyEmailUser",
                    email: "",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects a missing password", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "MissingPasswordUser",
                    email: "missingpassword@example.com"
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username, password, and email are required"
            )
        })


        test("rejects a password shorter than 8 characters", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "ShortPasswordUser",
                    email: "shortpassword@example.com",
                    password: "short"
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Password length must be 8-16 characters"
            )
        })


        test("rejects a password longer than 16 characters", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "LongPasswordUser",
                    email: "longpassword@example.com",
                    password: "12345678901234567"
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Password length must be 8-16 characters"
            )
        })


        test("rejects a duplicate username", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: testUser.username,
                    email: "different@example.com",
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe(
                "Username or email already exists"
            )
        })


        test("rejects a duplicate email", async () => {
            const response = await request(app)
                .post("/users")
                .send({
                    username: "DifferentUsername",
                    email: testUser.email,
                    password: TEST_PASSWORD
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe(
                "Username or email already exists"
            )
        })

    })


    // --- PATCH /users/me ---

    describe("PATCH /users/me", () => {

        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .patch("/users/me")
                .send({
                    username: "UpdatedUsername"
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("requires the current password to change username", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    username: `${testUser.username}_NoPassword`
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Current password is required"
            )
        })


        test("updates the username when the current password is correct", async () => {
            const newUsername =
                `${testUser.username}_Updated`

            const response = await agent
                .patch("/users/me")
                .send({
                    username: newUsername,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.user_id)
                .toBe(testUser.user_id)
            expect(response.body.username)
                .toBe(newUsername)
            expect(response.body.email)
                .toBe(testUser.email)

            const storedUser = db.prepare(`
                SELECT username
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            expect(storedUser.username).toBe(newUsername)
        })


        test("trims the username before updating it", async () => {
            const newUsername =
                `${testUser.username}_Trimmed`

            const response = await agent
                .patch("/users/me")
                .send({
                    username: `   ${newUsername}   `,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.username).toBe(newUsername)
        })


        test("rejects an empty username", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    username: "   "
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username must be a non-empty string"
            )
        })


        test("rejects a non-string username", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    username: 123
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Username must be a non-empty string"
            )
        })


        test("rejects a request with no update fields", async () => {
            const response = await agent
                .patch("/users/me")
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "At least one field must be provided"
            )
        })


        test("requires the current password to change email", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    email: "updated@example.com"
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Current password is required"
            )
        })


        test("rejects an incorrect current password when changing email", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    email: "updated@example.com",
                    currentPassword: "wrongpass"
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Current password is incorrect"
            )
        })


        test("updates the email when the current password is correct", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const newEmail =
                `updated_${uniqueSuffix}@example.com`

            const response = await agent
                .patch("/users/me")
                .send({
                    email: newEmail,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.user_id)
                .toBe(testUser.user_id)
            expect(response.body.username)
                .toBe(testUser.username)
            expect(response.body.email)
                .toBe(newEmail)

            const storedUser = db.prepare(`
                SELECT email
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            expect(storedUser.email).toBe(newEmail)
        })


        test("trims the email before updating it", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const newEmail =
                `trimmed_${uniqueSuffix}@example.com`

            const response = await agent
                .patch("/users/me")
                .send({
                    email: `   ${newEmail}   `,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.email).toBe(newEmail)
        })


        test("rejects an empty email", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    email: "   ",
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Email must be a non-empty string"
            )
        })


        test("rejects a non-string email", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    email: 123,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Email must be a non-empty string"
            )
        })


        test("requires the current password to change password", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    password: "newpass123"
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Current password is required"
            )
        })


        test("rejects an incorrect current password when changing password", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    password: "newpass123",
                    currentPassword: "wrongpass"
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Current password is incorrect"
            )
        })


        test("rejects a new password shorter than 8 characters", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    password: "short",
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Password length must be 8-16 characters"
            )
        })


        test("rejects a new password longer than 16 characters", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    password: "12345678901234567",
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Password length must be 8-16 characters"
            )
        })


        test("updates the password when the current password is correct", async () => {
            const newPassword = "newpass123"

            const response = await agent
                .patch("/users/me")
                .send({
                    password: newPassword,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.password).toBeUndefined()
            expect(response.body.password_hash).toBeUndefined()

            const storedUser = db.prepare(`
                SELECT password_hash
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            expect(storedUser.password_hash)
                .not.toBe(TEST_PASSWORD)

            const oldPasswordMatches = await argon2.verify(
                storedUser.password_hash,
                TEST_PASSWORD
            )

            const newPasswordMatches = await argon2.verify(
                storedUser.password_hash,
                newPassword
            )

            expect(oldPasswordMatches).toBe(false)
            expect(newPasswordMatches).toBe(true)
        })


        test("preserves the password when only the username changes", async () => {
            const response = await agent
                .patch("/users/me")
                .send({
                    username: `${testUser.username}_Updated`,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)

            const storedUser = db.prepare(`
                SELECT password_hash
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            const passwordMatches = await argon2.verify(
                storedUser.password_hash,
                TEST_PASSWORD
            )

            expect(passwordMatches).toBe(true)
        })


        test("preserves the password when only the email changes", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const response = await agent
                .patch("/users/me")
                .send({
                    email: `preserve_${uniqueSuffix}@example.com`,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)

            const storedUser = db.prepare(`
                SELECT password_hash
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            const passwordMatches = await argon2.verify(
                storedUser.password_hash,
                TEST_PASSWORD
            )

            expect(passwordMatches).toBe(true)
        })


        test("updates username, email, and password together", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const newUsername =
                `UpdatedUser_${uniqueSuffix}`

            const newEmail =
                `updatedall_${uniqueSuffix}@example.com`

            const newPassword = "newpass123"

            const response = await agent
                .patch("/users/me")
                .send({
                    username: newUsername,
                    email: newEmail,
                    password: newPassword,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.username).toBe(newUsername)
            expect(response.body.email).toBe(newEmail)
            expect(response.body.password).toBeUndefined()
            expect(response.body.password_hash).toBeUndefined()

            const storedUser = db.prepare(`
                SELECT username, email, password_hash
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            expect(storedUser.username).toBe(newUsername)
            expect(storedUser.email).toBe(newEmail)

            const passwordMatches = await argon2.verify(
                storedUser.password_hash,
                newPassword
            )

            expect(passwordMatches).toBe(true)
        })


        test("rejects a duplicate username", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondUserResponse = await request(app)
                .post("/users")
                .send({
                    username: `SecondUser_${uniqueSuffix}`,
                    email: `second_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            additionalUserIds.push(
                secondUserResponse.body.user_id
            )

            const response = await agent
                .patch("/users/me")
                .send({
                    username: secondUserResponse.body.username,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe(
                "Username or email already exists"
            )
        })


        test("rejects a duplicate email", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondUserResponse = await request(app)
                .post("/users")
                .send({
                    username: `SecondUser_${uniqueSuffix}`,
                    email: `second_${uniqueSuffix}@example.com`,
                    password: TEST_PASSWORD
                })

            expect(secondUserResponse.status).toBe(201)

            additionalUserIds.push(
                secondUserResponse.body.user_id
            )

            const response = await agent
                .patch("/users/me")
                .send({
                    email: secondUserResponse.body.email,
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(409)
            expect(response.body.error).toBe(
                "Username or email already exists"
            )
        })

    })


    // --- DELETE /users/me ---

    describe("DELETE /users/me", () => {

        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .delete("/users/me")
                .send({
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })


        test("requires the current password", async () => {
            const response = await agent
                .delete("/users/me")
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Current password is required"
            )
        })


        test("rejects an incorrect current password", async () => {
            const response = await agent
                .delete("/users/me")
                .send({
                    currentPassword: "wrongpass"
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Current password is incorrect"
            )
        })


        test("deletes the authenticated user with the correct password", async () => {
            const response = await agent
                .delete("/users/me")
                .send({
                    currentPassword: TEST_PASSWORD
                })

            expect(response.status).toBe(200)
            expect(response.body.deleted).toBe(true)

            const storedUser = db.prepare(`
                SELECT *
                FROM users
                WHERE user_id = ?
            `).get(testUser.user_id)

            expect(storedUser).toBeUndefined()
        })


        test("destroys the session after deleting the user", async () => {
            const deleteResponse = await agent
                .delete("/users/me")
                .send({
                    currentPassword: TEST_PASSWORD
                })

            expect(deleteResponse.status).toBe(200)

            const meResponse = await agent
                .get("/auth/me")

            expect(meResponse.status).toBe(401)
            expect(meResponse.body.error).toBe(
                "Not authenticated"
            )
        })

    })

})