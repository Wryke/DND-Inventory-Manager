const { findUserById } = require("../db/userQueries.js")
const { findCharacterByUserIdAndName } = require("../db/characterQueries.js")

// Load the logged-in user's character from req.params.name into req.character.
// Must run after requireAuth.
function loadCharacter(req, res, next) {

    const userId = req.session.userId

    const user = findUserById(userId)

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        })
    }

    const name = req.params.name

    if (
        typeof name !== "string" ||
        name.trim().length === 0
    ) {
        return res.status(400).json({
            error: "Invalid character name"
        })
    }

    const character = findCharacterByUserIdAndName(userId, name.trim())

    if (!character) {
        return res.status(404).json({
            error: "Character not found"
        })
    }

    req.character = character

    next()
}

module.exports = loadCharacter
