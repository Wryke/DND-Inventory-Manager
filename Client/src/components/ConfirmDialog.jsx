import { useState } from "react"

import Modal from "./Modal"

// Confirmation modal for destructive actions.
// onConfirm returns null on success or an error message to show in the dialog.
// On success the parent is expected to close (unmount) the dialog.
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {

    // --- State ---
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // --- Event Handlers ---
    async function handleConfirm() {
        setError("")
        setLoading(true)

        const errorMessage = await onConfirm()

        if (errorMessage) {
            setError(errorMessage)
            setLoading(false)
        }
    }

    // --- Render ---
    return (
        <Modal>
            <div className="confirm-dialog">
                <h3>{title}</h3>

                <p>{message}</p>

                {error && <p role="alert">{error}</p>}

                <div className="character-form-actions">
                    <button type="button" onClick={handleConfirm} disabled={loading}>
                        {loading ? "Working..." : confirmLabel}
                    </button>

                    <button type="button" onClick={onCancel} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default ConfirmDialog
