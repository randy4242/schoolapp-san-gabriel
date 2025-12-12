
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Certificate, User, Classroom } from '../../types';
import { DocumentTextIcon, XIcon, ClipboardCheckIcon, EyeIcon, PencilAltIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';

// Helpers
const getStatus = (content: string | undefined | null): 'Approved' | 'Rejected' | 'Pending' => {
    if (!content) return 'Pending';
    if (content.startsWith('[BOLETA_CONFIRMADA]')) return 'Approved';
    if (content.startsWith('[BOLETA_RECHAZADA]')) return 'Rejected';
    return 'Pending';
};

const cleanContent = (content: string | undefined | null) => {
    if (!content) return '';
    return content
        .replace('[BOLETA_CONFIRMADA]', '')
        .replace('[BOLETA_RECHAZADA]', '')
        .trim();
};

// Helper to remove [Internal Tags] from classroom names for display
const cleanClassroomName = (name: string) => {
    return name.replace(/^\[.*?\]\s*/, '');
};

const BoletaListPage: React.FC = () => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [salonFilter, setSalonFilter] = useState<string>('');
    const [sectionFilter, setSectionFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>(''); // Filter: Pending, Approved, Rejected
    const [highlightId, setHighlightId] = useState<number | null>(null);
    
    const [boletaToDelete, setBoletaToDelete] = useState<Certificate | null>(null);
    
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [boletaToReject, setBoletaToReject] = useState<Certificate | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [boletaToApprove, setBoletaToApprove] = useState<Certificate | null>(null);

    const [actionLoading, setActionLoading] = useState(false);
    
    // Refs for scrolling
    const highlightRef = useRef<HTMLTableRowElement>(null);

    // View permissions
    const canManage = useMemo(() => hasPermission([6, 7, 2, 9, 10, 3]), [hasPermission]);
    // Edit permissions (Parents excluded)
    const canEdit = useMemo(() => hasPermission([6, 7, 2, 9, 10]), [hasPermission]);
    const isSuperAdmin = useMemo(() => hasPermission([6, 7]), [hasPermission]);
    const isParent = useMemo(() => hasPermission([3]), [hasPermission]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const highlight = params.get('highlight');
        if (highlight) {
            setHighlightId(Number(highlight));
        } else {
            setHighlightId(null);
        }
    }, [location.search]);

    useEffect(() => {
        if (highlightId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId, loading]);

    const fetchData = async () => {
        if (user?.schoolId) {
            try {
                setLoading(true);
                setError('');

                // 1. Fetch Certificates
                const certData = await apiService.getCertificates(user.schoolId);
                setCertificates(certData.filter(c => c.certificateType === 'Boleta'));

                // 2. Fetch Students (Context-aware)
                let studentData: User[] = [];
                try {
                    if (isParent) {
                        const children = await apiService.getChildrenOfParent(user.userId, user.schoolId);
                        studentData = children.map(c => ({
                            userID: c.userID,
                            userName: c.userName,
                            email: c.email,
                            roleID: 1, 
                            schoolID: user.schoolId,
                            isBlocked: false,
                            cedula: null,
                            phoneNumber: null
                        }));
                    } else {
                        studentData = await apiService.getStudents(user.schoolId);
                    }
                    setStudents(studentData);
                } catch (e) {
                    console.warn("Could not load student list details:", e);
                }

                // 3. Fetch Classrooms (For Section Filtering)
                try {
                    const classData = await apiService.getClassrooms(user.schoolId);
                    setClassrooms(classData);
                } catch (e) {
                    console.warn("Could not load classrooms:", e);
                }

            } catch (err) {
                setError('No se pudo cargar la lista de boletas. Verifique su conexión.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isParent]);

    const studentMap = useMemo(() => {
        return new Map(students.map(s => [s.userID, s.userName]));
    }, [students]);

    // Map Classroom ID -> Classroom Name for quick lookup
    const classroomNameMap = useMemo(() => {
        return new Map(classrooms.map(c => [c.classroomID, c.name]));
    }, [classrooms]);

    // Map Student ID -> Classroom Name (Current assignment) - CLEANED NAME
    const studentClassroomMap = useMemo(() => {
        const map = new Map<number, string>();
        students.forEach(s => {
            if (s.classroomID) {
                const clsName = classroomNameMap.get(s.classroomID);
                if (clsName) {
                    // Remove internal tags like [Primer Grado]
                    map.set(s.userID, cleanClassroomName(clsName));
                }
            }
        });
        return map;
    }, [students, classroomNameMap]);

    const uniqueSalons = useMemo(() => {
        const salons = new Set<string>();
        certificates.forEach(cert => {
            try {
                const clean = cleanContent(cert.content);
                if (clean) {
                    const contentJson = JSON.parse(clean);
                    if (contentJson.level) {
                        salons.add(contentJson.level);
                    }
                }
            } catch (e) {}
        });
        return Array.from(salons).sort();
    }, [certificates]);

    const confirmDelete = async () => {
        if (!boletaToDelete || !user?.schoolId) return;

        try {
            await apiService.deleteCertificate(boletaToDelete.certificateId, user.schoolId);
            fetchData(); 
            setBoletaToDelete(null); 
        } catch (err) {
            setError('Error al eliminar la boleta.');
            console.error(err);
            setBoletaToDelete(null); 
        }
    };

    const handleView = (certificate: Certificate) => {
        const resolvedName = certificate.studentName || studentMap.get(certificate.userId) || 'N/A';
        const certWithStudent = { ...certificate, studentName: resolvedName };
        navigate('/report-viewer', { state: { reportData: certWithStudent, reportType: 'boleta' } });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: '2-digit', month: '2-digit', day: '2-digit'
        });
    }
    
    // Open Approve Modal
    const openApproveModal = (cert: Certificate) => {
        setBoletaToApprove(cert);
        setApproveModalOpen(true);
    };

    // Action: Confirm Approve
    const handleApproveConfirm = async () => {
        if (!isSuperAdmin || !user?.schoolId || !boletaToApprove) return;
        
        setActionLoading(true);
        try {
            const rawContent = cleanContent(boletaToApprove.content);
            let contentJson: any = {};
            try {
                contentJson = JSON.parse(rawContent);
            } catch (e) {
                console.error("Error parsing content JSON", e);
            }

            const newContent = `[BOLETA_CONFIRMADA]${rawContent}`;
            
            const payload = {
                userId: boletaToApprove.userId,
                certificateType: boletaToApprove.certificateType,
                signatoryName: boletaToApprove.signatoryName || '',
                signatoryTitle: boletaToApprove.signatoryTitle || '',
                content: newContent,
                schoolId: user.schoolId,
                issueDate: boletaToApprove.issueDate
            };
            
            await apiService.updateCertificate(boletaToApprove.certificateId, payload);

            // Notify creator
            if (contentJson.createdBy && contentJson.createdBy !== user.userId) {
                const studentName = studentMap.get(boletaToApprove.userId) || 'Estudiante';
                try {
                    await apiService.sendNotification({
                        userID: Number(contentJson.createdBy),
                        schoolID: user.schoolId,
                        title: `[BOLETA_STATUS] Boleta Aprobada`,
                        content: `La boleta de ${studentName} ha sido aprobada por la administración.\n\nURL: #/boletas/edit/${boletaToApprove.certificateId}`
                    });
                } catch (notifError) {
                    console.warn("Could not send notification", notifError);
                }
            }

            await fetchData();
            setApproveModalOpen(false);
        } catch (e) {
            console.error(e);
            setError("Error al aprobar la boleta.");
        } finally {
            setActionLoading(false);
            setBoletaToApprove(null);
        }
    };

    // Action: Open Reject Modal
    const openRejectModal = (cert: Certificate) => {
        setBoletaToReject(cert);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    // Action: Confirm Reject
    const handleRejectConfirm = async () => {
        if (!boletaToReject || !user?.schoolId) return;
        
        setActionLoading(true);
        try {
            const rawContent = cleanContent(boletaToReject.content);
            let contentJson: any = {};
            try {
                contentJson = JSON.parse(rawContent);
            } catch (e) {}
            
            const newContent = `[BOLETA_RECHAZADA]${rawContent}`;

            const payload = {
                userId: boletaToReject.userId,
                certificateType: boletaToReject.certificateType,
                signatoryName: boletaToReject.signatoryName || '',
                signatoryTitle: boletaToReject.signatoryTitle || '',
                content: newContent, 
                schoolId: user.schoolId,
                issueDate: boletaToReject.issueDate
            };
            await apiService.updateCertificate(boletaToReject.certificateId, payload);

            if (contentJson.createdBy) {
                const studentName = studentMap.get(boletaToReject.userId) || 'Estudiante';
                await apiService.sendNotification({
                    userID: Number(contentJson.createdBy),
                    schoolID: user.schoolId,
                    title: `[BOLETA_STATUS] Boleta Rechazada`,
                    content: `La boleta de ${studentName} ha sido rechazada.\n\nMotivo: ${rejectionReason}\n\nPor favor corrija y vuelva a guardar.`
                });
            }
            
            setRejectModalOpen(false);
            await fetchData();
        } catch (e) {
            console.error(e);
            setError("Error al rechazar la boleta.");
        } finally {
            setActionLoading(false);
            setBoletaToReject(null);
        }
    };
    
    const clearHighlight = () => {
        setHighlightId(null);
        navigate('/boletas', { replace: true }); 
    };

    const filteredCertificates = useMemo(() => {
        return certificates.filter(c => {
            const status = getStatus(c.content);

            // 1. Parent Filtering
            if (isParent) {
                if (status !== 'Approved') return false;
            }

            // 2. Teacher View Logic
            let createdBy = 0;
            try {
                const clean = cleanContent(c.content);
                if (clean) {
                    const contentJson = JSON.parse(clean);
                    createdBy = contentJson.createdBy;
                }
            } catch (e) {}

            if (!isSuperAdmin && !isParent && user && createdBy !== user.userId) {
                if (createdBy) return false; 
            }

            // 3. Status Filter (New)
            if (statusFilter && status !== statusFilter) {
                return false;
            }

            // 4. Search Filter
            const lowerTerm = searchTerm.toLowerCase();
            const name = c.studentName || studentMap.get(c.userId) || '';
            const nameMatch = name.toLowerCase().includes(lowerTerm);

            // 5. Salon Level Filter
            let level = '';
            try {
                const clean = cleanContent(c.content);
                if (clean) {
                    const contentJson = JSON.parse(clean);
                    level = contentJson.level || '';
                }
            } catch (e) {}
            const salonMatch = !salonFilter || level === salonFilter;

            // 6. Section Filter
            let sectionMatch = true;
            if (sectionFilter) {
                const currentClassroomName = studentClassroomMap.get(c.userId) || '';
                sectionMatch = currentClassroomName.toLowerCase().includes(sectionFilter.toLowerCase());
            }

            // 7. Highlight Filter
            if (highlightId) {
                return c.certificateId === highlightId;
            }

            return nameMatch && salonMatch && sectionMatch;
        });
    }, [certificates, searchTerm, salonFilter, sectionFilter, statusFilter, studentMap, studentClassroomMap, isSuperAdmin, isParent, user, highlightId]);

    if (!canManage) {
        return <p className="text-danger p-4">No tienes permisos para ver esta sección.</p>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                     <DocumentTextIcon />
                     <h1 className="text-2xl font-bold text-text-primary ml-2">Boletas de Calificaciones</h1>
                </div>
                {canEdit && (
                    <Link to="/boletas/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                        Crear Nueva Boleta
                    </Link>
                )}
            </div>
            
            {highlightId && (
                <div className="bg-info-light p-3 rounded mb-4 flex justify-between items-center border border-info">
                    <span className="text-info-text font-bold flex items-center">
                        <span className="mr-2">🔍</span>
                        Filtrando boleta específica #{highlightId}
                    </span>
                    <button onClick={clearHighlight} className="text-sm bg-white border border-info text-info-text px-3 py-1 rounded hover:bg-info-light transition-colors">
                        Ver todas
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    disabled={!!highlightId}
                    className="w-full md:w-1/4 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50"
                />
                
                {/* Salon / Nivel Filter */}
                <select
                    value={salonFilter}
                    onChange={e => setSalonFilter(e.target.value)}
                    disabled={!!highlightId}
                    className="w-full md:w-1/4 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50"
                >
                    <option value="">Nivel: Todos</option>
                    {uniqueSalons.map(salon => (
                        <option key={salon} value={salon}>{salon}</option>
                    ))}
                </select>

                {/* Section / Letter Filter */}
                <input
                    type="text"
                    placeholder="Sección/Letra (ej: A)"
                    value={sectionFilter}
                    onChange={e => setSectionFilter(e.target.value)}
                    disabled={!!highlightId}
                    className="w-full md:w-1/4 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50"
                />

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    disabled={!!highlightId}
                    className="w-full md:w-1/4 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50"
                >
                    <option value="">Estado: Todas</option>
                    <option value="Pending">Pendiente</option>
                    <option value="Approved">Aprobada</option>
                    <option value="Rejected">Rechazada</option>
                </select>
            </div>

            {loading && <p>Cargando boletas...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded mb-4">{error}</p>}

            {!loading && !error && (
                certificates.length > 0 ? (
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-header">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase">Estudiante</th>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase">Fecha</th>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase">Nivel</th>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase">Sección</th>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase">Estado</th>
                                    <th className="px-4 py-2 text-left font-medium text-text-on-primary uppercase w-1">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {filteredCertificates.length > 0 ? filteredCertificates.map((cert) => {
                                    let level = "Desconocido";
                                    const status = getStatus(cert.content);
                                    try {
                                        const clean = cleanContent(cert.content);
                                        if (clean) {
                                            const contentJson = JSON.parse(clean);
                                            level = contentJson.level || "Desconocido";
                                        }
                                    } catch (e) {}
                                    
                                    const studentName = cert.studentName || studentMap.get(cert.userId) || 'N/A';
                                    const currentSection = studentClassroomMap.get(cert.userId) || '—';
                                    const isHighlighted = highlightId === cert.certificateId;

                                    let statusBadge;
                                    if (status === 'Approved') {
                                        statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-success-light text-success-text">Aprobada</span>;
                                    } else if (status === 'Rejected') {
                                        statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-danger-light text-danger-text">Rechazada</span>;
                                    } else {
                                        statusBadge = <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-dark">Pendiente</span>;
                                    }

                                    return (
                                        <tr 
                                            key={cert.certificateId} 
                                            ref={isHighlighted ? highlightRef : null}
                                            className={`hover:bg-background transition-colors ${isHighlighted ? 'bg-yellow-100 border-l-4 border-warning' : ''}`}
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap font-medium text-text-primary">{studentName}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{formatDate(cert.issueDate)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{level}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{currentSection}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                {statusBadge}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <button 
                                                        onClick={() => handleView(cert)} 
                                                        className="text-info hover:text-info-dark p-1 rounded hover:bg-info-light/20"
                                                        title="Ver Boleta"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {canEdit && (
                                                        <>
                                                            <Link 
                                                                to={`/boletas/edit/${cert.certificateId}`} 
                                                                className="text-warning hover:text-warning-dark p-1 rounded hover:bg-warning/10"
                                                                title="Editar Boleta"
                                                            >
                                                                <PencilAltIcon className="w-5 h-5" />
                                                            </Link>
                                                            <button 
                                                                onClick={() => setBoletaToDelete(cert)} 
                                                                className="text-danger hover:text-danger-text p-1 rounded hover:bg-danger-light/20"
                                                                title="Eliminar Boleta"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    
                                                    {isSuperAdmin && status !== 'Approved' && (
                                                        <>
                                                            <button 
                                                                onClick={() => openApproveModal(cert)} 
                                                                className="text-success hover:text-success-text p-1 rounded hover:bg-success-light/20"
                                                                title="Aprobar Boleta"
                                                            >
                                                                <ClipboardCheckIcon className="w-5 h-5" />
                                                            </button>
                                                            {status !== 'Rejected' && (
                                                                <button 
                                                                    onClick={() => openRejectModal(cert)} 
                                                                    className="text-danger hover:text-danger-text p-1 rounded hover:bg-danger-light/20"
                                                                    title="Rechazar Boleta"
                                                                >
                                                                    <XIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-secondary">
                                            {searchTerm || salonFilter || sectionFilter || statusFilter || highlightId 
                                                ? 'No se encontraron boletas con los filtros actuales.' 
                                                : 'No hay boletas disponibles.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                        <p className="text-secondary">No hay boletas generadas (o no tienes permiso para verlas).</p>
                    </div>
                )
            )}

            {/* Delete Modal */}
            {boletaToDelete && (
                <Modal isOpen={true} onClose={() => setBoletaToDelete(null)} title="Confirmar Eliminación">
                    <p>
                        ¿Estás seguro de que deseas eliminar la boleta para el estudiante 
                        <strong> {boletaToDelete.studentName || studentMap.get(boletaToDelete.userId)}</strong>?
                    </p>
                    <p className="text-sm text-secondary mt-2">
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end space-x-4 pt-4 mt-4 border-t">
                        <button 
                            type="button" 
                            onClick={() => setBoletaToDelete(null)}
                            className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark transition-colors"
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </Modal>
            )}

            {/* Approve Modal */}
            {approveModalOpen && (
                <Modal isOpen={true} onClose={() => setApproveModalOpen(false)} title="Aprobar Boleta">
                    <p>¿Está seguro de aprobar esta boleta? Cambiará su estado a "Aprobada" y se notificará al docente.</p>
                    <div className="flex justify-end space-x-4 pt-4 border-t mt-4">
                        <button 
                            onClick={() => setApproveModalOpen(false)}
                            className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleApproveConfirm}
                            disabled={actionLoading}
                            className="bg-success text-text-on-primary py-2 px-4 rounded hover:bg-success-text transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? 'Aprobando...' : 'Sí, Aprobar'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Reject Modal */}
            {rejectModalOpen && (
                <Modal isOpen={true} onClose={() => setRejectModalOpen(false)} title="Rechazar Boleta">
                    <p className="mb-2">Indique el motivo del rechazo para notificar al docente:</p>
                    <textarea 
                        className="w-full p-2 border border-border rounded mb-4 bg-background text-text-primary"
                        rows={3}
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Ej: Faltan observaciones, fecha incorrecta..."
                    />
                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button 
                            onClick={() => setRejectModalOpen(false)}
                            className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleRejectConfirm}
                            disabled={actionLoading}
                            className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? 'Procesando...' : 'Rechazar y Notificar'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BoletaListPage;
