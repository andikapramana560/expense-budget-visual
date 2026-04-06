// State variables
let transactions = [];
let categories = [
    { name: 'Food', color: 'hsl(340, 80%, 60%)' },
    { name: 'Transport', color: 'hsl(190, 80%, 50%)' },
    { name: 'Fun', color: 'hsl(45, 90%, 55%)' }
];
let chartInstance = null;
let currentTheme = 'dark';
let spendingLimit = null;

// DOM Elements
const balanceEl = document.getElementById('total-balance');
const monthIncomeEl = document.getElementById('month-income');
const monthExpenseEl = document.getElementById('month-expense');
const monthSummaryCard = document.getElementById('month-summary-card');
const currentMonthLabel = document.getElementById('current-month-label');

const form = document.getElementById('transaction-form');
const itemNameInput = document.getElementById('item-name');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const typeInputs = document.getElementsByName('transaction-type');

const sortBySelect = document.getElementById('sort-by');
const limitInput = document.getElementById('monthly-limit');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const newCatNameInput = document.getElementById('new-cat-name');
const newCatColorInput = document.getElementById('new-cat-color');
const addCatBtn = document.getElementById('add-cat-btn');

const transactionListEl = document.getElementById('transaction-list');
const chartCanvas = document.getElementById('expenseChart');

// Initialize App
function init() {
    loadSettings();
    updateCategoryDropdown();
    
    // Set current month label
    currentMonthLabel.innerText = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    updateUI();
}

function loadSettings() {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) transactions = JSON.parse(savedTransactions);

    const savedCats = localStorage.getItem('categories');
    if (savedCats) categories = JSON.parse(savedCats);

    const savedLimit = localStorage.getItem('spendingLimit');
    if (savedLimit) {
        spendingLimit = parseFloat(savedLimit);
        limitInput.value = spendingLimit;
    }

    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme) {
        currentTheme = savedTheme;
        applyTheme();
    }
}

// Ensure settings are saved
function saveSettings() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('categories', JSON.stringify(categories));
    if (spendingLimit) localStorage.setItem('spendingLimit', spendingLimit);
    else localStorage.removeItem('spendingLimit');
    localStorage.setItem('themePreference', currentTheme);
}

// Theming
themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveSettings();
    updateChart(); // Re-render chart text colors based on theme
});

function applyTheme() {
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.innerText = '☀️';
        Chart.defaults.color = 'hsl(225, 25%, 15%)';
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.innerText = '🌙';
        Chart.defaults.color = 'hsl(225, 20%, 70%)';
    }
}

// Set Limit listener
limitInput.addEventListener('change', (e) => {
    spendingLimit = parseFloat(e.target.value) || null;
    saveSettings();
    updateUI();
});

// Category Logic
function updateCategoryDropdown() {
    categoryInput.innerHTML = '<option value="" disabled selected>Select category</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.innerText = cat.name;
        categoryInput.appendChild(option);
    });
}

function getCategoryColor(catName) {
    const cat = categories.find(c => c.name === catName);
    return cat ? cat.color : '#888'; // fallback
}

addCatBtn.addEventListener('click', () => {
    const name = newCatNameInput.value.trim();
    const color = newCatColorInput.value;
    
    if (!name) return alert('Please enter a category name');
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return alert('Category already exists');
    }

    categories.push({ name, color });
    saveSettings();
    updateCategoryDropdown();
    
    // Select newly created option
    categoryInput.value = name;
    
    newCatNameInput.value = '';
});

// Transaction Logic
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    let selectedType = 'expense';
    for(const radio of typeInputs) {
        if(radio.checked) { selectedType = radio.value; break; }
    }

    const transaction = {
        id: Math.floor(Math.random() * 100000000).toString(),
        name: itemNameInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        type: selectedType,
        date: new Date().toISOString()
    };

    transactions.push(transaction); // Add to end, sorting takes care of render order
    
    saveSettings();
    updateUI();
    
    // Reset form
    itemNameInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
});

function deleteTransaction(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveSettings();
    updateUI();
}

sortBySelect.addEventListener('change', () => updateUI());

