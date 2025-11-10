import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PendingInvoice } from '../../types';
import { CashIcon } from '../../components/icons';

const CuentasPorCobrarPage: React.FC = () => {
    const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getPendingInvoices(user.schoolId)
                .then(data => {
                    setPendingInvoices(data);
                })
                .catch(err => {
                    setError('No se pudieron cargar las cuentas por cobrar.');
                    console.error(err);
                })
                .finally(() => setLoading(false));
        }
    }, [user]);

    const totalAmount = pendingInvoices.reduce((sum, inv) => sum + inv.totalGeneral, 0);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center">
                    <CashIcon />
                    <span className="ml-2">Cuentas Por Cobrar</span>
                </h1>
                <Link to="/invoices" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                    Ver Todas las Facturas
                </Link>
            </div>

            <div className="mb-6 bg-surface p-4 rounded-lg shadow-sm border">
                <p className="text-lg">Total Pendiente: <span className="font-bold text-accent">{totalAmount.toFixed(2)} VES</span></p>
            </div>

            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}

            {!loading && !error && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Factura N°</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Fecha Emisión</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-on-primary uppercase">Monto Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-on-primary uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {pendingInvoices.map(inv => (
                                <tr key={inv.invoiceID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{inv.numeroFactura}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{inv.clienteNombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(inv.fechaEmision)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">{inv.totalGeneral.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Link to={`/invoices/print/${inv.invoiceID}`} className="text-info hover:text-info-dark font-medium">
                                            Ver Factura
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CuentasPorCobrarPage;
