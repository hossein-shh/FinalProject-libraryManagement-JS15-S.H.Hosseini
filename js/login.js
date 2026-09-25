document.addEventListener("DOMContentLoaded", function() {
    if (!protectLoginPage()) {
        return;
    }
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const alertContainer = document.getElementById("alert-container");
    const loginText = document.getElementById("loginText");
    const loginSpinner = document.getElementById("loginSpinner");
    const submitButton = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email && !password) {
            showAlert(alertContainer, "Please enter your email and password.", "error");
            return;
        }
        if (!email) {
            showAlert(alertContainer, "Please enter your email address.", "error");
            return;
        }
        if (!password) {
            showAlert(alertContainer, "Please enter your password.", "error");
            return;
        }
        submitButton.disabled = true;
        loginText.textContent = "Logging in...";
        loginSpinner.classList.remove("hidden");
        alertContainer.innerHTML = "";
        try {
            const response = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            const token = getTokenFromResponse(response);
            if (!token) {
                throw new Error("Login succeeded but no token was returned.");
            }
            saveToken(token);
            redirectToDashboard();
        } catch (error) {
            showAlert(alertContainer, error.message || "Login failed.", "error");
        } finally {
            submitButton.disabled = false;
            loginText.textContent = "Login";
            loginSpinner.classList.add("hidden");
        }
    });
});
