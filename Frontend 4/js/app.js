const API_URL = 'http://127.0.0.1:8000';

// ── Application state
const state = {
    // Data
    notices: [], // cached list of traffic correction notices

    // Auth (used in Assessment 3)
    token: null, // JWT string once logged in
    currentUser: null, // user object { id, username, role }
    clearance: null, // user clearance level (Officer or Civilian)

    // UI
    isLoading: false, // true while any fetch is in progress
    lastError: null // last error message string
};

window.state = state;

// ── Utility functions
/**
 * showToast(message, duration) – displays a temporary toast notification
 * @param {string} message – the notification text
 * @param {number} duration – how long to show in milliseconds
 */
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    // allow pointer events while visible
    toast.style.pointerEvents = 'auto';

    setTimeout(function() {
        toast.classList.remove('show');
        toast.style.pointerEvents = 'none';
    }, duration);
}

// ── View management
/**
 * showView(viewId) – hides all views, then reveals the one requested.
 * @param {string} viewId – the id of the <section> to show
 */
function showView(viewId) {

    // Remove active from all views
    document.querySelectorAll('.view').forEach(section => {
        section.classList.remove('active');
    });

    // Add active to requested view
    const target = document.getElementById(viewId);

    if (target) {
        target.classList.add('active');
    } else {
        console.warn('Unknown view id "' + viewId + '"');
    }
}

