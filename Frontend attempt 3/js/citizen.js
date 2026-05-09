protectRoute("citizen");

const username = sessionStorage.getItem("username");

document.getElementById("username-display")
    .textContent = `Logged in as: ${username}`;

async function loadCitizenData() {

    const tableBody = document.getElementById("citations-table-body");

    const loading = document.getElementById("loading");

    try {

        // TEMPORARY SAMPLE DATA
        // Replace with your real endpoint later

        const citations = [
            {
                id: 1001,
                violation: "Speeding",
                status: "Pending"
            },
            {
                id: 1002,
                violation: "Parking Violation",
                status: "Resolved"
            }
        ];

        tableBody.innerHTML = "";

        citations.forEach(citation => {

            const row = `
                <tr>
                    <td>${citation.id}</td>
                    <td>${citation.violation}</td>
                    <td>${citation.status}</td>
                </tr>
            `;

            tableBody.innerHTML += row;
        });

    } catch (error) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="3">Failed to load citations.</td>
            </tr>
        `;

    } finally {

        loading.style.display = "none";
    }
}

loadCitizenData();