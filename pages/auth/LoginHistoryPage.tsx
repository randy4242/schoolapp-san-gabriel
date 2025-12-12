
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { LoginHistoryRecord, User, ROLES } from '../../types';
import { Link } from 'react-router-dom';
import { HistoryIcon } from '../../components/icons';

const LoginHistoryPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const [history, setHistory] = useState<LoginHistoryRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (user?.schoolId && hasPermission([6])) {
            Promise.all([
                apiService.getLoginHistory(user.schoolId),
                apiService.getUsers(user.schoolId)
            ]).then(([historyData, usersData]) => {
                setHistory(historyData.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()));
                setUsers(usersData);
            })
            .catch(err => {
                setError('No se pudo cargar el historial de inicios de sesión o la lista de usuarios.');
                console.error(err);
            })
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user, hasPermission]);
    
    const userNameToRoleMap = useMemo(() => {
        return new Map(users.map(u => [u.userName, u.roleID]));
    }, [users]);

    const filteredHistory = useMemo(() => {
        let filtered = history;

        if (searchTerm) {
            filtered = filtered.filter(record => 
                record.userName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (roleFilter !== 'all') {
            const roleId = parseInt(roleFilter, 10);
            filtered = filtered.filter(record => {
                const userRole = userNameToRoleMap.get(record.userName);
                return userRole === roleId;
            });
        }
        
        const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
        const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

        if (start || end) {
            filtered = filtered.filter(record => {
                const recordDate = new Date(record.loginTime);
                if (start && recordDate < start) return false;
                if (end && recordDate > end) return false;
                return true;
            });
        }

        return filtered;
    }, [history, searchTerm, roleFilter, startDate, endDate, userNameToRoleMap]);


    if (!hasPermission([6])) {
        return (
            <div className="text-center p-8 bg-surface rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-danger">Acceso Denegado</h1>
                <p className="text-secondary mt-2">No tienes los permisos necesarios para ver esta página.</p>
                <Link to="/dashboard" className="mt-4 inline-block bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        // Add 2 hours correction
        date.setHours(date.getHours() + 2);
        
        return date.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };
    
    const statusBadge = (success: boolean) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${success ? 'bg-success-light text-success-text' : 'bg-danger-light text-danger-text'}`}>
            {success ? "Éxito" : "Fallo"}
        </span>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center">
                    <HistoryIcon />
                    <span className="ml-2">Historial de Inicios de Sesión</span>
                </h1>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-background rounded-lg border">
                <input 
                    type="text"
                    placeholder="Buscar por usuario..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-dark rounded focus:outline-none focus:ring-2 focus:ring-accent/50 bg-secondary text-text-on-primary placeholder:text-text-tertiary"
                />
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full p-2 border border-dark rounded bg-secondary text-text-on-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                    <option value="all">Todos los Roles</option>
                    {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <div>
                    <label htmlFor="startDate" className="text-xs text-text-secondary">Desde:</label>
                    <input 
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full p-2 border border-dark rounded bg-secondary text-text-on-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="text-xs text-text-secondary">Hasta:</label>
                    <input 
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full p-2 border border-dark rounded bg-secondary text-text-on-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}

            {loading ? (
                <p>Cargando historial...</p>
            ) : (
                <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block">
                        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-header">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Fecha y Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Mensaje</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {filteredHistory.length > 0 ? filteredHistory.map((record) => (
                                        <tr key={record.historyID} className="hover:bg-background">
                                            <td className="px-6 py-4 whitespace-nowrap">{record.userName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatDate(record.loginTime)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{statusBadge(record.loginSuccess)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{record.loginMessage || 'N/A'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-secondary">
                                                No se encontraron registros que coincidan con los filtros.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredHistory.length > 0 ? filteredHistory.map((record) => (
                            <div key={record.historyID} className="bg-surface shadow-md rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-text-primary break-all">{record.userName}</span>
                                    {statusBadge(record.loginSuccess)}
                                </div>
                                <div className="text-sm text-text-secondary mb-3">
                                    {formatDate(record.loginTime)}
                                </div>
                                <p className="text-sm text-text-primary bg-background p-2 rounded break-words">
                                    {record.loginMessage || 'N/A'}
                                </p>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-secondary bg-surface rounded-lg shadow-md">
                                No se encontraron registros que coincidan con los filtros.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default LoginHistoryPage;
