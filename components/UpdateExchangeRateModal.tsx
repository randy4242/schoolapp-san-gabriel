import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Modal from './Modal';
import { apiService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { ExchangeRate } from '../types';

interface UpdateExchangeRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRate: number;
    onRateUpdated: (newRate: ExchangeRate) => void;
}

interface FormInputs {
    rate: number;
    notes: string;
}

const UpdateExchangeRateModal: React.FC<UpdateExchangeRateModalProps> = ({ isOpen, onClose, currentRate, onRateUpdated }) => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            rate: currentRate,
            notes: ''
        }
    });

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) return;
        setIsSaving(true);
        setError(null);

        try {
            const result = await apiService.updateExchangeRate(user.schoolId, data.rate, data.notes);
            onRateUpdated(result);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al actualizar la tasa.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Actualizar Tasa de Cambio (USD -> VES)">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="bg-danger-light text-danger-text p-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">Nueva Tasa (VES)</label>
                    <input
                        type="number"
                        step="0.01"
                        {...register('rate', { required: 'La tasa es requerida', min: 0.01, valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    {errors.rate && <p className="text-danger text-xs mt-1">{errors.rate.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Notas (Opcional)</label>
                    <textarea
                        {...register('notes')}
                        placeholder="Ej: Tasa BCV del día..."
                        className="w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                        rows={3}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 border border-border rounded hover:bg-surface text-text-primary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary text-text-on-primary rounded hover:bg-opacity-90 disabled:opacity-50 flex items-center"
                    >
                        {isSaving && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isSaving ? 'Guardando...' : 'Guardar Tasa'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UpdateExchangeRateModal;
