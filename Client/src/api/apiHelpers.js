const API_BASE_URL = "http://localhost:3000"

async function apiRequest(endpoint, options = {}) {
    let response

    try {
        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                credentials: "include"
            }
        )
    }
    catch {
        // fetch only throws when the request never reached the server
        throw new Error("Unable to reach the server. Is the API running?")
    }

    // Only parse bodies the server marked as JSON; error pages may be HTML
    const isJson = response.headers
        .get("Content-Type")
        ?.includes("application/json")

    const data = isJson
        ? await response.json()
        : null

    if (!response.ok) {
        throw new Error(
            data?.error ||
            `Request failed: ${response.status} ${response.statusText}`
        )
    }

    return data
}

export { apiRequest }