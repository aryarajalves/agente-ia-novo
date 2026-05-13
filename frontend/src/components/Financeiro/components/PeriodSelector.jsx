import React from 'react';
import { useFinance } from '../FinanceContext';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEARS = [2024, 2025, 2026];

const PeriodSelector = () => {
    const {
        period, setPeriod,
        customDates, setCustomDates,
        selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear,
        setCurrentPage,
    } = useFinance();

    const handleQuick = (p) => { setPeriod(p); setCurrentPage(1); };
    const handleMonth = (e) => { setPeriod('monthly'); setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); };
    const handleYear  = (e) => { setPeriod('monthly'); setSelectedYear(parseInt(e.target.value));  setCurrentPage(1); };

    return (
        <div className="period-selector-container" id="period-selector">
            {/* Botões rápidos */}
            <div className="quick-periods">
                <button
                    id="btn-period-today"
                    className={period === 'today' ? 'active' : ''}
                    onClick={() => handleQuick('today')}
                >
                    Hoje
                </button>
                <button
                    id="btn-period-7d"
                    className={period === '7d' ? 'active' : ''}
                    onClick={() => handleQuick('7d')}
                >
                    7 dias
                </button>
                <button
                    id="btn-period-30d"
                    className={period === '30d' ? 'active' : ''}
                    onClick={() => handleQuick('30d')}
                >
                    30 dias
                </button>
            </div>

            <div className="period-divider" />

            {/* Mês / Ano */}
            <div className="month-year-group">
                <select
                    id="select-month"
                    value={selectedMonth}
                    onChange={handleMonth}
                    title="Selecionar mês"
                >
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select
                    id="select-year"
                    value={selectedYear}
                    onChange={handleYear}
                    title="Selecionar ano"
                >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div className="period-divider" />

            {/* Intervalo personalizado */}
            <div className="custom-dates">
                <input
                    id="input-date-start"
                    type="date"
                    value={customDates.start}
                    onChange={e => { setPeriod('custom'); setCustomDates({ ...customDates, start: e.target.value }); setCurrentPage(1); }}
                    title="Data inicial"
                />
                <span>até</span>
                <input
                    id="input-date-end"
                    type="date"
                    value={customDates.end}
                    onChange={e => { setPeriod('custom'); setCustomDates({ ...customDates, end: e.target.value }); setCurrentPage(1); }}
                    title="Data final"
                />
            </div>
        </div>
    );
};

export default PeriodSelector;
