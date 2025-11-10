import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PaginatedPayrolls, User } from '../../types';
import { BriefcaseIcon } from '../../components/icons';
import Modal from '../../components/Modal';

// --- Helper Functions ---
const formatMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodLabel = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

// --- Base Salary Management Component ---
const BaseSalaryManager: React.FC = () => {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm<{ userId: number; baseSalary: number }>();

    useEffect(() => {
        if (authUser?.schoolId) {
            apiService.getUsers(authUser.schoolId).then(allUsers => {
                // Employees are users who are not students (1) or parents (3)
                const employees = allUsers.filter(u => u.roleID !== 1 && u.roleID !== 3);
                setUsers(employees);
            });
        }
    }, [authUser]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(u => u.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, searchTerm]);

    const onSubmit: SubmitHandler<{ userId: number; baseSalary: number }> = async (data) => {
        if (data.baseSalary < 0) {
            setError("El salario base no puede ser negativo.");
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiService.updateBaseSalary({ userID: data.userId, baseSalary: data.baseSalary });
            setSuccess('Salario base actualizado correctamente.');
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el salario.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-md border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Gestión de Sueldos Base</h3>
            {error && <p className="text-danger bg-danger-light p-2 rounded mb-2 text-sm">{error}</p>}
            {success && <p className="text-success bg-success-light p-2 rounded mb-2 text-sm">{success}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-text-secondary">Empleado</label>
                    <input type="text" placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mt-1 w-full p-2 border border-border rounded" />
                    <select {...register('userId', { required: true, valueAsNumber: true })} className="mt-1 w-full p-2 border border-border rounded">
                        <option value="">Seleccionar...</option>
                        {filteredUsers.map(u => <option key={u.userID} value={u.userID}>{u.userName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">Nuevo Salario Base</label>
                    <input type="number" step="0.01" {...register('baseSalary', { required: true, valueAsNumber: true })} className="mt-1 w-full p-2 border border-border rounded" />
                </div>
                <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary h-10">
                    {loading ? 'Guardando...' : 'Guardar Salario'}
                </button>
            </form>
        </div>
    );
};

// --- Main Payroll List Page Component ---
const PayrollListPage: React.FC = () => {
    const [data, setData] = useState<PaginatedPayrolls | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: 0, // 0 for all
        page: 1,
        pageSize: 10
    });

    const [annulModal, setAnnulModal] = useState<{ isOpen: boolean, payrollId: number | null, reason: string }>({ isOpen: false, payrollId: null, reason: '' });

    const fetchPayrolls = useCallback(async () => {
        if (user?.schoolId) {
            setLoading(true);
            setError('');
            apiService.getPayrolls({ 
                schoolId: user.schoolId, 
                page: filters.page, 
                pageSize: filters.pageSize,
                ...(filters.year && { year: filters.year }),
                ...(filters.month && { month: filters.month }),
            })
            .then(setData)
            .catch(err => setError('No se pudieron cargar las nóminas.'))
            .finally(() => setLoading(false));
        }
    }, [user, filters]);

    useEffect(() => {
        fetchPayrolls();
    }, [fetchPayrolls]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: Number(e.target.value), page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleClosePeriod = async (year: number, month: number) => {
        if (window.confirm(`¿Está seguro de cerrar el período ${periodLabel(year, month)}? No podrá generar nuevas nóminas para este período.`) && user) {
            try {
                await apiService.closePayrollPeriod({ schoolId: user.schoolId, year, month });
                fetchPayrolls();
            } catch (err: any) {
                setError(err.message || 'Error al cerrar el período.');
            }
        }
    };

    const handleAnnulConfirm = async () => {
        if (annulModal.payrollId) {
            try {
                await apiService.annulPayroll(annulModal.payrollId, annulModal.reason);
                setAnnulModal({ isOpen: false, payrollId: null, reason: '' });
                fetchPayrolls();
            } catch (err: any) {
                setError(err.message || 'Error al anular la nómina.');
            }
        }
    };

    const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center"><BriefcaseIcon /><span className="ml-2">Dashboard de Nóminas</span></h1>
                <Link to="/payroll/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80">Generar Nómina</Link>
            </div>
            
            <div className="mb-6"><BaseSalaryManager /></div>

            <div className="flex gap-4 mb-4 p-4 bg-background rounded-lg border">
                <select name="year" value={filters.year} onChange={handleFilterChange} className="p-2 border rounded">
                    {[...Array(5)].map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                </select>
                <select name="month" value={filters.month} onChange={handleFilterChange} className="p-2 border rounded">
                    <option value="0">Todos los Meses</option>
                    {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
                </select>
            </div>

            {loading ? <p>Cargando...</p> : error ? <p className="text-danger bg-danger-light p-3 rounded">{error}</p> : (
                <>
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header">
                                <tr>
                                    {['Período', 'Empleados', 'Bruto', 'Deducciones', 'Neto', 'Estado', 'Creado', 'Acciones'].map(h => 
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {data?.items.map(p => (
                                    <tr key={p.payrollID} className="hover:bg-background">
                                        <td className="px-4 py-2">{periodLabel(p.periodYear, p.periodMonth)}</td>
                                        <td className="px-4 py-2">{p.employees}</td>
                                        <td className="px-4 py-2 text-right">{formatMoney(p.grossTotal)}</td>
                                        <td className="px-4 py-2 text-right">{formatMoney(p.deductionsTotal)}</td>
                                        <td className="px-4 py-2 text-right font-bold">{formatMoney(p.netTotal)}</td>
                                        <td className="px-4 py-2">{p.status}</td>
                                        <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString('es-ES')}</td>
                                        <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                                            <button onClick={() => navigate(`/payroll/detail/${p.payrollID}`)} className="text-info hover:underline text-sm">Ver</button>
                                            {p.status !== 'Annulled' && p.status !== 'Closed' &&
                                                <button onClick={() => setAnnulModal({ isOpen: true, payrollId: p.payrollID, reason: '' })} className="text-danger hover:underline text-sm">Anular</button>
                                            }
                                             {p.status === 'Issued' &&
                                                <button onClick={() => handleClosePeriod(p.periodYear, p.periodMonth)} className="text-warning hover:underline text-sm">Cerrar</button>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-text-secondary">Página {data?.page} de {totalPages}. Total: {data?.total} registros.</span>
                        <div className="space-x-2">
                             <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page <= 1} className="py-1 px-3 border rounded disabled:opacity-50">Anterior</button>
                             <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page >= totalPages} className="py-1 px-3 border rounded disabled:opacity-50">Siguiente</button>
                        </div>
                    </div>
                </>
            )}
            <Modal isOpen={annulModal.isOpen} onClose={() => setAnnulModal({ isOpen: false, payrollId: null, reason: '' })} title="Anular Nómina">
                <div className="space-y-4">
                    <p>¿Está seguro de que desea anular la nómina seleccionada? Esta acción es irreversible.</p>
                    <input type="text" placeholder="Motivo (opcional)" value={annulModal.reason} onChange={e => setAnnulModal(prev => ({...prev, reason: e.target.value}))} className="w-full p-2 border rounded"/>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setAnnulModal({ isOpen: false, payrollId: null, reason: '' })} className="bg-background py-2 px-4 rounded">Cancelar</button>
                        <button onClick={handleAnnulConfirm} className="bg-danger text-white py-2 px-4 rounded">Confirmar Anulación</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PayrollListPage;
