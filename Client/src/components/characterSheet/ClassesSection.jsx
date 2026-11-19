import { useState } from "react"

import {
    addCharacterClass,
    updateCharacterClass,
    removeCharacterClass
} from "../../api/characterTraits"
import { getSubclasses } from "../../api/lookups"
import useTraitRequest from "./useTraitRequest"

const MAX_TOTAL_LEVEL = 20

// Subclass options for a <select>, with "" meaning no subclass
function SubclassOptions({ subclasses }) {
    return (
        <>
            <option value="">No subclass</option>
            {subclasses.map((subclass) => {
                return (
                    <option key={subclass.subclass_id} value={subclass.subclass_id}>
                        {subclass.subclass_name}
                    </option>
                )
            })}
        </>
    )
}

// One class the character has, with an inline editor for level and subclass
function ClassRow({ characterClass, otherLevels, busy, onSave, onRemove }) {

    // --- State ---
    const [isEditing, setIsEditing] = useState(false)
    const [level, setLevel] = useState(String(characterClass.class_level))
    const [subclassId, setSubclassId] = useState("")
    const [subclasses, setSubclasses] = useState([])
    const [rowError, setRowError] = useState("")

    // --- Event Handlers ---
    async function handleEditClick() {
        setLevel(String(characterClass.class_level))
        setSubclassId(characterClass.subclass_id === null ? "" : String(characterClass.subclass_id))
        setRowError("")
        setIsEditing(true)

        try {
            setSubclasses(await getSubclasses(characterClass.class_id))
        }
        catch (error) {
            setRowError(error.message)
        }
    }

    async function handleSave() {
        const numericLevel = Number(level)

        if (!Number.isInteger(numericLevel) || numericLevel < 1 || numericLevel > 20) {
            setRowError("Level must be a whole number from 1 to 20.")
            return
        }

        if (otherLevels + numericLevel > MAX_TOTAL_LEVEL) {
            setRowError(`Total character level cannot be above ${MAX_TOTAL_LEVEL}.`)
            return
        }

        const changes = {}

        if (numericLevel !== characterClass.class_level) {
            changes.class_level = numericLevel
        }

        // null clears the subclass
        const newSubclassId = subclassId === "" ? null : Number(subclassId)

        if (newSubclassId !== characterClass.subclass_id) {
            changes.subclass_id = newSubclassId
        }

        if (Object.keys(changes).length > 0) {
            const saved = await onSave(characterClass.class_id, changes)

            if (!saved) {
                return
            }
        }

        setIsEditing(false)
    }

    // --- Render ---
    if (!isEditing) {
        return (
            <li className="trait-row">
                <span>
                    {characterClass.class_name} {characterClass.class_level}
                    {characterClass.subclass_name && (
                        <span className="character-sheet-detail">
                            {characterClass.subclass_name}
                        </span>
                    )}
                </span>

                <span className="trait-row-actions">
                    <button type="button" onClick={handleEditClick} disabled={busy}>
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(characterClass.class_id)}
                        disabled={busy}
                    >
                        Remove
                    </button>
                </span>
            </li>
        )
    }

    const idPrefix = `class-${characterClass.class_id}`

    return (
        <li className="trait-row trait-row-editing">
            <strong>{characterClass.class_name}</strong>

            <label htmlFor={`${idPrefix}-level`}>Level</label>
            <input
                id={`${idPrefix}-level`}
                className="trait-level-input"
                type="number"
                min="1"
                max="20"
                step="1"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={busy}
            />

            <label htmlFor={`${idPrefix}-subclass`}>Subclass</label>
            <select
                id={`${idPrefix}-subclass`}
                value={subclassId}
                onChange={(event) => setSubclassId(event.target.value)}
                disabled={busy}
            >
                <SubclassOptions subclasses={subclasses} />
            </select>

            <span className="trait-row-actions">
                <button type="button" onClick={handleSave} disabled={busy}>
                    Save
                </button>
                <button type="button" onClick={() => setIsEditing(false)} disabled={busy}>
                    Cancel
                </button>
            </span>

            {rowError && <p role="alert" className="trait-error">{rowError}</p>}
        </li>
    )
}

