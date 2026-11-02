const {
    findAllItems,
    findItemsByCategory,
    findItemByIndex,
    findItemByName,
    findAllItemCategories,
    findItemByIndexAndCategory,
    findItemByNameAndCategory,

    findWeaponDetails,
    findArmorDetails,
    findContainerDetails,
    findAmmunitionDetails,
    findToolDetails,
    findEquipmentPackDetails
} = require("./itemQueries")

const db = require("./connection")

describe("Database Item Queries", () => {
    let testItem
    let testCategory

    beforeAll(() => {
        testItem = findItemByIndex("backpack")

        expect(testItem).toBeDefined()

        const categories = findAllItemCategories()

        testCategory = categories.find(category => {
            const items = findItemsByCategory(category.category_index)

            return items.some(item =>
                item.item_id === testItem.item_id
            )
        })

        expect(testCategory).toBeDefined()
    })

    describe("findAllItems", () => {
        test("returns a non-empty array of item objects", () => {
            const items = findAllItems()

            expect(Array.isArray(items)).toBe(true)
            expect(items.length).toBeGreaterThan(0)

            expect(items[0]).toHaveProperty("item_id")
            expect(items[0]).toHaveProperty("item_index")
            expect(items[0]).toHaveProperty("name")
            expect(items[0]).toHaveProperty("description")
            expect(items[0]).toHaveProperty("weight")
            expect(items[0]).toHaveProperty("cost_quantity")
            expect(items[0]).toHaveProperty("currency_code")
            expect(items[0]).toHaveProperty("currency_name")
            expect(items[0]).toHaveProperty("item_type_name")
        })

        test("contains the backpack item", () => {
            const items = findAllItems()

            expect(
                items.some(item =>
                    item.item_id === testItem.item_id
                )
            ).toBe(true)
        })

        test("returns items ordered by name", () => {
            const items = findAllItems()
            const names = items.map(item => item.name)

            const sortedNames = [...names].sort((a, b) =>
                a.localeCompare(b)
            )

            expect(names).toEqual(sortedNames)
        })
    })

    describe("findItemByIndex", () => {
        test("returns an existing item by index", () => {
            const item = findItemByIndex("backpack")

            expect(item).toBeDefined()
            expect(item.item_index).toBe("backpack")
            expect(item.name).toBe("Backpack")
        })

        test("returns standardized item data", () => {
            const item = findItemByIndex("backpack")

            expect(item).toHaveProperty("item_id")
            expect(item).toHaveProperty("item_index")
            expect(item).toHaveProperty("name")
            expect(item).toHaveProperty("description")
            expect(item).toHaveProperty("weight")
            expect(item).toHaveProperty("cost_quantity")
            expect(item).toHaveProperty("currency_code")
            expect(item).toHaveProperty("currency_name")
            expect(item).toHaveProperty("item_type_name")
        })

        test("returns undefined for a missing index", () => {
            const item = findItemByIndex("flooper")

            expect(item).toBeUndefined()
        })
    })

    describe("findItemByName", () => {
        test("returns an array containing an existing item by name", () => {
            const items = findItemByName("Backpack")

            expect(Array.isArray(items)).toBe(true)
            expect(items.length).toBeGreaterThan(0)

            expect(
                items.some(item =>
                    item.item_index === "backpack"
                )
            ).toBe(true)
        })

        test("is case insensitive", () => {
            const items = findItemByName("backpack")

            expect(
                items.some(item =>
                    item.item_index === "backpack"
                )
            ).toBe(true)
        })

        test("returns an empty array for a missing name", () => {
            const items = findItemByName("Flooper")

            expect(Array.isArray(items)).toBe(true)
            expect(items).toEqual([])
        })
    })

    describe("findAllItemCategories", () => {
        test("returns a non-empty array of category objects", () => {
            const categories = findAllItemCategories()

            expect(Array.isArray(categories)).toBe(true)
            expect(categories.length).toBeGreaterThan(0)

            expect(categories[0]).toHaveProperty("category_id")
            expect(categories[0]).toHaveProperty("category_index")
            expect(categories[0]).toHaveProperty("category_name")
        })

        test("contains a category associated with the backpack", () => {
            const categories = findAllItemCategories()

            expect(
                categories.some(category =>
                    category.category_index ===
                    testCategory.category_index
                )
            ).toBe(true)
        })

        test("does not return duplicate category indexes", () => {
            const categories = findAllItemCategories()
            const categoryIndexes = categories.map(
                category => category.category_index
            )
            const uniqueCategories = new Set(categoryIndexes)

            expect(uniqueCategories.size)
                .toBe(categoryIndexes.length)
        })

        test("returns categories ordered by name", () => {
            const categories = findAllItemCategories()
            const names = categories.map(
                category => category.category_name
            )

            const sortedNames = [...names].sort((a, b) =>
                a.localeCompare(b)
            )

            expect(names).toEqual(sortedNames)
        })
    })

    describe("findItemsByCategory", () => {
        test("returns items from the requested category", () => {
            const items = findItemsByCategory(
                testCategory.category_index
            )

            expect(Array.isArray(items)).toBe(true)
            expect(items.length).toBeGreaterThan(0)
        })

        test("contains the backpack when filtering by one of its categories", () => {
            const items = findItemsByCategory(
                testCategory.category_index
            )

            expect(
                items.some(item =>
                    item.item_id === testItem.item_id
                )
            ).toBe(true)
        })

        test("returns standardized item data", () => {
            const items = findItemsByCategory(
                testCategory.category_index
            )

            expect(items[0]).toHaveProperty("item_id")
            expect(items[0]).toHaveProperty("item_index")
            expect(items[0]).toHaveProperty("name")
            expect(items[0]).toHaveProperty("currency_code")
            expect(items[0]).toHaveProperty("currency_name")
            expect(items[0]).toHaveProperty("item_type_name")
        })

        test("returns an empty array for a missing category", () => {
            const items = findItemsByCategory("flooper")

            expect(Array.isArray(items)).toBe(true)
            expect(items).toEqual([])
        })

        test("returns items ordered by name", () => {
            const items = findItemsByCategory(
                testCategory.category_index
            )

            const names = items.map(item => item.name)

            const sortedNames = [...names].sort((a, b) =>
                a.localeCompare(b)
            )

            expect(names).toEqual(sortedNames)
        })
    })

    describe("findItemByIndexAndCategory", () => {
        test("returns an item when index and category both match", () => {
            const item = findItemByIndexAndCategory(
                testItem.item_index,
                testCategory.category_index
            )

            expect(item).toBeDefined()
            expect(item.item_id).toBe(testItem.item_id)
            expect(item.item_index)
                .toBe(testItem.item_index)
        })

        test("returns undefined when the category does not match", () => {
            const item = findItemByIndexAndCategory(
                testItem.item_index,
                "flooper"
            )

            expect(item).toBeUndefined()
        })

        test("returns undefined when the index does not exist", () => {
            const item = findItemByIndexAndCategory(
                "flooper",
                testCategory.category_index
            )

            expect(item).toBeUndefined()
        })
    })

    describe("findItemByNameAndCategory", () => {
        test("returns an array when name and category both match", () => {
            const items = findItemByNameAndCategory(
                testItem.name,
                testCategory.category_index
            )

            expect(Array.isArray(items)).toBe(true)
            expect(items.length).toBeGreaterThan(0)

            expect(
                items.some(item =>
                    item.item_id === testItem.item_id
                )
            ).toBe(true)
        })

        test("is case insensitive", () => {
            const items = findItemByNameAndCategory(
                testItem.name.toLowerCase(),
                testCategory.category_index
            )

            expect(
                items.some(item =>
                    item.item_id === testItem.item_id
                )
            ).toBe(true)
        })

        test("returns an empty array when the category does not match", () => {
            const items = findItemByNameAndCategory(
                testItem.name,
                "flooper"
            )

            expect(Array.isArray(items)).toBe(true)
            expect(items).toEqual([])
        })

        test("returns an empty array when the name does not exist", () => {
            const items = findItemByNameAndCategory(
                "Flooper",
                testCategory.category_index
            )

            expect(Array.isArray(items)).toBe(true)
            expect(items).toEqual([])
        })
    })
})

