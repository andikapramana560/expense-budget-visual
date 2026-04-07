// State variables
let transactions = [];
let categories = [
    { name: 'Food', color: 'hsl(340, 80%, 60%)', isDefault: true },
    { name: 'Transport', color: 'hsl(190, 80%, 50%)', isDefault: true },
    { name: 'Fun', color: 'hsl(45, 90%, 55%)', isDefault: true }
];
let chartInstance = null;
let incomeChartInstance = null;
let currentTheme = 'dark';
let spendingLimit = null;
let editingTransactionId = null;

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
const dateInput = document.getElementById('transaction-date');
const typeInputs = document.getElementsByName('transaction-type');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const sortBySelect = document.getElementById('sort-by');
const limitInput = document.getElementById('monthly-limit');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const newCatNameInput = document.getElementById('new-cat-name');
const newCatColorInput = document.getElementById('new-cat-color');
const addCatBtn = document.getElementById('add-cat-btn');
const categoryListEl = document.getElementById('category-list');

const transactionListEl = document.getElementById('transaction-list');
const chartCanvas = document.getElementById('expenseChart');
const incomeChartCanvas = document.getElementById('incomeChart');

// Initialize App
function init() {
    loadSettings();
    updateCategoryDropdown();
    updateCategoryList();
    
    // Set default date to today
    dateInput.value = new Date().toISOString().split('T')[0];
    
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

function updateCategoryList() {
    categoryListEl.innerHTML = '';
    categories.filter(cat => !cat.isDefault).forEach(cat => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '0.5rem';
        li.style.background = 'var(--input-bg)';
        li.style.border = '1px solid var(--input-border)';
        li.style.borderRadius = '8px';
        li.style.marginBottom = '0.5rem';
        
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${cat.color};"></span>
                <span>${cat.name}</span>
            </div>
            <button type="button" class="delete-btn" onclick="deleteCategory('${cat.name.replace(/'/g, "\\'")}')" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 0.25rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
        `;
        categoryListEl.appendChild(li);
    });
}

function deleteCategory(catName) {
    categories = categories.filter(c => c.name !== catName);
    saveSettings();
    updateCategoryDropdown();
    updateCategoryList();
    updateUI();
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
    updateCategoryList();
    
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

    const transactionData = {
        name: itemNameInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        type: selectedType,
        date: dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString()
    };

    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        if (index > -1) {
            transactions[index] = { ...transactions[index], ...transactionData };
        }
        resetForm();
    } else {
        const newTransaction = {
            id: Math.floor(Math.random() * 100000000).toString(),
            ...transactionData
        };
        transactions.push(newTransaction);
        resetForm();
    }
    
    saveSettings();
    updateUI();
});

function resetForm() {
    editingTransactionId = null;
    submitBtn.innerText = 'Add Transaction';
    cancelEditBtn.style.display = 'none';
    itemNameInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    typeInputs[0].checked = true; // default to expense
}

cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

function editTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    editingTransactionId = id;
    itemNameInput.value = tx.name;
    amountInput.value = tx.amount;
    categoryInput.value = tx.category;
    dateInput.value = tx.date.split('T')[0];
    
    for(const radio of typeInputs) {
        if (radio.value === tx.type) {
            radio.checked = true;
        }
    }
    
    submitBtn.innerText = 'Update Transaction';
    cancelEditBtn.style.display = 'block';
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

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
                        <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.5rem;">${new Date(tx.date).toLocaleDateString()}</span>
                    </span>
                </div>
                <div class="item-actions">
                    <span class="item-amount ${amountClass}">${amountStr}</span>
                    <button class="edit-btn" onclick="editTransaction('${tx.id}')" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 0.25rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
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
    const incomes = transactions.filter(tx => tx.type === 'income');
    
    const expenseCategoryTotals = {};
    const incomeCategoryTotals = {};
    
    categories.forEach(cat => {
        expenseCategoryTotals[cat.name] = 0;
        incomeCategoryTotals[cat.name] = 0;
    });

    expenses.forEach(tx => {
        if (expenseCategoryTotals[tx.category] !== undefined) {
            expenseCategoryTotals[tx.category] += tx.amount;
        } else {
            expenseCategoryTotals[tx.category] = tx.amount;
        }
    });
    
    incomes.forEach(tx => {
        if (incomeCategoryTotals[tx.category] !== undefined) {
            incomeCategoryTotals[tx.category] += tx.amount;
        } else {
            incomeCategoryTotals[tx.category] = tx.amount;
        }
    });

    const expenseLabels = Object.keys(expenseCategoryTotals).filter(key => expenseCategoryTotals[key] > 0);
    const expenseDataValues = expenseLabels.map(key => expenseCategoryTotals[key]);
    const expenseBgColors = expenseLabels.map(key => getCategoryColor(key));

    const incomeLabels = Object.keys(incomeCategoryTotals).filter(key => incomeCategoryTotals[key] > 0);
    const incomeDataValues = incomeLabels.map(key => incomeCategoryTotals[key]);
    const incomeBgColors = incomeLabels.map(key => getCategoryColor(key));

    const hasExpenseData = expenseDataValues.some(val => val > 0);
    const hasIncomeData = incomeDataValues.some(val => val > 0);

    if (chartInstance) chartInstance.destroy();
    if (incomeChartInstance) incomeChartInstance.destroy();

    const emptyDataConfig = {
        labels: ['No Data'],
        datasets: [{
            data: [1],
            backgroundColor: [currentTheme === 'light' ? 'hsla(0, 0%, 50%, 0.1)' : 'hsla(225, 25%, 30%, 0.3)'],
            borderWidth: 0
        }]
    };

    const commonOptions = {
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
    };

    const emptyOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
    };

    chartInstance = new Chart(chartCanvas, {
        type: 'doughnut',
        data: hasExpenseData ? {
            labels: expenseLabels,
            datasets: [{
                data: expenseDataValues,
                backgroundColor: expenseBgColors,
                borderWidth: 2,
                borderColor: currentTheme === 'light' ? '#fff' : 'hsl(225, 25%, 15%)',
                hoverOffset: 10
            }]
        } : emptyDataConfig,
        options: hasExpenseData ? commonOptions : emptyOptions
    });
    
    incomeChartInstance = new Chart(incomeChartCanvas, {
        type: 'doughnut',
        data: hasIncomeData ? {
            labels: incomeLabels,
            datasets: [{
                data: incomeDataValues,
                backgroundColor: incomeBgColors,
                borderWidth: 2,
                borderColor: currentTheme === 'light' ? '#fff' : 'hsl(225, 25%, 15%)',
                hoverOffset: 10
            }]
        } : emptyDataConfig,
        options: hasIncomeData ? commonOptions : emptyOptions
    });
}

// Start
init();