function ClassesSection({ characterName, classes, classOptions, onChange }) {

    // --- State ---
    const { busy, error, run } = useTraitRequest()

    const [newClassId, setNewClassId] = useState("")
    const [newSubclassId, setNewSubclassId] = useState("")
    const [newLevel, setNewLevel] = useState("1")
    const [newSubclasses, setNewSubclasses] = useState([])
    const [formError, setFormError] = useState("")

    // --- Derived Data ---
    const totalLevel = classes.reduce((total, characterClass) => {
        return total + characterClass.class_level
    }, 0)

    const ownedClassIds = new Set(classes.map((characterClass) => characterClass.class_id))

    const availableClasses = classOptions.filter((option) => {
        return !ownedClassIds.has(option.class_id)
    })

    // --- Event Handlers ---
    async function handleNewClassChange(value) {
        setNewClassId(value)
        setNewSubclassId("")
        setNewSubclasses([])

        if (value === "") {
            return
        }

        // Load the chosen class's subclasses for the subclass dropdown
        try {
            setNewSubclasses(await getSubclasses(Number(value)))
        }
        catch (error) {
            setFormError(error.message)
        }
    }

    function handleAdd(event) {
        event.preventDefault()

        setFormError("")

        const level = Number(newLevel)

        if (newClassId === "") {
            setFormError("Choose a class to add.")
            return
        }

        if (!Number.isInteger(level) || level < 1 || level > 20) {
            setFormError("Level must be a whole number from 1 to 20.")
            return
        }

        if (totalLevel + level > MAX_TOTAL_LEVEL) {
            setFormError(`Total character level cannot be above ${MAX_TOTAL_LEVEL}.`)
            return
        }

        run(async () => {
            const updatedClasses = await addCharacterClass(
                characterName,
                Number(newClassId),
                level,
                newSubclassId === "" ? null : Number(newSubclassId)
            )

            onChange(updatedClasses)

            setNewClassId("")
            setNewSubclassId("")
            setNewSubclasses([])
            setNewLevel("1")
        })
    }

    // Returns true when the save succeeded, so the row can close its editor
    async function handleSave(classId, changes) {
        let saved = false

        await run(async () => {
            onChange(await updateCharacterClass(characterName, classId, changes))
            saved = true
        })

        return saved
    }

    function handleRemove(classId) {
        run(async () => {
            const result = await removeCharacterClass(characterName, classId)

            onChange(result.classes)
        })
    }

    // --- Render ---
    return (
        <section className="character-sheet-section">
            <h2>
                Classes
                {totalLevel > 0 && (
                    <span className="character-sheet-detail">Total level {totalLevel}</span>
                )}
            </h2>

            {classes.length === 0 ? (
                <p className="character-sheet-empty">No classes yet.</p>
            ) : (
                <ul className="trait-list">
                    {classes.map((characterClass) => {
                        return (
                            <ClassRow
                                key={characterClass.class_id}
                                characterClass={characterClass}
                                otherLevels={totalLevel - characterClass.class_level}
                                busy={busy}
                                onSave={handleSave}
                                onRemove={handleRemove}
                            />
                        )
                    })}
                </ul>
            )}

            <form className="trait-add-form" onSubmit={handleAdd}>
                <label htmlFor="add-class">Class</label>
                <select
                    id="add-class"
                    value={newClassId}
                    onChange={(event) => handleNewClassChange(event.target.value)}
                    disabled={busy || availableClasses.length === 0}
                >
                    <option value="">Choose a class</option>
                    {availableClasses.map((option) => {
                        return (
                            <option key={option.class_id} value={option.class_id}>
                                {option.class_name}
                            </option>
                        )
                    })}
                </select>

                <label htmlFor="add-class-subclass">Subclass</label>
                <select
                    id="add-class-subclass"
                    value={newSubclassId}
                    onChange={(event) => setNewSubclassId(event.target.value)}
                    disabled={busy || newClassId === ""}
                >
                    <SubclassOptions subclasses={newSubclasses} />
                </select>

                <label htmlFor="add-class-level">Level</label>
                <input
                    id="add-class-level"
                    className="trait-level-input"
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={newLevel}
                    onChange={(event) => setNewLevel(event.target.value)}
                    disabled={busy}
                />

                <button type="submit" disabled={busy || newClassId === ""}>
                    Add Class
                </button>
            </form>

            {(formError || error) && (
                <p role="alert" className="trait-error">{formError || error}</p>
            )}
        </section>
    )
}

export default ClassesSection
