const express = require("express")
const cors = require("cors")
const session = require("express-session")

const authRoutes = require("./routes/auth.js")
const userRoutes = require("./routes/users.js")
const characterRoutes = require("./routes/characters.js")
const characterTraitRoutes = require("./routes/characterTraits.js")
const inventoryRoutes = require("./routes/inventory.js")
const itemRoutes = require("./routes/items.js")
const equipmentRoutes = require("./routes/equipment.js")
const lookupRoutes = require("./routes/lookups.js")

const app = express()

app.use(express.json())

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

// --- Routes ---
app.use("/auth", authRoutes)
app.use("/users", userRoutes)
app.use("/characters", characterRoutes)
app.use("/characters", inventoryRoutes)
app.use("/characters", characterTraitRoutes)
app.use("/items", itemRoutes)
app.use("/characters", equipmentRoutes)
app.use("/lookups", lookupRoutes)

// --- Error Handling ---

// Unknown routes return JSON like every other error
app.use((req, res) => {
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl}`
    })
})

// Errors Express catches itself, such as a request body that isn't valid JSON.
// Express identifies error handlers by their four parameters, so next must stay.
app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "Request body is not valid JSON"
        })
    }

    console.error(error)

    res.status(error.status || 500).json({
        error: error.status && error.status < 500
            ? error.message
            : "Internal server error"
    })
})

module.exports = app