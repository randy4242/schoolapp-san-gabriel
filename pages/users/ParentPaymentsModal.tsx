import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Payment, PaymentMethod, PaymentStatus, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface ParentPaymentsModalProps {
    user: User;
    onClose: () => void;
}

type ReviewFormInputs = { comment: string };

const ParentPaymentsModal: React.FC<ParentPaymentsModalProps> = ({ user, onClose }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openCollapseId, setOpenCollapseId] = useState<number | null>(null);
    const { user: authUser } = useAuth();
    const { register, handleSubmit, reset } = useForm<ReviewFormInputs>();
    const navigate = useNavigate();

    const fetchPayments = useCallback(async () => {
        if (authUser?.schoolId) {
            setLoading(true);
            try {
                const data = await apiService.getParentPayments(user.userID, authUser.schoolId);
                setPayments(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (err) {
                setError('No se pudieron cargar los pagos.');
            } finally {
                setLoading(false);
            }
        }
    }, [user, authUser]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleReview = async (paymentId: number, action: 'approve' | 'reject', data: ReviewFormInputs) => {
        if (!authUser) return;
        try {
            setError('');
            setSuccess('');
            if (action === 'approve') {
                const response = await apiService.approvePayment(paymentId, authUser.userId, data.comment);
                setSuccess('Pago aprobado. Redirigiendo a la factura...');
                reset();
                if (response.invoiceId) {
                    navigate(`/invoices/print/${response.invoiceId}`);
                } else {
                    fetchPayments(); // fallback to refresh
                }
            } else { // reject
                await apiService.rejectPayment(paymentId, authUser.userId, data.comment);
                setSuccess('Pago rechazado. Redirigiendo...');
                reset();
                navigate(`/users/block/${user.userID}`);
            }
        } catch (err: any) {
            setError(err.message || `Error al ${action} el pago.`);
        }
    };

    const getStatusBadge = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.Approved: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success-text">Aprobado</span>;
            case PaymentStatus.Rejected: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-light text-danger-text">Rechazado</span>;
            default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning/20 text-warning-dark">Pendiente</span>;
        }
    };
    
    const PaymentDetails: React.FC<{p: Payment}> = ({p}) => (
        <div className="bg-background p-4">
            {p.method === PaymentMethod.PagoMovil ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div><strong>Cédula/RIF:</strong> {p.pm_CedulaRif || '—'}</div>
                    <div><strong>Teléfono:</strong> {p.pm_Phone || '—'}</div>
                    <div><strong>Banco Origen:</strong> {p.pm_BankOrigin || '—'}</div>
                    <div><strong>Banco Destino:</strong> {p.pm_BankDest || '—'}</div>
                </div>
            ) : p.method === PaymentMethod.Transfer ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div><strong>Cédula/RIF:</strong> {p.tr_CedulaRif || '—'}</div>
                    <div><strong>Nombre:</strong> {p.tr_FullName || '—'}</div>
                    <div><strong>Banco Destino:</strong> {p.tr_BankDest || '—'}</div>
                    <div><strong>Nº Cuenta:</strong> {p.tr_AccountNumber || '—'}</div>
                </div>
            ) : <p className="text-secondary text-xs">Sin detalles específicos.</p>}

            {p.status === PaymentStatus.Pending ? (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                    <form onSubmit={handleSubmit((data) => handleReview(p.paymentID, 'approve', data))} className="space-y-2 p-3 border border-success rounded-md bg-success-light/20">
                        <h4 className="font-semibold text-success-text text-sm">Aprobar Pago</h4>
                        <input {...register('comment')} placeholder="Comentario (opcional)" className="w-full p-1 border rounded text-xs"/>
                        <button type="submit" className="w-full bg-success text-text-on-primary text-sm py-1 px-2 rounded hover:bg-opacity-80">Aprobar</button>
                    </form>
                    <form onSubmit={handleSubmit((data) => handleReview(p.paymentID, 'reject', data))} className="space-y-2 p-3 border border-danger rounded-md bg-danger-light/20">
                        <h4 className="font-semibold text-danger-text text-sm">Rechazar Pago</h4>
                        <input {...register('comment')} placeholder="Motivo (opcional)" className="w-full p-1 border rounded text-xs"/>
                        <button type="submit" className="w-full bg-danger text-text-on-primary text-sm py-1 px-2 rounded hover:bg-opacity-80">Rechazar</button>
                    </form>
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-text-secondary">Este pago ya fue {p.status === PaymentStatus.Approved ? 'aprobado' : 'rechazado'}.</p>
                </div>
            )}
        </div>
    );


    return (
        <Modal isOpen={true} onClose={onClose} title={`Pagos de ${user.userName}`}>
            {error && <p className="text-danger mb-2">{error}</p>}
            {success && <p className="text-success mb-2">{success}</p>}
            {loading && <p>Cargando pagos...</p>}
            
            {!loading && !error && (
                payments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                    <th className="px-4 py-2 text-left">Monto</th>
                                    <th className="px-4 py-2 text-left">Ref.</th>
                                    <th className="px-4 py-2 text-left">Estado</th>
                                    <th className="px-4 py-2 text-left">Comentario</th>
                                    <th className="px-4 py-2 text-left"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {payments.map(p => (
                                    <React.Fragment key={p.paymentID}>
                                    <tr>
                                        <td className="px-4 py-2">{new Date(p.createdAt).toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-2">{p.amount.toFixed(2)} {p.currency}</td>
                                        <td className="px-4 py-2">{p.referenceNumber || '—'}</td>
                                        <td className="px-4 py-2">{getStatusBadge(p.status)}</td>
                                        <td className="px-4 py-2">{p.notes || '—'}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center gap-2">
                                                {p.status === PaymentStatus.Approved && p.invoiceID && (
                                                    <button onClick={() => navigate(`/invoices/print/${p.invoiceID}`)} className="text-xs py-1 px-2 rounded bg-background text-primary border border-primary hover:bg-primary/10">
                                                        Factura
                                                    </button>
                                                )}
                                                <button onClick={() => setOpenCollapseId(openCollapseId === p.paymentID ? null : p.paymentID)} className="text-info hover:underline text-xs">
                                                    {openCollapseId === p.paymentID ? 'Ocultar' : 'Detalles'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {openCollapseId === p.paymentID && (
                                        <tr><td colSpan={6} className="p-0"><PaymentDetails p={p} /></td></tr>
                                    )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-secondary">Este padre no tiene pagos reportados.</p>
                )
            )}
             <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cerrar</button>
            </div>
        </Modal>
    );
};

export default ParentPaymentsModal;