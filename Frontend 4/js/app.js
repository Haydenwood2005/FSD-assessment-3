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

            break;

        case 'user-profile':

            setBreadcrumb([
                { label: 'User' },
                { label: 'Profile' }
            ]);

            break;

        case 'admin-dash':

            setBreadcrumb([
                { label: 'Admin' },
                { label: 'Dashboard' }
            ]);

            loadOfficerDashboard();

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

        // OFFICER LOGIN
        if (username === 'officer_user') {

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

            return;
        }

        // CITIZEN LOGIN
        if (username === 'citizen_user') {

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


async function loadOfficerDashboard() {

    try {

        const [totalRes, violationRes, districtRes] = await Promise.all([
            fetch(API_URL + "/stats/total-citations"),
            fetch(API_URL + "/stats/by-violation"),
            fetch(API_URL + "/stats/by-district")
        ]);

        const total = await totalRes.json();
        const violations = await violationRes.json();
        const districts = await districtRes.json();

        // TOTAL
        document.getElementById("total-citations").innerHTML =
            `<h3>Total Citations: ${total.total}</h3>`;

        // VIOLATIONS TABLE
        document.getElementById("violation-chart").innerHTML =
            violations.map(v =>
                `<p>${v.Violation_Name}: ${v.total}</p>`
            ).join("");

        // DISTRICT TABLE
        document.getElementById("district-chart").innerHTML =
            districts.map(d =>
                `<p>${d.Violation_District}: ${d.total}</p>`
            ).join("");

    } catch (err) {
        console.error(err);
    }
}