import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Student, AttendanceUpsertDto } from '../../types';
import Modal from '../../components/Modal';
import { SpinnerIcon, CheckIcon, XIcon, EyeIcon } from '../../components/icons';

// Icono simple de reloj para Retardo (SVG Inline para evitar líos de importación)
const ClockIconSvg = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

interface TakeAttendanceModalProps {
    courseId: number;
    courseName: string;
    onClose: () => void;
    onSaveSuccess: () => void;
}

// Estado local extendido para manejar los cambios de cada estudiante en memoria
interface StudentAttendanceState extends Student {
    status: string; // Presente, Ausente, Retardo, Observación
    isManual: boolean; // Para saber si el usuario lo tocó específicamente
    notes: string;
    minutesLate: number;
    isJustified: boolean;
}

const statusOptions = ["Presente", "Ausente", "Retardo", "Observación"];

const TakeAttendanceModal: React.FC<TakeAttendanceModalProps> = ({ courseId, courseName, onClose, onSaveSuccess }) => {
    const { user } = useAuth();
    const [students, setStudents] = useState<StudentAttendanceState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Función para obtener la fecha actual en formato string para el input
    const getNowString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
    };

    // Fecha Global para todos
    const [globalDate, setGlobalDate] = useState(getNowString());

    useEffect(() => {
        const fetchStudents = async () => {
            if (user?.schoolId) {
                try {
                    const data = await apiService.getStudentsByCourse(courseId, user.schoolId);
                    // Inicializamos a todos como "Presente" pero sin marcar como "manual"
                    // Así si le dan a "Marcar Todos Ausente", estos cambian.
                    const mapped = data
                        .sort((a,b) => a.studentName.localeCompare(b.studentName))
                        .map(s => ({
                            ...s,
                            status: 'Presente',
                            isManual: false, // Importante: False al inicio
                            notes: '',
                            minutesLate: 0,
                            isJustified: false
                        }));
                    setStudents(mapped);
                } catch (err) {
                    setError('Error al cargar la lista de estudiantes.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchStudents();
    }, [courseId, user]);

    // --- Lógica Masiva ---
    const applyBulkStatus = (status: string) => {
        setStudents(prev => prev.map(s => {
            // Si el usuario ya lo modificó manualmente, NO lo tocamos
            if (s.isManual) return s;
            
            // Si no, aplicamos el estado masivo
            return { ...s, status };
        }));
    };

    // --- Lógica Individual ---
    const updateStudentStatus = (studentId: number, newStatus: string) => {
        setStudents(prev => prev.map(s => {
            if (s.userID === studentId) {
                return { ...s, status: newStatus, isManual: true }; // Marcamos como manual
            }
            return s;
        }));
    };

    const updateStudentDetail = (studentId: number, field: keyof StudentAttendanceState, value: any) => {
        setStudents(prev => prev.map(s => {
            if (s.userID === studentId) {
                return { ...s, [field]: value, isManual: true };
            }
            return s;
        }));
    };

    // --- Guardado Final ---
    const handleSaveAll = async () => {
        if (!user) return;
        
        // Validación de fecha futura antes de guardar
        const selectedDate = new Date(globalDate);
        const now = new Date();
        // Margen de 1 minuto por si acaso
        if (selectedDate.getTime() > now.getTime() + 60000) { 
            setError('No se puede registrar asistencia en el futuro.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Preparamos el payload masivo (array completo)
            const payloads: AttendanceUpsertDto[] = students.map(s => ({
                UserID: s.userID,
                RelatedUserID: user.userId,
                CourseID: courseId,
                SchoolID: user.schoolId,
                Status: s.status,
                Notes: s.notes || null,
                IsJustified: s.isJustified,
                MinutesLate: s.status === 'Retardo' ? Number(s.minutesLate) : null,
                Date: globalDate // Enviamos la fecha seleccionada en el input
            }));

            // 🔥 Llamamos al endpoint manual con TODA la lista de una vez
            await apiService.markAttendanceManual(payloads);
            
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError('Error al guardar la asistencia. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    // Helper para iconos de estado
    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'Presente': return <CheckIcon className="w-5 h-5 text-success" />;
            case 'Ausente': return <XIcon className="w-5 h-5 text-danger" />;
            case 'Retardo': return <ClockIconSvg className="w-5 h-5 text-warning" />;
            default: return <EyeIcon className="w-5 h-5 text-info" />;
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Asistencia Masiva - ${courseName}`}>
            <div className="flex flex-col h-[80vh]">
                {/* Header: Fecha y Acciones Masivas */}
                <div className="bg-surface p-4 border-b border-border space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Asistencia</label>
                            <input 
                                type="datetime-local" 
                                value={globalDate}
                                onChange={(e) => setGlobalDate(e.target.value)}
                                max={getNowString()} // Bloquea fechas futuras en el selector
                                className="px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text-secondary w-full md:w-auto self-center">Marcar Vacíos:</span>
                            <button onClick={() => applyBulkStatus('Presente')} className="px-3 py-1 bg-success-light text-success-text text-sm rounded hover:bg-success/20">Todos Presentes</button>
                            <button onClick={() => applyBulkStatus('Ausente')} className="px-3 py-1 bg-danger-light text-danger-text text-sm rounded hover:bg-danger/20">Todos Ausentes</button>
                        </div>
                    </div>
                    {error && <p className="text-danger text-sm font-semibold bg-danger-light p-2 rounded">{error}</p>}
                </div>

                {/* Tabla Scrolleable */}
                <div className="flex-1 overflow-y-auto bg-background/50 p-2">
                    {loading ? (
                        <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 text-primary animate-spin"/></div>
                    ) : (
                        <div className="space-y-2">
                            {students.map((s) => (
                                <div key={s.userID} className={`bg-surface p-3 rounded-lg border transition-colors ${s.isManual ? 'border-primary/50 shadow-sm' : 'border-border'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-text-primary">{s.studentName}</span>
                                            {s.isManual && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Editado</span>}
                                        </div>
                                        <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
                                            {statusOptions.map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => updateStudentStatus(s.userID, opt)}
                                                    className={`p-1.5 rounded-md transition-all ${s.status === opt ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-text-secondary hover:bg-gray-100'}`}
                                                    title={opt}
                                                >
                                                    {getStatusIcon(opt)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Campos condicionales (Retardo / Observación / Ausente) */}
                                    {(s.status !== 'Presente') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pl-2 border-l-2 border-border text-sm">
                                            {(s.status === 'Ausente' || s.status === 'Retardo') && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={s.isJustified}
                                                        onChange={(e) => updateStudentDetail(s.userID, 'isJustified', e.target.checked)}
                                                        className="rounded border-border text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-text-secondary">¿Justificado?</span>
                                                </label>
                                            )}
                                            
                                            {s.status === 'Retardo' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-text-secondary whitespace-nowrap">Min. tarde:</span>
                                                    <input 
                                                        type="number" 
                                                        value={s.minutesLate}
                                                        onChange={(e) => updateStudentDetail(s.userID, 'minutesLate', parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 border border-border rounded bg-background"
                                                    />
                                                </div>
                                            )}

                                            <input 
                                                type="text" 
                                                placeholder="Nota (opcional)..." 
                                                value={s.notes}
                                                onChange={(e) => updateStudentDetail(s.userID, 'notes', e.target.value)}
                                                className="w-full px-2 py-1 border border-border rounded bg-background md:col-span-2"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer: Botón de Guardar */}
                <div className="bg-surface p-4 border-t border-border flex justify-between items-center">
                    <div className="text-sm text-text-secondary">
                        <strong>{students.length}</strong> estudiantes en lista.
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-border rounded text-text-primary hover:bg-background">Cancelar</button>
                        <button 
                            onClick={handleSaveAll} 
                            disabled={loading || saving}
                            className="px-6 py-2 bg-primary text-text-on-primary rounded font-bold hover:bg-opacity-90 disabled:opacity-50 flex items-center"
                        >
                            {saving ? <><SpinnerIcon className="w-4 h-4 mr-2 animate-spin"/> Guardando...</> : 'Guardar Asistencia'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TakeAttendanceModal;