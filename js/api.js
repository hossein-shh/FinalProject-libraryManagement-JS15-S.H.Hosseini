const API_BASE_URL = "https://haditabatabaei.dev/api";

function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        if (cookie.startsWith(name + "=")) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return null;
}

function setCookie(name, value, seconds) {
    document.cookie = name + "=" + encodeURIComponent(value) + "; path=/; max-age=" + seconds + "; SameSite=Lax";
}

function removeCookie(name) {
    document.cookie = name + "=; path=/; max-age=0; SameSite=Lax";
}

function getToken() {
    return getCookie("library_token");
}

function saveToken(token) {
    setCookie("library_token", token, 86400);
}

function clearToken() {
    removeCookie("library_token");
}

async function apiRequest(endpoint, options) {
    options = options || {};
    const headers = options.headers || {};
    headers.Accept = "application/json";
    const token = getToken();
    if (token) {
        headers.Authorization = "Bearer " + token;
    }
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(API_BASE_URL + endpoint, {
        method: options.method || "GET",
        headers: headers,
        body: options.body
    });
    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }
    if (!response.ok) {
        const message = data && (data.message || data.detail || data.error);
        const error = new Error(message || "Request failed. Status: " + response.status);
        error.status = response.status;
        throw error;
    }
    return data;
}

function getArray(data, key) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && Array.isArray(data[key])) {
        return data[key];
    }
    if (data && data.data && Array.isArray(data.data)) {
        return data.data;
    }
    if (data && data.data && Array.isArray(data.data[key])) {
        return data.data[key];
    }
    return [];
}

function getTokenFromResponse(data) {
    if (!data) {
        return null;
    }
    if (typeof data.token === "string") {
        return data.token;
    }
    if (typeof data.access_token === "string") {
        return data.access_token;
    }
    if (typeof data.accessToken === "string") {
        return data.accessToken;
    }
    if (data.data) {
        if (typeof data.data.token === "string") {
            return data.data.token;
        }
        if (typeof data.data.access_token === "string") {
            return data.data.access_token;
        }
    }
    return null;
}

function getUser(data) {
    if (data && data.user) {
        return data.user;
    }
    if (data && data.data && data.data.user) {
        return data.data.user;
    }
    if (data && data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
        return data.data;
    }
    return data || {};
}

function getUserName(user) {
    if (!user) {
        return "Student";
    }
    const firstName = user.firstName || user.first_name || "";
    const lastName = user.lastName || user.last_name || "";
    const fullName = (firstName + " " + lastName).trim();
    return user.name || user.fullName || user.full_name || user.displayName || user.display_name || fullName || user.studentName || user.student_name || "Student";
}

function getUserId(user) {
    if (!user) return null;
    return user.id || user._id || user.userId || user.user_id || null;
}

function getBookId(book) {
    return book.id || book._id || book.bookId || book.book_id;
}

function getBookTitle(book) {
    return book.title || book.name || book.bookTitle || "Untitled Book";
}

function getBookAuthor(book) {
    return book.author || book.authorName || book.author_name || "Unknown Author";
}

function getBookIsbn(book) {
    return book.isbn || book.ISBN || "N/A";
}

function getBookCategory(book) {
    const category = book.category || book.categoryName || book.category_name;
    if (category && typeof category === "object") {
        return category.name || category.title || category.label || category.categoryName || "Uncategorized";
    }
    return category || "Uncategorized";
}

function getBookYear(book) {
    return book.publishedYear || book.published_year || book.publicationYear || book.publication_year || book.publishYear || book.publish_year || book.year || "N/A";
}

function getBookTags(book) {
    const tags = book.tags || book.tag || [];
    if (Array.isArray(tags)) {
        return tags.map(function(tag) {
            if (tag && typeof tag === "object") {
                return tag.name || tag.title || tag.label || "";
            }
            return String(tag);
        }).filter(function(tag) {
            return tag;
        }).join(", ");
    }
    if (tags && typeof tags === "object") {
        return tags.name || tags.title || tags.label || "N/A";
    }
    return tags ? String(tags) : "N/A";
}

