const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(endpoint, method = "GET", body = null) {
    const token = sessionStorage.getItem("token");

    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return response.json();
}