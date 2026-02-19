import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ExchangeRate } from '../../types';
import { CashIcon } from '../../components/icons';

const ExchangeRatePage: React.FC = () => {
    const { user } = useAuth();
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRate, setNewRate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.schoolId) {
            loadRates();
        }
    }, [user]);

    const loadRates = async () => {
        if (!user?.schoolId) return;
        setLoading(true);
        try {
            const fetchedRates = await apiService.getExchangeRates(user.schoolId);
            setRates(fetchedRates);
        } catch (err) {
            console.error(err);
            setError('Error al cargar tasas.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.schoolId) return;

        const rateValue = parseFloat(newRate.replace(',', '.'));
        if (isNaN(rateValue) || rateValue <= 0) {
            setError('Ingrese una tasa válida.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await apiService.updateExchangeRate(user.schoolId, rateValue, notes);
            setNewRate('');
            setNotes('');
            loadRates(); // Reload list
        } catch (err) {
            console.error(err);
            setError('Error al actualizar la tasa.');
        } finally {
            setSubmitting(false);
        }
    };

    const activeRate = rates.find(r => r.isActive && r.fromCurrency === 'USD' && r.toCurrency === 'VES');

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center text-primary">
                <CashIcon />
                <span className="ml-2">Gestión de Tasa de Cambio (USD - VES)</span>
            </h1>

            {/* Current Rate Card */}
            <div className="bg-surface p-6 rounded-lg shadow border border-border mb-8">
                <h2 className="text-lg font-semibold text-text-primary mb-2">Tasa Actual Activa</h2>
                {activeRate ? (
                    <div>
                        <p className="text-4xl font-bold text-accent">{activeRate.rate.toLocaleString('es-VE')} VES/USD</p>
                        <p className="text-sm text-text-secondary mt-1">
                            Actualizada: {new Date(activeRate.effectiveDate).toLocaleString()}
                        </p>
                        {activeRate.notes && <p className="text-sm text-text-secondary italic">Nota: {activeRate.notes}</p>}
                    </div>
                ) : (
                    <p className="text-text-secondary">No hay tasa activa registrada.</p>
                )}
            </div>

            {/* Update Form */}
            <div className="bg-surface p-6 rounded-lg shadow border border-border mb-8 max-w-xl">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Actualizar Tasa</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Nueva Tasa (VES/USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                            className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:outline-none bg-background text-text-primary"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Nota (Opcional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:outline-none bg-background text-text-primary text-sm"
                            placeholder="Ej. Tasa BCV Mañana"
                        />
                    </div>
                    {error && <p className="text-error text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-2 rounded text-white font-medium transition-colors ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'
                            }`}
                    >
                        {submitting ? 'Actualizando...' : 'Establecer Nueva Tasa'}
                    </button>
                </form>
            </div>

            {/* History Table */}
            <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Historial Reciente</h2>
                <div className="bg-surface rounded-lg shadow border border-border overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tasa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nota</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {rates.slice(0, 10).map((r) => (
                                <tr key={r.exchangeRateID}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                        {new Date(r.effectiveDate).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-primary">
                                        {r.rate.toLocaleString('es-VE')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {r.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.isActive ? 'bg-success text-white' : 'bg-gray-200 text-gray-800'
                                            }`}>
                                            {r.isActive ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExchangeRatePage;