function setBreadcrumb(crumbs) {

    const bc = document.getElementById('breadcrumb');

    if (!bc) {
        return;
    }

    bc.innerHTML = crumbs.map((crumb, i) => {

        if (i === crumbs.length - 1) {
            return '<span>' + crumb.label + '</span>';
        }

        const route = crumb.route || 'list';

        const params = crumb.params
            ? JSON.stringify(crumb.params).replace(/"/g, '&quot;')
            : '{}';

        return '<a href="#" onclick="navigateTo(\'' +
            route +
            '\', ' +
            params +
            ')">' +
            crumb.label +
            '</a>';

    }).join('<span class="crumb-sep">&rsaquo;</span>');
}

/**
 * canAccess(route)
 */
function canAccess(route) {

    // Public routes
    const publicRoutes = [
        'info',
        'user-login',
        'register',
        'admin-login'
    ];

    if (publicRoutes.includes(route)) {
        return true;
    }

    // Require login
    if (!state.token || !state.currentUser) {

        showToast(
            'Please log in to access this page.',
            3000
        );

        navigateTo('info');

        return false;
    }

    // Officer only routes
    const officerRoutes = [
        'admin-dash',
        'admin-management'
    ];

    if (
        officerRoutes.includes(route)
        && !hasOfficerClearance()
    ) {

        showToast(
            'You do not have permission to access this page.',
            3000
        );

        navigateTo('user-dash');

        return false;
    }

    // Civilian only routes
    const civilianRoutes = [
        'user-dash',
        'user-profile'
    ];

    if (
        civilianRoutes.includes(route)
        && !hasCivilianClearance()
    ) {

        showToast(
            'You do not have permission to access this page.',
            3000
        );

        navigateTo('admin-dash');

        return false;
    }

    return true;
}

/**
 * hasOfficerClearance()
 */
function hasOfficerClearance() {
    return state.clearance === 'Officer';
}

/**
 * hasCivilianClearance()
 */
function hasCivilianClearance() {
    return state.clearance === 'Civilian';
}

// ── Router
function navigateTo(route, params = {}) {

    if (!canAccess(route)) {
        return;
    }

    // URL hash
    const hashRoute =
        route === 'detail' && params.id
            ? '#detail/' + params.id
            : '#' + route;

    if (window.location.hash !== hashRoute) {

        history.pushState(
            { route, params },
            '',
            hashRoute
        );
    }

    // Active nav links
    document.querySelectorAll('.nav-link').forEach(link => {

        link.classList.toggle(
            'active',
            link.dataset.view === route
        );
    });

    // Correct view
    const viewId =
        ROUTE_TO_VIEW[route]
        || 'view-info';

    switch (route) {

        case 'info':

            setBreadcrumb([
                { label: 'Home' },
                { label: 'Info' }
            ]);

            loadUsersForInfoPage();

            break;

        case 'user-login':

            setBreadcrumb([
                { label: 'Home' },
                { label: 'User Login' }
            ]);

            break;

        case 'register':

            setBreadcrumb([
                { label: 'Home' },
                { label: 'Register' }
            ]);

            break;

        case 'admin-login':

            setBreadcrumb([
                { label: 'Home' },
                { label: 'Admin Login' }
            ]);

            break;

        case 'user-dash':

            setBreadcrumb([
                { label: 'User' },
                { label: 'Dashboard' }
            ]);

             loadMyNotices();
             
            break;

        case 'user-profile':

            setBreadcrumb([
                { label: 'User' },
                { label: 'Profile' }
            ]);

            loadUserProfile();

            break;

        case 'admin-dash':

            setBreadcrumb([
                { label: 'Admin' },
                { label: 'Dashboard' }
            ]);

            break;

        case 'admin-management':

            setBreadcrumb([
                { label: 'Admin' },
                { label: 'Management' }
            ]);

            break;

        default:

            setBreadcrumb([
                { label: 'Home' }
            ]);
    }

    showView(viewId);

    updateActiveNav(route);

    if (
        route === 'info'
        || route === 'user-login'
        || route === 'admin-login'
        || route === 'logout'
    ) {

        setVisibleNav('main-nav');

        return;
    }

    if (
        route === 'user-dash'
        || route === 'user-profile'
    ) {

        setVisibleNav('user-nav');

        return;
    }

    if (
        route === 'admin-dash'
        || route === 'admin-management'
    ) {

        setVisibleNav('admin-nav');
    }
}

// ── Hash routing
function routeFromHash() {

    const hash =
        window.location.hash.slice(1);

    if (!hash) {

        navigateTo('info');

        return;
    }

    const parts = hash.split('/');

    const route = parts[0];

    const id = parts[1]
        ? parseInt(parts[1], 10)
        : null;

    navigateTo(route, { id });
}

window.addEventListener(
    'hashchange',
    routeFromHash
);

window.addEventListener(
    'popstate',
    function(event) {

        if (
            event.state
            && event.state.route
        ) {

            navigateTo(
                event.state.route,
                event.state.params || {}
            );

        } else {

            routeFromHash();
        }
    }
);

// Sets visible nav
function setVisibleNav(navId) {

    [
        'main-nav',
        'user-nav',
        'admin-nav'
    ].forEach(id => {

        const nav =
            document.getElementById(id);

        if (nav) {

            nav.style.display =
                id === navId
                    ? 'flex'
                    : 'none';
        }
    });
}

// Active nav
function updateActiveNav(route) {

    document.querySelectorAll('.nav-link').forEach(link => {

        link.classList.toggle(
            'active',
            link.dataset.view === route
        );
    });
}

// Route map
const ROUTE_TO_VIEW = {

    'info': 'view-info',

    // landing page views
    'user-login': 'view-user-login',
    'register': 'view-register',
    'admin-login': 'view-admin-login',

    // user views
    'user-dash': 'view-user-dashboard',
    'user-profile': 'view-user-profile',
    'user-logout': 'view-user-logout',

    // admin views
    'admin-dash': 'view-admin-dashboard',
    'admin-management': 'view-admin-management',
    'admin-logout': 'view-admin-logout',

    'logout': 'view-logout'
};

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {

    // nav links
    document.querySelectorAll('.nav-link').forEach(link => {

        link.addEventListener('click', function(event) {

            if (
                this.id
                && this.id.includes('logout')
            ) {

                return;
            }

            event.preventDefault();

            window.location.hash =
                this.dataset.view || 'info';
        });
    });

    // user login
    const userLoginBtn =
        document.getElementById('user-login-btn');

    if (userLoginBtn) {

        userLoginBtn.addEventListener(
            'click',
            function() {

                handleLogin('user');
            }
        );
    }

    // admin login
    const adminLoginBtn =
        document.getElementById('admin-login-btn');

    if (adminLoginBtn) {

        adminLoginBtn.addEventListener(
            'click',
            function() {

                handleLogin('admin');
            }
        );
    }

    // user logout
    const userLogoutBtn =
        document.querySelector(
            'a[id="user-logout-btn"]'
        );

    if (userLogoutBtn) {

        userLogoutBtn.addEventListener(
            'click',
            function(event) {

                event.preventDefault();

                handleLogout();
            }
        );
    }

    // admin logout
    const adminLogoutBtn =
        document.querySelector(
            'a[id="admin-logout-btn"]'
        );

    if (adminLogoutBtn) {

        adminLogoutBtn.addEventListener(
            'click',
            function(event) {

                event.preventDefault();

                handleLogout();
            }
        );
    }

    window.addEventListener(
        'hashchange',
        routeFromHash
    );

    setVisibleNav('main-nav');

    routeFromHash();
});
// Register form handler
const registerBtn = document.getElementById('register-btn');

