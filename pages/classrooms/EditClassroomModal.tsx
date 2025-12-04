import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom, BOLETA_LEVELS } from '../../types';
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
    const [boletaType, setBoletaType] = useState('');
    
    // Specific schools that require the strict boleta tagging system
    const allowedSchools = [5, 6, 7, 8, 9];
    const showBoletaSelect = user?.schoolId && allowedSchools.includes(user.schoolId);
    
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            name: classroom.name,
            description: classroom.description,
        }
    });

    useEffect(() => {
        if (showBoletaSelect) {
            // Only parse tags for specific schools
            const match = classroom.name.match(/^\[(.*?)\]\s*(.*)/);
            if (match) {
                setBoletaType(match[1]);
                setValue('name', match[2]);
            } else {
                setValue('name', classroom.name);
            }
        } else {
            // For other schools, show the full raw name (including brackets if they exist)
            setValue('name', classroom.name);
        }
    }, [classroom, setValue, showBoletaSelect]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }
        
        if (showBoletaSelect && !boletaType) {
            setError("Para este colegio, es obligatorio seleccionar el Tipo de Boleta.");
            return;
        }
        
        setError('');
        setLoading(true);

        try {
            // Inject tag if applicable: [Level] Name
            let finalName = data.name;
            if (showBoletaSelect && boletaType) {
                finalName = `[${boletaType}] ${data.name}`;
            }

            const payload = { 
                name: finalName,
                description: data.description,
                schoolID: user.schoolId 
            };
            await apiService.updateClassroom(classroom.classroomID, payload);
            onSaveSuccess();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar el salón.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Editar Salón`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
                
                <div>
                    <label className="block text-sm font-medium text-text-primary">Nombre del Salón</label>
                    <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                    {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                </div>

                {showBoletaSelect && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <label className="block text-sm font-bold text-text-primary mb-1">Tipo de Boleta (Obligatorio)</label>
                        <select 
                            value={boletaType} 
                            onChange={(e) => setBoletaType(e.target.value)}
                            className="block w-full px-3 py-2 bg-white text-text-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                            <option value="">-- Seleccione Nivel --</option>
                            {BOLETA_LEVELS.map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>
                    </div>
                )}

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