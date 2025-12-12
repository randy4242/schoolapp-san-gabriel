
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { QuestionOption } from '../../types';
import Modal from '../../components/Modal';

interface OptionFormModalProps {
    evaluationId: number;
    questionId: number;
    optionToEdit: QuestionOption | null;
    onClose: () => void;
    onSave: () => void;
}

type FormInputs = {
    optionText: string;
    isCorrect: boolean;
};

const OptionFormModal: React.FC<OptionFormModalProps> = ({ evaluationId, questionId, optionToEdit, onClose, onSave }) => {
    const isEditMode = !!optionToEdit;
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            optionText: optionToEdit?.optionText || '',
            isCorrect: optionToEdit?.isCorrect || false,
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsSubmitting(true);
        setError('');
        try {
            if (isEditMode) {
                await apiService.updateQuestionOption(evaluationId, questionId, optionToEdit.optionID, data);
            } else {
                await apiService.createQuestionOption(evaluationId, questionId, data);
            }
            onSave();
        } catch (err: any) {
            setError(err.message || 'Error al guardar la opción.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditMode ? 'Editar Opción' : 'Crear Opción'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}
                
                <div>
                    <label className="block text-sm font-medium">Texto de la opción</label>
                    <input {...register('optionText', { required: true })} className={inputClasses} />
                    {errors.optionText && <p className="text-danger text-xs mt-1">El texto es requerido.</p>}
                </div>
                
                <div className="flex items-center">
                    <input type="checkbox" {...register('isCorrect')} id="isCorrect" className="h-4 w-4 text-primary focus:ring-accent border-border rounded" />
                    <label htmlFor="isCorrect" className="ml-2 text-sm font-medium">Marcar como respuesta correcta</label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                    <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default OptionFormModal;