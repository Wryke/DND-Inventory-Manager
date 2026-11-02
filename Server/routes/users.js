const express = require("express")
const router = express.Router()

const argon2 = require("argon2")

const requireAuth = require("../middleware/requireAuth")

const { 
    findUserById,
    findPasswordHashByUserId,
    createUser,
    updateUserById,
    deleteUserById,
} = require("../db/userQueries.js")

// --- User Routes ---
// POST /users - Create a user
// PATCH /users/me - Update a user's information
// DELETE /users/me - Delete a user
// --- ----------- ---

// --- User Routes ---

// POST /users - Create a user
router.post("/", async (req, res) => {

    const { username, email, password } = req.body

    if (
        typeof username !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        username.trim().length === 0 ||
        email.trim().length === 0 ||
        password.length === 0
    ) {
        return res.status(400).json({
            error: "Username, password, and email are required"
        })
    }

    if(password.length < 8 || password.length > 16){
        return res.status(400).json({
            error: "Password length must be 8-16 characters"
        })
    }

    try {
        const passwordHash = await argon2.hash(password)

        const user = createUser({
            username: username.trim(),
            email: email.trim(),
            passwordHash
        })
        
        return res.status(201).json(user)
    } catch (error) {
        if(error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                error: "Username or email already exists"
            })
        }

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

// PATCH /users/me - Update the authenticated user's information
router.patch("/me", requireAuth, async (req, res) => {

    const userId = req.session.userId
    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const {
        username,
        email,
        password,
        currentPassword
    } = req.body

    const hasUsername = username !== undefined
    const hasEmail = email !== undefined
    const hasPassword = password !== undefined

    if (!hasUsername && !hasEmail && !hasPassword) {
        return res.status(400).json({
            error: "At least one field must be provided"
        })
    }

    // Validate username if supplied
    if (
        hasUsername &&
        (
            typeof username !== "string" ||
            username.trim().length === 0
        )
    ) {
        return res.status(400).json({
            error: "Username must be a non-empty string"
        })
    }

    // Validate email if supplied
    if (
        hasEmail &&
        (
            typeof email !== "string" ||
            email.trim().length === 0
        )
    ) {
        return res.status(400).json({
            error: "Email must be a non-empty string"
        })
    }

    // Validate new password if supplied
    if (
        hasPassword &&
        (
            typeof password !== "string" ||
            password.length < 8 ||
            password.length > 16
        )
    ) {
        return res.status(400).json({
            error: "Password length must be 8-16 characters"
        })
    }

    // Every account change requires the current password
    if (
        typeof currentPassword !== "string" ||
        currentPassword.length === 0
    ) {
        return res.status(400).json({
            error: "Current password is required"
        })
    }

    try {
        const currentPasswordHash = findPasswordHashByUserId(userId)

        if (!currentPasswordHash) {
            return res.status(404).json({
                error: "User not found"
            })
        }

        const passwordMatches = await argon2.verify(
            currentPasswordHash,
            currentPassword
        )

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Current password is incorrect"
            })
        }

        // Omitted fields keep their current value in updateUserById
        const updated = updateUserById(userId, {
            username: hasUsername ? username.trim() : undefined,
            email: hasEmail ? email.trim() : undefined,
            passwordHash: hasPassword ? await argon2.hash(password) : undefined
        })

        if (!updated) {
            return res.status(404).json({
                error: "User not found"
            })
        }

        return res.status(200).json(updated)
    }
    catch (error) {

        if (error.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                error: "Username or email already exists"
            })
        }

        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

// DELETE /users/me - Delete the authenticated user
router.delete("/me", requireAuth, async (req, res) => {

    const userId = req.session.userId
    const { currentPassword } = req.body

    if (
        typeof currentPassword !== "string" ||
        currentPassword.length === 0
    ) {
        return res.status(400).json({
            error: "Current password is required"
        })
    }

    try {

        const passwordHash = findPasswordHashByUserId(userId)

        if (!passwordHash) {
            return res.status(404).json({
                error: "User not found"
            })
        }

        const passwordMatches = await argon2.verify(
            passwordHash,
            currentPassword
        )

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Current password is incorrect"
            })
        }

        const deleted = deleteUserById(userId)

        if (!deleted) {
            return res.status(404).json({
                error: "User not found"
            })
        }

        req.session.destroy((error) => {

            if (error) {
                console.error(error)

                return res.status(500).json({
                    error: "User deleted, but session could not be destroyed"
                })
            }

            res.clearCookie("connect.sid")

            return res.status(200).json({
                deleted: true
            })
        })
    }
    catch (error) {

        console.error(error)

        return res.status(500).json({
            error: "Internal server error"
        })
    }
})

module.exports = router