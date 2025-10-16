import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { LoginHistoryRecord } from '../../types';
import { Link } from 'react-router-dom';
import { HistoryIcon } from '../../components/icons';

const LoginHistoryPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const [history, setHistory] = useState<LoginHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.schoolId && hasPermission([6])) {
            apiService.getLoginHistory(user.schoolId)
                .then(data => {
                    setHistory(data.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()));
                })
                .catch(err => {
                    setError('No se pudo cargar el historial de inicios de sesión.');
                    console.error(err);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user, hasPermission]);

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
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center">
                    <HistoryIcon />
                    <span className="ml-2">Historial de Inicios de Sesión</span>
                </h1>
            </div>

            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}

            {loading ? (
                <p>Cargando historial...</p>
            ) : (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Fecha y Hora</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Mensaje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {history.length > 0 ? history.map((record) => (
                                <tr key={record.historyID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{record.historyID}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{record.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(record.loginTime)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.loginSuccess ? 'bg-success-light text-success-text' : 'bg-danger-light text-danger-text'}`}>
                                            {record.loginSuccess ? "Éxito" : "Fallo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{record.loginMessage || 'N/A'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-secondary">
                                        No se encontraron registros de inicio de sesión.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LoginHistoryPage;