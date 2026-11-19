import { useState } from 'react'

function CharacterForm(props) {

    // --- State ---
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const [name, setName] = useState("")
    const [maxWeight, setMaxWeight] = useState("")

    // --- Event handlers ---
    async function handleSubmit(event) {
        event.preventDefault()

        setError("")

        const numericMaxWeight = Number(maxWeight)

        if(name.trim() === ""){
            setError("Character name is required.")
            return
        }

        if (
            Number.isNaN(numericMaxWeight) ||
            numericMaxWeight <= 0 ||
            !Number.isInteger(numericMaxWeight)
        ) {
            setError("Character max weight must be a positive whole number.")
            return
        }

        setLoading(true)

        const result = await props.addCharacter(
            name.trim(),
            numericMaxWeight
        )

        if (result !== null) {
            setError(result)
            setLoading(false)
            return
        }

        // Closing unmounts the form, so it starts empty the next time it opens
        props.cancelCreate()
    }

    // --- Render ---
    return (
        <form onSubmit={handleSubmit}>
            <h3>Create New Character</h3>

            <label htmlFor="character-name">Character Name</label>
            <input
                id="character-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
            />

            <label htmlFor="character-max-weight">Maximum Carry Weight (lbs)</label>
            <input
                id="character-max-weight"
                type="number"
                min="1"
                step="1"
                value={maxWeight}
                onChange={(event) => setMaxWeight(event.target.value)}
                disabled={loading}
            />

            {error && <p role="alert">{error}</p>}

            <button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add Character"}
            </button>

            <button
                type="button"
                onClick={props.cancelCreate}
                disabled={loading}
            >
                Cancel
            </button>
        </form>
    )
}

export default CharacterForm
