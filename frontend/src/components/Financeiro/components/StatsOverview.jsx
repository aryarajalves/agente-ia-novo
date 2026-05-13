import React from 'react';
import { useFinanceMetrics } from '../hooks/useFinanceMetrics';
import { useFinance } from '../FinanceContext';

const StatsOverview = () => {
    const { chartData, ranking, activeTotalCost } = useFinanceMetrics();
    const { viewMode } = useFinance();
    const maxCost = Math.max(...chartData.map(d => d.cost), 0.01);

    return (
        <div className="stats-overview">
            {/* --- Gráfico de Barras --- */}
            <div className="chart-card" id="chart-tendencia">
                <h3>📈 Tendência de Gastos</h3>
                {chartData.length === 0 ? (
                    <div className="chart-empty">Nenhum dado para o período selecionado</div>
                ) : (
                    <div className="bar-chart">
                        {chartData.map((d, i) => (
                            <div key={i} className="bar-container">
                                <div
                                    className="bar-fill"
                                    style={{ height: `${(d.cost / maxCost) * 100}%` }}
                                    title={`R$ ${d.cost.toFixed(4)}`}
                                />
                                <span className="bar-label">
                                    {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Cards de Resumo (direita) --- */}
            <div className="summary-cards">
                <div id="card-total" className={`total-card ${viewMode}`}>
                    <span className="label">
                        Total Agentes
                    </span>
                    <span className="value">R$ {activeTotalCost.toFixed(2)}</span>
                </div>

                <div className="ranking-card" id="card-ranking">
                    <h3>🏆 Top 3 Agentes</h3>
                    {ranking.length === 0 ? (
                        <div style={{ color: 'var(--fin-text-muted)', fontSize: '0.82rem', padding: '0.5rem 0' }}>
                            Nenhum dado disponível
                        </div>
                    ) : (
                        ranking.map((item, idx) => (
                            <div key={idx} className="ranking-item" id={`ranking-item-${idx}`}>
                                <span>{idx + 1}º {item.name}</span>
                                <strong>R$ {item.cost.toFixed(2)}</strong>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsOverview;
