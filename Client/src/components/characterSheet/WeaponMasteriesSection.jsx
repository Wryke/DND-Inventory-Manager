import { useState } from "react"

import {
    addCharacterWeaponMastery,
    removeCharacterWeaponMastery
} from "../../api/characterTraits"
import useTraitRequest from "./useTraitRequest"

function WeaponMasteriesSection({ characterName, masteries, masteryOptions, onChange }) {

    // --- State ---
    const { busy, error, run } = useTraitRequest()

    const [newWeaponTypeId, setNewWeaponTypeId] = useState("")

    // --- Derived Data ---
    const ownedWeaponTypeIds = new Set(masteries.map((mastery) => mastery.weapon_type_id))

    const availableWeapons = masteryOptions.filter((option) => {
        return !ownedWeaponTypeIds.has(option.weapon_type_id)
    })

    // --- Event Handlers ---
    function handleAdd(event) {
        event.preventDefault()

        if (newWeaponTypeId === "") {
            return
        }

        run(async () => {
            onChange(await addCharacterWeaponMastery(characterName, Number(newWeaponTypeId)))

            setNewWeaponTypeId("")
        })
    }

    function handleRemove(weaponTypeId) {
        run(async () => {
            const result = await removeCharacterWeaponMastery(characterName, weaponTypeId)

            onChange(result.weapon_masteries)
        })
    }

    // --- Render ---
    return (
        <section className="character-sheet-section">
            <h2>Weapon Masteries</h2>

            {masteries.length === 0 ? (
                <p className="character-sheet-empty">No weapon masteries yet.</p>
            ) : (
                <ul className="trait-list">
                    {masteries.map((mastery) => {
                        return (
                            <li className="trait-row" key={mastery.weapon_type_id}>
                                <span>
                                    {mastery.weapon_type_name}
                                    <span className="character-sheet-detail">
                                        {mastery.mastery_name}
                                    </span>
                                </span>

                                <span className="trait-row-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(mastery.weapon_type_id)}
                                        disabled={busy}
                                    >
                                        Remove
                                    </button>
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}

            <form className="trait-add-form" onSubmit={handleAdd}>
                <label htmlFor="add-weapon-mastery">Weapon</label>
                <select
                    id="add-weapon-mastery"
                    value={newWeaponTypeId}
                    onChange={(event) => setNewWeaponTypeId(event.target.value)}
                    disabled={busy || availableWeapons.length === 0}
                >
                    <option value="">Choose a weapon</option>
                    {availableWeapons.map((option) => {
                        return (
                            <option key={option.weapon_type_id} value={option.weapon_type_id}>
                                {option.weapon_type_name} ({option.mastery_name})
                            </option>
                        )
                    })}
                </select>

                <button type="submit" disabled={busy || newWeaponTypeId === ""}>
                    Add Mastery
                </button>
            </form>

            {error && <p role="alert" className="trait-error">{error}</p>}
        </section>
    )
}

export default WeaponMasteriesSection
