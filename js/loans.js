function createLoanRow(loan) {
    const book = getLoanBook(loan);
    const loanId = getLoanId(loan);
    const status = getLoanStatus(loan);
    const returned = status.toLowerCase() === "returned";
    const statusClass = status.toLowerCase() === "overdue"
        ? "status-overdue"
        : returned
            ? "status-returned"
            : "status-active";
    const button = returned
        ? "<button type=\"button\" class=\"btn btn-secondary btn-sm\" disabled>Returned</button>"
        : "<button type=\"button\" class=\"btn btn-success btn-sm return-btn\" data-loan-id=\"" + escapeHtml(String(loanId || "")) + "\">Return</button>";

    return "<tr>" +
        "<td><strong>" + escapeHtml(getBookTitle(book)) + "</strong><br><small style=\"color:#666;\">ISBN: " + escapeHtml(getBookIsbn(book)) + "</small></td>" +
        "<td>" + escapeHtml(getBookAuthor(book)) + "</td>" +
        "<td>" + escapeHtml(formatDate(getLoanDate(loan))) + "</td>" +
        "<td class=\"" + statusClass + "\"><span class=\"status " + statusClass + "\">" + escapeHtml(status) + "</span></td>" +
        "<td>" + button + "</td>" +
        "</tr>";
}

function isOpenLoan(loan) {
    const status = getLoanStatus(loan).toLowerCase();
    return status === "active" || status === "overdue";
}

async function loadLoansPage() {
    const tbody = document.getElementById("loansTableBody");
    const totalElement = document.getElementById("totalLoans");
    const activeElement = document.getElementById("activeLoanCount");
    const returnedElement = document.getElementById("returnedLoanCount");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-center\">Loading loans...</td></tr>";

    try {
        const loans = await getMyLoans();
        const activeLoans = loans.filter(isOpenLoan);
        const returnedLoans = loans.filter(function(loan) {
            return getLoanStatus(loan).toLowerCase() === "returned";
        });

        if (loans.length) {
            tbody.innerHTML = loans.map(createLoanRow).join("");
        } else {
            tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-center\">You have no loans.</td></tr>";
        }

        if (totalElement) {
            totalElement.textContent = "Total: " + loans.length + " loan" + (loans.length === 1 ? "" : "s");
        }
        if (activeElement) {
            activeElement.textContent = activeLoans.length;
        }
        if (returnedElement) {
            returnedElement.textContent = returnedLoans.length;
        }
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-center\">Unable to load your loans.</td></tr>";
        showPageMessage(error.message || "Unable to load your loans.", "error");
    }
}

async function handleReturn(loanId, button) {
    if (!loanId) {
        showPageMessage("Loan id is missing. Please refresh the page.", "error");
        return;
    }

    const originalText = button ? button.textContent : "Return";
    if (button) {
        button.disabled = true;
        button.textContent = "Returning...";
    }

    try {
        await returnBook(loanId);
        markBooksDirty();
        showPageMessage("Book returned successfully.", "success");
        await loadLoansPage();
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        showPageMessage(error.message || "Unable to return this book.", "error");
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    if (!protectPage()) {
        return;
    }
    const tbody = document.getElementById("loansTableBody");
    if (tbody) {
        tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-center\">Loading loans...</td></tr>";
    }
    try {
        await setupUserInfo();
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        showPageMessage(error.message || "Unable to load user information.", "error");
    }
    document.addEventListener("click", function(event) {
        const button = event.target.closest(".return-btn");
        if (!button) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
        }
        handleReturn(button.getAttribute("data-loan-id"), button);
    }, true);

    await loadLoansPage();
});
