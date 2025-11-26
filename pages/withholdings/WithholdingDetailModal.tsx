import React, { useEffect, useState } from 'react';
import { WithholdingDetail } from '../../types';
import { apiService } from '../../services/apiService';
import Modal from '../../components/Modal';

interface WithholdingDetailModalProps {
    withholdingId: number;
    onClose: () => void;
}

const WithholdingDetailModal: React.FC<WithholdingDetailModalProps> = ({ withholdingId, onClose }) => {
    const [detail, setDetail] = useState<WithholdingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        apiService.getWithholdingById(withholdingId)
            .then(setDetail)
            .catch(() => setError('No se pudo cargar el detalle.'))
            .finally(() => setLoading(false));
    }, [withholdingId]);

    const header = detail?.header;
    const lines = detail?.lines || [];
    const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES');
    const formatMoney = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2 });

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalle de Retención #${header?.withholdingID}`}>
            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger">{error}</p>}
            {header && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-background rounded-md">
                        <div><strong>Agente:</strong> {header.agentName}</div>
                        <div><strong>Sujeto Retenido:</strong> {header.subjectName}</div>
                        <div><strong>Fecha:</strong> {formatDate(header.issueDate)}</div>
                        <div><strong>Estado:</strong> <span className={`font-semibold ${header.status === 'Annulled' ? 'text-danger' : 'text-success'}`}>{header.status}</span></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-header-light">
                                <tr>
                                    <th className="p-2 text-left">Concepto</th>
                                    <th className="p-2 text-right">Base</th>
                                    <th className="p-2 text-right">Tasa (%)</th>
                                    <th className="p-2 text-right">Monto Retenido</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map(line => (
                                    <tr key={line.withholdingLineID} className="border-b">
                                        <td className="p-2">{line.description}</td>
                                        <td className="p-2 text-right">{formatMoney(line.baseAmount)}</td>
                                        <td className="p-2 text-right">{line.ratePercent.toFixed(2)}%</td>
                                        <td className="p-2 text-right font-semibold">{formatMoney(line.amountWithheld)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end">
                        <div className="w-1/2 text-sm space-y-1">
                            <div className="flex justify-between"><span className="font-semibold">Base Total:</span><span>{formatMoney(header.totalBase)}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t pt-1"><span >Total Retenido:</span><span>{formatMoney(header.totalWithheld)}</span></div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cerrar</button>
            </div>
        </Modal>
    );
};

export default WithholdingDetailModal;
