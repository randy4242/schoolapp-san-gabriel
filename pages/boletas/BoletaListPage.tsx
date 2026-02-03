
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Certificate, User, Classroom, Course } from '../../types';
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

const cleanClassroomName = (name: string) => {
    return name.replace(/^\[.*?\]\s*/, '');
};

const BoletaListPage: React.FC = () => {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [salonFilter, setSalonFilter] = useState<string>('');
    const [sectionFilter, setSectionFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>(''); 
    const [highlightId, setHighlightId] = useState<number | null>(null);
    
    // Permissions State
    const [authorizedClassroomIds, setAuthorizedClassroomIds] = useState<Set<number>>(new Set());
    
    const [boletaToDelete, setBoletaToDelete] = useState<Certificate | null>(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [boletaToReject, setBoletaToReject] = useState<Certificate | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [boletaToApprove, setBoletaToApprove] = useState<Certificate | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    const highlightRef = useRef<HTMLTableRowElement>(null);

    const isSuperAdmin = useMemo(() => hasPermission([6, 7]), [hasPermission]);
    const isParent = user?.roleId === 3;
    const canEdit = useMemo(() => hasPermission([6, 7, 2, 9, 10]), [hasPermission]);

    const fetchData = useCallback(async () => {
        if (!user?.schoolId) return;
        
        try {
            setLoading(true);
            setError('');

            const [certData, classroomData, userData, courseData] = await Promise.all([
                apiService.getCertificates(user.schoolId),
                apiService.getClassrooms(user.schoolId),
                apiService.getUsers(user.schoolId),
                apiService.getCourses(user.schoolId)
            ]);

            setCertificates(certData.filter(c => c.certificateType === 'Boleta'));
            setClassrooms(classroomData);
            setAllUsers(userData);
            setCourses(courseData);

            // Fetch Teacher Mapping if applicable (Not admin, not parent)
            if (!isSuperAdmin && !isParent) {
                try {
                    // Llamamos al endpoint
                    const mappings = await apiService.getTeacherClassrooms(user.userId, user.schoolId);
                    
                    // CAMBIO AQUÍ: Usamos m.classroomID (minúscula) para coincidir con el API y la interfaz
                    const mappedIds = new Set(mappings.map((m: any) => m.classroomID));
                    
                    console.log("Salones autorizados para el profe:", mappedIds); // Un log para debug
                    setAuthorizedClassroomIds(mappedIds);
                } catch (e) {
                    console.error("Failed to fetch teacher classroom mapping", e);
                }
            }

        } catch (err) {
            setError('No se pudo cargar la lista de boletas.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, isSuperAdmin, isParent]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Mapeos base
    const userToClassroomMap = useMemo(() => new Map(allUsers.map(u => [u.userID, u.classroomID])), [allUsers]);
    const studentMap = useMemo(() => new Map(allUsers.map(u => [u.userID, u])), [allUsers]);
    const classroomNameMap = useMemo(() => new Map(classrooms.map(c => [c.classroomID, c.name])), [classrooms]);

    // --- LÓGICA DE JURISDICCIÓN COMBINADA ---
    const myClassroomIds = useMemo(() => {
        if (!user || isSuperAdmin || isParent) return new Set<number>();

        // Start with IDs from API endpoint (Official assignment via Courses + Additional Teacher)
        const myIds = new Set<number>(authorizedClassroomIds);

        // Add IDs by Authorship (Fallback/Legacy: If I created a boleta here, I can see it)
        certificates.forEach(c => {
            let createdBy = 0;
            try {
                const json = JSON.parse(cleanContent(c.content));
                createdBy = json.createdBy;
            } catch(e) {}

            if (createdBy === user.userId) {
                const studentClassId = userToClassroomMap.get(c.userId);
                if (studentClassId) myIds.add(studentClassId);
            }
        });

        return myIds;
    }, [authorizedClassroomIds, certificates, user, isSuperAdmin, isParent, userToClassroomMap]);

    // --- FILTRADO ---
    const filteredCertificates = useMemo(() => {
        return certificates.filter(c => {
            const status = getStatus(c.content);
            const student = studentMap.get(c.userId);

            if (isParent) return status === 'Approved';

            // Lógica para Profesores
            if (!isSuperAdmin && user) {
                const studentClassId = userToClassroomMap.get(c.userId);
                // Si el alumno pertenece a un salón donde el profesor tiene "jurisdicción"
                if (!studentClassId || !myClassroomIds.has(studentClassId)) return false;
            }

            // Filtros de UI
            if (statusFilter && status !== statusFilter) return false;
            const lowerTerm = searchTerm.toLowerCase();
            const name = c.studentName || student?.userName || '';
            if (!name.toLowerCase().includes(lowerTerm)) return false;

            let levelInCert = '';
            try {
                const clean = cleanContent(c.content);
                if (clean) levelInCert = JSON.parse(clean).level || '';
            } catch (e) {}
            if (salonFilter && levelInCert !== salonFilter) return false;

            if (sectionFilter) {
                const clsId = userToClassroomMap.get(c.userId);
                const clsName = clsId ? classroomNameMap.get(clsId) || '' : '';
                if (!clsName.toLowerCase().includes(sectionFilter.toLowerCase())) return false;
            }

            if (highlightId) return c.certificateId === highlightId;

            return true;
        });
    }, [certificates, searchTerm, salonFilter, sectionFilter, statusFilter, studentMap, isSuperAdmin, isParent, user, highlightId, myClassroomIds, userToClassroomMap, classroomNameMap]);

    const uniqueSalons = useMemo(() => {
        const salons = new Set<string>();
        certificates.forEach(cert => {
            try {
                const clean = cleanContent(cert.content);
                if (clean) {
                    const contentJson = JSON.parse(clean);
                    if (contentJson.level) salons.add(contentJson.level);
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
            setBoletaToDelete(null); 
        }
    };

    const handleView = (certificate: Certificate) => {
        const student = studentMap.get(certificate.userId);
        const resolvedName = certificate.studentName || student?.userName || 'N/A';
        const certWithStudent = { ...certificate, studentName: resolvedName };
        navigate('/report-viewer', { state: { reportData: certWithStudent, reportType: 'boleta' } });
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: '2-digit', month: '2-digit', day: '2-digit' });
    
    const openApproveModal = (cert: Certificate) => { setBoletaToApprove(cert); setApproveModalOpen(true); };
    const openRejectModal = (cert: Certificate) => { setBoletaToReject(cert); setRejectModalOpen(true); setRejectionReason(''); };

    const handleApproveConfirm = async () => {
        if (!isSuperAdmin || !user?.schoolId || !boletaToApprove) return;
        setActionLoading(true);
        try {
            const rawContent = cleanContent(boletaToApprove.content);
            const newContent = `[BOLETA_CONFIRMADA]${rawContent}`;
            await apiService.updateCertificate(boletaToApprove.certificateId, {
                userId: boletaToApprove.userId,
                certificateType: boletaToApprove.certificateType,
                signatoryName: boletaToApprove.signatoryName || '',
                signatoryTitle: boletaToApprove.signatoryTitle || '',
                content: newContent,
                schoolId: user.schoolId,
                issueDate: boletaToApprove.issueDate
            });
            await fetchData();
            setApproveModalOpen(false);
        } catch (e) { setError("Error al aprobar la boleta."); } finally { setActionLoading(false); setBoletaToApprove(null); }
    };

    const handleRejectConfirm = async () => {
        if (!boletaToReject || !user?.schoolId) return;
        setActionLoading(true);
        try {
            const rawContent = cleanContent(boletaToReject.content);
            const newContent = `[BOLETA_RECHAZADA]${rawContent}`;
            await apiService.updateCertificate(boletaToReject.certificateId, {
                userId: boletaToReject.userId,
                certificateType: boletaToReject.certificateType,
                signatoryName: boletaToReject.signatoryName || '',
                signatoryTitle: boletaToReject.signatoryTitle || '',
                content: newContent, 
                schoolId: user.schoolId,
                issueDate: boletaToReject.issueDate
            });
            setRejectModalOpen(false);
            await fetchData();
        } catch (e) { setError("Error al rechazar la boleta."); } finally { setActionLoading(false); setBoletaToReject(null); }
    };
    
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
                    <span className="text-info-text font-bold flex items-center">🔍 Filtrando boleta específica #{highlightId}</span>
                    <button onClick={() => {setHighlightId(null); navigate('/boletas', { replace: true });}} className="text-sm bg-white border border-info text-info-text px-3 py-1 rounded hover:bg-info-light transition-colors">Ver todas</button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={!!highlightId} className="w-full md:w-1/4 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50" />
                <select value={salonFilter} onChange={e => setSalonFilter(e.target.value)} disabled={!!highlightId} className="w-full md:w-1/4 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50">
                    <option value="">Nivel: Todos</option>
                    {uniqueSalons.map(salon => <option key={salon} value={salon}>{salon}</option>)}
                </select>
                <input type="text" placeholder="Sección/Letra (ej: A)" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} disabled={!!highlightId} className="w-full md:w-1/4 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} disabled={!!highlightId} className="w-full md:w-1/4 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:bg-background disabled:opacity-50">
                    <option value="">Estado: Todas</option>
                    <option value="Pending">Pendiente</option>
                    <option value="Approved">Aprobada</option>
                    <option value="Rejected">Rechazada</option>
                </select>
            </div>

            {loading ? <p>Cargando boletas...</p> : (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-header text-text-on-primary">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium uppercase">Estudiante</th>
                                <th className="px-4 py-2 text-left font-medium uppercase">Fecha</th>
                                <th className="px-4 py-2 text-left font-medium uppercase">Nivel</th>
                                <th className="px-4 py-2 text-left font-medium uppercase">Sección</th>
                                <th className="px-4 py-2 text-left font-medium uppercase">Estado</th>
                                <th className="px-4 py-2 text-left font-medium uppercase w-1">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {filteredCertificates.length > 0 ? filteredCertificates.map((cert) => {
                                let levelInCert = "Desconocido";
                                const status = getStatus(cert.content);
                                try {
                                    const clean = cleanContent(cert.content);
                                    if (clean) levelInCert = JSON.parse(clean).level || "Desconocido";
                                } catch (e) {}
                                
                                const studentClassId = userToClassroomMap.get(cert.userId);
                                const currentSection = studentClassId ? cleanClassroomName(classroomNameMap.get(studentClassId) || '') : '—';
                                
                                const isHighlighted = highlightId === cert.certificateId;
                                return (
                                    <tr key={cert.certificateId} ref={isHighlighted ? highlightRef : null} className={`hover:bg-background transition-colors ${isHighlighted ? 'bg-yellow-100 border-l-4 border-warning' : ''}`}>
                                        <td className="px-4 py-2 whitespace-nowrap font-medium text-text-primary">{cert.studentName || studentMap.get(cert.userId)?.userName || 'N/A'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{formatDate(cert.issueDate)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{levelInCert}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">{currentSection}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {status === 'Approved' ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-success-light text-success-text">Aprobada</span> :
                                             status === 'Rejected' ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-danger-light text-danger-text">Rechazada</span> :
                                             <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warning/20 text-warning-dark">Pendiente</span>}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => handleView(cert)} className="text-info hover:text-info-dark p-1 rounded hover:bg-info-light/20"><EyeIcon className="w-5 h-5" /></button>
                                                {canEdit && (
                                                    <>
                                                        <Link to={`/boletas/edit/${cert.certificateId}`} className="text-warning hover:text-warning-dark p-1 rounded hover:bg-warning/10"><PencilAltIcon className="w-5 h-5" /></Link>
                                                        <button onClick={() => setBoletaToDelete(cert)} className="text-danger hover:text-danger-text p-1 rounded hover:bg-danger-light/20"><TrashIcon className="w-5 h-5" /></button>
                                                    </>
                                                )}
                                                {isSuperAdmin && status !== 'Approved' && (
                                                    <>
                                                        <button onClick={() => openApproveModal(cert)} className="text-success hover:text-success-text p-1 rounded hover:bg-success-light/20"><ClipboardCheckIcon className="w-5 h-5" /></button>
                                                        {status !== 'Rejected' && <button onClick={() => openRejectModal(cert)} className="text-danger hover:text-danger-text p-1 rounded hover:bg-danger-light/20"><XIcon className="w-5 h-5" /></button>}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}) : (
                                    <tr><td colSpan={6} className="px-6 py-4 text-center text-secondary">No se encontraron boletas.</td></tr>
                                )}
                        </tbody>
                    </table>
                </div>
            )}

            {boletaToDelete && (
                <Modal isOpen={true} onClose={() => setBoletaToDelete(null)} title="Confirmar Eliminación">
                    <p>¿Estás seguro de que deseas eliminar la boleta?</p>
                    <div className="flex justify-end space-x-4 pt-4 mt-4 border-t">
                        <button onClick={() => setBoletaToDelete(null)} className="bg-background text-text-primary py-2 px-4 rounded border">Cancelar</button>
                        <button onClick={confirmDelete} className="bg-danger text-text-on-primary py-2 px-4 rounded">Sí, Eliminar</button>
                    </div>
                </Modal>
            )}

            {approveModalOpen && (
                <Modal isOpen={true} onClose={() => setApproveModalOpen(false)} title="Aprobar Boleta">
                    <p>¿Desea aprobar esta boleta?</p>
                    <div className="flex justify-end space-x-4 pt-4 border-t mt-4">
                        <button onClick={() => setApproveModalOpen(false)} className="bg-background text-text-primary py-2 px-4 rounded border">Cancelar</button>
                        <button onClick={handleApproveConfirm} disabled={actionLoading} className="bg-success text-text-on-primary py-2 px-4 rounded">Sí, Aprobar</button>
                    </div>
                </Modal>
            )}

            {rejectModalOpen && (
                <Modal isOpen={true} onClose={() => setRejectModalOpen(false)} title="Rechazar Boleta">
                    <textarea className="w-full p-2 border border-border rounded mb-4" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Motivo del rechazo..." />
                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button onClick={() => setRejectModalOpen(false)} className="bg-background text-text-primary py-2 px-4 rounded border">Cancelar</button>
                        <button onClick={handleRejectConfirm} disabled={actionLoading} className="bg-danger text-text-on-primary py-2 px-4 rounded">Rechazar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BoletaListPage;