// Update DOM and Chart
function updateUI() {
    // 1. Total Balance Calculation
    const totalBalance = transactions.reduce((acc, current) => {
        return current.type === 'income' ? acc + current.amount : acc - current.amount;
    }, 0);
    const sign = totalBalance < 0 ? '-' : '';
    balanceEl.innerText = `${sign}$${Math.abs(totalBalance).toFixed(2)}`;

    // 2. Month Totals Calculation
    const now = new Date();
    const currentMonthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    let monthIncome = 0;
    let monthExpense = 0;

    currentMonthTx.forEach(tx => {
        if (tx.type === 'income') monthIncome += tx.amount;
        else monthExpense += tx.amount;
    });

    monthIncomeEl.innerText = `+$${monthIncome.toFixed(2)}`;
    monthExpenseEl.innerText = `-$${monthExpense.toFixed(2)}`;

    // Limit Warning Check
    if (spendingLimit && monthExpense > spendingLimit) {
        monthSummaryCard.classList.add('limit-exceeded');
    } else {
        monthSummaryCard.classList.remove('limit-exceeded');
    }

    // 3. Render Sorted List
    const sortVal = sortBySelect.value;
    let sortedList = [...transactions];
    
    if (sortVal === 'newest') sortedList.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sortVal === 'oldest') sortedList.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'highest') sortedList.sort((a, b) => b.amount - a.amount);
    else if (sortVal === 'lowest') sortedList.sort((a, b) => a.amount - b.amount);
    else if (sortVal === 'category') sortedList.sort((a, b) => a.category.localeCompare(b.category));

    transactionListEl.innerHTML = '';
    
    if (sortedList.length === 0) {
        transactionListEl.innerHTML = '<p class="empty-state">No transactions. Add some above!</p>';
    } else {
        sortedList.forEach(tx => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');
            
            // Highlight individual item if its expense amount is > limit
            const isExpense = tx.type === 'expense';
            if (isExpense && spendingLimit && tx.amount > spendingLimit) {
                li.classList.add('exceeds-limit');
            }
            
            const amountStr = isExpense ? `-$${tx.amount.toFixed(2)}` : `+$${tx.amount.toFixed(2)}`;
            const amountClass = isExpense ? 'expense' : 'income';
            
            // Dynamic badge color
            const badgeColor = getCategoryColor(tx.category);
            
            // To ensure contrast on the badge, use hsla trick or direct color mapping
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${tx.name}</span>
                    <span class="item-category">
                        <span class="cat-badge" style="background-color: ${badgeColor}33; color: ${badgeColor};">${tx.category}</span>
                    </span>
                </div>
                <div class="item-actions">
                    <span class="item-amount ${amountClass}">${amountStr}</span>
                    <button class="delete-btn" onclick="deleteTransaction('${tx.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            transactionListEl.appendChild(li);
        });
    }

    // 4. Update Chart
    updateChart();
}

function updateChart() {
    const expenses = transactions.filter(tx => tx.type === 'expense');
    
    const categoryTotals = {};
    categories.forEach(cat => categoryTotals[cat.name] = 0);

    expenses.forEach(tx => {
        if (categoryTotals[tx.category] !== undefined) {
            categoryTotals[tx.category] += tx.amount;
        } else {
            // For categories that might have been deleted (though UI doesn't support deletion yet)
            categoryTotals[tx.category] = tx.amount;
        }
    });

    const labels = Object.keys(categoryTotals).filter(key => categoryTotals[key] > 0);
    const dataValues = labels.map(key => categoryTotals[key]);
    const bgColors = labels.map(key => getCategoryColor(key));

    const hasData = dataValues.some(val => val > 0);

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (!hasData) {
        chartInstance = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['No Expenses'],
                datasets: [{
                    data: [1],
                    backgroundColor: [currentTheme === 'light' ? 'hsla(0, 0%, 50%, 0.1)' : 'hsla(225, 25%, 30%, 0.3)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
        return;
    }

    chartInstance = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: currentTheme === 'light' ? '#fff' : 'hsl(225, 25%, 15%)',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    backgroundColor: currentTheme === 'light' ? 'hsla(0, 0%, 100%, 0.9)' : 'hsla(225, 25%, 10%, 0.9)',
                    titleColor: currentTheme === 'light' ? '#333' : '#fff',
                    bodyColor: currentTheme === 'light' ? '#333' : '#fff',
                    titleFont: { size: 14, family: "'Outfit', sans-serif" },
                    bodyFont: { size: 14, family: "'Outfit', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    borderColor: currentTheme === 'light' ? '#eee' : 'transparent',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) label += '$' + context.parsed.toFixed(2);
                            return label;
                        }
                    }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// Start
init();
