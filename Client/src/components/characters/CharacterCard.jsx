
import { useState } from "react"

import Modal from "../Modal"
import ConfirmDialog from "../ConfirmDialog"
import CharacterEditForm from "./CharacterEditForm"
import "../../styles/CharacterCard.css"

function CharacterCard({
    character,
    selectedCharacter,
    selectCharacter,
    removeCharacter,
    updateCharacter,
    species,
    backgrounds
}) {

    // --- State ---
    const [isEditing, setIsEditing] = useState(false)
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

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

    function handleDeleteClick() {
        setIsConfirmingDelete(true)
    }

    function handleDeleteCancel() {
        setIsConfirmingDelete(false)
    }

    // Returns the error message, if any, for the dialog to show.
    // On success the character is removed, which unmounts this card and its dialog.
    function handleDeleteConfirm() {
        return removeCharacter(character.character_id)
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
                    onClick={handleDeleteClick}
                >
                    Delete
                </button>
            </div>

            {isConfirmingDelete && (
                <ConfirmDialog
                    title={`Delete ${character.name}?`}
                    message="This also deletes the character's inventory, equipment, classes, skills, proficiencies, and weapon masteries. This cannot be undone."
                    confirmLabel="Delete Character"
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}

            {isEditing && (
                <Modal>
                    <CharacterEditForm
                        character={character}
                        updateCharacter={updateCharacter}
                        cancelEdit={handleEditClose}
                        species={species}
                        backgrounds={backgrounds}
                    />
                </Modal>
            )}
        </div>
    )
}

export default CharacterCard