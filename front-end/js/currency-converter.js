document.addEventListener('DOMContentLoaded', function() {
    // Mock exchange rates (in a real app, you'd fetch from an API)
    const exchangeRates = {
        USD: { EUR: 0.85, GBP: 0.73, JPY: 110.25, CAD: 1.25, AUD: 1.32, CHF: 0.92, CNY: 6.45, INR: 74.50 },
        EUR: { USD: 1.18, GBP: 0.86, JPY: 129.75, CAD: 1.47, AUD: 1.55, CHF: 1.08, CNY: 7.59, INR: 87.65 },
        GBP: { USD: 1.37, EUR: 1.16, JPY: 151.20, CAD: 1.71, AUD: 1.81, CHF: 1.26, CNY: 8.84, INR: 102.10 },
        JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, CAD: 0.0113, AUD: 0.0120, CHF: 0.0083, CNY: 0.0585, INR: 0.676 },
        CAD: { USD: 0.80, EUR: 0.68, GBP: 0.58, JPY: 88.50, AUD: 1.06, CHF: 0.74, CNY: 5.16, INR: 59.60 },
        AUD: { USD: 0.76, EUR: 0.65, GBP: 0.55, JPY: 83.33, CAD: 0.94, CHF: 0.70, CNY: 4.88, INR: 56.44 },
        CHF: { USD: 1.09, EUR: 0.93, GBP: 0.79, JPY: 120.65, CAD: 1.35, AUD: 1.43, CNY: 7.01, INR: 80.98 },
        CNY: { USD: 0.155, EUR: 0.132, GBP: 0.113, JPY: 17.10, CAD: 0.194, AUD: 0.205, CHF: 0.143, INR: 11.55 },
        INR: { USD: 0.0134, EUR: 0.0114, GBP: 0.0098, JPY: 1.48, CAD: 0.0168, AUD: 0.0177, CHF: 0.0123, CNY: 0.0865 }
    };

    const elements = {
        amount: document.getElementById('amount'),
        fromCurrency: document.getElementById('fromCurrency'),
        toCurrency: document.getElementById('toCurrency'),
        swapBtn: document.getElementById('swapBtn'),
        result: document.getElementById('result'),
        rateInfo: document.getElementById('rateInfo'),
        loading: document.getElementById('loading'),
        historicalBtn: document.getElementById('historicalBtn'),
        favoritesBtn: document.getElementById('favoritesBtn')
    };

    // Format currency display
    function formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Get exchange rate
    function getExchangeRate(from, to) {
        if (from === to) return 1;
        return exchangeRates[from]?.[to] || 1;
    }

    // Perform conversion
    function convertCurrency() {
        const amount = parseFloat(elements.amount.value) || 0;
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        
        // Show loading
        elements.loading.style.display = 'block';
        
        // Simulate API delay
        setTimeout(() => {
            const rate = getExchangeRate(from, to);
            const convertedAmount = amount * rate;
            
            elements.result.textContent = formatCurrency(convertedAmount, to);
            elements.rateInfo.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
            
            elements.loading.style.display = 'none';
        }, 500);
    }

    // Swap currencies
    function swapCurrencies() {
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        
        elements.fromCurrency.value = to;
        elements.toCurrency.value = from;
        
        convertCurrency();
    }

    // Historical rates feature
    function showHistoricalRates() {
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        const currentRate = getExchangeRate(from, to);
        const yesterdayRate = currentRate * (1 + (Math.random() - 0.5) * 0.02); // Random variation
        
        alert(`Historical Exchange Rates:\n\nYesterday: 1 ${from} = ${yesterdayRate.toFixed(4)} ${to}\nToday: 1 ${from} = ${currentRate.toFixed(4)} ${to}\n\nChange: ${((currentRate - yesterdayRate) / yesterdayRate * 100).toFixed(2)}%`);
    }

    // Save favorites feature
    function saveFavorite() {
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        
        // Save to localStorage
        const favorites = JSON.parse(localStorage.getItem('currencyFavorites')) || [];
        const newFavorite = { from, to };
        
        // Check if already exists
        const exists = favorites.some(fav => fav.from === from && fav.to === to);
        
        if (!exists) {
            favorites.push(newFavorite);
            localStorage.setItem('currencyFavorites', JSON.stringify(favorites));
            alert(`Saved favorite pair: ${from} to ${to}`);
        } else {
            alert(`Currency pair ${from} to ${to} is already in your favorites.`);
        }
    }

    // Load favorites into dropdown (optional enhancement)
    function loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('currencyFavorites')) || [];
        // Could be used to populate a favorites dropdown
    }

    // Event listeners
    elements.amount.addEventListener('input', convertCurrency);
    elements.fromCurrency.addEventListener('change', convertCurrency);
    elements.toCurrency.addEventListener('change', convertCurrency);
    elements.swapBtn.addEventListener('click', swapCurrencies);
    elements.historicalBtn.addEventListener('click', showHistoricalRates);
    elements.favoritesBtn.addEventListener('click', saveFavorite);

    // Initialize
    convertCurrency();
    loadFavorites();
});