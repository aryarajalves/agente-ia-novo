import { useMemo } from 'react';
import { useFinance } from '../FinanceContext';

const USD_BRL = 5.8;

export const useFinanceMetrics = () => {
    const { report, ftJobs, viewMode, period, customDates, selectedMonth, selectedYear } = useFinance();

    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPeriodBounds = () => {
        const today = new Date();
        let end = getLocalDateString(today);
        let start = '';
        if (period === 'today') start = end;
        else if (period === '7d') { const d = new Date(); d.setDate(d.getDate() - 7); start = getLocalDateString(d); }
        else if (period === '30d') { const d = new Date(); d.setDate(d.getDate() - 30); start = getLocalDateString(d); }
        else if (period === 'custom') { start = customDates.start; end = customDates.end; }
        else if (period === 'monthly') {
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            start = getLocalDateString(firstDay);
            end = getLocalDateString(lastDay);
        }
        return { start, end };
    };

    const ftRows = useMemo(() => {
        const { start, end } = getPeriodBounds();
        return ftJobs.filter(j => {
            if (j.status !== 'succeeded' || !j.finished_at) return false;
            const jobDate = getLocalDateString(new Date(j.finished_at * 1000));
            return (!start || jobDate >= start) && (!end || jobDate <= end);
        }).map(j => {
            const pricePerM = j.model?.includes('gpt-3.5') ? 8 : 3;
            const total_cost = (j.trained_tokens / 1_000_000) * pricePerM * USD_BRL;
            return {
                date: getLocalDateString(new Date(j.finished_at * 1000)),
                agent_name: `Fine-Tuning (${j.model?.split('-')[0] || 'modelo'})`,
                total_tokens: j.trained_tokens || 0,
                total_cost,
                isFtJob: true,
                id: j.id
            };
        });
    }, [ftJobs, period, customDates, selectedMonth, selectedYear]);

    const activeRowsData = useMemo(() => viewMode === 'agents' ? report.items : ftRows, [viewMode, report.items, ftRows]);
    const activeTotalCost = useMemo(() => activeRowsData.reduce((s, r) => s + r.total_cost, 0), [activeRowsData]);

    const ranking = useMemo(() => {
        const costs = {};
        activeRowsData.forEach(item => { costs[item.agent_name] = (costs[item.agent_name] || 0) + item.total_cost; });
        return Object.entries(costs).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost).slice(0, 3);
    }, [activeRowsData]);

    const chartData = useMemo(() => {
        const daily = {};
        activeRowsData.forEach(item => { daily[item.date] = (daily[item.date] || 0) + item.total_cost; });
        return Object.entries(daily).map(([date, cost]) => ({ date, cost })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [activeRowsData]);

    return { activeRowsData, activeTotalCost, ranking, chartData };
};
