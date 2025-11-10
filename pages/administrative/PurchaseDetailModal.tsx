import React, { useEffect, useState } from 'react';
import { PurchaseDetail } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface PurchaseDetailModalProps {
    purchaseId: number;
    onClose: () => void;
}

const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({ purchaseId, onClose }) => {
    const [detail, setDetail] = useState<PurchaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.schoolId) {
            apiService.getPurchaseById(purchaseId, user.schoolId)
                .then(setDetail)
                .catch(() => setError('No se pudo cargar el detalle de la compra.'))
                .finally(() => setLoading(false));
        }
    }, [purchaseId, user]);

    const header = detail?.header;
    const lines = detail?.lines || [];
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');
    const M = (v: number) => v.toFixed(2);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalle de Compra #${header?.purchaseID}`}>
            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger">{error}</p>}
            {header && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-background rounded-md">
                        <div><strong>Proveedor:</strong> {header.supplierName} ({header.supplierRif})</div>
                        <div><strong>Fecha:</strong> {formatDate(header.fecha)}</div>
                        <div><strong>Serie:</strong> {header.serie}</div>
                        <div><strong>Moneda:</strong> {header.moneda}</div>
                        <div><strong>Estado:</strong> <span className={`font-semibold ${header.status === 'Annulled' ? 'text-danger' : 'text-success'}`}>{header.status}</span></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="p-2 text-left">Producto</th>
                                    <th className="p-2 text-right">Cant.</th>
                                    <th className="p-2 text-right">Costo Unit.</th>
                                    <th className="p-2 text-right">Subtotal</th>
                                    <th className="p-2 text-right">IVA</th>
                                    <th className="p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map(line => (
                                    <tr key={line.purchaseLineID} className="border-b">
                                        <td className="p-2">{line.descripcion}</td>
                                        <td className="p-2 text-right">{M(line.cantidad)}</td>
                                        <td className="p-2 text-right">{M(line.unitCost)}</td>
                                        <td className="p-2 text-right">{M(line.montoBase)}</td>
                                        <td className="p-2 text-right">{M(line.montoIva)}</td>
                                        <td className="p-2 text-right font-semibold">{M(line.totalLinea)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end">
                        <div className="w-1/2 text-sm space-y-1">
                             <div className="flex justify-between"><span className="font-semibold">Subtotal:</span><span>{M(header.subtotal)}</span></div>
                             <div className="flex justify-between"><span className="font-semibold">Monto IVA:</span><span>{M(header.montoIva)}</span></div>
                             <div className="flex justify-between font-bold text-lg border-t pt-1"><span >Total General:</span><span>{M(header.totalGeneral)} {header.moneda}</span></div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default PurchaseDetailModal;
