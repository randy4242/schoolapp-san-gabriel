import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../Modal';

interface RejectUnlockRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    evaluationId: string;
    requestingUserId: string;
    evaluationTitle: string;
    onSuccess: () => void;
}

type FormInputs = {
    reason: string;
};

const RejectUnlockRequestModal: React.FC<RejectUnlockRequestModalProps> = ({
    isOpen,
    onClose,
    evaluationId,
    requestingUserId,
    evaluationTitle,
    onSuccess,
}) => {
    const { user } = useAuth();
    const { register, handleSubmit } = useForm<FormInputs>();
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user) return;
        setIsSending(true);
        setError('');

        try {
            const title = `[UNLOCK_REJECTED] Solicitud Rechazada para Evaluación #${evaluationId}`;
            let content = `Su solicitud para editar la evaluación "${evaluationTitle}" ha sido rechazada.`;
            if (data.reason.trim()) {
                content += `\n\nMotivo: ${data.reason.trim()}`;
            }

            const payload = {
                title,
                content,
                userID: Number(requestingUserId),
                schoolID: user.schoolId,
            };
            await apiService.sendNotification(payload);
            onSuccess();
            onClose();
        } catch (err) {
            setError('Error al enviar la notificación de rechazo. Por favor, intente de nuevo.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rechazar Solicitud de Desbloqueo">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}
                <p className="text-sm text-text-secondary">
                    Estás a punto de rechazar la solicitud para editar la evaluación <strong className="text-text-primary">"{evaluationTitle}"</strong>.
                    El profesor que la solicitó recibirá una notificación.
                </p>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-text-primary">
                        Motivo del rechazo (opcional)
                    </label>
                    <textarea
                        id="reason"
                        {...register('reason')}
                        rows={3}
                        className="mt-1 block w-full p-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        placeholder="Explique por qué se rechaza la solicitud..."
                    />
                </div>
                <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button type="button" onClick={onClose} disabled={isSending} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSending} className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark disabled:bg-secondary">
                        {isSending ? 'Enviando...' : 'Rechazar Solicitud'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RejectUnlockRequestModal;
