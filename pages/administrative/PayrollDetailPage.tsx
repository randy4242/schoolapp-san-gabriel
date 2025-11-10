import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PayrollDetail, ROLES } from '../../types';
import { BriefcaseIcon } from '../../components/icons';
import Modal from '../../components/Modal';

const formatMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodLabel = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

const PayrollDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [detail, setDetail] = useState<PayrollDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [annulModal, setAnnulModal] = useState<{ isOpen: boolean, reason: string }>({ isOpen: false, reason: '' });

    const payrollId = Number(id);

    const fetchDetail = async () => {
        if (!payrollId) return;
        setLoading(true);
        setError('');
        try {
            const data = await apiService.getPayrollById(payrollId);
            // Sort lines by employee name
            data.lines.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
            setDetail(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el detalle de la nómina.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleClosePeriod = async () => {
        if (!detail?.header || !user) return;
        const { periodYear, periodMonth } = detail.header;
        if (window.confirm(`¿Está seguro de cerrar el período ${periodLabel(periodYear, periodMonth)}?`)) {
            try {
                await apiService.closePayrollPeriod({ schoolId: user.schoolId, year: periodYear, month: periodMonth });
                fetchDetail(); // Refresh data
            } catch (err: any) {
                setError(err.message || 'Error al cerrar el período.');
            }
        }
    };

    const handleAnnulConfirm = async () => {
        if (detail?.header) {
            try {
                await apiService.annulPayroll(detail.header.payrollID, annulModal.reason);
                setAnnulModal({ isOpen: false, reason: '' });
                fetchDetail(); // Refresh data
            } catch (err: any) {
                setError(err.message || 'Error al anular la nómina.');
            }
        }
    };

    const getRoleName = (roleId: number) => ROLES.find(r => r.id === roleId)?.name || `Rol #${roleId}`;

    if (loading) return <p>Cargando...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded">{error}</p>;
    if (!detail) return <p>No se encontró la nómina.</p>;

    const { header, lines } = detail;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-text-primary flex items-center"><BriefcaseIcon /><span className="ml-2">Detalle de Nómina</span></h1>
            
            <div className="bg-surface p-6 rounded-lg shadow-md space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold">Período: {periodLabel(header.periodYear, header.periodMonth)}</h2>
                        <p className="text-sm text-text-secondary">ID de Nómina: {header.payrollID} | Estado: <span className="font-bold">{header.status}</span></p>
                    </div>
                    <div className="space-x-2">
                        {header.status === 'Issued' && 
                            <button onClick={handleClosePeriod} className="bg-warning text-white py-2 px-4 rounded hover:bg-opacity-80 text-sm">Cerrar Período</button>
                        }
                        {header.status !== 'Annulled' && header.status !== 'Closed' &&
                            <button onClick={() => setAnnulModal({ isOpen: true, reason: '' })} className="bg-danger text-white py-2 px-4 rounded hover:bg-opacity-80 text-sm">Anular Nómina</button>
                        }
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
                    <div><div className="text-sm text-text-secondary">Empleados</div><div className="text-lg font-bold">{header.employees}</div></div>
                    <div><div className="text-sm text-text-secondary">Total Bruto</div><div className="text-lg font-bold">{formatMoney(header.grossTotal)}</div></div>
                    <div><div className="text-sm text-text-secondary">Deducciones</div><div className="text-lg font-bold text-danger-text">{formatMoney(header.deductionsTotal)}</div></div>
                    <div><div className="text-sm text-text-secondary">Total Neto</div><div className="text-lg font-bold text-success-text">{formatMoney(header.netTotal)}</div></div>
                </div>
            </div>

            <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-header text-text-on-primary">
                        <tr>
                            {['Empleado', 'Rol', 'Base', 'Transporte', 'Otras Asig.', 'ISR', 'Pensión', 'Otras Ded.', 'Neto a Pagar'].map(h =>
                                <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border text-sm">
                        {lines.map(line => (
                            <tr key={line.payrollLineID}>
                                <td className="px-3 py-2 whitespace-nowrap">{line.employeeName}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{getRoleName(line.roleID)}</td>
                                <td className="px-3 py-2 text-right">{formatMoney(line.baseAmount)}</td>
                                <td className="px-3 py-2 text-right">{formatMoney(line.transportAllow)}</td>
                                <td className="px-3 py-2 text-right">{formatMoney(line.otherAllow)}</td>
                                <td className="px-3 py-2 text-right text-red-600">({formatMoney(line.isr)})</td>
                                <td className="px-3 py-2 text-right text-red-600">({formatMoney(line.pension)})</td>
                                <td className="px-3 py-2 text-right text-red-600">({formatMoney(line.otherDed)})</td>
                                <td className="px-3 py-2 text-right font-bold text-base">{formatMoney(line.netPay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

             <Modal isOpen={annulModal.isOpen} onClose={() => setAnnulModal({ isOpen: false, reason: '' })} title="Anular Nómina">
                <div className="space-y-4">
                    <p>¿Está seguro de que desea anular esta nómina? Esta acción es irreversible.</p>
                    <input type="text" placeholder="Motivo (opcional)" value={annulModal.reason} onChange={e => setAnnulModal(prev => ({...prev, reason: e.target.value}))} className="w-full p-2 border rounded"/>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setAnnulModal({ isOpen: false, reason: '' })} className="bg-background py-2 px-4 rounded">Cancelar</button>
                        <button onClick={handleAnnulConfirm} className="bg-danger text-white py-2 px-4 rounded">Confirmar Anulación</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PayrollDetailPage;