if (registerBtn) {

    registerBtn.addEventListener('click', async function() {

        const username =
            document.getElementById('register-username').value.trim();

        const password =
            document.getElementById('register-password').value;

        const confirmPassword =
            document.getElementById('register-confirm-password').value;

        const fullName =
            document.getElementById('register-fullname').value.trim();

        const dob =
            document.getElementById('register-dob').value;

        const email =
            document.getElementById('register-email').value.trim();

        const phone =
            document.getElementById('register-phone').value.trim();

        const licence =
            document.getElementById('register-licence').value.trim();

        const vehicle =
            document.getElementById('register-vehicle').value.trim();

        let valid = true;

        // clear errors
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
        });

        // username
        if (!username) {

            document.getElementById(
                'register-username-error'
            ).textContent = 'Username required';

            valid = false;
        }

        // password validation
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!passwordRegex.test(password)) {

            document.getElementById(
                'register-password-error'
            ).textContent =
                'Password must contain uppercase, lowercase and number';

            valid = false;
        }

        // confirm password
        if (password !== confirmPassword) {

            document.getElementById(
                'register-confirm-password-error'
            ).textContent =
                'Passwords do not match';

            valid = false;
        }

        // fullname
        if (!fullName) {

            document.getElementById(
                'register-fullname-error'
            ).textContent =
                'Full name required';

            valid = false;
        }

        // dob
        if (!dob) {

            document.getElementById(
                'register-dob-error'
            ).textContent =
                'Date of birth required';

            valid = false;
        }

        // email
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {

            document.getElementById(
                'register-email-error'
            ).textContent =
                'Valid email required';

            valid = false;
        }

        // phone
        if (!phone) {

            document.getElementById(
                'register-phone-error'
            ).textContent =
                'Phone required';

            valid = false;
        }

        // licence
        if (!licence) {

            document.getElementById(
                'register-licence-error'
            ).textContent =
                'Licence required';

            valid = false;
        }

        // vehicle
        if (!vehicle) {

            document.getElementById(
                'register-vehicle-error'
            ).textContent =
                'Vehicle registration required';

            valid = false;
        }

        if (!valid) {

            showToast(
                'Please correct the highlighted errors'
            );

            return;
        }

        try {

            const response = await fetch(
                API_URL + '/register',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        username: username,
                        password: password,
                        full_name: fullName,
                        date_of_birth: dob,
                        email: email,
                        phone: phone,
                        licence_number: licence,
                        vehicle_registration: vehicle
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.detail || 'Registration failed'
                );
            }

            showToast(
                'Registration successful'
            );

            navigateTo('user-login');

        } catch (error) {

            showToast(
                error.message
            );
        }
    });
}


