
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CertificadoTemplate from './CertificacionEmgReport';
import ResumenFinalEmgReport from './ResumenFinalEmgReport';
import ResumenFinalPrimariaReport from './ResumenFinalPrimariaReport';
import CertificateTemplate from '../certificates/CertificateTemplate';
import DescriptiveGradeReport from './DescriptiveGradeReport';
import BoletaReport from './BoletaReport';
import UserListReport from './UserListReport';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import Modal from '../../components/Modal';
import { ClipboardCheckIcon, XIcon } from '../../components/icons';

// Helpers
const cleanContent = (content: string | undefined | null) => {
    if (!content) return '';
    return content
        .replace('[BOLETA_CONFIRMADA]', '')
        .replace('[BOLETA_RECHAZADA]', '')
        .trim();
};

const getStatus = (content: string | undefined | null): 'Approved' | 'Rejected' | 'Pending' => {
    if (!content) return 'Pending';
    if (content.startsWith('[BOLETA_CONFIRMADA]')) return 'Approved';
    if (content.startsWith('[BOLETA_RECHAZADA]')) return 'Rejected';
    return 'Pending';
};

const ReportViewerPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    
    const initialState = location.state || {};
    // Use local state for reportData to allow updates (Approvals/Rejections) without reload
    const [reportData, setReportData] = useState(initialState.reportData);
    const { reportType, classroom, student, evaluation, grade, schoolName } = initialState;
    
    const templateRef = React.useRef<HTMLDivElement>(null);

    // Approval/Rejection States
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [statusMessage, setStatusMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

    const isSuperAdmin = useMemo(() => hasPermission([6, 7]), [hasPermission]);
    const isBoleta = reportType === 'boleta';
    const currentStatus = reportData ? getStatus(reportData.content) : 'Pending';

    useEffect(() => {
        if (!reportData && !initialState.reportData && reportType !== 'descriptive-grade' && reportType !== 'user-list') {
             // Logic to handle missing data handled in render
        } else if (!reportData && initialState.reportData) {
            setReportData(initialState.reportData);
        }
    }, [reportData, initialState, reportType]);

    if ((!reportData && reportType !== 'descriptive-grade' && reportType !== 'user-list')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
                <div className="bg-surface p-8 rounded-lg shadow-md text-center">
                    <h2 className="text-xl font-bold text-danger mb-4">Error al cargar el reporte</h2>
                    <p>No se encontraron datos para mostrar. Por favor, genere un reporte primero.</p>
                    <button onClick={() => navigate('/reports')} className="mt-6 bg-primary text-text-on-primary py-2 px-6 rounded hover:bg-opacity-80 transition-colors">
                        Volver a Reportes
                    </button>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        switch (reportType) {
            case 'boleta':
                navigate('/boletas');
                break;
            case 'certificate':
                navigate('/certificates');
                break;
            case 'user-list':
                navigate('/users');
                break;
            case 'resumen':
            case 'resumen_primaria':
            case 'certificado':
                navigate('/reports');
                break;
            default:
                navigate(-1);
                break;
        }
    };

    // --- Actions Logic ---

    const handleApprove = async () => {
        if (!user?.schoolId || !reportData) return;
        setActionLoading(true);
        setStatusMessage(null);

        try {
            const rawContent = cleanContent(reportData.content);
            let contentJson: any = {};
            try { contentJson = JSON.parse(rawContent); } catch (e) {}

            const newContent = `[BOLETA_CONFIRMADA]${rawContent}`;
            
            const payload = {
                userId: reportData.userId,
                certificateType: reportData.certificateType,
                signatoryName: reportData.signatoryName || '',
                signatoryTitle: reportData.signatoryTitle || '',
                content: newContent,
                schoolId: user.schoolId,
                issueDate: reportData.issueDate
            };
            
            await apiService.updateCertificate(reportData.certificateId, payload);

            // Notify creator
            if (contentJson.createdBy && contentJson.createdBy !== user.userId) {
                const studentName = reportData.studentName || 'Estudiante';
                try {
                    await apiService.sendNotification({
                        userID: Number(contentJson.createdBy),
                        schoolID: user.schoolId,
                        title: `[BOLETA_STATUS] Boleta Aprobada`,
                        content: `La boleta de ${studentName} ha sido aprobada por la administración.\n\nURL: #/boletas/edit/${reportData.certificateId}`
                    });
                } catch (e) { console.warn("Notification failed"); }
            }

            // Update local state
            setReportData({ ...reportData, content: newContent });
            setStatusMessage({ type: 'success', text: 'Boleta aprobada exitosamente.' });

        } catch (e: any) {
            setStatusMessage({ type: 'error', text: e.message || 'Error al aprobar.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectConfirm = async () => {
        if (!user?.schoolId || !reportData) return;
        setActionLoading(true);
        
        try {
            const rawContent = cleanContent(reportData.content);
            let contentJson: any = {};
            try { contentJson = JSON.parse(rawContent); } catch (e) {}
            
            const newContent = `[BOLETA_RECHAZADA]${rawContent}`;

            const payload = {
                userId: reportData.userId,
                certificateType: reportData.certificateType,
                signatoryName: reportData.signatoryName || '',
                signatoryTitle: reportData.signatoryTitle || '',
                content: newContent, 
                schoolId: user.schoolId,
                issueDate: reportData.issueDate
            };
            await apiService.updateCertificate(reportData.certificateId, payload);

            if (contentJson.createdBy) {
                const studentName = reportData.studentName || 'Estudiante';
                await apiService.sendNotification({
                    userID: Number(contentJson.createdBy),
                    schoolID: user.schoolId,
                    title: `[BOLETA_STATUS] Boleta Rechazada`,
                    content: `La boleta de ${studentName} ha sido rechazada.\n\nMotivo: ${rejectionReason}\n\nPor favor corrija y vuelva a guardar.`
                });
            }
            
            setReportData({ ...reportData, content: newContent });
            setStatusMessage({ type: 'success', text: 'Boleta rechazada y notificada.' });
            setRejectModalOpen(false);
            setRejectionReason('');

        } catch (e: any) {
            setStatusMessage({ type: 'error', text: e.message || 'Error al rechazar.' });
        } finally {
            setActionLoading(false);
        }
    };

    // Helper para determinar el tamaño de página CSS
    const getPageSize = () => {
        if (reportType === 'user-list') return 'landscape';
        if (reportType === 'boleta') return 'letter'; // Tamaño Carta para boletas
        return 'auto';
    };

    // Helper para el ancho del contenedor en pantalla
    const getContainerWidth = () => {
        if (reportType === 'user-list') return '297mm';
        if (reportType === 'boleta') return '216mm'; // Ancho Carta
        return '210mm'; // Ancho A4 por defecto
    };

    return (
        <div className="bg-background p-4 print:p-0 print:bg-white">
            <style>{`
                @media print {
                    @page {
                        size: ${getPageSize()};
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        margin: 0;
                        padding: 0;
                        transform: scale(1);
                        box-shadow: none;
                    }
                    .no-print {
                        display: none !important;
                    }
                    html, body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
            
            <div className="no-print max-w-4xl mx-auto mb-4 bg-surface p-4 rounded shadow">
                 <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold text-text-primary">
                        Vista Previa 
                        {isBoleta && (
                            <span className={`ml-3 text-sm px-2 py-1 rounded-full ${currentStatus === 'Approved' ? 'bg-success-light text-success-text' : currentStatus === 'Rejected' ? 'bg-danger-light text-danger-text' : 'bg-warning/20 text-warning-dark'}`}>
                                {currentStatus === 'Approved' ? 'Aprobada' : currentStatus === 'Rejected' ? 'Rechazada' : 'Pendiente'}
                            </span>
                        )}
                    </h1>
                    <div className="flex items-center gap-2">
                        <button onClick={handleBack} className="bg-secondary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">Volver</button>
                        <button onClick={handlePrint} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">Imprimir</button>
                        
                        {isBoleta && isSuperAdmin && (
                            <>
                                {currentStatus !== 'Approved' && (
                                    <button 
                                        onClick={handleApprove} 
                                        disabled={actionLoading}
                                        className="bg-success text-white py-2 px-4 rounded hover:bg-success-dark transition-colors flex items-center disabled:opacity-50"
                                    >
                                        <ClipboardCheckIcon className="w-5 h-5 mr-1" /> Aprobar
                                    </button>
                                )}
                                {currentStatus !== 'Rejected' && (
                                    <button 
                                        onClick={() => setRejectModalOpen(true)} 
                                        disabled={actionLoading}
                                        className="bg-danger text-white py-2 px-4 rounded hover:bg-danger-dark transition-colors flex items-center disabled:opacity-50"
                                    >
                                        <XIcon className="w-5 h-5 mr-1" /> Rechazar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                 </div>
                 
                 {statusMessage && (
                     <div className={`p-2 rounded text-sm text-center ${statusMessage.type === 'success' ? 'bg-success-light text-success-text' : 'bg-danger-light text-danger-text'}`}>
                         {statusMessage.text}
                     </div>
                 )}
            </div>

            <div id="print-section" className="print-container bg-surface shadow-lg mx-auto" style={{ width: getContainerWidth() }}>
                {reportType === 'certificado' && <CertificadoTemplate reportData={reportData} student={student} templateRef={templateRef} />}
                {reportType === 'resumen' && <ResumenFinalEmgReport data={reportData} classroom={classroom} templateRef={templateRef} />}
                {reportType === 'resumen_primaria' && <ResumenFinalPrimariaReport data={reportData} templateRef={templateRef} />}
                {reportType === 'certificate' && <CertificateTemplate data={reportData} templateRef={templateRef} />}
                {reportType === 'descriptive-grade' && <DescriptiveGradeReport student={student} evaluation={evaluation} grade={grade} templateRef={templateRef} />}
                {reportType === 'boleta' && <BoletaReport data={reportData} templateRef={templateRef} />}
                {reportType === 'user-list' && <UserListReport users={reportData} schoolName={schoolName} templateRef={templateRef} />}
            </div>

            {/* Reject Modal */}
            {rejectModalOpen && (
                <Modal isOpen={true} onClose={() => setRejectModalOpen(false)} title="Rechazar Boleta">
                    <div className="no-print">
                        <p className="mb-2">Indique el motivo del rechazo para notificar al docente:</p>
                        <textarea 
                            className="w-full p-2 border border-border rounded mb-4 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-danger/50"
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
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReportViewerPage;
