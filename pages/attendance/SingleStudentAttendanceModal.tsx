import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Student, AttendanceUpsertDto } from '../../types';
import Modal from '../../components/Modal';

interface SingleStudentAttendanceModalProps {
    student: Student;
    courseId: number;
    courseName: string;
    onClose: () => void;
    // CAMBIO: Simplificado. Ya no necesitamos pasar el ID, solo avisar que terminó.Si
    onSuccess: () => void;
}

type FormInputs = {
    date: string;
    status: string;
    notes: string;
    isJustified: boolean;
    minutesLate: number;
};

const statusOptions = ["Presente", "Ausente", "Retardo", "Observación"];

const SingleStudentAttendanceModal: React.FC<SingleStudentAttendanceModalProps> = ({ student, courseId, courseName, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Obtener fecha actual local en formato YYYY-MM-DDTHH:mm
    const getNowString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
    };

    const { register, handleSubmit, watch, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            date: getNowString(),
            status: 'Presente',
            notes: '',
            isJustified: false,
            minutesLate: 0
        }
    });

    const status = watch('status');

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user) return;
        
        const selectedDate = new Date(data.date);
        const now = new Date();
        if (selectedDate.getTime() > now.getTime() + 60000) { 
            setError('No se puede registrar asistencia en el futuro.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload: AttendanceUpsertDto = {
                UserID: student.userID, 
                RelatedUserID: user.userId,
                CourseID: courseId,
                SchoolID: user.schoolId,
                Status: data.status,
                Notes: data.notes || null,
                IsJustified: data.isJustified,
                MinutesLate: data.status === 'Retardo' ? Number(data.minutesLate) : null,
                Date: data.date
            };

            await apiService.markAttendanceSingle(payload);
            
            // CAMBIO: Solo notificamos éxito sin pasar datos extra.
            onSuccess();
            
            onClose();
        } catch (err: any) {
            console.error("Error marking attendance:", err);
            setError(err.message || 'Error al registrar la asistencia.');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

    return (
        <Modal isOpen={true} onClose={onClose} title={`Asistencia: ${student.studentName}`}>
            <div className="text-sm text-text-secondary mb-4 font-semibold">{courseName}</div>
            
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4 text-sm">{error}</p>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-primary">Fecha y Hora</label>
                    <input 
                        type="datetime-local" 
                        {...register('date', { required: 'La fecha es requerida' })}
                        max={getNowString()}
                        className={inputClasses}
                    />
                    {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary">Estado</label>
                    <select {...register('status')} className={inputClasses}>
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>

                {(status === 'Ausente' || status === 'Retardo') && (
                    <div className="flex items-center space-x-2 p-2 bg-background rounded border border-border">
                        <input 
                            type="checkbox" 
                            id="isJustified" 
                            {...register('isJustified')} 
                            className="h-4 w-4 text-primary focus:ring-accent border-border rounded"
                        />
                        <label htmlFor="isJustified" className="text-sm text-text-primary">¿Justificado?</label>
                    </div>
                )}

                {status === 'Retardo' && (
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Minutos de Retardo</label>
                        <input 
                            type="number" 
                            {...register('minutesLate', { min: 1 })}
                            className={inputClasses}
                            placeholder="Ej. 15"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-text-primary">Notas / Observaciones</label>
                    <textarea 
                        {...register('notes')} 
                        rows={3} 
                        className={inputClasses} 
                        placeholder="Comentarios adicionales..."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-90 disabled:bg-secondary transition-colors"
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SingleStudentAttendanceModal;