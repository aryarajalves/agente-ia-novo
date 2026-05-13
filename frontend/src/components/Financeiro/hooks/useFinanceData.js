import { useEffect, useCallback } from 'react';
import { useFinance } from '../FinanceContext';
import { api } from '../../../api/client';

export const useFinanceData = () => {
    const { 
        setReport, setFtJobs, setLoading, period, customDates, 
        selectedMonth, selectedYear, setCurrentPage 
    } = useFinance();

    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPeriodBounds = useCallback(() => {
        const today = new Date();
        let end = getLocalDateString(today);
        let start = '';
        if (period === 'today') {
            start = end;
        } else if (period === '7d') {
            const d = new Date(); d.setDate(d.getDate() - 7);
            start = getLocalDateString(d);
        } else if (period === '30d') {
            const d = new Date(); d.setDate(d.getDate() - 30);
            start = getLocalDateString(d);
        } else if (period === 'custom') {
            start = customDates.start;
            end = customDates.end;
        } else if (period === 'monthly') {
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            start = getLocalDateString(firstDay);
            end = getLocalDateString(lastDay);
        }
        return { start, end };
    }, [period, customDates, selectedMonth, selectedYear]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        const { start, end } = getPeriodBounds();
        const params = new URLSearchParams();
        if (start) params.append('start_date', start);
        if (end) params.append('end_date', end);

        try {
            const [reportRes, jobsRes] = await Promise.all([
                api.get(`/financial/report?${params.toString()}`),
                api.get('/fine-tuning/jobs')
            ]);
            setReport(await reportRes.json());
            const jobsData = await jobsRes.json();
            setFtJobs(Array.isArray(jobsData) ? jobsData : []);
        } catch (e) {
            console.error("Erro ao carregar relatório:", e);
        } finally {
            setLoading(false);
        }
    }, [getPeriodBounds, setReport, setFtJobs, setLoading]);

    useEffect(() => {
        fetchReport();
        setCurrentPage(1);
    }, [fetchReport, setCurrentPage]);

    return { fetchReport, getPeriodBounds, getLocalDateString };
};
