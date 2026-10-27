document.addEventListener("DOMContentLoaded", async function() {
    if (!protectPage()) {
        return;
    }
    const activeLoansElement = document.getElementById("activeLoans");
    const availableBooksElement = document.getElementById("availableBooks");

    function readStatsFromUser(user) {
        if (!user || typeof user !== "object") {
            return null;
        }
        const stats = user.stats || user.statistics || {};
        const active =
            stats.activeLoans ?? stats.active_loans ?? stats.activeLoanCount ??
            user.activeLoans ?? user.active_loans;
        const available =
            stats.availableBooks ?? stats.available_books ?? stats.availableBookCount ??
            user.availableBooks ?? user.available_books;
        if (active === undefined && available === undefined) {
            return null;
        }
        return {
            active: active !== undefined && active !== null ? Number(active) : null,
            available: available !== undefined && available !== null ? Number(available) : null
        };
    }

    async function loadDashboardStats() {
        const user = await setupUserInfo();
        const fromStats = readStatsFromUser(user);
        let activeLoans;
        let availableBooks;
        if (fromStats && fromStats.active !== null && Number.isFinite(fromStats.active) &&
            fromStats.available !== null && Number.isFinite(fromStats.available)) {
            activeLoans = fromStats.active;
            availableBooks = fromStats.available;
        } else {
            const books = await getBooksWithCache();
            const loans = await getMyLoans();
            activeLoans = loans.filter(function(loan) {
                const status = getLoanStatus(loan).toLowerCase();
                return status === "active" || status === "overdue";
            }).length;
            availableBooks = books.filter(function(book) {
                return getAvailableCopies(book) > 0;
            }).length;

            if (fromStats) {
                if (fromStats.active !== null && Number.isFinite(fromStats.active)) {
                    activeLoans = fromStats.active;
                }
                if (fromStats.available !== null && Number.isFinite(fromStats.available)) {
                    availableBooks = fromStats.available;
                }
            }
        }
        if (activeLoansElement) {
            activeLoansElement.textContent = activeLoans;
        }
        if (availableBooksElement) {
            availableBooksElement.textContent = availableBooks;
        }
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
