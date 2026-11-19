import { useState } from "react"

import {
    addCharacterSkill,
    updateCharacterSkillExpertise,
    removeCharacterSkill
} from "../../api/characterTraits"
import useTraitRequest from "./useTraitRequest"

function SkillsSection({ characterName, skills, skillOptions, onChange }) {

    // --- State ---
    const { busy, error, run } = useTraitRequest()

    const [newSkillId, setNewSkillId] = useState("")
    const [newExpertise, setNewExpertise] = useState(false)

    // --- Derived Data ---
    const ownedSkillIds = new Set(skills.map((skill) => skill.skill_id))

    const availableSkills = skillOptions.filter((option) => {
        return !ownedSkillIds.has(option.skill_id)
    })

    // --- Event Handlers ---
    function handleAdd(event) {
        event.preventDefault()

        if (newSkillId === "") {
            return
        }

        run(async () => {
            onChange(await addCharacterSkill(characterName, Number(newSkillId), newExpertise))

            setNewSkillId("")
            setNewExpertise(false)
        })
    }

    function handleExpertiseChange(skillId, expertise) {
        run(async () => {
            onChange(await updateCharacterSkillExpertise(characterName, skillId, expertise))
        })
    }

    function handleRemove(skillId) {
        run(async () => {
            const result = await removeCharacterSkill(characterName, skillId)

            onChange(result.skills)
        })
    }

    // --- Render ---
    return (
        <section className="character-sheet-section">
            <h2>Skills</h2>

            {skills.length === 0 ? (
                <p className="character-sheet-empty">No skill proficiencies yet.</p>
            ) : (
                <ul className="trait-list">
                    {skills.map((skill) => {
                        const checkboxId = `skill-expertise-${skill.skill_id}`

                        return (
                            <li className="trait-row" key={skill.skill_id}>
                                <span>
                                    {skill.skill_name}
                                    <span className="character-sheet-detail">
                                        {skill.ability_name}
                                    </span>
                                </span>

                                <span className="trait-row-actions">
                                    <input
                                        id={checkboxId}
                                        type="checkbox"
                                        checked={skill.expertise === 1}
                                        onChange={(event) => {
                                            handleExpertiseChange(skill.skill_id, event.target.checked)
                                        }}
                                        disabled={busy}
                                    />
                                    <label htmlFor={checkboxId}>Expertise</label>

                                    <button
                                        type="button"
                                        onClick={() => handleRemove(skill.skill_id)}
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
                <label htmlFor="add-skill">Skill</label>
                <select
                    id="add-skill"
                    value={newSkillId}
                    onChange={(event) => setNewSkillId(event.target.value)}
                    disabled={busy || availableSkills.length === 0}
                >
                    <option value="">Choose a skill</option>
                    {availableSkills.map((option) => {
                        return (
                            <option key={option.skill_id} value={option.skill_id}>
                                {option.skill_name} ({option.ability_index.toUpperCase()})
                            </option>
                        )
                    })}
                </select>

                <input
                    id="add-skill-expertise"
                    type="checkbox"
                    checked={newExpertise}
                    onChange={(event) => setNewExpertise(event.target.checked)}
                    disabled={busy}
                />
                <label htmlFor="add-skill-expertise">Expertise</label>

                <button type="submit" disabled={busy || newSkillId === ""}>
                    Add Skill
                </button>
            </form>

            {error && <p role="alert" className="trait-error">{error}</p>}
        </section>
    )
}

export default SkillsSection
