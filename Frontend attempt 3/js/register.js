document.getElementById("register-form")
    .addEventListener("submit", registerCitizen);

async function registerCitizen(event) {

    event.preventDefault();

    const errorDiv = document.getElementById("error-message");

    const successDiv = document.getElementById("success-message");

    errorDiv.textContent = "";
    successDiv.textContent = "";

    const username = document.getElementById("username").value.trim();

    const password = document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirm-password").value;

    const firstName =
        document.getElementById("first-name").value.trim();

    const lastName =
        document.getElementById("last-name").value.trim();

    const dob =
        document.getElementById("dob").value;

    const license =
        document.getElementById("license").value.trim();

    const vehicleRegistration =
        document.getElementById("vehicle-registration").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    // PASSWORD VALIDATION

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/;

    if (!passwordRegex.test(password)) {

        errorDiv.textContent =
            "Password must contain uppercase, lowercase, number, and minimum 8 characters.";

        return;
    }

    // CONFIRM PASSWORD

    if (password !== confirmPassword) {

        errorDiv.textContent =
            "Passwords do not match.";

        return;
    }

    // EMAIL VALIDATION

    const emailRegex =
        /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    if (!emailRegex.test(email)) {

        errorDiv.textContent =
            "Invalid email address.";

        return;
    }

    // DOB VALIDATION

    const selectedDate = new Date(dob);

    const today = new Date();

    if (selectedDate > today) {

        errorDiv.textContent =
            "Date of birth cannot be in the future.";

        return;
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth: dob,
                    drivers_license: license,
                    vehicle_registration: vehicleRegistration,
                    email,
                    phone
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.detail || "Registration failed");
        }

        successDiv.textContent =
            "Registration successful. Redirecting to login...";

        setTimeout(() => {

            window.location.href = "citizen-login.html";

        }, 2000);

    } catch (error) {

        errorDiv.textContent = error.message;
    }
}