// Authentication handlers
function handleLogin(loginRole) {

    // get the appropriate login view based on role
    const loginView = document.getElementById(
        loginRole === 'admin'
            ? 'view-admin-login'
            : 'view-user-login'
    );

    if (!loginView) {
        return;
    }

    // Extract username and password from the login form
    const usernameInput = loginView.querySelector('#login-username');
    const passwordInput = loginView.querySelector('#login-password');
    const errorText = loginView.querySelector('#login-error');

    const username = usernameInput
        ? usernameInput.value.trim()
        : '';

    const password = passwordInput
        ? passwordInput.value
        : '';

    // Clear previous error message
    if (errorText) {
        errorText.textContent = '';
    }

    // check for empty fields
    if (!username || !password) {

        if (errorText) {
            errorText.textContent =
                'Please enter both username and password.';
        }

        return;
    }

    // OAuth2 form body
    const formData = new URLSearchParams();

    formData.append('username', username);
    formData.append('password', password);

    // Attempt login via API
    fetch(API_URL + '/token', {

        method: 'POST',

        headers: {
            'Content-Type':
                'application/x-www-form-urlencoded'
        },

        body: formData

    })

    .then(function(response) {

        return response.json().then(function(data) {

            if (!response.ok) {

                throw new Error(
                    data.detail || 'Login failed'
                );
            }

            return data;
        });
    })

    .then(function(data) {

        // Save JWT token
        state.token = data.access_token;

        // Save token to session storage
        sessionStorage.setItem(
            'token',
            data.access_token
        );

        // Save role
        sessionStorage.setItem(
            'role',
            data.role
        );

        // OFFICER LOGIN
        if (data.role === 'officer') {

            state.currentUser = {
                username: username,
                role: 'officer'
            };

            state.clearance = 'Officer';

            // logged in message
            showToast(
                'Officer login successful.'
            );

            // Navigate to admin dashboard
            setVisibleNav('admin-nav');

            navigateTo('admin-dash');
            loadAdminStats();

            return;
        }

        // CITIZEN LOGIN
        if (data.role === 'citizen') {

            state.currentUser = {
                username: username,
                role: 'citizen'
            };

            state.clearance = 'Civilian';

            // logged in message
            showToast(
                'Citizen login successful.'
            );

            // Navigate to user dashboard
            setVisibleNav('user-nav');

            navigateTo('user-dash');

            return;
        }

        throw new Error('Unknown user role');

    })

    .catch(function(error) {

        console.error(error);

        if (errorText) {
            errorText.textContent =
                error.message;
        }

        showToast(
            error.message,
            3000
        );
    });
}

// Logout handler
function handleLogout() {

    confirmAction(
        'Are you sure you want to log out?',
        function() {

            state.token = null;
            state.currentUser = null;
            state.clearance = null;

            showToast(
                'You have been logged out.'
            );

            navigateTo('info');

            updateActiveNav('info');
        }
    );
}

/**
 * confirmAction(message, callback)
 */
function confirmAction(message, callback) {

    if (window.confirm(message)) {
        callback();
    }
}



