document.addEventListener("DOMContentLoaded", async function() {
    if (!protectPage()) {
        return;
    }

    const activeLoansElement = document.getElementById("activeLoans");
    const availableBooksElement = document.getElementById("availableBooks");

    async function loadDashboardStats() {
        await setupUserInfo();
        const books = await getBooksFresh();
        const loans = await getMyLoans();
        const activeLoans = loans.filter(function(loan) {
            const status = getLoanStatus(loan).toLowerCase();
            // کتاب هنوز دست کاربر است (فعال یا سررسیدشده)
            return status === "active" || status === "overdue";
        }).length;
        const availableBooks = books.filter(function(book) {
            return getAvailableCopies(book) > 0;
        }).length;
        activeLoansElement.textContent = activeLoans;
        availableBooksElement.textContent = availableBooks;
    }
    try {
        await loadDashboardStats();
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        showPageMessage(error.message || "Unable to load dashboard data.", "error");
    }
    window.addEventListener("pageshow", function(event) {
        if (event.persisted) {
            loadDashboardStats().catch(function() {});
        }
    });
});
