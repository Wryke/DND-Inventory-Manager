import { useState } from 'react'

// Ability score fields, keyed by the server's field names
const ABILITY_SCORES = [
    { field: "strength_score", label: "Strength" },
    { field: "dexterity_score", label: "Dexterity" },
    { field: "constitution_score", label: "Constitution" },
    { field: "intelligence_score", label: "Intelligence" },
    { field: "wisdom_score", label: "Wisdom" },
    { field: "charisma_score", label: "Charisma" }
]

// Every score starts at the schema default of 10
const DEFAULT_ABILITY_SCORES = Object.fromEntries(
    ABILITY_SCORES.map((ability) => [ability.field, "10"])
)

function CharacterForm(props) {

    // --- State ---
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const [name, setName] = useState("")
    const [maxWeight, setMaxWeight] = useState("")
    const [speciesId, setSpeciesId] = useState("")
    const [backgroundId, setBackgroundId] = useState("")

    // Kept as strings while typing; converted to numbers on submit
    const [abilityScores, setAbilityScores] = useState(DEFAULT_ABILITY_SCORES)

    // --- Derived Data ---
    const speciesOptions = props.species.map((species) => {
        return (
            <option key={species.species_id} value={species.species_id}>
                {species.species_name}
            </option>
        )
    })

    const backgroundOptions = props.backgrounds.map((background) => {
        return (
            <option key={background.background_id} value={background.background_id}>
                {background.background_name}
            </option>
        )
    })

    // --- Event handlers ---
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

        const numericMaxWeight = Number(maxWeight)

        if(name.trim() === ""){
            setError("Character name is required.")
            return
        }

        if (
            maxWeight.trim() === "" ||
            Number.isNaN(numericMaxWeight) ||
            numericMaxWeight <= 0
        ) {
            setError("Character max weight must be a number above 0.")
            return
        }

        const newCharacter = {
            name: name.trim(),
            max_weight: numericMaxWeight
        }

        for (const ability of ABILITY_SCORES) {
            const value = abilityScores[ability.field]
            const score = Number(value)

            if (value.trim() === "" || !Number.isInteger(score) || score <= 0) {
                setError(`${ability.label} must be a whole number above 0.`)
                return
            }

            newCharacter[ability.field] = score
        }

        // Leaving species or background out means "none"
        if (speciesId !== "") {
            newCharacter.species_id = Number(speciesId)
        }

        if (backgroundId !== "") {
            newCharacter.background_id = Number(backgroundId)
        }

        setLoading(true)

        const result = await props.addCharacter(newCharacter)

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
        <form className="character-form" onSubmit={handleSubmit}>
            <h3>Create New Character</h3>

            <div className="form-field">
                <label htmlFor="character-name">Character Name</label>
                <input
                    id="character-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="form-field">
                <label htmlFor="character-max-weight">Maximum Carry Weight (lbs)</label>
                <input
                    id="character-max-weight"
                    type="number"
                    min="0"
                    step="any"
                    value={maxWeight}
                    onChange={(event) => setMaxWeight(event.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="form-field">
                <label htmlFor="character-species">Species</label>
                <select
                    id="character-species"
                    value={speciesId}
                    onChange={(event) => setSpeciesId(event.target.value)}
                    disabled={loading}
                >
                    <option value="">None</option>
                    {speciesOptions}
                </select>
            </div>

            <div className="form-field">
                <label htmlFor="character-background">Background</label>
                <select
                    id="character-background"
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
                            <label htmlFor={`character-${ability.field}`}>
                                {ability.label}
                            </label>
                            <input
                                id={`character-${ability.field}`}
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
                    {loading ? "Saving..." : "Add Character"}
                </button>

                <button
                    type="button"
                    onClick={props.cancelCreate}
                    disabled={loading}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default CharacterForm
