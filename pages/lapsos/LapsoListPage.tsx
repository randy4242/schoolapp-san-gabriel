import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Lapso } from '../../types';

const LapsoListPage: React.FC = () => {
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user } = useAuth();

    const fetchLapsos = async () => {
        if (user?.schoolId) {
            try {
                setLoading(true);
                const data = await apiService.getLapsos(user.schoolId);
                setLapsos(data);
                setError('');
            } catch (err) {
                setError('No se pudo cargar la lista de lapsos.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchLapsos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleDelete = async (lapsoId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este lapso?')) {
            if (!user?.schoolId) {
                setError('No se pudo identificar el colegio para la eliminación.');
                return;
            }
            try {
                await apiService.deleteLapso(lapsoId, user.schoolId);
                setSuccess('Lapso eliminado correctamente.');
                fetchLapsos(); // Refetch lapsos after deletion
            } catch (err) {
                setError('Error al eliminar el lapso.');
                setSuccess('');
                console.error(err);
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Gestión de Lapsos</h1>
                <Link to="/lapsos/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                    Crear Nuevo Lapso
                </Link>
            </div>
            
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
            {success && <p className="bg-success-light text-success p-3 rounded mb-4">{success}</p>}

            {loading ? (
                <p>Cargando lapsos...</p>
            ) : !lapsos.length ? (
                <div className="bg-info-light text-info-dark p-4 rounded-lg">No se encontraron lapsos.</div>
            ) : (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Fecha de Inicio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Fecha de Fin</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {lapsos.map((lapso) => (
                                <tr key={lapso.lapsoID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{lapso.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(lapso.fechaInicio)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(lapso.fechaFin)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                        <Link to={`/lapsos/edit/${lapso.lapsoID}`} className="text-warning hover:text-warning-dark font-medium">
                                            Editar
                                        </Link>
                                        <button onClick={() => handleDelete(lapso.lapsoID)} className="text-danger hover:text-danger-text font-medium">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LapsoListPage;