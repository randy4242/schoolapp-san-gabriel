
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { Question, QuestionOption } from '../../types';
import Modal from '../../components/Modal';
import { PlusIcon, TrashIcon } from '../../components/icons';

type OptionFormInput = Partial<QuestionOption> & { clientId: string };

type FormInputs = {
    questionText: string;
    questionType: number;
    points: number;
    orderIndex: number;
    options: OptionFormInput[];
    correctOptionClientId: string;
};

interface QuestionFormModalProps {
    evaluationId: number;
    questionToEdit: Question | null;
    onClose: () => void;
    onSave: () => void;
}

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({ evaluationId, questionToEdit, onClose, onSave }) => {
    const isEditMode = !!questionToEdit;
    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            questionText: questionToEdit?.questionText || '',
            questionType: questionToEdit?.questionType || 1,
            points: questionToEdit?.points || 0,
            orderIndex: questionToEdit?.orderIndex || 0,
            options: [],
            correctOptionClientId: '',
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "options" });
    const questionType = watch('questionType');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (questionToEdit?.options) {
            const mappedOptions = questionToEdit.options.map(opt => ({
                ...opt,
                clientId: opt.optionID.toString(),
            }));
            const correctOption = mappedOptions.find(opt => opt.isCorrect);
            setValue('options', mappedOptions);
            if (correctOption) {
                setValue('correctOptionClientId', correctOption.clientId);
            }
        }
    }, [questionToEdit, setValue]);
    
    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsSubmitting(true);
        setError('');
        try {
            const questionPayload = {
                questionText: data.questionText,
                questionType: Number(data.questionType) as 1 | 2 | 3,
                points: data.points,
                orderIndex: data.orderIndex,
            };

            if (isEditMode && questionToEdit) {
                // UPDATE
                await apiService.updateEvaluationQuestion(evaluationId, questionToEdit.questionID, questionPayload);

                if (Number(data.questionType) === 2) {
                    const originalOptions = questionToEdit.options || [];
                    const finalOptions = data.options;
    
                    const toDelete = originalOptions.filter(origOpt => !finalOptions.some(finalOpt => finalOpt.optionID === origOpt.optionID));
                    const toUpdate = finalOptions.filter(finalOpt => finalOpt.optionID && originalOptions.some(origOpt => origOpt.optionID === finalOpt.optionID));
                    const toCreate = finalOptions.filter(finalOpt => !finalOpt.optionID);
    
                    const deletePromises = toDelete.map(o => apiService.deleteQuestionOption(evaluationId, questionToEdit.questionID, o.optionID));
                    const updatePromises = toUpdate.map(o => apiService.updateQuestionOption(evaluationId, questionToEdit.questionID, o.optionID!, {
                        optionText: o.optionText,
                        isCorrect: o.clientId === data.correctOptionClientId
                    }));
                    const createPromises = toCreate.map(o => apiService.createQuestionOption(evaluationId, questionToEdit.questionID, {
                        optionText: o.optionText,
                        isCorrect: o.clientId === data.correctOptionClientId
                    }));
    
                    await Promise.all([...deletePromises, ...updatePromises, ...createPromises]);
                }

            } else {
                // CREATE
                const newQuestion = await apiService.createEvaluationQuestion(evaluationId, questionPayload);
                if (Number(data.questionType) === 2 && data.options.length > 0) {
                    const optionPromises = data.options.map(opt => apiService.createQuestionOption(evaluationId, newQuestion.questionID, {
                        optionText: opt.optionText,
                        isCorrect: opt.clientId === data.correctOptionClientId
                    }));
                    await Promise.all(optionPromises);
                }
            }
            onSave();
        } catch (err: any) {
            setError(err.message || 'Error al guardar la pregunta.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const inputClasses = "block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditMode ? 'Editar Pregunta' : 'Crear Pregunta'}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}
                
                <div>
                    <label className="block text-sm font-medium">Texto de la pregunta</label>
                    <textarea {...register('questionText', { required: true })} rows={3} className={`${inputClasses} mt-1`}></textarea>
                    {errors.questionText && <p className="text-danger text-xs mt-1">El texto es requerido.</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Tipo</label>
                        <select {...register('questionType', { valueAsNumber: true })} className={`${inputClasses} mt-1`}>
                            <option value={1}>Abierta</option>
                            <option value={2}>Selección Múltiple</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Puntos</label>
                        <input type="number" {...register('points', { required: true, valueAsNumber: true, min: 0 })} className={`${inputClasses} mt-1`} />
                        {errors.points && <p className="text-danger text-xs mt-1">Puntos inválidos.</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Orden</label>
                        <input type="number" {...register('orderIndex', { required: true, valueAsNumber: true, min: 0 })} className={`${inputClasses} mt-1`} />
                        {errors.orderIndex && <p className="text-danger text-xs mt-1">Orden inválido.</p>}
                    </div>
                </div>

                {Number(questionType) === 2 && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold text-text-primary mb-2">Opciones</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 bg-background p-2 rounded">
                                    <input 
                                        type="radio"
                                        {...register('correctOptionClientId', { required: "Debe seleccionar una opción correcta" })}
                                        value={field.clientId}
                                        className="h-4 w-4 text-primary focus:ring-accent border-border"
                                    />
                                    <input 
                                        {...register(`options.${index}.optionText`, { required: "El texto no puede estar vacío" })}
                                        placeholder={`Texto de la opción ${index + 1}`}
                                        className={`${inputClasses} flex-grow`}
                                    />
                                    <button type="button" onClick={() => remove(index)} className="p-1 text-danger hover:bg-danger/10 rounded-full">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {errors.options && <p className="text-danger text-xs mt-1">Asegúrese de que todas las opciones tengan texto.</p>}
                        {errors.correctOptionClientId && fields.length > 0 && <p className="text-danger text-xs mt-1">{errors.correctOptionClientId.message}</p>}

                        <button 
                            type="button" 
                            onClick={() => append({ clientId: crypto.randomUUID(), optionText: '', isCorrect: false })}
                            className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            <PlusIcon /> Añadir Opción
                        </button>
                    </div>
                )}


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

export default QuestionFormModal;