describe("Database Item Detail Queries", () => {
    let items

    beforeAll(() => {
        items = findAllItems()

        expect(items.length).toBeGreaterThan(0)
    })

    describe("findWeaponDetails", () => {
        test("returns weapon details for a weapon", () => {
            const item = items.find(item =>
                item.item_type_name === "weapon"
            )

            expect(item).toBeDefined()

            const weapon = findWeaponDetails(item.item_id)

            expect(weapon).toBeDefined()
            expect(weapon.item_id).toBe(item.item_id)
            expect(weapon).toHaveProperty("weapon_type_id")
            expect(Array.isArray(weapon.properties)).toBe(true)
            expect(Array.isArray(weapon.damage)).toBe(true)
            expect(weapon).toHaveProperty("mastery_name")
        })

        test("returns undefined for a missing weapon", () => {
            const weapon = findWeaponDetails(-1)

            expect(weapon).toBeUndefined()
        })
    })

    describe("findArmorDetails", () => {
        test("returns armor details for armor", () => {
            const item = items.find(item =>
                item.item_type_name === "armor"
            )

            expect(item).toBeDefined()

            const armor = findArmorDetails(item.item_id)

            expect(armor).toBeDefined()
            expect(armor.item_id).toBe(item.item_id)
            expect(armor).toHaveProperty("armor_category")
            expect(armor).toHaveProperty("base_ac")
            expect(Array.isArray(armor.resistances)).toBe(true)
        })

        test("returns undefined for missing armor", () => {
            const armor = findArmorDetails(-1)

            expect(armor).toBeUndefined()
        })
    })

    describe("findContainerDetails", () => {
        test("returns container details for a container", () => {
            const item = items.find(item =>
                item.item_type_name === "container"
            )

            expect(item).toBeDefined()

            const container = findContainerDetails(item.item_id)

            expect(container).toBeDefined()
            expect(container.item_id).toBe(item.item_id)
            expect(container).toHaveProperty("max_volume")
            expect(container).toHaveProperty("max_carry_weight")
            expect(container).toHaveProperty("max_item_count")
        })

        test("returns undefined for a missing container", () => {
            const container = findContainerDetails(-1)

            expect(container).toBeUndefined()
        })
    })

    describe("findAmmunitionDetails", () => {
        test("returns ammunition details for ammunition", () => {
            const item = items.find(item =>
                item.item_type_name === "ammunition"
            )

            expect(item).toBeDefined()

            const ammunition = findAmmunitionDetails(item.item_id)

            expect(ammunition).toBeDefined()
            expect(ammunition.item_id).toBe(item.item_id)
            expect(ammunition).toHaveProperty("bundle_quantity")
            expect(ammunition)
                .toHaveProperty("storage_item_index")
            expect(ammunition)
                .toHaveProperty("storage_item_name")
        })

        test("returns undefined for missing ammunition", () => {
            const ammunition = findAmmunitionDetails(-1)

            expect(ammunition).toBeUndefined()
        })
    })

    describe("findToolDetails", () => {
        test("returns tool details for a tool", () => {
            const item = items.find(item =>
                item.item_type_name === "tool"
            )

            expect(item).toBeDefined()

            const tool = findToolDetails(item.item_id)

            expect(tool).toBeDefined()
            expect(tool.item_id).toBe(item.item_id)
            expect(tool).toHaveProperty("ability_index")
            expect(tool).toHaveProperty("ability_name")
            expect(Array.isArray(tool.crafts)).toBe(true)
            expect(Array.isArray(tool.utilizes)).toBe(true)
        })

        test("returns undefined for a missing tool", () => {
            const tool = findToolDetails(-1)

            expect(tool).toBeUndefined()
        })

        test("returns a tool that has no ability score", () => {
            const item = items.find(item =>
                item.item_type_name === "tool"
            )

            const { ability_score_id } = db.prepare(`
                SELECT ability_score_id FROM tools WHERE item_id = ?
            `).get(item.item_id)

            const setAbility = db.prepare(`
                UPDATE tools SET ability_score_id = ? WHERE item_id = ?
            `)

            // ability_score_id is nullable, so clear it temporarily
            setAbility.run(null, item.item_id)

            try {
                const tool = findToolDetails(item.item_id)

                expect(tool).toBeDefined()
                expect(tool.item_id).toBe(item.item_id)
                expect(tool.ability_index).toBeNull()
            }
            finally {
                setAbility.run(ability_score_id, item.item_id)
            }
        })
    })

    describe("findEquipmentPackDetails", () => {
        test("returns equipment pack details for an equipment pack", () => {
            const item = items.find(item =>
                item.item_type_name === "equipment_pack"
            )

            expect(item).toBeDefined()

            const pack = findEquipmentPackDetails(item.item_id)

            expect(pack).toBeDefined()
            expect(pack.item_id).toBe(item.item_id)
            expect(Array.isArray(pack.contents)).toBe(true)
            expect(pack.contents.length).toBeGreaterThan(0)
        })

        test("returns undefined for a missing equipment pack", () => {
            const pack = findEquipmentPackDetails(-1)

            expect(pack).toBeUndefined()
        })
    })
})