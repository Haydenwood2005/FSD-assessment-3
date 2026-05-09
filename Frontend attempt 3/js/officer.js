protectRoute("officer");

const username = sessionStorage.getItem("username");

document.getElementById("officer-display")
    .textContent = `Logged in as: ${username}`;

async function loadOfficerStats() {

    // TEMPORARY SAMPLE DATA

    document.getElementById("total-citations")
        .textContent = 142;

    document.getElementById("pending-cases")
        .textContent = 38;

    document.getElementById("resolved-cases")
        .textContent = 104;
}

loadOfficerStats();