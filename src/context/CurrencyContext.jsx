import { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CurrencyContext = createContext();

/**
 * Supported currencies with symbols, locales, and approximate conversion rates from INR.
 * Rates are illustrative mock values for UI demonstration.
 */
export const CURRENCIES = {
    INR: { symbol: '₹', label: 'Indian Rupee', locale: 'en-IN', rate: 1 },
    USD: { symbol: '$', label: 'US Dollar', locale: 'en-US', rate: 0.012 },
    EUR: { symbol: '€', label: 'Euro', locale: 'de-DE', rate: 0.011 },
    GBP: { symbol: '£', label: 'British Pound', locale: 'en-GB', rate: 0.0095 },
};

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useLocalStorage('spendlens-currency', 'INR');

    /**
     * Format an amount (stored in INR) to the selected currency.
     * @param {number} amountInINR
     * @returns {string} e.g. "₹3,517" or "$42"
     */
    const formatCurrency = (amountInINR) => {
        const config = CURRENCIES[currency] || CURRENCIES.INR;
        const converted = Math.round(amountInINR * config.rate);
        return config.symbol + converted.toLocaleString(config.locale, { maximumFractionDigits: 0 });
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, currencies: CURRENCIES }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
    return ctx;
}
