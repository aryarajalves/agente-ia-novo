import React from 'react';
import { FinanceProvider, useFinance } from './FinanceContext';
import { useFinanceData } from './hooks/useFinanceData';
import FinanceHeader from './components/FinanceHeader';
import PeriodSelector from './components/PeriodSelector';
import StatsOverview from './components/StatsOverview';
import TransactionTable from './components/TransactionTable';
import './styles/Financeiro.css';

const FinanceContent = () => {
    const { loading } = useFinance();
    useFinanceData();

    if (loading) {
        return (
            <div className="finance-loading-overlay">
                <div className="loading-spinner"></div>
                <p>Sincronizando estatísticas financeiras...</p>
            </div>
        );
    }

    return (
        <div className="finance-container fade-in">
            <div className="finance-layout">
                <div className="layout-left">
                    <FinanceHeader />
                    <PeriodSelector />
                    <StatsOverview />
                    <TransactionTable />
                </div>
            </div>
        </div>
    );
};

const Financeiro = () => (
    <FinanceProvider>
        <FinanceContent />
    </FinanceProvider>
);

export default Financeiro;
