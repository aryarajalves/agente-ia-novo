import React from 'react';

const PipelineCountdown = ({ step, onFinished, isPending, serverNow }) => {
    const [timeLeft, setTimeLeft] = React.useState(null);

    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        const normalized = (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:?\d{2}$/)) 
            ? dateStr 
            : dateStr + 'Z';
        return new Date(normalized);
    };

    React.useEffect(() => {
        if (!step || !step.timestamp || !isPending) return;
        
        const delayMatch = step.step.match(/(\d+)s/);
        const delaySeconds = delayMatch ? parseInt(delayMatch[1]) : 30;
        
        // Calcular o offset entre o relógio do cliente e o do servidor
        let clockOffset = 0;
        if (serverNow) {
            const sNow = parseDate(serverNow).getTime();
            const cNow = new Date().getTime();
            clockOffset = sNow - cNow;
        }
        
        const update = () => {
            const start = parseDate(step.timestamp).getTime();
            const now = new Date().getTime() + clockOffset;
            const elapsed = Math.floor((now - start) / 1000);
            let remaining = Math.max(0, delaySeconds - elapsed);
            
            if (isNaN(remaining)) remaining = 0;
            
            setTimeLeft(remaining);
            return remaining;
        };
        
        update();
        const timer = setInterval(() => {
            const rem = update();
            if (rem <= 0) {
                clearInterval(timer);
                if (onFinished && isPending) {
                    setTimeout(onFinished, 1000);
                }
            }
        }, 1000);
        
        return () => clearInterval(timer);
    }, [step, onFinished, isPending, serverNow]);

    if (timeLeft === null || !isPending) return null;
    return <span style={{ marginLeft: 'auto', marginRight: '0.75rem', fontSize: '0.85rem', color: '#f59e0b', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{timeLeft}s</span>;
};

export default PipelineCountdown;
