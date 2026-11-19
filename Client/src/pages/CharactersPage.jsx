import { useState } from "react"
import CharacterForm from "../components/characters/CharacterForm"
import Modal from "../components/Modal"

function CharactersPage({ addCharacter, characterElements }) {

    // --- State ---
    const [isCreateCharacterOpen, setIsCreateCharacterOpen] = useState(false)

    // --- Event Handlers ---
    function handleCreateCharacterOpen() {
        setIsCreateCharacterOpen(true)
    }

    function handleCreateCharacterClose() {
        setIsCreateCharacterOpen(false)
    }

    // --- Render ---
    return (
        <div>
            <h1>Characters</h1>

            <button
                type="button"
                onClick={handleCreateCharacterOpen}
            >
                Create New Character
            </button>

            {isCreateCharacterOpen && (
                <Modal>
                    <CharacterForm
                        addCharacter={addCharacter}
                        cancelCreate={handleCreateCharacterClose}
                    />
                </Modal>
            )}

            <div className="character-grid">
                {characterElements}
            </div>
        </div>
    )
}

export default CharactersPage