function getAvailableCopies(book) {
    const value = book.availableCopies ?? book.available_copies ?? book.copiesAvailable ?? book.available;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function getBookDescription(book) {
    return book.description || book.summary || "No description available.";
}

function getLoanBook(loan) {
    if (loan.book) {
        return loan.book;
    }
    return {
        id: loan.bookId || loan.book_id,
        title: loan.bookTitle || loan.book_title || loan.title,
        author: loan.bookAuthor || loan.book_author || loan.author,
        isbn: loan.bookIsbn || loan.book_isbn || loan.isbn
    };
}

function getLoanId(loan) {
    return loan.id || loan._id || loan.loanId || loan.loan_id;
}

function getLoanDate(loan) {
    return loan.loanDate || loan.loan_date || loan.borrowedAt || loan.borrowed_at || loan.createdAt || loan.created_at || "";
}

function getLoanStatus(loan) {
    const status = String(loan.status || "").toLowerCase();
    if (status.includes("return") || loan.returned === true || loan.isReturned === true || loan.is_returned === true) {
        return "Returned";
    }
    if (status.includes("overdue")) {
        return "Overdue";
    }
    const loanDate = getLoanDate(loan);
    if (loanDate) {
        const dueDate = new Date(loanDate);
        // dueDate.setDate(dueDate.getDate() + 14);
        dueDate.setSeconds(dueDate.getSeconds() + 10);
        if (Date.now() > dueDate.getTime()) {
            return "Overdue";
        }
    }
    return "Active";
}

function formatDate(value) {
    if (!value) {
        return "N/A";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showAlert(container, message, type) {
    if (!container) {
        return;
    }
    container.innerHTML = "<div class=\"alert alert-" + (type || "error") + "\">" + escapeHtml(message) + "</div>";
}

function showPageMessage(message, type) {
    let container = document.getElementById("page-alert");
    if (!container) {
        container = document.createElement("div");
        container.id = "page-alert";
        container.className = "container";
        container.style.marginTop = "1rem";
        const main = document.querySelector(".main-content");
        if (main) {
            main.prepend(container);
        } else {
            document.body.prepend(container);
        }
    }
    showAlert(container, message, type || "error");
}

async function getCurrentUser() {
    return getUser(await apiRequest("/auth/me"));
}

async function getBooks() {
    return getArray(await apiRequest("/books"), "books");
}

async function getMyLoans() {
    return getArray(await apiRequest("/loans/my-loans"), "loans");
}

function getCachedBooks() {
    const saved = localStorage.getItem("library_books_cache");
    if (!saved) {
        return null;
    }
    try {
        const cache = JSON.parse(saved);
        if (Date.now() - cache.timestamp >= 5 * 60 * 1000) {
            localStorage.removeItem("library_books_cache");
            return null;
        }
        return Array.isArray(cache.books) ? cache.books : null;
    } catch (error) {
        localStorage.removeItem("library_books_cache");
        return null;
    }
}

function clearBooksCache() {
    localStorage.removeItem("library_books_cache");
}

function markBooksDirty() {
    clearBooksCache();
    try {
        sessionStorage.setItem("library_books_dirty", "1");
    } catch (e) {}
}

function consumeBooksDirty() {
    try {
        if (sessionStorage.getItem("library_books_dirty") === "1") {
            sessionStorage.removeItem("library_books_dirty");
            return true;
        }
    } catch (e) {}
    return false;
}

function saveBooksToCache(books) {
    localStorage.setItem("library_books_cache", JSON.stringify({
        timestamp: Date.now(),
        books: books
    }));
}

async function getBooksFresh() {
    clearBooksCache();
    const books = await getBooks();
    saveBooksToCache(books);
    return books;
}

async function getBooksWithCache() {
    const cachedBooks = getCachedBooks();
    if (cachedBooks) {
        return cachedBooks;
    }
    const books = await getBooks();
    saveBooksToCache(books);
    return books;
}

async function borrowBook(bookId) {
    if (bookId === undefined || bookId === null || String(bookId).trim() === "") {
        throw new Error("Book id is missing. Please refresh the page and try again.");
    }
    const id = String(bookId).trim();
    const user = await getCurrentUser();
    const userId = getUserId(user);
    if (!userId) {
        throw new Error("User id is missing. Please login again.");
    }
    const payload = {
        bookId: id,
        userId: String(userId)
    };
    return apiRequest("/loans", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

async function returnBook(loanId) {
    return apiRequest("/loans/" + encodeURIComponent(loanId) + "/return", {
        method: "POST"
    });
}
