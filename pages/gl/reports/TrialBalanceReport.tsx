import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/apiService';
import { TrialBalanceRow } from '../../../types';
import { exportToCsv } from '../../../lib/exportUtils';

const TrialBalanceReport: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<TrialBalanceRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof TrialBalanceRow; direction: 'asc' | 'desc' }>({ key: 'accountCode', direction: 'asc' });

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        setError('');
        apiService.getTrialBalance(user.schoolId)
            .then(setData)
            .catch(err => setError(err.message || 'Error al cargar el balance de comprobación.'))
            .finally(() => setLoading(false));
    }, [user]);

    const sortedData = useMemo(() => {
        const sortableData = [...data];
        sortableData.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableData;
    }, [data, sortConfig]);

    const groupedData = useMemo(() => {
        // FIX: Use generic on reduce to correctly type the accumulator and avoid downstream type errors.
        return sortedData.reduce<Record<string, { rows: TrialBalanceRow[], totals: { debit: number, credit: number, net: number } }>>((acc, row) => {
            const type = row.accountType || 'Sin Tipo';
            if (!acc[type]) {
                acc[type] = { rows: [], totals: { debit: 0, credit: 0, net: 0 } };
            }
            acc[type].rows.push(row);
            acc[type].totals.debit += row.totalDebit;
            acc[type].totals.credit += row.totalCredit;
            acc[type].totals.net += row.net;
            return acc;
        }, {});
    }, [sortedData]);
    
    const grandTotals = useMemo(() => {
        return data.reduce((acc, row) => {
            acc.debit += row.totalDebit;
            acc.credit += row.totalCredit;
            acc.net += row.net;
            return acc;
        }, { debit: 0, credit: 0, net: 0 });
    }, [data]);

    const handleSort = (key: keyof TrialBalanceRow) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const format = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <button onClick={() => exportToCsv(`trial_balance.csv`, sortedData)} className="bg-success text-white py-2 px-4 rounded text-sm">Exportar a CSV</button>
            </div>
            
            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}

            {Object.entries(groupedData).map(([type, group]) => (
                <div key={type} className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <h3 className="text-lg font-semibold p-4 bg-background">{type}</h3>
                    <table className="min-w-full divide-y">
                        <thead className="bg-header-light">
                            <tr>
                                <th onClick={() => handleSort('accountCode')} className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer">Código</th>
                                <th onClick={() => handleSort('accountName')} className="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer">Nombre Cuenta</th>
                                <th onClick={() => handleSort('totalDebit')} className="px-4 py-3 text-right text-xs font-medium uppercase cursor-pointer">Débito</th>
                                <th onClick={() => handleSort('totalCredit')} className="px-4 py-3 text-right text-xs font-medium uppercase cursor-pointer">Crédito</th>
                                <th onClick={() => handleSort('net')} className="px-4 py-3 text-right text-xs font-medium uppercase cursor-pointer">Neto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.rows.map(row => (
                                <tr key={row.accountCode}>
                                    <td className="px-4 py-2">{row.accountCode}</td>
                                    <td className="px-4 py-2">{row.accountName}</td>
                                    <td className="px-4 py-2 text-right">{format(row.totalDebit)}</td>
                                    <td className="px-4 py-2 text-right">{format(row.totalCredit)}</td>
                                    <td className="px-4 py-2 text-right font-medium">{format(row.net)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold bg-background">
                            <tr>
                                <td colSpan={2} className="px-4 py-2 text-right">Subtotal {type}:</td>
                                <td className="px-4 py-2 text-right">{format(group.totals.debit)}</td>
                                <td className="px-4 py-2 text-right">{format(group.totals.credit)}</td>
                                <td className="px-4 py-2 text-right">{format(group.totals.net)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ))}
            <div className="bg-primary text-white font-bold p-4 rounded-lg flex justify-end gap-8">
                <span>Total Débito: {format(grandTotals.debit)}</span>
                <span>Total Crédito: {format(grandTotals.credit)}</span>
                <span>Neto: {format(grandTotals.net)}</span>
            </div>
        </div>
    );
};

export default TrialBalanceReport;