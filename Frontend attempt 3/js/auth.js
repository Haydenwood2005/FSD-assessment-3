async function login(username, password, expectedRole) {

    const errorDiv = document.getElementById("error-message");

    errorDiv.textContent = "";

    try {

        const formData = new URLSearchParams();

        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch("http://127.0.0.1:8000/token", {

            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: formData
        });

        if (!response.ok) {
            throw new Error("Invalid username or password");
        }

        const data = await response.json();

        // DETERMINE ROLE FROM USERNAME

        let role = "";

        if (username === "officer_user") {
            role = "officer";
        }
        else if (username === "citizen_user") {
            role = "citizen";
        }

        if (role !== expectedRole) {
            throw new Error("Unauthorized role access");
        }

        sessionStorage.setItem("token", data.access_token);
        sessionStorage.setItem("role", role);
        sessionStorage.setItem("username", username);

        if (role === "citizen") {

            window.location.href = "citizen-dashboard.html";

        } else {

            window.location.href = "officer-dashboard.html";
        }

    } catch (error) {

        errorDiv.textContent = error.message;
    }
}

function logout() {

    sessionStorage.clear();

    window.location.href = "index.html";
}

function protectRoute(requiredRole) {

    const token = sessionStorage.getItem("token");

    const role = sessionStorage.getItem("role");

    if (!token || role !== requiredRole) {

        alert("Unauthorized access");

        window.location.href = "index.html";
    }
}