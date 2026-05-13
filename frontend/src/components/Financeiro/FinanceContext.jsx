import React, { createContext, useContext, useState } from 'react';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
    const [report, setReport] = useState({ items: [], grand_total_cost: 0 });
    const [ftJobs, setFtJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d'); // 'today', '7d', '30d', 'custom', 'monthly'
    const [viewMode, setViewMode] = useState('agents'); // 'agents' | 'finetuning'
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const value = {
        report, setReport,
        ftJobs, setFtJobs,
        loading, setLoading,
        period, setPeriod,
        viewMode, setViewMode,
        customDates, setCustomDates,
        selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear,
        currentPage, setCurrentPage,
        rowsPerPage, setRowsPerPage
    };

    return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) throw new Error('useFinance must be used within a FinanceProvider');
    return context;
};
