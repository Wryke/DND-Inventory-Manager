import { useState } from "react"

import { ABILITY_SCORES } from "../../utils/abilityScores"

// Turn a nullable id into a <select> value, where "" means none
function toSelectValue(id) {
    return id === null ? "" : String(id)
}

// Turn a <select> value back into an id, where "" means none
function fromSelectValue(value) {
    return value === "" ? null : Number(value)
}

function CharacterEditForm({ character, updateCharacter, cancelEdit, species, backgrounds }) {

    // --- State ---
    const [name, setName] = useState(character.name)
    const [maxWeight, setMaxWeight] = useState(String(character.max_weight))
    const [speciesId, setSpeciesId] = useState(toSelectValue(character.species_id))
    const [backgroundId, setBackgroundId] = useState(toSelectValue(character.background_id))

    // Kept as strings while typing; converted to numbers on submit
    const [abilityScores, setAbilityScores] = useState(
        Object.fromEntries(
            ABILITY_SCORES.map((ability) => [ability.field, String(character[ability.field])])
        )
    )

    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // --- Derived Data ---
    const idPrefix = `edit-${character.character_id}`

    const speciesOptions = species.map((option) => {
        return (
            <option key={option.species_id} value={option.species_id}>
                {option.species_name}
            </option>
        )
    })

    const backgroundOptions = backgrounds.map((option) => {
        return (
            <option key={option.background_id} value={option.background_id}>
                {option.background_name}
            </option>
        )
    })

    // --- Event Handlers ---
    function handleAbilityScoreChange(field, value) {
        setAbilityScores((currentScores) => {
            return {
                ...currentScores,
                [field]: value
            }
        })
    }

    async function handleSubmit(event) {
        event.preventDefault()

        setError("")

        const trimmedName = name.trim()
        const numericMaxWeight = Number(maxWeight)

        if (trimmedName === "") {
            setError("Character name is required.")
            return
        }

        if (
            maxWeight.trim() === "" ||
            Number.isNaN(numericMaxWeight) ||
            numericMaxWeight <= 0
        ) {
            setError("Maximum carry weight must be a number above 0.")
            return
        }

        // Only send fields that changed; the server keeps the rest
        const changes = {}

        if (trimmedName !== character.name) {
            changes.name = trimmedName
        }

        if (numericMaxWeight !== character.max_weight) {
            changes.max_weight = numericMaxWeight
        }

        // null clears species or background
        const newSpeciesId = fromSelectValue(speciesId)
        const newBackgroundId = fromSelectValue(backgroundId)

        if (newSpeciesId !== character.species_id) {
            changes.species_id = newSpeciesId
        }

        if (newBackgroundId !== character.background_id) {
            changes.background_id = newBackgroundId
        }

        for (const ability of ABILITY_SCORES) {
            const value = abilityScores[ability.field]
            const score = Number(value)

            if (value.trim() === "" || !Number.isInteger(score) || score <= 0) {
                setError(`${ability.label} must be a whole number above 0.`)
                return
            }

            if (score !== character[ability.field]) {
                changes[ability.field] = score
            }
        }

        // Nothing changed, so there is nothing to save
        if (Object.keys(changes).length === 0) {
            cancelEdit()
            return
        }

        setLoading(true)

        const errorMessage = await updateCharacter(character.character_id, changes)

        if (errorMessage) {
            setError(errorMessage)
            setLoading(false)
            return
        }

        // Closing unmounts the form, so its state resets the next time it opens
        cancelEdit()
    }

    // --- Render ---
    return (
        <form className="character-form" onSubmit={handleSubmit}>
            <h3>Edit {character.name}</h3>

            <div className="form-field">
                <label htmlFor={`${idPrefix}-name`}>Character Name</label>
                <input
                    id={`${idPrefix}-name`}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="form-field">
                <label htmlFor={`${idPrefix}-weight`}>Maximum Carry Weight (lbs)</label>
                <input
                    id={`${idPrefix}-weight`}
                    type="number"
                    min="0"
                    step="any"
                    value={maxWeight}
                    onChange={(event) => setMaxWeight(event.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="form-field">
                <label htmlFor={`${idPrefix}-species`}>Species</label>
                <select
                    id={`${idPrefix}-species`}
                    value={speciesId}
                    onChange={(event) => setSpeciesId(event.target.value)}
                    disabled={loading}
                >
                    <option value="">None</option>
                    {speciesOptions}
                </select>
            </div>

            <div className="form-field">
                <label htmlFor={`${idPrefix}-background`}>Background</label>
                <select
                    id={`${idPrefix}-background`}
                    value={backgroundId}
                    onChange={(event) => setBackgroundId(event.target.value)}
                    disabled={loading}
                >
                    <option value="">None</option>
                    {backgroundOptions}
                </select>
            </div>

            <fieldset className="ability-score-grid" disabled={loading}>
                <legend>Ability Scores</legend>

                {ABILITY_SCORES.map((ability) => {
                    return (
                        <div className="form-field" key={ability.field}>
                            <label htmlFor={`${idPrefix}-${ability.field}`}>
                                {ability.label}
                            </label>
                            <input
                                id={`${idPrefix}-${ability.field}`}
                                type="number"
                                min="1"
                                step="1"
                                value={abilityScores[ability.field]}
                                onChange={(event) => {
                                    handleAbilityScoreChange(ability.field, event.target.value)
                                }}
                            />
                        </div>
                    )
                })}
            </fieldset>

            {error && <p role="alert">{error}</p>}

            <div className="character-form-actions">
                <button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                </button>

                <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={loading}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default CharacterEditForm
