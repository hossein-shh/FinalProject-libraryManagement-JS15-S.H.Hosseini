function createBookCard(book) {
    const id = getBookId(book);
    const availableCopies = getAvailableCopies(book);
    const available = availableCopies > 0;
    const statusClass = available ? "status-available" : "status-unavailable";
    const statusText = available ? "Available" : "Unavailable";
    const borrowButton = available
        ? "<button class=\"btn btn-primary btn-sm borrow-btn\" data-book-id=\"" + escapeHtml(id) + "\">Borrow Book</button>"
        : "<button class=\"btn btn-secondary btn-sm\" disabled>Not Available</button>";
    return "<div class=\"card book-card\">" +
        "<div style=\"display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;gap:1rem;\">" +
        "<h3 style=\"margin:0;color:#2c3e50;\">" + escapeHtml(getBookTitle(book)) + "</h3>" +
        "<span class=\"status " + statusClass + "\">" + statusText + "</span>" +
        "</div>" +
        "<p style=\"color:#666;margin-bottom:0.5rem;\"><strong>Author:</strong> " + escapeHtml(getBookAuthor(book)) + "</p>" +
        "<p style=\"color:#666;margin-bottom:0.5rem;\"><strong>ISBN:</strong> " + escapeHtml(getBookIsbn(book)) + "</p>" +
        "<p style=\"color:#666;margin-bottom:0.5rem;\"><strong>Category:</strong> " + escapeHtml(getBookCategory(book)) + "</p>" +
        "<p style=\"color:#666;margin-bottom:1rem;\"><strong>Available Copies:</strong> " + availableCopies + "</p>" +
        "<p style=\"margin-bottom:1rem;font-size:0.9rem;color:#555;\">" + escapeHtml(getBookDescription(book)) + "</p>" +
        "<div style=\"display:flex;gap:0.5rem;flex-wrap:nowrap;align-items:center;\">" +
        borrowButton +
        "<button class=\"btn btn-secondary btn-sm details-btn\" data-book-id=\"" + escapeHtml(id) + "\">View Details</button>" +
        "</div></div>";
}

function renderBooks(books, container) {
    if (!books.length) {
        container.innerHTML = "<div class=\"card\"><p>No books were found.</p></div>";
        return;
    }
    container.innerHTML = books.map(createBookCard).join("");
}

async function showBookDetails(bookId) {
    const response = await apiRequest("/books/" + encodeURIComponent(bookId));
    let book = null;
    if (response) {
        if (response.book) {
            book = response.book;
        } else if (response.data && response.data.book) {
            book = response.data.book;
        } else if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
            book = response.data;
        } else {
            book = response;
        }
    }
    book = book || {};
    let categoryText = getBookCategory(book);
    if (categoryText === "Uncategorized") {
        try {
            const list = await getBooksWithCache();
            const fromList = list.find(function(item) {
                return String(getBookId(item)) === String(bookId);
            });
            if (fromList) {
                const fromListCategory = getBookCategory(fromList);
                if (fromListCategory !== "Uncategorized") {
                    categoryText = fromListCategory;
                }
                if (!getBookTitle(book) || getBookTitle(book) === "Untitled") {
                    book = Object.assign({}, fromList, book);
                }
            }
        } catch (e) {}
    }
    openBookDetailsModal(book, categoryText);
}

