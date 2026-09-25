async function setupUserInfo() {
    const user = await getCurrentUser();
    const name = getUserName(user);
    document.querySelectorAll(".user-info span").forEach(function(element) {
        element.textContent = name;
    });
    const userName = document.getElementById("userName");
    if (userName) {
        userName.textContent = name;
    }
    const studentName = document.getElementById("studentName");
    if (studentName) {
        studentName.textContent = name;
    }
    const avatar = document.getElementById("userAvatar") || document.querySelector(".user-avatar");
    if (avatar) {
        avatar.textContent = name.charAt(0).toUpperCase();
    }
    return user;
}

document.addEventListener("DOMContentLoaded", function() {
    setupLogoutLinks();
});
