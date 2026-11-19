import { useState } from "react"

// Shared saving/error state for the character sheet sections.
// run() disables the section while a request is in flight and shows the
// server's error message if it fails.
function useTraitRequest() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    async function run(request) {
        setBusy(true)
        setError("")

        try {
            await request()
        }
        catch (error) {
            setError(error.message)
        }
        finally {
            setBusy(false)
        }
    }

    return { busy, error, run }
}

export default useTraitRequest
