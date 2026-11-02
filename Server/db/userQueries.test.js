
const {
    findUserById,
    findUserByUsername,
    findUserByEmail,
    findPasswordHashByUserId,
    createUser,
    updateUserById,
    deleteUserById
} = require("./userQueries")

const {
    createCharacter,
    findCharacterByUserIdAndName
} = require("./characterQueries")

// Integration tests: use a dedicated SQLite test database.
describe("Database User Queries", () => {
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

    describe("findUserById", () => {
        test("returns an existing user", () => {
            const user = findUserById(testUser.user_id)

            expect(user).toEqual({
                user_id: testUser.user_id,
                username: testUser.username,
                email: testUser.email
            })
        })

        test("does not return the password hash", () => {
            const user = findUserById(testUser.user_id)

            expect(user).not.toHaveProperty("password_hash")
        })

        test("returns undefined for a missing user", () => {
            const user = findUserById(999999999)

            expect(user).toBeUndefined()
        })
    })

    describe("findUserByUsername", () => {
        test("returns an existing user", () => {
            const user = findUserByUsername(testUser.username)

            expect(user).toEqual({
                user_id: testUser.user_id,
                username: testUser.username
            })
        })

        test("only returns safe username lookup data", () => {
            const user = findUserByUsername(testUser.username)

            expect(user).not.toHaveProperty("email")
            expect(user).not.toHaveProperty("password_hash")
        })

        test("returns undefined for a missing username", () => {
            const user = findUserByUsername("FortuneFinder")

            expect(user).toBeUndefined()
        })
    })

    describe("findUserByEmail", () => {
        test("returns an existing user by email", () => {
            const user = findUserByEmail(testUser.email)

            expect(user).toBeDefined()
            expect(user.user_id).toBe(testUser.user_id)
            expect(user.username).toBe(testUser.username)
            expect(user.email).toBe(testUser.email)
        })

        test("returns the password hash for authentication", () => {
            const user = findUserByEmail(testUser.email)

            expect(user).toHaveProperty("password_hash")
            expect(user.password_hash).toContain("test-hash-")
        })

        test("returns undefined for a missing email", () => {
            const user = findUserByEmail(
                "missing-user@example.com"
            )

            expect(user).toBeUndefined()
        })
    })

    describe("findPasswordHashByUserId", () => {
        test("returns the password hash for an existing user", () => {
            const passwordHash =
                findPasswordHashByUserId(testUser.user_id)

            expect(passwordHash).toContain("test-hash-")
        })

        test("returns the hash string instead of an object", () => {
            const passwordHash =
                findPasswordHashByUserId(testUser.user_id)

            expect(typeof passwordHash).toBe("string")
        })

        test("returns undefined for a missing user", () => {
            const passwordHash =
                findPasswordHashByUserId(999999999)

            expect(passwordHash).toBeUndefined()
        })
    })

    describe("createUser", () => {
        test("creates a new user", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const user = createUser({
                username: `AdditionalUser_${uniqueSuffix}`,
                email: `additional_${uniqueSuffix}@example.com`,
                passwordHash: "additional-test-hash"
            })

            additionalUserIds.push(user.user_id)

            expect(user).toEqual({
                user_id: expect.any(Number),
                username: `AdditionalUser_${uniqueSuffix}`,
                email: `additional_${uniqueSuffix}@example.com`
            })

            const storedUser = findUserById(user.user_id)

            expect(storedUser).toEqual(user)
        })

        test("stores the supplied password hash", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const user = createUser({
                username: `HashUser_${uniqueSuffix}`,
                email: `hash_${uniqueSuffix}@example.com`,
                passwordHash: "my-test-password-hash"
            })

            additionalUserIds.push(user.user_id)

            expect(
                findPasswordHashByUserId(user.user_id)
            ).toBe("my-test-password-hash")
        })

        test("does not return the password hash", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const user = createUser({
                username: `SafeUser_${uniqueSuffix}`,
                email: `safe_${uniqueSuffix}@example.com`,
                passwordHash: "secret-test-hash"
            })

            additionalUserIds.push(user.user_id)

            expect(user).not.toHaveProperty("password_hash")
        })

        test("throws for a duplicate username", () => {
            expect(() => {
                createUser({
                    username: testUser.username,
                    email: `different_${Date.now()}@example.com`,
                    passwordHash: "different-hash"
                })
            }).toThrow("UNIQUE constraint failed")
        })

        test("throws for a duplicate email", () => {
            expect(() => {
                createUser({
                    username: `DifferentUser_${Date.now()}`,
                    email: testUser.email,
                    passwordHash: "different-hash"
                })
            }).toThrow("UNIQUE constraint failed")
        })
    })

    describe("updateUserById", () => {
        test("updates an existing user", () => {
            const newUsername =
                `${testUser.username}_Updated`

            const newEmail =
                `updated_${Date.now()}@example.com`

            const newPasswordHash = "updated-password-hash"

            const result = updateUserById(testUser.user_id, {
                username: newUsername,
                email: newEmail,
                passwordHash: newPasswordHash
            })

            expect(result).toEqual({
                user_id: testUser.user_id,
                username: newUsername,
                email: newEmail
            })

            const storedUser = findUserById(testUser.user_id)

            expect(storedUser).toEqual(result)

            expect(
                findPasswordHashByUserId(testUser.user_id)
            ).toBe(newPasswordHash)
        })

        test("does not return the password hash", () => {
            const result = updateUserById(testUser.user_id, {
                username: testUser.username,
                email: testUser.email,
                passwordHash: "new-test-hash"
            })

            expect(result).not.toHaveProperty("password_hash")
        })

        test("returns undefined for a missing user", () => {
            const result = updateUserById(999999999, {
                username: "MissingUser",
                email: "missing@example.com",
                passwordHash: "missing-hash"
            })

            expect(result).toBeUndefined()
        })

        test("leaves omitted fields unchanged", () => {
            const originalHash = findPasswordHashByUserId(testUser.user_id)
            const newUsername = `${testUser.username}_Partial`

            const result = updateUserById(testUser.user_id, {
                username: newUsername
            })

            expect(result).toEqual({
                user_id: testUser.user_id,
                username: newUsername,
                email: testUser.email
            })

            expect(
                findPasswordHashByUserId(testUser.user_id)
            ).toBe(originalHash)
        })
    })

    describe("deleteUserById", () => {
        test("deletes an existing user", () => {
            const deleted = deleteUserById(testUser.user_id)

            expect(deleted).toBe(true)
            expect(findUserById(testUser.user_id)).toBeUndefined()
        })

        test("deletes the user's characters through cascade", () => {
            const characterId = testCharacter.character_id
            const characterName = testCharacter.name

            const deleted = deleteUserById(testUser.user_id)

            expect(deleted).toBe(true)

            expect(
                findCharacterByUserIdAndName(
                    testUser.user_id,
                    characterName
                )
            ).toBeUndefined()

            expect(characterId).toBeDefined()
        })

        test("returns false for a missing user", () => {
            const deleted = deleteUserById(999999999)

            expect(deleted).toBe(false)
        })
    })
})