function openBookDetailsModal(book, categoryText) {
    const modal = document.getElementById("bookDetailsModal");
    const body = document.getElementById("bookModalBody");
    const titleEl = document.getElementById("bookModalTitle");
    if (!modal || !body) {
        return;
    }
    if (titleEl) {
        titleEl.textContent = getBookTitle(book);
    }
    body.innerHTML =
        "<div class=\"detail-row\"><strong>Author:</strong> " + escapeHtml(getBookAuthor(book)) + "</div>" +
        "<div class=\"detail-row\"><strong>ISBN:</strong> " + escapeHtml(getBookIsbn(book)) + "</div>" +
        "<div class=\"detail-row\"><strong>Category:</strong> " + escapeHtml(categoryText) + "</div>" +
        "<div class=\"detail-row\"><strong>Publication Year:</strong> " + escapeHtml(String(getBookYear(book))) + "</div>" +
        "<div class=\"detail-row\"><strong>Tags:</strong> " + escapeHtml(getBookTags(book)) + "</div>" +
        "<div class=\"detail-row\"><strong>Available Copies:</strong> " + escapeHtml(String(getAvailableCopies(book))) + "</div>" +
        "<div class=\"detail-row\"><strong>Description:</strong> " + escapeHtml(getBookDescription(book)) + "</div>";
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeBookDetailsModal() {
    const modal = document.getElementById("bookDetailsModal");
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function setupBookDetailsModal() {
    const modal = document.getElementById("bookDetailsModal");
    if (!modal || modal.dataset.ready === "1") {
        return;
    }
    modal.dataset.ready = "1";
    modal.addEventListener("click", function(event) {
        const target = event.target;
        if (
            target === modal ||
            target.classList.contains("modal-backdrop") ||
            target.closest("[data-close-modal]")
        ) {
            if (target.closest(".modal-dialog") && !target.closest("[data-close-modal]")) {
                return;
            }
            event.preventDefault();
            closeBookDetailsModal();
        }
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeBookDetailsModal();
        }
    });
}

async function handleBorrow(bookId, button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Borrowing...";
    try {
        const loans = await getMyLoans();
        const currentLoans = loans.filter(function(loan) {
            return getLoanStatus(loan).toLowerCase() !== "returned";
        });
        if (currentLoans.length >= 4) {
            showPageMessage("You can borrow a maximum of 4 books at a time.", "error");
            button.disabled = false;
            button.textContent = originalText;
            return;
        }
        await borrowBook(bookId);
        markBooksDirty();
        showPageMessage("Book borrowed successfully.", "success");
        await loadBooksPage(true);
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        showPageMessage(error.message || "Unable to borrow this book.", "error");
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function loadBooksPage(forceRefresh) {
    const container = document.getElementById("booksGrid");
    container.innerHTML = "<div class=\"card\"><p>Loading books...</p></div>";
    try {
        const shouldRefresh = forceRefresh || consumeBooksDirty();
        const books = shouldRefresh ? await getBooksFresh() : await getBooksWithCache();
        renderBooks(books, container);
    } catch (error) {
        if (error.status === 401) {
            clearToken();
            redirectToLogin();
            return;
        }
        container.innerHTML = "<div class=\"card\"><p>Unable to load books.</p></div>";
        showPageMessage(error.message || "Unable to load books.", "error");
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    if (!protectPage()) {
        return;
    }
    setupBookDetailsModal();
    setupUserInfo().catch(function(error) {
        if (error.status !== 401) {
            showPageMessage(error.message || "Unable to load user information.", "error");
        }
    });
    const container = document.getElementById("booksGrid");
    container.addEventListener("click", async function(event) {
        const borrowButton = event.target.closest(".borrow-btn");
        const detailsButton = event.target.closest(".details-btn");
        if (borrowButton) {
            await handleBorrow(borrowButton.dataset.bookId, borrowButton);
            return;
        }
        if (detailsButton) {
            detailsButton.disabled = true;
            detailsButton.textContent = "Loading...";
            try {
                await showBookDetails(detailsButton.dataset.bookId);
            } catch (error) {
                if (error.status === 401) {
                    clearToken();
                    redirectToLogin();
                    return;
                }
                showPageMessage(error.message || "Unable to load book details.", "error");
            }
            detailsButton.disabled = false;
            detailsButton.textContent = "View Details";
        }
    });
    await loadBooksPage();
    window.addEventListener("pageshow", function() {
        loadBooksPage(true);
    });
});
