const {
    createUser,
    deleteUserById
} = require("./userQueries")

const {
    createCharacter
} = require("./characterQueries")

const {
    createInventoryEntry
} = require("./inventoryQueries")


const {
    findItemByIndex
} = require("./itemQueries")

const {
    findAllEquipmentSlots,
    findEquipmentSlotById,
    findEquipmentEntryBySlot,
    findAllEquipment,
    findEquipmentEntryById,
    createEquipmentEntry,
    deleteEquipmentEntryById,
    isInventoryItemCompatibleWithSlot,
    findCompatibleInventory,
    isInventoryItemEquipped
} = require("./equipmentQueries")

describe("Database Equipment Queries", () => {
    let testUser
    let testCharacter
    let testItems
    let testInventory

    beforeEach(() => {
        const uniqueSuffix =
            `${Date.now()}_${Math.random().toString(16).slice(2)}`

        testUser = createUser({
            username: `EquipmentTestUser_${uniqueSuffix}`,
            email: `equipment_${uniqueSuffix}@example.com`,
            passwordHash: `test-hash-${uniqueSuffix}`
        })

        testCharacter = createCharacter({
            user_id: testUser.user_id,
            name: `EquipmentTestCharacter_${uniqueSuffix}`,
            max_weight: 100
        })

        /*
         * These are seeded item definitions.
         * The tests only create inventory/equipment records
         * referencing them.
         */
        testItems = {
            longsword: findItemByIndex("longsword"),
            shield: findItemByIndex("shield"),
            torch: findItemByIndex("torch")
        }

        expect(testItems.longsword).toBeDefined()
        expect(testItems.shield).toBeDefined()
        expect(testItems.torch).toBeDefined()

        testInventory = {
            longsword: createInventoryEntry({
                character_id: testCharacter.character_id,
                item_id: testItems.longsword.item_id,
                parent_inventory_id: null,
                quantity: 1
            }),

            shield: createInventoryEntry({
                character_id: testCharacter.character_id,
                item_id: testItems.shield.item_id,
                parent_inventory_id: null,
                quantity: 1
            }),

            torch: createInventoryEntry({
                character_id: testCharacter.character_id,
                item_id: testItems.torch.item_id,
                parent_inventory_id: null,
                quantity: 1
            })
        }
    })


    afterEach(() => {
        /*
         * Deleting the user cascades through characters,
         * inventory, and equipment.
         */
        deleteUserById(testUser.user_id)
    })


    // --- findAllEquipmentSlots ---

    describe("findAllEquipmentSlots", () => {

        test("returns all equipment slots", () => {
            const slots = findAllEquipmentSlots()

            expect(Array.isArray(slots)).toBe(true)
            expect(slots.length).toBeGreaterThan(0)
        })


        test("returns standardized equipment slot data", () => {
            const slots = findAllEquipmentSlots()

            const slot = slots[0]

            expect(slot)
                .toHaveProperty("equipment_slot_id")

            expect(slot)
                .toHaveProperty("equipment_slot_index")

            expect(slot)
                .toHaveProperty("equipment_slot_name")
        })


        test("contains the main hand equipment slot", () => {
            const slots = findAllEquipmentSlots()

            const mainHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "main_hand"
            )

            expect(mainHand).toBeDefined()

            expect(mainHand.equipment_slot_name)
                .toBe("Main Hand")
        })


        test("contains the off hand equipment slot", () => {
            const slots = findAllEquipmentSlots()

            const offHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "off_hand"
            )

            expect(offHand).toBeDefined()

            expect(offHand.equipment_slot_name)
                .toBe("Off Hand")
        })


        test("returns equipment slots ordered by ID", () => {
            const slots = findAllEquipmentSlots()

            const ids = slots.map(
                slot => slot.equipment_slot_id
            )

            const sortedIds = [...ids].sort(
                (a, b) => a - b
            )

            expect(ids).toEqual(sortedIds)
        })

    })


    // --- findEquipmentSlotById ---

    describe("findEquipmentSlotById", () => {

        test("returns an existing equipment slot", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            expect(mainHand).toBeDefined()

            const slot =
                findEquipmentSlotById(
                    mainHand.equipment_slot_id
                )

            expect(slot).toEqual(mainHand)
        })


        test("returns standardized equipment slot data", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const slot =
                findEquipmentSlotById(
                    mainHand.equipment_slot_id
                )

            expect(slot)
                .toHaveProperty("equipment_slot_id")

            expect(slot)
                .toHaveProperty("equipment_slot_index")

            expect(slot)
                .toHaveProperty("equipment_slot_name")
        })


        test("returns undefined for a missing equipment slot", () => {
            const slot =
                findEquipmentSlotById(999999999)

            expect(slot).toBeUndefined()
        })

    })


    // --- findEquipmentEntryBySlot ---

    describe("findEquipmentEntryBySlot", () => {

        test("returns equipment occupying a slot", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const created =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            const equipment =
                findEquipmentEntryBySlot(
                    testCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            expect(equipment).toBeDefined()

            expect(equipment.equipment_id)
                .toBe(created.equipment_id)

            expect(equipment.inventory_id)
                .toBe(
                    testInventory.longsword.inventory_id
                )

            expect(equipment.item_id)
                .toBe(testItems.longsword.item_id)

            expect(equipment.item_index)
                .toBe("longsword")

            expect(equipment.name)
                .toBe(testItems.longsword.name)

            expect(equipment.equipment_slot_id)
                .toBe(mainHand.equipment_slot_id)

            expect(equipment.equipment_slot_index)
                .toBe("main_hand")

            expect(equipment.equipment_slot_name)
                .toBe("Main Hand")
        })


        test("returns undefined when the slot is empty", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const equipment =
                findEquipmentEntryBySlot(
                    testCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            expect(equipment).toBeUndefined()
        })


        test("does not return equipment belonging to another character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const equipment =
                findEquipmentEntryBySlot(
                    otherCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            expect(equipment).toBeUndefined()
        })

    })


    // --- findAllEquipment ---

    describe("findAllEquipment", () => {

        test("returns an empty array when the character has no equipment", () => {
            const equipment =
                findAllEquipment(
                    testCharacter.character_id
                )

            expect(equipment).toEqual([])
        })


        test("returns all equipment belonging to a character", () => {
            const slots = findAllEquipmentSlots()

            const mainHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "main_hand"
            )

            const offHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "off_hand"
            )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.shield.inventory_id,
                offHand.equipment_slot_id
            )

            const equipment =
                findAllEquipment(
                    testCharacter.character_id
                )

            expect(equipment).toHaveLength(2)

            const slotIds = equipment.map(entry => entry.equipment_slot_id)

            expect(slotIds).toEqual([...slotIds].sort((a, b) => a - b))

            const longsword = equipment.find(
                entry =>
                    entry.inventory_id ===
                    testInventory.longsword.inventory_id
            )

            const shield = equipment.find(
                entry =>
                    entry.inventory_id ===
                    testInventory.shield.inventory_id
            )

            expect(longsword).toBeDefined()
            expect(shield).toBeDefined()

            expect(longsword.item_index)
                .toBe("longsword")

            expect(longsword.equipment_slot_index)
                .toBe("main_hand")

            expect(shield.item_index)
                .toBe("shield")

            expect(shield.equipment_slot_index)
                .toBe("off_hand")
        })


        test("returns standardized equipment data", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const equipment =
                findAllEquipment(
                    testCharacter.character_id
                )

            const entry = equipment[0]

            expect(entry)
                .toHaveProperty("equipment_id")

            expect(entry)
                .toHaveProperty("inventory_id")

            expect(entry)
                .toHaveProperty("item_id")

            expect(entry)
                .toHaveProperty("item_index")

            expect(entry)
                .toHaveProperty("name")

            expect(entry)
                .toHaveProperty("equipment_slot_id")

            expect(entry)
                .toHaveProperty("equipment_slot_index")

            expect(entry)
                .toHaveProperty("equipment_slot_name")
        })

    })


    // --- findEquipmentEntryById ---

    describe("findEquipmentEntryById", () => {

        test("returns an existing equipment entry", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const created =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            const equipment =
                findEquipmentEntryById(
                    testCharacter.character_id,
                    created.equipment_id
                )

            expect(equipment).toBeDefined()

            expect(equipment.equipment_id)
                .toBe(created.equipment_id)

            expect(equipment.inventory_id)
                .toBe(
                    testInventory.longsword.inventory_id
                )

            expect(equipment.item_id)
                .toBe(testItems.longsword.item_id)

            expect(equipment.item_index)
                .toBe("longsword")

            expect(equipment.equipment_slot_index)
                .toBe("main_hand")
        })


        test("returns undefined for a missing equipment entry", () => {
            const equipment =
                findEquipmentEntryById(
                    testCharacter.character_id,
                    999999999
                )

            expect(equipment).toBeUndefined()
        })


        test("does not return equipment belonging to another character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const created =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            const equipment =
                findEquipmentEntryById(
                    otherCharacter.character_id,
                    created.equipment_id
                )

            expect(equipment).toBeUndefined()
        })

    })


    // --- createEquipmentEntry ---

    describe("createEquipmentEntry", () => {

        test("creates a new equipment entry", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const equipment =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            expect(equipment)
                .toHaveProperty("equipment_id")

            expect(equipment.character_id)
                .toBe(testCharacter.character_id)

            expect(equipment.inventory_id)
                .toBe(
                    testInventory.longsword.inventory_id
                )

            expect(equipment.equipment_slot_id)
                .toBe(mainHand.equipment_slot_id)

            const stored =
                findEquipmentEntryById(
                    testCharacter.character_id,
                    equipment.equipment_id
                )

            expect(stored).toBeDefined()

            expect(stored.item_index)
                .toBe("longsword")

            expect(stored.equipment_slot_index)
                .toBe("main_hand")

            expect(equipment).toEqual(stored)
        })


        test("throws when the equipment slot is already occupied", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            expect(() => {
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.shield.inventory_id,
                    mainHand.equipment_slot_id
                )
            }).toThrow("UNIQUE constraint failed")
        })


        test("throws when inventory belongs to another character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            expect(() => {
                createEquipmentEntry(
                    otherCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )
            }).toThrow("FOREIGN KEY constraint failed")
        })


        test("throws when the equipment slot does not exist", () => {
            expect(() => {
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    999999999
                )
            }).toThrow("FOREIGN KEY constraint failed")
        })

    })


    // --- deleteEquipmentEntryById ---

    describe("deleteEquipmentEntryById", () => {

        test("deletes an existing equipment entry", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const created =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            const result =
                deleteEquipmentEntryById(
                    testCharacter.character_id,
                    created.equipment_id
                )

            expect(result).toBe(true)

            const deleted =
                findEquipmentEntryById(
                    testCharacter.character_id,
                    created.equipment_id
                )

            expect(deleted).toBeUndefined()
        })


        test("does not delete another character's equipment", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const created =
                createEquipmentEntry(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            const result =
                deleteEquipmentEntryById(
                    otherCharacter.character_id,
                    created.equipment_id
                )

            expect(result).toBe(false)

            const equipment =
                findEquipmentEntryById(
                    testCharacter.character_id,
                    created.equipment_id
                )

            expect(equipment).toBeDefined()
        })


        test("returns false for a missing equipment entry", () => {
            const result =
                deleteEquipmentEntryById(
                    testCharacter.character_id,
                    999999999
                )

            expect(result).toBe(false)
        })

    })


    // --- isInventoryItemCompatibleWithSlot ---

    describe("isInventoryItemCompatibleWithSlot", () => {

        test("returns true for a compatible inventory item", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatible =
                isInventoryItemCompatibleWithSlot(
                    testInventory.longsword.inventory_id,
                    mainHand.equipment_slot_id
                )

            expect(compatible).toBe(true)
        })


        test("returns false for an incompatible inventory item", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatible =
                isInventoryItemCompatibleWithSlot(
                    testInventory.torch.inventory_id,
                    mainHand.equipment_slot_id
                )

            expect(compatible).toBe(false)
        })


        test("returns false for a missing inventory entry", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatible =
                isInventoryItemCompatibleWithSlot(
                    999999999,
                    mainHand.equipment_slot_id
                )

            expect(compatible).toBe(false)
        })


        test("returns false for a missing equipment slot", () => {
            const compatible =
                isInventoryItemCompatibleWithSlot(
                    testInventory.longsword.inventory_id,
                    999999999
                )

            expect(compatible).toBe(false)
        })

    })


    // --- findCompatibleInventory ---

    describe("findCompatibleInventory", () => {

        test("returns compatible inventory for a slot", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatibleInventory =
                findCompatibleInventory(
                    testCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            expect(Array.isArray(compatibleInventory))
                .toBe(true)

            const longsword =
                compatibleInventory.find(
                    entry =>
                        entry.inventory_id ===
                        testInventory.longsword.inventory_id
                )

            expect(longsword).toBeDefined()

            expect(longsword.item_id)
                .toBe(testItems.longsword.item_id)

            expect(longsword.item_index)
                .toBe("longsword")

            expect(longsword.name)
                .toBe(testItems.longsword.name)
        })


        test("does not return incompatible inventory", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatibleInventory =
                findCompatibleInventory(
                    testCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            const torch =
                compatibleInventory.find(
                    entry =>
                        entry.inventory_id ===
                        testInventory.torch.inventory_id
                )

            expect(torch).toBeUndefined()
        })


        test("only returns inventory belonging to the specified character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatibleInventory =
                findCompatibleInventory(
                    otherCharacter.character_id,
                    mainHand.equipment_slot_id
                )

            expect(compatibleInventory)
                .toEqual([])
        })


        test("does not return an inventory item that is already equipped", () => {
            const slots = findAllEquipmentSlots()

            const mainHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "main_hand"
            )

            const offHand = slots.find(
                slot =>
                    slot.equipment_slot_index ===
                    "off_hand"
            )

            /*
             * Longsword can be equipped in both hands.
             * Equip it in Main Hand first.
             */
            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const compatibleInventory =
                findCompatibleInventory(
                    testCharacter.character_id,
                    offHand.equipment_slot_id
                )

            const longsword =
                compatibleInventory.find(
                    entry =>
                        entry.inventory_id ===
                        testInventory.longsword.inventory_id
                )

            expect(longsword).toBeUndefined()
        })


        test("returns an empty array for a missing character", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            const compatibleInventory =
                findCompatibleInventory(
                    999999999,
                    mainHand.equipment_slot_id
                )

            expect(compatibleInventory)
                .toEqual([])
        })


        test("returns an empty array for a missing equipment slot", () => {
            const compatibleInventory =
                findCompatibleInventory(
                    testCharacter.character_id,
                    999999999
                )

            expect(compatibleInventory)
                .toEqual([])
        })

    })


    // --- isInventoryItemEquipped ---

    describe("isInventoryItemEquipped", () => {

        test("returns true when the inventory item is equipped", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const equipped =
                isInventoryItemEquipped(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id
                )

            expect(equipped).toBe(true)
        })


        test("returns false when the inventory item is not equipped", () => {
            const equipped =
                isInventoryItemEquipped(
                    testCharacter.character_id,
                    testInventory.longsword.inventory_id
                )

            expect(equipped).toBe(false)
        })


        test("returns false when a different inventory item is equipped", () => {
            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const equipped =
                isInventoryItemEquipped(
                    testCharacter.character_id,
                    testInventory.shield.inventory_id
                )

            expect(equipped).toBe(false)
        })


        test("returns false when checking another character", () => {
            const uniqueSuffix =
                `${Date.now()}_${Math.random().toString(16).slice(2)}`

            const otherCharacter =
                createCharacter({
                    user_id: testUser.user_id,
                    name: `OtherCharacter_${uniqueSuffix}`,
                    max_weight: 100
                })

            const mainHand =
                findAllEquipmentSlots().find(
                    slot =>
                        slot.equipment_slot_index ===
                        "main_hand"
                )

            createEquipmentEntry(
                testCharacter.character_id,
                testInventory.longsword.inventory_id,
                mainHand.equipment_slot_id
            )

            const equipped =
                isInventoryItemEquipped(
                    otherCharacter.character_id,
                    testInventory.longsword.inventory_id
                )

            expect(equipped).toBe(false)
        })


        test("returns false for a missing inventory entry", () => {
            const equipped =
                isInventoryItemEquipped(
                    testCharacter.character_id,
                    999999999
                )

            expect(equipped).toBe(false)
        })

    })

})