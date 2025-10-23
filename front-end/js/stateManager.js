class StateManager {
  constructor() {
    this.state = {
      user: null,
      transactions: [],
      budgets: [],
      goals: [],
      isLoading: false,
      notifications: [],
      filters: {
        transactions: {
          type: '',
          category: '',
          startDate: '',
          endDate: ''
        }
      }
    };
    this.subscribers = [];
    this.API_BASE_URL = 'http://localhost:3001/api';
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }

  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // User management
  async loadUserData() {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ user: data.user });
        return { success: true, user: data.user };
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Load user data error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Transaction management
  async loadTransactions(filters = {}) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`${this.API_BASE_URL}/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ 
          transactions: data.transactions,
          filters: {
            ...this.state.filters,
            transactions: filters
          }
        });
        return { success: true, ...data };
      } else {
        throw new Error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Load transactions error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async addTransaction(transactionData) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });

      const result = await response.json();

      if (response.ok) {
        // Reload transactions to get updated list
        await this.loadTransactions(this.state.filters.transactions);
        this.addNotification('Transaction added successfully', 'success');
        return { success: true, transaction: result.transaction };
      } else {
        throw new Error(result.message || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async updateTransaction(transactionId, updateData) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        await this.loadTransactions(this.state.filters.transactions);
        this.addNotification('Transaction updated successfully', 'success');
        return { success: true, transaction: result.transaction };
      } else {
        throw new Error(result.message || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async deleteTransaction(transactionId) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        await this.loadTransactions(this.state.filters.transactions);
        this.addNotification('Transaction deleted successfully', 'success');
        return { success: true };
      } else {
        throw new Error(result.message || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Budget management
  async loadBudgets() {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/budgets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ budgets: data.budgets });
        return { success: true, budgets: data.budgets };
      } else {
        throw new Error('Failed to load budgets');
      }
    } catch (error) {
      console.error('Load budgets error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async addBudget(budgetData) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetData)
      });

      const result = await response.json();

      if (response.ok) {
        await this.loadBudgets();
        this.addNotification('Budget created successfully', 'success');
        return { success: true, budget: result.budget };
      } else {
        throw new Error(result.message || 'Failed to create budget');
      }
    } catch (error) {
      console.error('Add budget error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Goals management
  async loadGoals() {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/goals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ goals: data.goals });
        return { success: true, goals: data.goals };
      } else {
        throw new Error('Failed to load goals');
      }
    } catch (error) {
      console.error('Load goals error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async addGoal(goalData) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/goals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(goalData)
      });

      const result = await response.json();

      if (response.ok) {
        await this.loadGoals();
        this.addNotification('Goal created successfully', 'success');
        return { success: true, goal: result.goal };
      } else {
        throw new Error(result.message || 'Failed to create goal');
      }
    } catch (error) {
      console.error('Add goal error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async updateGoal(goalId, updateData) {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        await this.loadGoals();
        this.addNotification('Goal updated successfully', 'success');
        return { success: true, goal: result.goal };
      } else {
        throw new Error(result.message || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Update goal error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Financial overview
  async loadFinancialOverview() {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/financial/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      } else {
        throw new Error('Failed to load financial overview');
      }
    } catch (error) {
      console.error('Load financial overview error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Analytics
  async loadAnalytics(period = '6m') {
    try {
      this.setState({ isLoading: true });
      
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/financial/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Load analytics error:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Notifications
  addNotification(message, type = 'info') {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };

    const notifications = [notification, ...this.state.notifications.slice(0, 4)];
    this.setState({ notifications });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  removeNotification(notificationId) {
    const notifications = this.state.notifications.filter(n => n.id !== notificationId);
    this.setState({ notifications });
  }

  clearNotifications() {
    this.setState({ notifications: [] });
  }

  // Data synchronization
  async syncAllData() {
    try {
      this.setState({ isLoading: true });
      
      await Promise.all([
        this.loadUserData(),
        this.loadTransactions(),
        this.loadBudgets(),
        this.loadGoals()
      ]);

      this.addNotification('Data synchronized successfully', 'success');
    } catch (error) {
      console.error('Data sync error:', error);
      this.addNotification('Failed to sync data', 'error');
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Export data
  async exportData(format = 'json') {
    try {
      const token = window.authManager?.getToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${this.API_BASE_URL}/reports/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintrack-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.addNotification('Data exported successfully', 'success');
        return { success: true };
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      console.error('Export data error:', error);
      this.addNotification(error.message, 'error');
      return { success: false, error: error.message };
    }
  }
}

// Initialize state manager
window.stateManager = new StateManager();