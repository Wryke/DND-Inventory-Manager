const express = require("express")
const cors = require("cors")
const session = require("express-session")

const authRoutes = require("./routes/auth.js")
const userRoutes = require("./routes/users.js")
const characterRoutes = require("./routes/characters.js")
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
app.use("/items", itemRoutes)
app.use("/characters", equipmentRoutes)
app.use("/lookups", lookupRoutes)

module.exports = app