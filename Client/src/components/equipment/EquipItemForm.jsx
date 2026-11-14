import { useEffect, useState } from "react"

import { 
    getCompatibleInventory
} from "../../api/equipment"

function EquipItemForm (props) {
    
    // --- State ---
    const [error, setError] = useState("")

    const [isLoading, setIsLoading] = useState(true)

    const [selectedInventoryId, setSelectedInventoryId] = useState("")

    const [compatibleInventory, setCompatibleInventory] = useState([])

    // --- Derived Data ---
    const inventoryOptions = compatibleInventory.map((item) => {
        return (
            <option
                key={item.inventory_id}
                value={item.inventory_id}
            >
                {item.name}
            </option>
        )
    })

    // --- Use Effects ---
    useEffect(() => {
        async function loadCompatibleInventory() {
            try {
                setIsLoading(true)

                const data = await getCompatibleInventory(
                    props.selectedCharacter.name,
                    props.slot.equipment_slot_id
                )

                setCompatibleInventory(data)
            }
            catch (error) {
                console.error(error)
                setError(error.message)
            }
            finally {
                setIsLoading(false)
            }
        }

        loadCompatibleInventory()
    }, [props.selectedCharacter.name, props.slot.equipment_slot_id])

    // --- Event Handlers ---
    async function handleSubmit(event) {
        event.preventDefault()

        setError("")

        if (selectedInventoryId === "") {
            setError("Please select an item.")
            return
        }

        const errorMessage = await props.onEquip(
            Number(selectedInventoryId),
            props.slot.equipment_slot_id
        )

        if (errorMessage) {
            setError(errorMessage)
        }
    }

    // --- Render ---
    return (
        <form onSubmit={handleSubmit}>
            <h2>Equip Item</h2>

            <p>Equipment Slot: {props.slot.equipment_slot_name}</p>

            <label>
                Item
            </label>

            <select
                value={selectedInventoryId}
                disabled={isLoading || compatibleInventory.length === 0}
                onChange={(event) => {
                    setSelectedInventoryId(event.target.value)
                }}
            >
                <option value="">
                    {isLoading
                        ? "Loading Items..."
                        : compatibleInventory.length === 0
                            ? "No Compatible Items"
                            : "No Selection"
                    }
                </option>

                {inventoryOptions}
            </select>

            {error && (
                <p className="form-error">
                    {error}
                </p>
            )}

            <button 
                type="submit"
                disabled={isLoading || compatibleInventory.length === 0}
            >
                Equip
            </button>

            <button
                type="button"
                onClick={props.onCancel}
            >
                Cancel
            </button>
        </form>
    )
}

export default EquipItemForm