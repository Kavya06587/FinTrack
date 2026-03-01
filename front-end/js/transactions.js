// transactions.js - Complete fixed version
class TransactionsManager {
    constructor() {
        this.currentTransactions = [];
        this.filteredTransactions = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            type: '',
            category: '',
            startDate: '',
            endDate: '',
            search: ''
        };
        this.selectedTransactions = new Set();
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.setDefaultDates();
        this.loadTransactions();
        this.loadCategories();
    }

    checkAuth() {
        const token = localStorage.getItem('fintrack_token');
        const user = localStorage.getItem('fintrack_user');
        
        if (!token || !user) {
            console.warn('User not authenticated, redirecting to login...');
            window.location.href = '../login.html';
            return false;
        }
        return true;
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Add transaction buttons
        const addTransactionBtnMain = document.getElementById('addTransactionBtnMain');
        const addTransactionBtnEmpty = document.getElementById('addTransactionBtnEmpty');
        
        if (addTransactionBtnMain) {
            addTransactionBtnMain.addEventListener('click', () => {
                this.showAddTransactionModal();
            });
        }
        
        if (addTransactionBtnEmpty) {
            addTransactionBtnEmpty.addEventListener('click', () => {
                this.showAddTransactionModal();
            });
        }

        // Modal submit button
        const submitTransactionBtn = document.getElementById('submitTransactionBtn');
        if (submitTransactionBtn) {
            submitTransactionBtn.addEventListener('click', () => {
                this.addTransaction();
            });
        }

        // Edit modal submit button
        const updateTransactionBtn = document.getElementById('updateTransactionBtn');
        if (updateTransactionBtn) {
            updateTransactionBtn.addEventListener('click', () => {
                this.updateTransaction();
            });
        }

        // Filter events
        document.getElementById('filter-type')?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
        });

        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
        });

        document.getElementById('filter-start-date')?.addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
        });

        document.getElementById('filter-end-date')?.addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
        });

        // Filter buttons
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Export button
        const exportTransactionsBtn = document.getElementById('exportTransactionsBtn');
        if (exportTransactionsBtn) {
            exportTransactionsBtn.addEventListener('click', () => {
                this.exportTransactions();
            });
        }

        // Recurring transaction toggle
        document.getElementById('recurringTransaction')?.addEventListener('change', (e) => {
            const options = document.getElementById('recurringOptions');
            if (options) {
                options.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Bulk action buttons
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDelete();
            });
        }

        const bulkExportBtn = document.getElementById('bulk-export');
        if (bulkExportBtn) {
            bulkExportBtn.addEventListener('click', () => {
                this.bulkExport();
            });
        }

        // Event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Checkbox selection
            if (e.target.classList.contains('transaction-checkbox')) {
                const transactionId = e.target.value;
                this.toggleTransactionSelection(transactionId, e.target.checked);
            }

            // Edit buttons
            if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
                const btn = e.target.classList.contains('edit-btn') ? e.target : e.target.closest('.edit-btn');
                const transactionId = btn.getAttribute('data-id');
                this.editTransaction(transactionId);
            }

            // Delete buttons
            if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                const btn = e.target.classList.contains('delete-btn') ? e.target : e.target.closest('.delete-btn');
                const transactionId = btn.getAttribute('data-id');
                this.deleteTransaction(transactionId);
            }
        });
    }

    showAddTransactionModal() {
        console.log('Showing add transaction modal');
        const modalElement = document.getElementById('addTransactionModal');
        if (!modalElement) {
            console.error('Add transaction modal not found!');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        this.setupAddTransactionForm();
        modal.show();
    }

    setupAddTransactionForm() {
        console.log('Setting up add transaction form');
        const form = document.getElementById('addTransactionForm');
        if (form) {
            form.reset();
            console.log('Form reset');
        } else {
            console.error('Add transaction form not found!');
        }
        
        const transactionDate = document.getElementById('transactionDate');
        if (transactionDate) {
            transactionDate.value = new Date().toISOString().split('T')[0];
            console.log('Date set to today:', transactionDate.value);
        }
        
        const typeIncome = document.getElementById('typeIncome');
        if (typeIncome) {
            typeIncome.checked = true;
            console.log('Type set to income');
        }
        
        const recurringOptions = document.getElementById('recurringOptions');
        if (recurringOptions) {
            recurringOptions.style.display = 'none';
        }
    }

    setDefaultDates() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const startDateInput = document.getElementById('filter-start-date');
        const endDateInput = document.getElementById('filter-end-date');
        const transactionDateInput = document.getElementById('transactionDate');
        
        if (startDateInput) {
            startDateInput.value = firstDay.toISOString().split('T')[0];
            this.filters.startDate = firstDay.toISOString().split('T')[0];
        }
        
        if (endDateInput) {
            endDateInput.value = lastDay.toISOString().split('T')[0];
            this.filters.endDate = lastDay.toISOString().split('T')[0];
        }
        
        if (transactionDateInput) {
            transactionDateInput.value = now.toISOString().split('T')[0];
        }
    }

    async loadTransactions() {
        try {
            if (!this.checkAuth()) return;
            
            this.showLoadingState();
            
            const token = localStorage.getItem('fintrack_token');
            const response = await this.apiCall('/transactions');
            
            if (response.success) {
                this.currentTransactions = response.transactions || [];
                this.filteredTransactions = [...this.currentTransactions];
                this.updateStats(response.totals, this.currentTransactions.length);
                this.renderTransactions();
            } else {
                this.showEmptyState();
                this.showMessage(response.message || 'Failed to load transactions', 'error');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showEmptyState();
            this.showMessage('Failed to load transactions: ' + error.message, 'error');
        }
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('fintrack_token');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            }
        };

        try {
            const url = `http://localhost:3001/api${endpoint}`;
            console.log(`API Call: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to server. Please make sure the backend is running on localhost:3001');
            }
            throw error;
        }
    }

    async loadCategories() {
        try {
            const categories = [
                'Food & Dining', 'Groceries', 'Transportation', 'Entertainment',
                'Bills & Utilities', 'Healthcare', 'Education', 'Shopping',
                'Travel', 'EMI & Loans', 'Investments', 'Insurance',
                'Rent', 'Fuel', 'Mobile & Internet', 'Salary', 'Other'
            ];
            
            const categorySelect = document.getElementById('filter-category');
            const addCategorySelect = document.getElementById('category');
            const editCategorySelect = document.getElementById('editCategory');
            
            const categoryOptions = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
            if (categorySelect) categorySelect.innerHTML = '<option value="">All Categories</option>' + categoryOptions;
            if (addCategorySelect) addCategorySelect.innerHTML = '<option value="">Select Category</option>' + categoryOptions;
            if (editCategorySelect) editCategorySelect.innerHTML = '<option value="">Select Category</option>' + categoryOptions;
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    applyFilters() {
        let filtered = [...this.currentTransactions];

        // Apply type filter
        if (this.filters.type) {
            filtered = filtered.filter(t => t.type === this.filters.type);
        }

        // Apply category filter
        if (this.filters.category) {
            filtered = filtered.filter(t => t.category === this.filters.category);
        }

        // Apply date filter
        if (this.filters.startDate) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(this.filters.startDate));
        }

        if (this.filters.endDate) {
            const endDate = new Date(this.filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.date) <= endDate);
        }

        // Apply search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(t => 
                t.description.toLowerCase().includes(searchTerm) ||
                t.category.toLowerCase().includes(searchTerm) ||
                t.amount.toString().includes(searchTerm)
            );
        }

        this.filteredTransactions = filtered;
        this.currentPage = 1;
        this.renderTransactions();
    }

    renderTransactions() {
        const container = document.getElementById('transactions-body');
        const mobileContainer = document.getElementById('mobile-transactions');
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');

        if (!container) return;

        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';

        if (this.filteredTransactions.length === 0) {
            container.innerHTML = '';
            if (mobileContainer) mobileContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            this.renderPagination();
            this.updateBulkActions();
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTransactions = this.filteredTransactions.slice(startIndex, endIndex);

        // Render desktop table
        const transactionsHTML = paginatedTransactions.map(transaction => 
            this.createTransactionRow(transaction)
        ).join('');

        container.innerHTML = transactionsHTML;

        // Render mobile cards
        this.renderMobileTransactions(paginatedTransactions);
        
        this.renderPagination();
        this.updateBulkActions();
    }

    renderMobileTransactions(transactions) {
        const container = document.getElementById('mobile-transactions');
        if (!container) return;

        const mobileHTML = transactions.map(transaction => 
            this.createMobileTransactionCard(transaction)
        ).join('');

        container.innerHTML = mobileHTML;
    }

    createTransactionRow(transaction) {
        const date = new Date(transaction.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const amountClass = transaction.type === 'income' ? 'amount-income' : 'amount-expense';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        const typeBadgeClass = transaction.type === 'income' ? 'type-income' : 'type-expense';
        const typeIcon = transaction.type === 'income' ? 'arrow-down-left' : 'arrow-up-right';
        const isSelected = this.selectedTransactions.has(transaction._id);

        return `
            <tr>
                <td>
                    <input type="checkbox" class="transaction-checkbox" value="${transaction._id}" 
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td>
                    <div class="fw-semibold">${date}</div>
                </td>
                <td>
                    <div class="fw-semibold">${transaction.description}</div>
                    ${transaction.tags ? `<small class="text-muted">${transaction.tags}</small>` : ''}
                </td>
                <td>
                    <span class="category-badge">${transaction.category}</span>
                </td>
                <td>
                    <span class="type-badge ${typeBadgeClass}">
                        <i class="bi bi-${typeIcon} me-1"></i>
                        ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                </td>
                <td class="${amountClass} fw-semibold">
                    ${amountSign}${this.formatCurrencyCompact(transaction.amount)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm-icon btn-outline-primary edit-btn" data-id="${transaction._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm-icon btn-outline-danger delete-btn" data-id="${transaction._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    createMobileTransactionCard(transaction) {
        const date = new Date(transaction.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        const isSelected = this.selectedTransactions.has(transaction._id);

        return `
            <div class="mobile-transaction-card">
                <div class="mobile-transaction-header">
                    <div>
                        <div class="mobile-transaction-title">${transaction.description}</div>
                        <div class="mobile-transaction-category">${transaction.category}</div>
                    </div>
                    <div class="mobile-transaction-amount ${amountClass}">
                        ${amountSign}${this.formatCurrencyCompact(transaction.amount)}
                    </div>
                </div>
                <div class="mobile-transaction-details">
                    <div class="mobile-transaction-date">${date}</div>
                    <div class="mobile-transaction-actions">
                        <input type="checkbox" class="form-check-input transaction-checkbox" 
                               value="${transaction._id}" 
                               ${isSelected ? 'checked' : ''}>
                        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${transaction._id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${transaction._id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;

        // Add event listeners to pagination links
        pagination.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                this.changePage(page);
            });
        });
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderTransactions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateStats(totals, count) {
        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        const netBalanceEl = document.getElementById('net-balance');
        const transactionCountEl = document.getElementById('transaction-count');

        if (totalIncomeEl) totalIncomeEl.textContent = this.formatCurrency(totals?.income || 0);
        if (totalExpensesEl) totalExpensesEl.textContent = this.formatCurrency(totals?.expenses || 0);
        if (netBalanceEl) netBalanceEl.textContent = this.formatCurrency(totals?.net || 0);
        if (transactionCountEl) transactionCountEl.textContent = count;
    }

    async addTransaction() {
        try {
            if (!this.checkAuth()) return;

            const rawCategory = document.getElementById('category')?.value;
            const category = rawCategory ? rawCategory.toString().trim() : '';

            const formData = {
                type: document.querySelector('#addTransactionModal input[name="type"]:checked')?.value,
                amount: parseFloat(document.getElementById('amount')?.value),
                category,
                description: document.getElementById('description')?.value,
                date: document.getElementById('transactionDate')?.value
            };

            console.log('Transaction data:', formData);

            // Validation
            if (!formData.type || !formData.amount || !formData.category || !formData.description || !formData.date) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }

            if (formData.amount <= 0) {
                this.showMessage('Amount must be greater than 0', 'error');
                return;
            }

            const response = await this.apiCall('/transactions', {
                method: 'POST',
                body: formData
            });

            if (response.success) {
                this.showMessage('Transaction added successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
                if (modal) modal.hide();
                
                // Reload transactions
                this.loadTransactions();

                // Trigger dashboard update
                this.triggerDashboardUpdate();
            } else {
                this.showMessage(response.message || 'Failed to add transaction', 'error');
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            this.showMessage('Failed to add transaction: ' + error.message, 'error');
        }
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            if (!this.checkAuth()) return;

            const response = await this.apiCall(`/transactions/${transactionId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.showMessage('Transaction deleted successfully!', 'success');
                this.loadTransactions();
                
                // Trigger dashboard update
                this.triggerDashboardUpdate();
            } else {
                this.showMessage(response.message || 'Failed to delete transaction', 'error');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showMessage('Failed to delete transaction: ' + error.message, 'error');
        }
    }

    async editTransaction(transactionId) {
        try {
            const transaction = this.currentTransactions.find(t => t._id === transactionId);
            if (!transaction) {
                this.showMessage('Transaction not found', 'error');
                return;
            }

            // Populate edit form
            document.getElementById('editTransactionId').value = transaction._id;
            const typeRadio = document.querySelector(`#editTransactionModal input[name="editType"][value="${transaction.type}"]`);
            if (typeRadio) typeRadio.checked = true;
            document.getElementById('editAmount').value = transaction.amount;
            document.getElementById('editCategory').value = transaction.category;
            document.getElementById('editDescription').value = transaction.description;
            document.getElementById('editTransactionDate').value = new Date(transaction.date).toISOString().split('T')[0];
            document.getElementById('editTags').value = transaction.tags || '';

            // Show edit modal
            const modal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
            modal.show();

        } catch (error) {
            console.error('Error editing transaction:', error);
            this.showMessage('Failed to edit transaction', 'error');
        }
    }

    async updateTransaction() {
        try {
            if (!this.checkAuth()) return;

            const transactionId = document.getElementById('editTransactionId').value;
            const rawEditCategory = document.getElementById('editCategory').value;
            const editCategory = rawEditCategory ? rawEditCategory.toString().trim() : '';

            const formData = {
                type: document.querySelector('#editTransactionModal input[name="editType"]:checked')?.value,
                amount: parseFloat(document.getElementById('editAmount').value),
                category: editCategory,
                description: document.getElementById('editDescription').value,
                date: document.getElementById('editTransactionDate').value,
                tags: document.getElementById('editTags').value
            };

            // Validation
            if (!formData.type || !formData.amount || !formData.category || !formData.description || !formData.date) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }

            const response = await this.apiCall(`/transactions/${transactionId}`, {
                method: 'PUT',
                body: formData
            });

            if (response.success) {
                this.showMessage('Transaction updated successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editTransactionModal'));
                if (modal) modal.hide();
                
                // Reload transactions
                this.loadTransactions();

                // Trigger dashboard update
                this.triggerDashboardUpdate();
            } else {
                this.showMessage(response.message || 'Failed to update transaction', 'error');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            this.showMessage('Failed to update transaction: ' + error.message, 'error');
        }
    }

    async exportTransactions() {
        try {
            const transactions = this.filteredTransactions;
            if (transactions.length === 0) {
                this.showMessage('No transactions to export', 'warning');
                return;
            }

            let csvContent = 'Date,Description,Category,Type,Amount,Tags\n';
            
            transactions.forEach(transaction => {
                const date = new Date(transaction.date).toLocaleDateString();
                const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
                
                csvContent += `"${date}","${transaction.description}","${transaction.category}","${transaction.type}",${amount},"${transaction.tags || ''}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage('Transactions exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting transactions:', error);
            this.showMessage('Failed to export transactions', 'error');
        }
    }

    // Selection and bulk operations
    toggleTransactionSelection(transactionId, isSelected) {
        if (isSelected) {
            this.selectedTransactions.add(transactionId);
        } else {
            this.selectedTransactions.delete(transactionId);
        }
        this.updateBulkActions();
        this.updateSelectAllCheckbox();
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const transactionId = checkbox.value;
            
            if (selectAll) {
                this.selectedTransactions.add(transactionId);
            } else {
                this.selectedTransactions.delete(transactionId);
            }
        });
        
        this.updateBulkActions();
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all');
        if (!selectAllCheckbox) return;
        
        const checkboxes = document.querySelectorAll('.transaction-checkbox');
        const checkedCount = document.querySelectorAll('.transaction-checkbox:checked').length;
        
        selectAllCheckbox.checked = checkedCount > 0 && checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    updateBulkActions() {
        const bulkDeleteBtn = document.getElementById('bulk-delete');
        const bulkExportBtn = document.getElementById('bulk-export');
        
        const hasSelection = this.selectedTransactions.size > 0;
        
        if (bulkDeleteBtn) bulkDeleteBtn.disabled = !hasSelection;
        if (bulkExportBtn) bulkExportBtn.disabled = !hasSelection;
    }

    async bulkDelete() {
        if (this.selectedTransactions.size === 0) {
            this.showMessage('No transactions selected', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${this.selectedTransactions.size} transaction(s)?`)) {
            return;
        }

        try {
            // Delete transactions one by one
            const deletePromises = Array.from(this.selectedTransactions).map(transactionId => 
                this.apiCall(`/transactions/${transactionId}`, {
                    method: 'DELETE'
                })
            );

            await Promise.all(deletePromises);
            
            this.showMessage(`Successfully deleted ${this.selectedTransactions.size} transaction(s)`, 'success');
            this.selectedTransactions.clear();
            this.loadTransactions();
            
        } catch (error) {
            console.error('Error bulk deleting transactions:', error);
            this.showMessage('Failed to delete some transactions', 'error');
        }
    }

    async bulkExport() {
        if (this.selectedTransactions.size === 0) {
            this.showMessage('No transactions selected', 'warning');
            return;
        }

        try {
            const selectedTransactions = this.currentTransactions.filter(t => 
                this.selectedTransactions.has(t._id)
            );

            let csvContent = 'Date,Description,Category,Type,Amount,Tags\n';
            
            selectedTransactions.forEach(transaction => {
                const date = new Date(transaction.date).toLocaleDateString();
                const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
                
                csvContent += `"${date}","${transaction.description}","${transaction.category}","${transaction.type}",${amount},"${transaction.tags || ''}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `selected-transactions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showMessage(`Exported ${this.selectedTransactions.size} transaction(s) successfully!`, 'success');
        } catch (error) {
            console.error('Error bulk exporting transactions:', error);
            this.showMessage('Failed to export transactions', 'error');
        }
    }

    showLoadingState() {
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        const container = document.getElementById('transactions-body');
        const mobileContainer = document.getElementById('mobile-transactions');
        
        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (container) container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
    }

    showEmptyState() {
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        const container = document.getElementById('transactions-body');
        const mobileContainer = document.getElementById('mobile-transactions');
        
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (container) container.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';
    }

    // Method to trigger dashboard updates
    triggerDashboardUpdate() {
        // Dispatch custom event that dashboard can listen for
        const event = new CustomEvent('transactionUpdated', {
            detail: { timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(event);

        // Also update localStorage to trigger cross-tab updates
        localStorage.setItem('fintrack_transactions_updated', Date.now().toString());
    }

    clearFilters() {
        this.filters = {
            type: '',
            category: '',
            startDate: '',
            endDate: '',
            search: ''
        };
        
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('search-input').value = '';
        this.setDefaultDates();
        this.applyFilters();
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.alert-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert-message alert-${type}`;
        messageDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-text">${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#alert-styles')) {
            const styles = document.createElement('style');
            styles.id = 'alert-styles';
            styles.textContent = `
                .alert-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideInRight 0.3s ease;
                }
                .alert-content {
                    padding: 12px 16px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .alert-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Utility methods
    formatCurrency(amount) {
        // Indian Rupee formatting
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatCurrencyCompact(amount) {
        // Compact formatting for transaction amounts
        if (Math.abs(amount) >= 10000000) {
            return '₹' + (Math.abs(amount) / 10000000).toFixed(2) + 'Cr';
        } else if (Math.abs(amount) >= 100000) {
            return '₹' + (Math.abs(amount) / 100000).toFixed(2) + 'L';
        } else if (Math.abs(amount) >= 1000) {
            return '₹' + (Math.abs(amount) / 1000).toFixed(2) + 'K';
        } else {
            return '₹' + Math.abs(amount).toFixed(2);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing TransactionsManager...');
    window.transactionsManager = new TransactionsManager();
});