function loadUsersForInfoPage() {

    console.log('Loading users for info page...');

    const tableBody = document.getElementById('users-table-body');

    if (!tableBody) {
        console.log('users-table-body not found');
        return;
    }

    fetch(API_URL + '/users')
        .then(function(response) {
            return response.json();
        })
        .then(function(users) {

            console.log(users);

            tableBody.innerHTML = '';

            users.forEach(function(user) {

                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.password}</td>
                `;

                tableBody.appendChild(row);
            });
        })
        .catch(function(error) {

            console.error(error);

            tableBody.innerHTML =
                '<tr><td colspan="2">Could not load users.</td></tr>';
        });
}


document.addEventListener('DOMContentLoaded', function () {
    loadUsersForInfoPage();
});


function loadAdminStats() {


    const token = sessionStorage.getItem('token');

    fetch(API_URL + '/admin/stats/total-citations', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('total-citations').textContent =
            data.total_citations;
    });

    fetch(API_URL + '/admin/stats/by-violation', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        const box = document.getElementById('citations-by-violation');
        box.innerHTML = '';

        data.forEach(item => {
            box.innerHTML += `
                <tr>
                    <td>${item.Violation_Name}</td>
                    <td>${item.total}</td>
                </tr>
            `;
        });
    });

    fetch(API_URL + '/admin/stats/by-district', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        const box = document.getElementById('citations-by-district');
        box.innerHTML = '';

        data.forEach(item => {
            box.innerHTML += `
                <tr>
                    <td>${item.Violation_District}</td>
                    <td>${item.total}</td>
                </tr>
            `;
        });
    });

    fetch(API_URL + '/admin/stats/by-detachment', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        const box = document.getElementById('citations-by-detachment');
        box.innerHTML = '';

        data.forEach(item => {
            box.innerHTML += `
                <tr>
                    <td>${item.Violation_Detachment}</td>
                    <td>${item.total}</td>
                </tr>
            `;
        });
    });
}


document.addEventListener('DOMContentLoaded', function () {

    const createBtn = document.getElementById('create-citation-btn');
    const historyBtn = document.getElementById('load-driver-history-btn');
    const updateBtn = document.getElementById('update-citation-btn');
    const deleteBtn = document.getElementById('delete-citation-btn');

    if (createBtn) {
        createBtn.addEventListener('click', createCitation);
    }

    if (historyBtn) {
        historyBtn.addEventListener('click', loadDriverHistory);
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', updateCitationLocation);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteCitation);
    }
});


function createCitation() {
    const token = sessionStorage.getItem('token');
    const driverId = document.getElementById('create-driver-id').value;

    const citationData = {
        OfficerID: Number(document.getElementById('create-officer-id').value),
        VehicleID: Number(document.getElementById('create-vehicle-id').value),
        ViolationTypesID: Number(document.getElementById('create-violation-type-id').value),
        Violation_Date: document.getElementById('create-violation-date').value,
        Violation_Time: document.getElementById('create-violation-time').value,
        Violation_Street: document.getElementById('create-street').value,
        Violation_City: document.getElementById('create-city').value,
        Violation_District: document.getElementById('create-district').value,
        Violation_Detachment: document.getElementById('create-detachment').value
    };

    fetch(API_URL + '/drivers/' + driverId + '/notices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(citationData)
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message || 'Citation created successfully');
        loadAdminStats();
    })
    .catch(error => {
        console.error(error);
        showToast('Could not create citation');
    });
}


function loadDriverHistory() {
    const token = sessionStorage.getItem('token');
    const driverId = document.getElementById('history-driver-id').value;
    const results = document.getElementById('driver-history-results');

    results.innerHTML = 'Loading...';

    fetch(API_URL + '/drivers/' + driverId + '/notices', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        results.innerHTML = '';

        if (!Array.isArray(data)) {
            results.innerHTML = '<p>No history found.</p>';
            return;
        }

        data.forEach(notice => {
            results.innerHTML += `
                <div style="border:1px solid #ccc; padding:10px; margin:10px 0;">
                    <p><strong>Notice ID:</strong> ${notice.NoticeID}</p>
                    <p><strong>Driver:</strong> ${notice.Driver_First_Name} ${notice.Driver_Last_Name}</p>
                    <p><strong>Violation:</strong> ${notice.Violation_Name}</p>
                    <p><strong>Date:</strong> ${notice.Violation_Date}</p>
                    <p><strong>Time:</strong> ${notice.Violation_Time}</p>
                    <p><strong>Street:</strong> ${notice.Violation_Street}</p>
                    <p><strong>City:</strong> ${notice.Violation_City}</p>
                    <p><strong>District:</strong> ${notice.Violation_District}</p>
                    <p><strong>Detachment:</strong> ${notice.Violation_Detachment}</p>
                    <p><strong>Officer:</strong> ${notice.Officer_First_Name} ${notice.Officer_Last_Name}</p>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error(error);
        results.innerHTML = '<p>Could not load history.</p>';
    });
}


function updateCitationLocation() {
    const token = sessionStorage.getItem('token');
    const noticeId = document.getElementById('update-notice-id').value;

    const updateData = {
        Violation_Street: document.getElementById('update-street').value,
        Violation_City: document.getElementById('update-city').value,
        Violation_District: document.getElementById('update-district').value,
        Violation_Detachment: document.getElementById('update-detachment').value
    };

    fetch(API_URL + '/notices/' + noticeId + '/location', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(updateData)
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message || 'Citation updated successfully');
        loadAdminStats();
    })
    .catch(error => {
        console.error(error);
        showToast('Could not update citation');
    });
}


