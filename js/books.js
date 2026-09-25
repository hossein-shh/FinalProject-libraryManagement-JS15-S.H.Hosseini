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
    const book = response && response.book ? response.book : response && response.data ? response.data : response;
    const details = "Title: " + getBookTitle(book) +
        "\n\nAuthor: " + getBookAuthor(book) +
        "\n\nISBN: " + getBookIsbn(book) +
        "\n\nCategory: " + getBookCategory(book) +
        "\n\nPublication Year: " + getBookYear(book) +
        "\n\nTags: " + getBookTags(book) +
        "\n\nAvailable Copies: " + getAvailableCopies(book) +
        "\n\nDescription: " + getBookDescription(book);
    window.alert(details);
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
        // هر بار برگشت به این صفحه، لیست را از سرور تازه کن
        loadBooksPage(true);
    });
});
