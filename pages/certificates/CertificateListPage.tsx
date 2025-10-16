import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Certificate } from '../../types';

const CertificateListPage: React.FC = () => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();

    const canCreate = useMemo(() => hasPermission([6]), [hasPermission]);

    const fetchData = async () => {
        if (user?.schoolId) {
            try {
                setLoading(true);
                const data = await apiService.getCertificates(user.schoolId);
                setCertificates(data);
                setError('');
            } catch (err) {
                setError('No se pudo cargar la lista de constancias.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleDelete = async (certificateId: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta constancia?')) {
            try {
                if (user?.schoolId) {
                    await apiService.deleteCertificate(certificateId, user.schoolId);
                    fetchData();
                }
            } catch (err) {
                setError('Error al eliminar la constancia.');
                console.error(err);
            }
        }
    };

    const handleView = (certificate: Certificate) => {
        navigate('/report-viewer', { state: { reportData: certificate, reportType: 'certificate' } });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Constancias Generadas</h1>
                {canCreate && (
                    <Link to="/certificates/generate" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                        Generar Constancia
                    </Link>
                )}
            </div>

            {loading && <p>Cargando constancias...</p>}
            {error && <p className="text-danger">{error}</p>}

            {!loading && !error && (
                certificates.length > 0 ? (
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Estudiante</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Fecha de Emisión</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Firmante</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {certificates.map((cert) => (
                                    <tr key={cert.certificateId} className="hover:bg-background">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{cert.certificateType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary">{cert.studentName || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary">{formatDate(cert.issueDate)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary">{cert.signatoryName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => handleView(cert)} className="text-info hover:text-info-dark font-medium">Ver</button>
                                                <button onClick={() => handleDelete(cert.certificateId)} className="text-danger hover:text-danger-text font-medium">Eliminar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                        <p className="text-secondary">No hay constancias generadas.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default CertificateListPage;