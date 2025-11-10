import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceRecord, AttendanceEditPayload } from '../../types';
import Modal from '../../components/Modal';

interface EditAttendanceModalProps {
    record: AttendanceRecord;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const allowedStatuses = ["Presente", "Ausente", "Retardo", "Observación"];

const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ record, onClose, onSaveSuccess }) => {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<AttendanceEditPayload>({
        defaultValues: {
            status: record.status,
            isJustified: record.isJustified ?? false,
            minutesLate: record.minutesLate ?? 0,
            notes: record.notes ?? ''
        }
    });

    const status = watch('status');

    const onSubmit: SubmitHandler<AttendanceEditPayload> = async (data) => {
        if (!user) {
            setError("No se ha podido identificar el usuario.");
            return;
        }

        setError('');
        setLoading(true);

        const payload: AttendanceEditPayload = { status: data.status };
        if (data.status === 'Retardo') {
            payload.minutesLate = Number(data.minutesLate);
            payload.isJustified = data.isJustified;
        }
        if (data.status === 'Ausente') {
            payload.isJustified = data.isJustified;
        }
        if (data.status === 'Observación') {
            payload.notes = data.notes;
        }

        try {
            await apiService.updateAttendance(record.attendanceID, payload, user.userId);
            onSaveSuccess();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al actualizar la asistencia.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Editar Asistencia - ${record.studentName}`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="bg-danger-light text-danger p-3 rounded">{error}</p>}
                
                <p className="text-sm">Fecha: {new Date(record.date).toLocaleDateString('es-ES')}</p>

                <div>
                    <label className="block text-sm font-medium">Estado</label>
                    <select {...register('status', { required: true })} className="mt-1 block w-full p-2 border border-border rounded-md">
                        {allowedStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {status === 'Retardo' && (
                    <div>
                        <label className="block text-sm font-medium">Minutos de Retardo</label>
                        <input type="number" {...register('minutesLate', { required: 'Este campo es requerido para retardos', valueAsNumber: true, min: { value: 1, message: 'Debe ser mayor a 0'} })} className="mt-1 block w-full p-2 border border-border rounded-md" />
                        {errors.minutesLate && <p className="text-danger text-xs mt-1">{errors.minutesLate.message}</p>}
                    </div>
                )}
                
                {(status === 'Retardo' || status === 'Ausente') && (
                     <div className="flex items-center">
                        <input type="checkbox" {...register('isJustified')} id="isJustified" className="h-4 w-4 rounded border-border text-primary focus:ring-accent" />
                        <label htmlFor="isJustified" className="ml-2 block text-sm">Justificado</label>
                    </div>
                )}
                
                {status === 'Observación' && (
                    <div>
                        <label className="block text-sm font-medium">Notas</label>
                        <textarea {...register('notes', { required: 'Se requieren notas para una observación' })} rows={3} className="mt-1 block w-full p-2 border border-border rounded-md"></textarea>
                        {errors.notes && <p className="text-danger text-xs mt-1">{errors.notes.message}</p>}
                    </div>
                )}

                <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                    <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</button>
                    <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditAttendanceModal;
