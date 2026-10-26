const $ = id => document.getElementById(id);

const authPage = $("authPage");
const dashboard = $("dashboard");

let currentUser = null;
let transactions = [];
let budget = 0;

// Date defaults
$("date").value = new Date().toLocaleDateString("en-CA");
$("monthFilter").value = new Date().toISOString().slice(0, 7);

// Load data safely for the current browser
function loadUserData() {
    const allData = JSON.parse(
        localStorage.getItem("expenseTrackerData") || "{}"
    );

    const userData = allData[currentUser] || {
        transactions: [],
        budget: 0
    };

    transactions = userData.transactions || [];
    budget = Number(userData.budget) || 0;
}

function saveData() {
    const allData = JSON.parse(
        localStorage.getItem("expenseTrackerData") || "{}"
    );

    allData[currentUser] = {
        transactions,
        budget
    };

    localStorage.setItem(
        "expenseTrackerData",
        JSON.stringify(allData)
    );
}

// Signup and demo login accounts
function getAccounts() {
    return JSON.parse(
        localStorage.getItem("expenseTrackerAccounts") || "{}"
    );
}

function saveAccounts(accounts) {
    localStorage.setItem(
        "expenseTrackerAccounts",
        JSON.stringify(accounts)
    );
}

// Switch between Login and Signup
$("showSignup").addEventListener("click", event => {
    event.preventDefault();
    $("loginForm").classList.add("hidden");
    $("showSignup").parentElement.classList.add("hidden");
    $("signupForm").classList.remove("hidden");
});

$("showLogin").addEventListener("click", event => {
    event.preventDefault();
    $("signupForm").classList.add("hidden");
    $("loginForm").classList.remove("hidden");
    $("showSignup").parentElement.classList.remove("hidden");
});

// Create account
$("signupForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("name").value.trim();
    const email = $("signupEmail").value.trim().toLowerCase();
    const password = $("signupPassword").value;

    if (!name || !email || password.length < 6) {
        alert("Please enter valid account details.");
        return;
    }

    const accounts = getAccounts();

    if (accounts[email]) {
        alert("Account already exists. Please login.");
        return;
    }

    // Demo only: never store real passwords this way.
    accounts[email] = { name, password };

    saveAccounts(accounts);

    alert("Account created! Please login.");

    $("signupForm").reset();
    $("signupForm").classList.add("hidden");
    $("loginForm").classList.remove("hidden");
    $("showSignup").parentElement.classList.remove("hidden");

    $("email").value = email;
});

// Login
$("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;
    const accounts = getAccounts();

    if (!accounts[email] || accounts[email].password !== password) {
        alert("Incorrect email or password. Please sign up first.");
        return;
    }

    currentUser = email;

    $("welcomeName").textContent = accounts[email].name;

    loadUserData();

    authPage.classList.add("hidden");
    dashboard.classList.remove("hidden");

    render();
});

// Logout
$("logoutBtn").addEventListener("click", () => {
    currentUser = null;
    transactions = [];
    budget = 0;

    dashboard.classList.add("hidden");
    authPage.classList.remove("hidden");

    $("loginForm").reset();
});

// Add a transaction
$("transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const amount = Number($("amount").value);
    const type = $("type").value;
    const category = $("category").value;
    const description = $("description").value.trim();
    const date = $("date").value;

    if (!Number.isFinite(amount) || amount <= 0 ||
        !description || !date) {
        alert("Please enter valid transaction details.");
        return;
    }

    transactions.unshift({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random(),
        amount,
        type,
        category,
        description,
        date
    });

    saveData();
    $("transactionForm").reset();
    $("date").value = new Date().toLocaleDateString("en-CA");

    render();
});

// Set monthly budget
$("budgetForm").addEventListener("submit", event => {
    event.preventDefault();

    const value = Number($("budget").value);

    if (!Number.isFinite(value) || value <= 0) {
        alert("Enter a valid budget.");
        return;
    }

    budget = value;
    saveData();
    render();
    $("budget").value = "";
});

// Filters
$("monthFilter").addEventListener("change", render);
$("typeFilter").addEventListener("change", render);

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(value);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Render dashboard
function render() {
    const month = $("monthFilter").value;

    const monthlyTransactions = transactions.filter(t =>
        t.date.startsWith(month)
    );

    const income = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    $("balance").textContent = money(income - expense);
    $("income").textContent = money(income);
    $("expense").textContent = money(expense);

    // Monthly budget
    const monthlyExpense = monthlyTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    if (budget > 0) {
        const percent = monthlyExpense / budget * 100;

        $("budgetInfo").textContent =
            `${money(monthlyExpense)} spent out of ${money(budget)} ` +
            `(${percent.toFixed(1)}%)`;

        $("budgetProgress").style.width =
            Math.min(percent, 100) + "%";

        $("budgetProgress").style.background =
            percent >= 100 ? "#e64d5c" : "#18b784";

        if (percent >= 100) {
            $("budgetInfo").textContent +=
                " — Budget limit reached!";
        }
    } else {
        $("budgetInfo").textContent = "No budget set yet.";
        $("budgetProgress").style.width = "0%";
    }

    // Transaction list
    const typeFilter = $("typeFilter").value;

    const filtered = monthlyTransactions.filter(t =>
        typeFilter === "all" || t.type === typeFilter
    );

    if (filtered.length === 0) {
        $("transactions").innerHTML =
            "<p>No transactions found for this filter.</p>";
    } else {
        $("transactions").innerHTML = filtered.map(t => `
            <div class="transaction">
                <div>
                    <strong>${escapeHTML(t.category)}</strong>
                    <p>${escapeHTML(t.description)}</p>
                    <p>${escapeHTML(t.date)}</p>
                </div>

                <div class="money">
                    <strong class="${t.type === "income" ? "positive" : "negative"}">
                        ${t.type === "income" ? "+" : "-"}${money(t.amount)}
                    </strong>
                    <br>
                    <button class="delete-btn"
                        data-delete="${escapeHTML(t.id)}">
                        Delete
                    </button>
                </div>
            </div>
        `).join("");
    }

    // Category-wise expense summary
    const categoryTotals = {};

    monthlyTransactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            categoryTotals[t.category] =
                (categoryTotals[t.category] || 0) + t.amount;
        });

    const categories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

    $("summary").innerHTML = categories.length
        ? categories.map(([category, total]) => `
            <div class="category-row">
                <span>${escapeHTML(category)}</span>
                <strong>${money(total)}</strong>
            </div>
        `).join("")
        : "<p>No expenses recorded for this month.</p>";
}

// Delete a transaction
$("transactions").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const id = button.dataset.delete;

    if (!confirm("Delete this transaction?")) return;

    transactions = transactions.filter(t => t.id !== id);

    saveData();
    render();
});