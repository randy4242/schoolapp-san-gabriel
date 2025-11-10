import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom } from '../../types';
import Modal from '../../components/Modal';

interface EditClassroomModalProps {
    classroom: Classroom;
    onClose: () => void;
    onSaveSuccess: () => void;
}

type FormInputs = Omit<Classroom, 'classroomID' | 'schoolID'>;

const EditClassroomModal: React.FC<EditClassroomModalProps> = ({ classroom, onClose, onSaveSuccess }) => {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            name: classroom.name,
            description: classroom.description,
        }
    });

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }
        
        setError('');
        setLoading(true);

        try {
            const payload = { ...data, schoolID: user.schoolId };
            await apiService.updateClassroom(classroom.classroomID, payload);
            onSaveSuccess();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar el salón.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Editar Salón: ${classroom.name}`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
                
                <div>
                    <label className="block text-sm font-medium text-text-primary">Nombre del Salón</label>
                    <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                    {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary">Descripción</label>
                    <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                    <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</button>
                    <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditClassroomModal;