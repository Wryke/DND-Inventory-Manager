
const {
    createUser,
    deleteUserById
} = require("./userQueries")

const {
    createCharacter
} = require("./characterQueries")

const {
    findInventoryEntryById,
    findAllInventoryByCharacterId,
    findRootInventoryByCharacterId,
    findInventoryChildren,
    findInventoryWeightByCharacterId,
    createInventoryEntry,
    updateInventoryQuantity,
    moveInventoryEntry,
    updateInventoryEntry,
    deleteInventoryEntry
} = require("./inventoryQueries")

const {
    findItemByIndex
} = require("./itemQueries")

// Integration tests: use a dedicated SQLite test database.
describe("Database Inventory Queries", () => {
    let testUser
    let testCharacter
    let testItems

    const addItem = (itemIndex, parentId = null, quantity = 1) => {
        return createInventoryEntry({
            character_id: testCharacter.character_id,
            item_id: testItems[itemIndex].item_id,
            parent_inventory_id: parentId,
            quantity
        })
    }

    const getEntry = (inventoryId) => {
        return findInventoryEntryById(
            testCharacter.character_id,
            inventoryId
        )
    }

    const getAll = () => {
        return findAllInventoryByCharacterId(
            testCharacter.character_id
        )
    }

    const getRoot = () => {
        return findRootInventoryByCharacterId(
            testCharacter.character_id
        )
    }

    const getChildren = (parentId) => {
        return findInventoryChildren(
            testCharacter.character_id,
            parentId
        )
    }

    const expectAlphabetical = (entries) => {
        const names = entries.map(entry => entry.name)
        const sortedNames = [...names].sort(
            (a, b) => a.localeCompare(b)
        )
        expect(names).toEqual(sortedNames)
    }

    beforeEach(() => {
        const suffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        testUser = createUser({
            username: `TestUser_${suffix}`,
            email: `test_${suffix}@example.com`,
            passwordHash: `test-hash-${suffix}`
        })

        testCharacter = createCharacter({
            user_id: testUser.user_id,
            name: `TestCharacter_${suffix}`,
            max_weight: 100
        })

        testItems = {
            backpack: findItemByIndex("backpack"),
            pouch: findItemByIndex("pouch"),
            torch: findItemByIndex("torch")
        }

        expect(testItems.backpack).toBeDefined()
        expect(testItems.pouch).toBeDefined()
        expect(testItems.torch).toBeDefined()
    })

    afterEach(() => {
        deleteUserById(testUser.user_id)
    })

    describe("createInventoryEntry", () => {
        test("creates a root inventory entry", () => {
            const entry = addItem("backpack")

            expect(entry).toHaveProperty("inventory_id")
            expect(entry.character_id).toBe(testCharacter.character_id)
            expect(entry.item_id).toBe(testItems.backpack.item_id)
            expect(entry.parent_inventory_id).toBeNull()
            expect(entry.quantity).toBe(1)
        })

        test("creates an inventory entry inside a container", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", backpack.inventory_id, 2)

            expect(torch.parent_inventory_id).toBe(backpack.inventory_id)
            expect(torch.quantity).toBe(2)
        })

        test("returns the stored entry with item details", () => {
            const backpack = addItem("backpack")

            expect(backpack).toEqual(getEntry(backpack.inventory_id))
            expect(backpack.item_index).toBe("backpack")
            expect(backpack.name).toBe("Backpack")
        })

        test("rejects a container owned by another character", () => {
            const otherCharacter = createCharacter({
                user_id: testUser.user_id,
                name: `OtherCharacter_${Date.now()}`,
                max_weight: 100
            })

            const otherBackpack = createInventoryEntry({
                character_id: otherCharacter.character_id,
                item_id: testItems.backpack.item_id,
                quantity: 1
            })

            expect(() => addItem("torch", otherBackpack.inventory_id))
                .toThrow("FOREIGN KEY constraint failed")
        })
    })

    describe("findInventoryEntryById", () => {
        test("returns an existing inventory entry", () => {
            const backpack = addItem("backpack")
            const entry = getEntry(backpack.inventory_id)

            expect(entry).toBeDefined()
            expect(entry.inventory_id).toBe(backpack.inventory_id)
            expect(entry.character_id).toBe(testCharacter.character_id)
            expect(entry.item_id).toBe(testItems.backpack.item_id)
            expect(entry.parent_inventory_id).toBeNull()
            expect(entry.quantity).toBe(1)
            expect(entry.item_index).toBe("backpack")
            expect(entry.name).toBe("Backpack")
        })

        test("returns standardized inventory and item data", () => {
            const backpack = addItem("backpack")
            const entry = getEntry(backpack.inventory_id)

            const expectedFields = [
                "inventory_id",
                "character_id",
                "item_id",
                "parent_inventory_id",
                "quantity",
                "item_index",
                "name",
                "description",
                "weight",
                "cost_quantity",
                "currency_code",
                "currency_name",
                "item_type_name"
            ]

            for (const field of expectedFields) {
                expect(entry).toHaveProperty(field)
            }
        })

        test("returns undefined for a missing inventory entry", () => {
            expect(getEntry(999999999)).toBeUndefined()
        })

        test("does not return another character's entry", () => {
            const backpack = addItem("backpack")

            const entry = findInventoryEntryById(
                999999999,
                backpack.inventory_id
            )

            expect(entry).toBeUndefined()
        })
    })

    describe("findAllInventoryByCharacterId", () => {
        test("returns root and nested inventory entries", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)
            addItem("torch", pouch.inventory_id, 2)

            const inventory = getAll()

            expect(inventory).toHaveLength(3)

            expect(
                inventory.map(entry => entry.item_index)
            ).toEqual(
                expect.arrayContaining([
                    "backpack",
                    "pouch",
                    "torch"
                ])
            )
        })

        test("returns inventory ordered by item name", () => {
            addItem("torch")
            addItem("backpack")

            expectAlphabetical(getAll())
        })

        test("returns an empty array for no inventory", () => {
            expect(getAll()).toEqual([])
        })
    })

    describe("findRootInventoryByCharacterId", () => {
        test("returns only root inventory entries", () => {
            const backpack = addItem("backpack")
            addItem("torch", backpack.inventory_id, 2)

            const inventory = getRoot()

            expect(inventory).toHaveLength(1)
            expect(inventory[0].item_index).toBe("backpack")
            expect(inventory[0].parent_inventory_id).toBeNull()
        })

        test("returns root inventory ordered by name", () => {
            addItem("torch")
            addItem("backpack")

            expectAlphabetical(getRoot())
        })

        test("returns an empty array for no inventory", () => {
            expect(getRoot()).toEqual([])
        })
    })

    describe("findInventoryChildren", () => {
        test("returns direct children of a container", () => {
            const backpack = addItem("backpack")

            addItem("torch", backpack.inventory_id, 2)
            addItem("pouch", backpack.inventory_id)

            const children = getChildren(backpack.inventory_id)

            expect(children).toHaveLength(2)

            expect(
                children.every(entry =>
                    entry.parent_inventory_id === backpack.inventory_id
                )
            ).toBe(true)
        })

        test("does not return grandchildren", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)
            addItem("torch", pouch.inventory_id, 2)

            const children = getChildren(backpack.inventory_id)

            expect(children).toHaveLength(1)
            expect(children[0].item_index).toBe("pouch")
        })

        test("returns children ordered by name", () => {
            const backpack = addItem("backpack")

            addItem("torch", backpack.inventory_id)
            addItem("pouch", backpack.inventory_id)

            expectAlphabetical(getChildren(backpack.inventory_id))
        })

        test("returns an empty array for no children", () => {
            const backpack = addItem("backpack")

            expect(getChildren(backpack.inventory_id)).toEqual([])
        })
    })

    describe("findInventoryWeightByCharacterId", () => {
        test("totals quantity times weight, including nested items", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)
            addItem("torch", pouch.inventory_id, 3)

            const expected =
                (testItems.backpack.weight ?? 0) +
                (testItems.pouch.weight ?? 0) +
                (testItems.torch.weight ?? 0) * 3

            expect(expected).toBeGreaterThan(0)

            expect(
                findInventoryWeightByCharacterId(testCharacter.character_id)
            ).toBeCloseTo(expected)
        })

        test("returns 0 for no inventory", () => {
            expect(
                findInventoryWeightByCharacterId(testCharacter.character_id)
            ).toBe(0)
        })
    })

    describe("updateInventoryQuantity", () => {
        test("updates an inventory quantity", () => {
            const torch = addItem("torch", null, 2)

            const updated = updateInventoryQuantity(
                testCharacter.character_id,
                torch.inventory_id,
                5
            )

            expect(updated).toEqual({
                ...torch,
                quantity: 5
            })

            expect(getEntry(torch.inventory_id).quantity).toBe(5)
        })

        test("returns undefined for a missing entry", () => {
            expect(
                updateInventoryQuantity(testCharacter.character_id, 999999999, 5)
            ).toBeUndefined()
        })

        test("does not update another character's entry", () => {
            const torch = addItem("torch", null, 2)

            expect(
                updateInventoryQuantity(999999999, torch.inventory_id, 5)
            ).toBeUndefined()

            expect(getEntry(torch.inventory_id).quantity).toBe(2)
        })
    })

    describe("moveInventoryEntry", () => {
        test("moves an inventory entry into a container", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", null, 2)

            const moved = moveInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id,
                backpack.inventory_id
            )

            expect(moved).toEqual({
                ...torch,
                parent_inventory_id: backpack.inventory_id
            })

            expect(
                getEntry(torch.inventory_id).parent_inventory_id
            ).toBe(backpack.inventory_id)
        })

        test("moves an inventory entry back to root", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", backpack.inventory_id, 2)

            const moved = moveInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id,
                null
            )

            expect(moved.parent_inventory_id).toBeNull()

            expect(
                getEntry(torch.inventory_id).parent_inventory_id
            ).toBeNull()
        })

        test("returns undefined for a missing entry", () => {
            expect(
                moveInventoryEntry(testCharacter.character_id, 999999999, null)
            ).toBeUndefined()
        })

        test("does not move another character's entry", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", backpack.inventory_id, 2)

            expect(
                moveInventoryEntry(999999999, torch.inventory_id, null)
            ).toBeUndefined()

            expect(
                getEntry(torch.inventory_id).parent_inventory_id
            ).toBe(backpack.inventory_id)
        })
    })

    describe("updateInventoryEntry", () => {
        test("updates quantity and parent atomically", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", null, 2)

            const updated = updateInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id,
                {
                    quantity: 5,
                    parent_inventory_id: backpack.inventory_id
                }
            )

            expect(updated).toEqual({
                ...torch,
                quantity: 5,
                parent_inventory_id: backpack.inventory_id
            })

            const stored = getEntry(torch.inventory_id)

            expect(stored.quantity).toBe(5)
            expect(stored.parent_inventory_id).toBe(backpack.inventory_id)
        })

        test("updates quantity and moves entry back to root", () => {
            const backpack = addItem("backpack")
            const torch = addItem("torch", backpack.inventory_id, 2)

            const updated = updateInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id,
                {
                    quantity: 7,
                    parent_inventory_id: null
                }
            )

            expect(updated).toMatchObject({
                quantity: 7,
                parent_inventory_id: null
            })

            const stored = getEntry(torch.inventory_id)

            expect(stored.quantity).toBe(7)
            expect(stored.parent_inventory_id).toBeNull()
        })

        test("returns undefined for a missing inventory entry", () => {
            expect(
                updateInventoryEntry(
                    testCharacter.character_id,
                    999999999,
                    {
                        quantity: 5,
                        parent_inventory_id: null
                    }
                )
            ).toBeUndefined()
        })

        test("rolls back the quantity when the move fails", () => {
            const torch = addItem("torch", null, 2)

            expect(() => updateInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id,
                {
                    quantity: 5,
                    parent_inventory_id: 999999999
                }
            )).toThrow("FOREIGN KEY constraint failed")

            expect(getEntry(torch.inventory_id).quantity).toBe(2)
        })
    })

    describe("deleteInventoryEntry", () => {
        test("deletes an inventory entry", () => {
            const torch = addItem("torch", null, 2)

            const deleted = deleteInventoryEntry(
                testCharacter.character_id,
                torch.inventory_id
            )

            expect(deleted).toBe(true)
            expect(getEntry(torch.inventory_id)).toBeUndefined()
        })

        test("promotes direct children to root when deleting a container", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)

            const deleted = deleteInventoryEntry(
                testCharacter.character_id,
                backpack.inventory_id
            )

            expect(deleted).toBe(true)

            const storedPouch = getEntry(pouch.inventory_id)

            expect(storedPouch).toBeDefined()
            expect(storedPouch.parent_inventory_id).toBeNull()
        })

        test("preserves deeper nesting when parent is promoted", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)
            const torch = addItem("torch", pouch.inventory_id, 2)

            deleteInventoryEntry(testCharacter.character_id, backpack.inventory_id)

            const storedPouch = getEntry(pouch.inventory_id)
            const storedTorch = getEntry(torch.inventory_id)

            expect(storedPouch.parent_inventory_id).toBeNull()
            expect(storedTorch.parent_inventory_id).toBe(pouch.inventory_id)
        })

        test("returns false for a missing inventory entry", () => {
            expect(
                deleteInventoryEntry(testCharacter.character_id, 999999999)
            ).toBe(false)
        })

        test("does not delete another character's entry", () => {
            const torch = addItem("torch", null, 2)

            expect(
                deleteInventoryEntry(999999999, torch.inventory_id)
            ).toBe(false)

            expect(getEntry(torch.inventory_id)).toBeDefined()
        })

        test("deleting the character removes nested inventory", () => {
            const backpack = addItem("backpack")
            const pouch = addItem("pouch", backpack.inventory_id)
            addItem("torch", pouch.inventory_id, 2)

            deleteUserById(testUser.user_id)

            expect(getAll()).toEqual([])
        })
    })
})
