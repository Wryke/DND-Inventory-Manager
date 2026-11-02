const request = require("supertest")
const app = require("../app")
const db = require("../db/connection.js")


describe("Inventory Routes", () => {
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
                username: `InventoryTestUser_${uniqueSuffix}`,
                email: `inventorytest_${uniqueSuffix}@example.com`,
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
                name: `InventoryTestCharacter_${uniqueSuffix}`,
                max_weight: 1000
            })

        expect(characterResponse.status).toBe(201)

        testCharacter = characterResponse.body
    })


    afterEach(() => {
        /*
         * Deleting the user cascades through the character
         * and its inventory.
         */
        db.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).run(testUser.user_id)
    })


    // --- GET /characters/:name/inventory/root ---

    describe("GET /characters/:name/inventory/root", () => {

        test("returns an empty array when the character has no inventory", async () => {
            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/root`
                )

            expect(response.status).toBe(200)
            expect(response.body).toEqual([])
        })


        test("returns only root inventory entries", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const backpackId =
                backpackResponse.body.inventory_id

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: backpackId,
                    quantity: 2
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/root`
                )

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(1)

            expect(response.body[0].item_index)
                .toBe("backpack")

            expect(response.body[0].name)
                .toBe("Backpack")

            expect(response.body[0].parent_inventory_id)
                .toBeNull()

            expect(response.body[0])
                .toHaveProperty("description")

            expect(response.body[0])
                .toHaveProperty("weight")

            expect(response.body[0])
                .toHaveProperty("cost_quantity")

            expect(response.body[0])
                .toHaveProperty("currency_code")

            expect(response.body[0])
                .toHaveProperty("currency_name")

            expect(response.body[0])
                .toHaveProperty("item_type_name")
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .get(
                    "/characters/DoesNotExist/inventory/root"
                )

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Character not found"
            )
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/root`
                )

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- GET /characters/:name/inventory/all ---

    describe("GET /characters/:name/inventory/all", () => {

        test("returns an empty array when the character has no inventory", async () => {
            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/all`
                )

            expect(response.status).toBe(200)
            expect(response.body).toEqual([])
        })


        test("returns all inventory entries including nested entries", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const backpackId =
                backpackResponse.body.inventory_id

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: backpackId,
                    quantity: 2
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/all`
                )

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(2)

            const backpack = response.body.find(
                item => item.item_index === "backpack"
            )

            const torch = response.body.find(
                item => item.item_index === "torch"
            )

            expect(backpack).toBeDefined()
            expect(backpack.parent_inventory_id).toBeNull()

            expect(backpack)
                .toHaveProperty("description")

            expect(backpack)
                .toHaveProperty("weight")

            expect(backpack)
                .toHaveProperty("cost_quantity")

            expect(backpack)
                .toHaveProperty("currency_code")

            expect(backpack)
                .toHaveProperty("currency_name")

            expect(backpack)
                .toHaveProperty("item_type_name")

            expect(torch).toBeDefined()
            expect(torch.parent_inventory_id)
                .toBe(backpackId)
            expect(torch.quantity).toBe(2)
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .get(
                    "/characters/DoesNotExist/inventory/all"
                )

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Character not found"
            )
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/all`
                )

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- GET /characters/:name/inventory/:inventoryId ---

    describe("GET /characters/:name/inventory/:inventoryId", () => {

        test("returns an existing inventory entry", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 2
                })

            expect(createResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    createResponse.body.inventory_id
                )

            expect(response.status).toBe(200)

            expect(response.body.inventory_id)
                .toBe(createResponse.body.inventory_id)

            expect(response.body.character_id)
                .toBe(testCharacter.character_id)

            expect(response.body.item_index).toBe("torch")
            expect(response.body.name).toBe("Torch")
            expect(response.body.quantity).toBe(2)
            expect(response.body.parent_inventory_id)
                .toBeNull()

            expect(response.body)
                .toHaveProperty("description")

            expect(response.body)
                .toHaveProperty("weight")

            expect(response.body)
                .toHaveProperty("cost_quantity")

            expect(response.body)
                .toHaveProperty("currency_code")

            expect(response.body)
                .toHaveProperty("currency_name")

            expect(response.body)
                .toHaveProperty("item_type_name")
        })


        test("returns 404 for a missing inventory entry", async () => {
            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Inventory entry not found"
            )
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- GET /characters/:name/inventory/:inventoryId/children ---

    describe("GET /characters/:name/inventory/:inventoryId/children", () => {

        test("returns direct children of an inventory entry", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const backpackId =
                backpackResponse.body.inventory_id

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: backpackId,
                    quantity: 2
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    `${backpackId}/children`
                )

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(1)

            expect(response.body[0].inventory_id)
                .toBe(torchResponse.body.inventory_id)

            expect(response.body[0].item_index)
                .toBe("torch")

            expect(response.body[0].name)
                .toBe("Torch")

            expect(response.body[0].parent_inventory_id)
                .toBe(backpackId)
        })


        test("returns only direct children, not deeper descendants", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const pouchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "pouch",
                    parent_inventory_id:
                        backpackResponse.body.inventory_id,
                    quantity: 1
                })

            expect(pouchResponse.status).toBe(201)

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id:
                        pouchResponse.body.inventory_id,
                    quantity: 1
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    `${backpackResponse.body.inventory_id}/children`
                )

            expect(response.status).toBe(200)
            expect(response.body).toHaveLength(1)

            expect(response.body[0].inventory_id)
                .toBe(pouchResponse.body.inventory_id)

            const torch = response.body.find(
                item =>
                    item.inventory_id ===
                    torchResponse.body.inventory_id
            )

            expect(torch).toBeUndefined()
        })


        test("returns an empty array when the entry has no children", async () => {
            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    `${torchResponse.body.inventory_id}/children`
                )

            expect(response.status).toBe(200)
            expect(response.body).toEqual([])
        })


        test("returns 404 for a missing inventory entry", async () => {
            const response = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999/children`
                )

            expect(response.status).toBe(404)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999/children`
                )

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- POST /characters/:name/inventory ---

    describe("POST /characters/:name/inventory", () => {

        test("creates a root inventory entry", async () => {
            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(response.status).toBe(201)
            expect(response.body)
                .toHaveProperty("inventory_id")

            expect(response.body.character_id)
                .toBe(testCharacter.character_id)

            expect(response.body.item_index)
                .toBe("backpack")

            expect(response.body.name)
                .toBe("Backpack")

            expect(response.body.quantity).toBe(1)

            expect(response.body.parent_inventory_id)
                .toBeNull()
        })


        test("creates a nested inventory entry", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id:
                        backpackResponse.body.inventory_id,
                    quantity: 2
                })

            expect(response.status).toBe(201)

            expect(response.body.item_index).toBe("torch")
            expect(response.body.quantity).toBe(2)

            expect(response.body.parent_inventory_id)
                .toBe(backpackResponse.body.inventory_id)
        })


        test("returns 404 for an invalid item index", async () => {
            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "item-that-does-not-exist",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(response.status).toBe(404)
        })


        test("rejects a non-positive quantity", async () => {
            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 0
                })

            expect(response.status).toBe(400)
        })


        test("rejects a non-integer quantity", async () => {
            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1.5
                })

            expect(response.status).toBe(400)
        })


        test("rejects a missing parent inventory entry", async () => {
            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: 999999999,
                    quantity: 1
                })

            expect(response.status).toBe(404)
        })


        test("rejects a parent that is not a container", async () => {
            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    quantity: 1
                })

            expect(torchResponse.status).toBe(201)

            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: torchResponse.body.inventory_id,
                    quantity: 1
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Parent inventory entry is not a container"
            )
        })


        test("rejects a parent belonging to another character", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondCharacterResponse = await agent
                .post("/characters")
                .send({
                    name: `SecondInventoryCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            expect(secondCharacterResponse.status).toBe(201)

            const parentResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(parentResponse.status).toBe(201)

            const response = await agent
                .post(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id:
                        parentResponse.body.inventory_id,
                    quantity: 1
                })

            expect(response.status).toBe(404)
        })


        test("returns 404 for a missing character", async () => {
            const response = await agent
                .post(
                    "/characters/DoesNotExist/inventory"
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(response.status).toBe(404)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- PATCH /characters/:name/inventory/:inventoryId ---

    describe("PATCH /characters/:name/inventory/:inventoryId", () => {

        test("updates the quantity", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(createResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    createResponse.body.inventory_id
                )
                .send({
                    quantity: 5
                })

            expect(response.status).toBe(200)
            expect(response.body.quantity).toBe(5)
        })


        test("moves an inventory entry into a container", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)
            expect(torchResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    torchResponse.body.inventory_id
                )
                .send({
                    parent_inventory_id:
                        backpackResponse.body.inventory_id
                })

            expect(response.status).toBe(200)

            expect(response.body.parent_inventory_id)
                .toBe(backpackResponse.body.inventory_id)
        })


        test("moves a nested inventory entry back to the root", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id:
                        backpackResponse.body.inventory_id,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)
            expect(torchResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    torchResponse.body.inventory_id
                )
                .send({
                    parent_inventory_id: null
                })

            expect(response.status).toBe(200)

            expect(response.body.parent_inventory_id)
                .toBeNull()
        })


        test("updates quantity and parent together", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            const torchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)
            expect(torchResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    torchResponse.body.inventory_id
                )
                .send({
                    quantity: 4,
                    parent_inventory_id:
                        backpackResponse.body.inventory_id
                })

            expect(response.status).toBe(200)
            expect(response.body.quantity).toBe(4)

            expect(response.body.parent_inventory_id)
                .toBe(backpackResponse.body.inventory_id)
        })


        test("rejects a non-positive quantity", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(createResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    createResponse.body.inventory_id
                )
                .send({
                    quantity: 0
                })

            expect(response.status).toBe(400)
        })


        test("rejects a non-integer quantity", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(createResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    createResponse.body.inventory_id
                )
                .send({
                    quantity: 1.5
                })

            expect(response.status).toBe(400)
        })


        test("rejects an inventory entry containing itself", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(createResponse.status).toBe(201)

            const inventoryId =
                createResponse.body.inventory_id

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    inventoryId
                )
                .send({
                    parent_inventory_id: inventoryId
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "An inventory entry cannot contain itself"
            )
        })


        test("rejects moving an entry into something that is not a container", async () => {
            const send = (body) => agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send(body)

            const torch = await send({ item_index: "torch", quantity: 1 })
            const otherTorch = await send({ item_index: "torch", quantity: 1 })

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    otherTorch.body.inventory_id
                )
                .send({
                    parent_inventory_id: torch.body.inventory_id
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toBe(
                "Parent inventory entry is not a container"
            )
        })


        test("returns 404 when updating an entry that does not exist", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )
                .send({
                    quantity: 2
                })

            expect(response.status).toBe(404)
            expect(response.body.error).toBe("Inventory entry not found")
        })


        test("rejects a missing parent inventory entry", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(createResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    createResponse.body.inventory_id
                )
                .send({
                    parent_inventory_id: 999999999
                })

            expect(response.status).toBe(404)
        })


        test("returns 404 for a missing inventory entry", async () => {
            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )
                .send({
                    quantity: 2
                })

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Inventory entry not found"
            )
        })


        test("does not allow updating another character's inventory", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondCharacterResponse = await agent
                .post("/characters")
                .send({
                    name: `SecondInventoryCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            expect(secondCharacterResponse.status).toBe(201)

            const inventoryResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(inventoryResponse.status).toBe(201)

            const response = await agent
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    inventoryResponse.body.inventory_id
                )
                .send({
                    quantity: 10
                })

            expect(response.status).toBe(404)

            const unchangedResponse = await agent
                .get(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}/inventory/` +
                    inventoryResponse.body.inventory_id
                )

            expect(unchangedResponse.status).toBe(200)
            expect(unchangedResponse.body.quantity).toBe(1)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .patch(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )
                .send({
                    quantity: 2
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })


    // --- DELETE /characters/:name/inventory/:inventoryId ---

    describe("DELETE /characters/:name/inventory/:inventoryId", () => {

        test("deletes an existing inventory entry", async () => {
            const createResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 2
                })

            expect(createResponse.status).toBe(201)

            const inventoryId =
                createResponse.body.inventory_id

            const deleteResponse = await agent
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    inventoryId
                )

            expect(deleteResponse.status).toBe(200)
            expect(deleteResponse.body.deleted).toBe(true)

            const getResponse = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    inventoryId
                )

            expect(getResponse.status).toBe(404)
        })


        test("promotes direct children to the root when deleting a container", async () => {
            const backpackResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "backpack",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(backpackResponse.status).toBe(201)

            const pouchResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory`
                )
                .send({
                    item_index: "pouch",
                    parent_inventory_id:
                        backpackResponse.body.inventory_id,
                    quantity: 1
                })

            expect(pouchResponse.status).toBe(201)

            const deleteResponse = await agent
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    backpackResponse.body.inventory_id
                )

            expect(deleteResponse.status).toBe(200)

            const pouchAfterDelete = await agent
                .get(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    pouchResponse.body.inventory_id
                )

            expect(pouchAfterDelete.status).toBe(200)

            expect(
                pouchAfterDelete.body.parent_inventory_id
            ).toBeNull()
        })


        test("returns 404 for a missing inventory entry", async () => {
            const response = await agent
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )

            expect(response.status).toBe(404)
            expect(response.body.error).toBe(
                "Inventory entry not found"
            )
        })


        test("does not allow deleting another character's inventory", async () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const secondCharacterResponse = await agent
                .post("/characters")
                .send({
                    name: `SecondInventoryCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            expect(secondCharacterResponse.status).toBe(201)

            const inventoryResponse = await agent
                .post(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}/inventory`
                )
                .send({
                    item_index: "torch",
                    parent_inventory_id: null,
                    quantity: 1
                })

            expect(inventoryResponse.status).toBe(201)

            const response = await agent
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/` +
                    inventoryResponse.body.inventory_id
                )

            expect(response.status).toBe(404)

            const stillExistsResponse = await agent
                .get(
                    `/characters/${encodeURIComponent(
                        secondCharacterResponse.body.name
                    )}/inventory/` +
                    inventoryResponse.body.inventory_id
                )

            expect(stillExistsResponse.status).toBe(200)
        })


        test("rejects an unauthenticated request", async () => {
            const response = await request(app)
                .delete(
                    `/characters/${encodeURIComponent(testCharacter.name)}/inventory/999999999`
                )

            expect(response.status).toBe(401)
            expect(response.body.error).toBe(
                "Not authenticated"
            )
        })

    })

})