function deleteCitation() {
    const token = sessionStorage.getItem('token');
    const noticeId = document.getElementById('delete-notice-id').value;

    if (!confirm('Are you sure you want to delete this citation?')) {
        return;
    }

    fetch(API_URL + '/notices/' + noticeId, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        showToast(data.message || 'Citation deleted successfully');
        loadAdminStats();
    })
    .catch(error => {
        console.error(error);
        showToast('Could not delete citation');
    });
}


function loadUserProfile() {

    const token = sessionStorage.getItem('token');

    fetch(API_URL + '/profile', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(user => {

        document.getElementById('profile-username').textContent =
            user.username;

        document.getElementById('profile-full-name').textContent =
            user.full_name;

        document.getElementById('profile-dob').textContent =
            user.date_of_birth;

        document.getElementById('profile-licence').textContent =
            user.licence_number;

        document.getElementById('profile-vehicle').textContent =
            user.vehicle_registration;

        document.getElementById('profile-email').value =
            user.email;

        document.getElementById('profile-phone').value =
            user.phone;
    })
    .catch(error => {
        console.error(error);
        showToast('Could not load profile');
    });
}


function updateUserProfile() {

    const token = sessionStorage.getItem('token');

    const email = document.getElementById('profile-email').value;
    const phone = document.getElementById('profile-phone').value;

    if (!email || !phone) {
        document.getElementById('profile-message').textContent =
            'Email and phone are required.';
        return;
    }

    fetch(API_URL + '/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            email: email,
            phone: phone
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('profile-message').textContent =
            data.message || 'Profile updated.';

        showToast('Profile updated successfully');
    })
    .catch(error => {
        console.error(error);
        showToast('Could not update profile');
    });
}


document.addEventListener('DOMContentLoaded', function () {

    const updateProfileBtn =
        document.getElementById('update-profile-btn');

    if (updateProfileBtn) {
        updateProfileBtn.addEventListener(
            'click',
            updateUserProfile
        );
    }
});


function loadMyNotices() {

    const token = sessionStorage.getItem('token');

    const list =
        document.getElementById('my-notices-list');

    if (!list) {
        return;
    }

    list.innerHTML = 'Loading citations...';

    fetch(API_URL + '/my-notices', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(notices) {

        list.innerHTML = '';

        if (!Array.isArray(notices) || notices.length === 0) {
            list.innerHTML = '<p>No citations found for your vehicle.</p>';
            return;
        }

        notices.forEach(function(notice) {

            list.innerHTML += `
                <div style="border:1px solid #ccc; padding:12px; margin:12px 0;">
                    <p><strong>Notice Number:</strong> ${notice.NoticeID}</p>
                    <p><strong>Date:</strong> ${notice.Violation_Date}</p>
                    <p><strong>Time:</strong> ${notice.Violation_Time}</p>
                    <p><strong>Location:</strong> ${notice.Violation_Street}, ${notice.Violation_City}</p>
                    <p><strong>District:</strong> ${notice.Violation_District}</p>
                    <p><strong>Detachment:</strong> ${notice.Violation_Detachment}</p>
                    <p><strong>Violation:</strong> ${notice.Violation_Name}</p>
                    <p><strong>Description:</strong> ${notice.Violation_Description}</p>
                    <p><strong>Officer:</strong> ${notice.Officer_First_Name} ${notice.Officer_Last_Name}</p>
                    <p><strong>Vehicle:</strong> ${notice.Vehicles_Licence_Number} - ${notice.Make} ${notice.Type}</p>
                    <p><strong>Status:</strong> Issued</p>
                </div>
            `;
        });
    })
    .catch(function(error) {
        console.error(error);
        list.innerHTML = '<p>Could not load citations.</p>';
    });
}
