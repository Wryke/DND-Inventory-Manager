import { useState } from "react"

import {
    addCharacterProficiency,
    removeCharacterProficiency
} from "../../api/characterTraits"
import useTraitRequest from "./useTraitRequest"

// Group rows under their type name; both lists arrive sorted by type, then name
function groupByType(proficiencies) {
    const groups = new Map()

    proficiencies.forEach((proficiency) => {
        if (!groups.has(proficiency.type_name)) {
            groups.set(proficiency.type_name, [])
        }

        groups.get(proficiency.type_name).push(proficiency)
    })

    return groups
}

function ProficienciesSection({ characterName, proficiencies, proficiencyOptions, onChange }) {

    // --- State ---
    const { busy, error, run } = useTraitRequest()

    const [newProficiencyId, setNewProficiencyId] = useState("")

    // --- Derived Data ---
    const ownedProficiencyIds = new Set(
        proficiencies.map((proficiency) => proficiency.proficiency_id)
    )

    const availableProficiencies = proficiencyOptions.filter((option) => {
        return !ownedProficiencyIds.has(option.proficiency_id)
    })

    const ownedGroups = groupByType(proficiencies)
    const availableGroups = groupByType(availableProficiencies)

    // --- Event Handlers ---
    function handleAdd(event) {
        event.preventDefault()

        if (newProficiencyId === "") {
            return
        }

        run(async () => {
            onChange(await addCharacterProficiency(characterName, Number(newProficiencyId)))

            setNewProficiencyId("")
        })
    }

    function handleRemove(proficiencyId) {
        run(async () => {
            const result = await removeCharacterProficiency(characterName, proficiencyId)

            onChange(result.proficiencies)
        })
    }

    // --- Render ---
    return (
        <section className="character-sheet-section">
            <h2>Proficiencies</h2>

            {ownedGroups.size === 0 ? (
                <p className="character-sheet-empty">No proficiencies yet.</p>
            ) : (
                Array.from(ownedGroups, ([typeName, group]) => {
                    return (
                        <div key={typeName}>
                            <h3>{typeName}</h3>

                            <ul className="trait-list">
                                {group.map((proficiency) => {
                                    return (
                                        <li className="trait-row" key={proficiency.proficiency_id}>
                                            <span>{proficiency.proficiency_name}</span>

                                            <span className="trait-row-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(proficiency.proficiency_id)}
                                                    disabled={busy}
                                                >
                                                    Remove
                                                </button>
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )
                })
            )}

            <form className="trait-add-form" onSubmit={handleAdd}>
                <label htmlFor="add-proficiency">Proficiency</label>
                <select
                    id="add-proficiency"
                    value={newProficiencyId}
                    onChange={(event) => setNewProficiencyId(event.target.value)}
                    disabled={busy || availableProficiencies.length === 0}
                >
                    <option value="">Choose a proficiency</option>
                    {Array.from(availableGroups, ([typeName, group]) => {
                        return (
                            <optgroup key={typeName} label={typeName}>
                                {group.map((option) => {
                                    return (
                                        <option key={option.proficiency_id} value={option.proficiency_id}>
                                            {option.proficiency_name}
                                        </option>
                                    )
                                })}
                            </optgroup>
                        )
                    })}
                </select>

                <button type="submit" disabled={busy || newProficiencyId === ""}>
                    Add Proficiency
                </button>
            </form>

            {error && <p role="alert" className="trait-error">{error}</p>}
        </section>
    )
}

export default ProficienciesSection
