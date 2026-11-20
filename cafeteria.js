document.addEventListener("DOMContentLoaded", function () {
    const $ = (selector) => document.querySelector(selector);

    const walletBalance = $("#wallet-balance");
    const rechargeBtn = $("#recharge-btn");
    const cartList = $("#cart-items-list");
    const cartTotal = $("#cart-total");
    const checkoutBtn = $("#checkout-btn");
    const checkoutPanel = $("#checkout-details");
    const checkoutForm = $("#checkout-form");
    const summaryBox = $("#checkout-order-summary");
    const tokenBox = $("#token-display-box");
    const tokenPlaceholder = $("#token-placeholder");

    let balance = Number(localStorage.getItem("walletBalance"));
    if (!Number.isFinite(balance) || balance < 0) balance = 500;

    let cart = {};
    try {
        cart = JSON.parse(localStorage.getItem("foodCart")) || {};
        if (!cart || typeof cart !== "object" || Array.isArray(cart)) cart = {};
    } catch {
        cart = {};
    }

    let lastToken = Number(localStorage.getItem("lastToken")) || 1000;

    function saveData() {
        localStorage.setItem("walletBalance", String(balance));
        localStorage.setItem("foodCart", JSON.stringify(cart));
        localStorage.setItem("lastToken", String(lastToken));
    }

    function getTotals() {
        return Object.values(cart).reduce((totals, item) => {
            totals.amount += Number(item.price) * Number(item.quantity);
            totals.calories += (Number(item.calories) || 0) * Number(item.quantity);
            return totals;
        }, { amount: 0, calories: 0 });
    }

    function updateWallet() {
        walletBalance.textContent = balance.toFixed(2).replace(/\.00$/, "");
        saveData();
    }

    function addToCart(food) {
        const name = food.dataset.name;
        const price = Number(food.dataset.price);
        const calories = Number(food.dataset.calories) || 0;
        const quantityInput = food.querySelector(".qty-input");
        const quantity = quantityInput ? Number(quantityInput.value) : 1;

        if (!name || !Number.isFinite(price) || price < 0) {
            alert("This menu item has incomplete price information.");
            return false;
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            alert("Please select a quantity between 1 and 10.");
            return false;
        }
        if (cart[name] && cart[name].quantity + quantity > 10) {
            alert("Maximum quantity allowed for one item is 10.");
            return false;
        }

        if (cart[name]) {
            cart[name].quantity += quantity;
        } else {
            cart[name] = { name, price, calories, quantity };
        }
        displayCart();
        return true;
    }

    function displayCart() {
        cartList.innerHTML = "";
        Object.entries(cart).forEach(([name, item]) => {
            const li = document.createElement("li");
            const details = document.createElement("span");
            details.textContent = `${item.name} x ${item.quantity} = ₹${item.price * item.quantity} (${(item.calories || 0) * item.quantity} kcal)`;

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => {
                delete cart[name];
                displayCart();
            });

            li.append(details, removeBtn);
            cartList.appendChild(li);
        });

        if (Object.keys(cart).length === 0) {
            const li = document.createElement("li");
            li.textContent = "Your cart is empty.";
            cartList.appendChild(li);
        }

        const totals = getTotals();
        cartTotal.textContent = totals.amount;
        const calorieParagraph = Array.from($("#cart-section").querySelectorAll("p"))
            .find(p => p.textContent.trim().startsWith("Total calories:"));
        if (calorieParagraph) calorieParagraph.textContent = `Total calories: ${totals.calories} kcal`;
        saveData();
    }

    $("#menu").addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button) return;
        const food = button.closest(".food-item");
        if (!food) return;

        if (button.textContent.trim() === "Add to Cart") {
            if (addToCart(food)) alert(`${food.dataset.name} added to cart.`);
        } else if (button.textContent.trim() === "Order") {
            if (addToCart(food)) {
                $("#cart-section").scrollIntoView({ behavior: "smooth" });
            }
        }
    });

    rechargeBtn.addEventListener("click", function () {
        balance += 500;
        updateWallet();
        alert(`Wallet recharged successfully. New balance: ₹${balance}`);
    });

    function renderCheckoutSummary() {
        const totals = getTotals();
        const lines = Object.values(cart).map(item =>
            `<li>${escapeHTML(item.name)} × ${item.quantity} — ₹${item.price * item.quantity}</li>`
        ).join("");
        summaryBox.innerHTML = `<h3>Order Summary</h3><ul>${lines}</ul><p><strong>Total: ₹${totals.amount}</strong></p><p>Calories: ${totals.calories} kcal</p><p>Wallet balance: ₹${balance}</p>`;
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[char]));
    }

    checkoutBtn.addEventListener("click", function () {
        if (Object.keys(cart).length === 0) {
            alert("Your cart is empty!");
            return;
        }
        const totals = getTotals();
        if (balance < totals.amount) {
            alert("Insufficient wallet balance. Please recharge your wallet.");
            return;
        }

        renderCheckoutSummary();
        checkoutPanel.classList.remove("hidden");

        const dateInput = $("#pickup-date");
        const today = new Date();
        const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 10);
        dateInput.min = localToday;
        if (!dateInput.value || dateInput.value < localToday) dateInput.value = localToday;

        checkoutPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#cancel-checkout").addEventListener("click", function () {
        checkoutPanel.classList.add("hidden");
        $("#cart-section").scrollIntoView({ behavior: "smooth" });
    });

    checkoutForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!checkoutForm.reportValidity()) return;
        if (Object.keys(cart).length === 0) {
            alert("Your cart is empty. Please add items again.");
            checkoutPanel.classList.add("hidden");
            return;
        }

        const totals = getTotals();
        if (balance < totals.amount) {
            alert("Your wallet balance is now insufficient. Please recharge and try again.");
            return;
        }

        const formData = new FormData(checkoutForm);
        const customer = {
            name: String(formData.get("customerName")).trim(),
            email: String(formData.get("customerEmail")).trim(),
            phone: String(formData.get("customerPhone")).trim(),
            pickupDate: String(formData.get("pickupDate")),
            pickupSlot: String(formData.get("pickupSlot")),
            customisation: String(formData.get("customisation") || "").trim()
        };

        lastToken += 1;
        const token = "CAF-" + lastToken;
        const counters = ["Counter 1", "Counter 2", "Counter 3"];
        const counter = counters[Math.floor(Math.random() * counters.length)];
        const order = {
            token, counter, amount: totals.amount, calories: totals.calories,
            items: { ...cart }, customer,
            date: new Date().toLocaleString()
        };

        balance -= totals.amount;
        localStorage.setItem("lastToken", String(lastToken));
        const orders = JSON.parse(localStorage.getItem("orderHistory") || "[]");
        orders.push(order);
        localStorage.setItem("orderHistory", JSON.stringify(orders));

        $("#token-number").textContent = token;
        $("#counter-allocation").textContent = counter;
        $("#confirmed-customer").textContent = customer.name;
        $("#confirmed-date").textContent = customer.pickupDate;
        $("#confirmed-time").textContent = customer.pickupSlot;
        $("#confirmed-phone").textContent = customer.phone;
        $("#confirmed-amount").textContent = totals.amount;
        tokenBox.classList.remove("hidden");
        tokenPlaceholder.classList.add("hidden");

        cart = {};
        displayCart();
        updateWallet();
        checkoutForm.reset();
        checkoutPanel.classList.add("hidden");

        alert(`ORDER CONFIRMED!\nToken: ${token}\nPickup: ${customer.pickupDate}, ${customer.pickupSlot}\nCounter: ${counter}\nAmount paid: ₹${totals.amount}`);
        $("#token-section").scrollIntoView({ behavior: "smooth" });
    });

    // Demo occupancy indicator. This is randomly simulated, not a live sensor reading.
    function updateOccupancy() {
        const occupancy = Math.floor(Math.random() * 71) + 20;
        $("#occupancy-text").textContent = occupancy + "%";
        $("#occupancy-fill").style.width = occupancy + "%";
        $("#occupancy-fill").setAttribute("role", "progressbar");
        $("#occupancy-fill").setAttribute("aria-valuemin", "0");
        $("#occupancy-fill").setAttribute("aria-valuemax", "100");
        $("#occupancy-fill").setAttribute("aria-valuenow", occupancy);
    }
    updateOccupancy();
    setInterval(updateOccupancy, 10000);

    // General contact form.
    const contactForm = $("#contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", function (event) {
            event.preventDefault();
            alert("Thank you! Your message has been submitted.");
            contactForm.reset();
        });
    }

    // Customer reviews.
    const reviewForm = $("#review-form");
    const reviewsList = $("#reviews-list");

    function displayReviews() {
        let reviews = [];
        try {
            reviews = JSON.parse(localStorage.getItem("cafeteriaReviews") || "[]");
        } catch {
            reviews = [];
        }

        reviewsList.innerHTML = "";
        if (!reviews.length) {
            const empty = document.createElement("p");
            empty.textContent = "No reviews yet. Be the first to review!";
            reviewsList.appendChild(empty);
            return;
        }

        reviews.slice().reverse().forEach(review => {
            const card = document.createElement("article");
            card.className = "review-card";

            const heading = document.createElement("h3");
            heading.textContent = `${review.name} — ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;

            const message = document.createElement("p");
            message.textContent = review.message;

            const date = document.createElement("small");
            date.textContent = review.date;

            card.append(heading, message, date);
            reviewsList.appendChild(card);
        });
    }

    if (reviewForm) {
        reviewForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!reviewForm.reportValidity()) return;

            const review = {
                name: $("#reviewer-name").value.trim(),
                rating: Number($("#review-rating").value),
                message: $("#review-message").value.trim(),
                date: new Date().toLocaleString()
            };

            let reviews = [];
            try {
                reviews = JSON.parse(localStorage.getItem("cafeteriaReviews") || "[]");
            } catch {
                reviews = [];
            }

            reviews.push(review);
            localStorage.setItem("cafeteriaReviews", JSON.stringify(reviews));
            reviewForm.reset();
            displayReviews();
            alert("Thank you! Your review has been submitted.");
        });
    }

    updateWallet();
    displayCart();
    displayReviews();
});