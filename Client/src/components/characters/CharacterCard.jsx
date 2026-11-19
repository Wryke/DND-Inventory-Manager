
import { useState } from "react"

import Modal from "../Modal"
import CharacterEditForm from "./CharacterEditForm"
import "../../styles/CharacterCard.css"

function CharacterCard({
    character,
    selectedCharacter,
    selectCharacter,
    removeCharacter,
    updateCharacter
}) {

    // --- State ---
    const [isEditing, setIsEditing] = useState(false)

    // --- Derived Data ---
    const isSelected = selectedCharacter?.character_id === character.character_id

    // e.g. "Human · Soldier"; empty when neither is set
    const origin = [character.species_name, character.background_name]
        .filter(Boolean)
        .join(" · ")

    // --- Event Handlers ---
    function handleEditClick() {
        setIsEditing(true)
    }

    function handleEditClose() {
        setIsEditing(false)
    }

    function handleDelete() {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${character.name}? This action cannot be undone.`
        )

        if (!confirmed) {
            return
        }

        removeCharacter(character.character_id)
    }

    // --- Render ---
    return (
        <div className={`character-card ${isSelected ? "selected" : ""}`}>
            <h2>{character.name}</h2>

            {origin && (
                <p>{origin}</p>
            )}

            <p>
                Max Carry Weight: {character.max_weight} lbs
            </p>

            <div className="character-card-actions">
                <button
                    type="button"
                    onClick={() => selectCharacter(character)}
                    disabled={isSelected}
                >
                    {isSelected ? "Selected" : "Select"}
                </button>

                <button
                    type="button"
                    onClick={handleEditClick}
                >
                    Edit
                </button>

                <button
                    type="button"
                    onClick={handleDelete}
                >
                    Delete
                </button>
            </div>

            {isEditing && (
                <Modal>
                    <CharacterEditForm
                        character={character}
                        updateCharacter={updateCharacter}
                        cancelEdit={handleEditClose}
                    />
                </Modal>
            )}
        </div>
    )
}

export default CharacterCard