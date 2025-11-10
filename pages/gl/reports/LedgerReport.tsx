import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/apiService';
import { LedgerRow, TrialBalanceRow } from '../../../types';
import { exportToCsv } from '../../../lib/exportUtils';

const LedgerReport: React.FC = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<TrialBalanceRow[]>([]);
    const [filters, setFilters] = useState({
        accountCode: '',
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accountSearch, setAccountSearch] = useState('');
    
    useEffect(() => {
        if (user) {
            apiService.getTrialBalance(user.schoolId)
                .then(setAccounts)
                .catch(() => setError('No se pudo cargar el catálogo de cuentas.'));
        }
    }, [user]);

    const fetchData = useCallback(() => {
        if (user && filters.accountCode && filters.from && filters.to) {
            setLoading(true);
            setError('');
            apiService.getLedger(user.schoolId, filters.accountCode, filters.from, filters.to)
                // FIX: Added `new Date()` wrapper to `b.journalDate` to allow sorting by date.
                .then(res => setData(res.sort((a, b) => new Date(a.journalDate).getTime() - new Date(b.journalDate).getTime())))
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [user, filters]);
    
    const filteredAccounts = useMemo(() => {
        if (!accountSearch) return accounts;
        const search = accountSearch.toLowerCase();
        return accounts.filter(acc => 
            acc.accountCode.includes(search) || 
            acc.accountName.toLowerCase().includes(search)
        );
    }, [accounts, accountSearch]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const dataWithRunningBalance = useMemo(() => {
        let balance = 0;
        return data.map(row => {
            balance += (row.debit ?? 0) - (row.credit ?? 0);
            return { ...row, balance };
        });
    }, [data]);

    const format = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end p-4 bg-background rounded-lg border">
                <div className="flex-grow">
                    <label className="text-sm">Cuenta</label>
                    <input 
                        type="text" 
                        value={accountSearch} 
                        onChange={e => setAccountSearch(e.target.value)} 
                        placeholder="Buscar por código o nombre..." 
                        className="w-full p-2 border rounded"
                    />
                    <select name="accountCode" value={filters.accountCode} onChange={handleFilterChange} className="w-full p-2 border rounded mt-1">
                        <option value="">Seleccione una cuenta</option>
                        {filteredAccounts.map(acc => <option key={acc.accountCode} value={acc.accountCode}>{acc.accountCode} - {acc.accountName}</option>)}
                    </select>
                </div>
                <div><label className="text-sm">Desde</label><input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="w-full p-2 border rounded"/></div>
                <div><label className="text-sm">Hasta</label><input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="w-full p-2 border rounded"/></div>
                <button onClick={fetchData} className="bg-primary text-white py-2 px-4 rounded self-end h-10">Buscar</button>
            </div>
            
            <div className="flex justify-end gap-2">
                <button onClick={() => exportToCsv(`ledger_${filters.accountCode}.csv`, dataWithRunningBalance)} className="bg-success text-white py-2 px-4 rounded text-sm">Exportar a CSV</button>
            </div>

            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {data.length > 0 && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead>
                            <tr>
                                {['Fecha', 'Journal', 'Línea', 'Memo', 'Origen', 'Débito', 'Crédito', 'Saldo'].map(h => 
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {dataWithRunningBalance.map((row, i) => (
                                <tr key={`${row.journalID}-${row.lineNo}`}>
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(row.journalDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{row.journalID}</td>
                                    <td className="px-4 py-2">{row.lineNo}</td>
                                    <td className="px-4 py-2">{row.memo}</td>
                                    <td className="px-4 py-2">{row.sourceCode} {row.sourceID}</td>
                                    <td className="px-4 py-2 text-right">{format(row.debit)}</td>
                                    <td className="px-4 py-2 text-right">{format(row.credit)}</td>
                                    <td className="px-4 py-2 text-right font-medium">{format(row.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LedgerReport;