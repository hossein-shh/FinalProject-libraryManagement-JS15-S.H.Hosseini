function isAuthenticated() {
    return Boolean(getToken());
}

function redirectToLogin() {
    window.location.replace("login.html");
}

function redirectToDashboard() {
    window.location.replace("dashboard.html");
}

function protectPage() {
    if (!isAuthenticated()) {
        redirectToLogin();
        return false;
    }
    return true;
}

function protectLoginPage() {
    if (isAuthenticated()) {
        redirectToDashboard();
        return false;
    }
    return true;
}

function logout() {
    clearToken();
    localStorage.removeItem("library_books_cache");
    redirectToLogin();
}

function setupLogoutLinks() {
    const links = document.querySelectorAll('a[href="login.html"]');
    links.forEach(function(link) {
        if (link.textContent.trim().toLowerCase() === "logout") {
            link.addEventListener("click", function(event) {
                event.preventDefault();
                logout();
            });
        }
    });
}
