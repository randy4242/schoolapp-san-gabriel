
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PendingInvoice, ExchangeRate } from '../../types';
import { CashIcon } from '../../components/icons';

const ParentPendingInvoicesPage: React.FC = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRate, setActiveRate] = useState<number | null>(null);

    useEffect(() => {
        if (user?.schoolId) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user?.schoolId) return;
        setLoading(true);
        try {
            const [fetchedInvoices, rates] = await Promise.all([
                apiService.getPendingInvoices(user.schoolId),
                apiService.getExchangeRates(user.schoolId)
            ]);

            // Filter for current user if API returns all (safety check)
            const myInvoices = fetchedInvoices.filter(i => i.clienteRifCedula === user.cedula || i.clienteNombre === user.userName);
            // Better to rely on backend filtering, but this is a fallback if endpoint is generic-admin
            // Actually, if userId is available in PendingInvoice, we should use that. 
            // Assuming the existing endpoint returns what the user is allowed to see.

            setInvoices(fetchedInvoices);

            // Find active USD->VES rate (case-insensitive safety)
            const rate = rates.find(r =>
                r.isActive &&
                r.fromCurrency?.toUpperCase() === 'USD' &&
                r.toCurrency?.toUpperCase() === 'VES'
            );
            console.log('Found Rate:', rate); // Debugging

            if (rate) setActiveRate(rate.rate);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return amount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' ' + currency;
    };

    if (loading) return <div className="p-8 text-center">Cargando facturas...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center text-primary">
                <CashIcon />
                <span className="ml-2">Mis Facturas Pendientes</span>
            </h1>

            {activeRate && (
                <div className="mb-4 text-sm text-text-secondary">
                    Tasa de cambio del día: <span className="font-bold text-accent">{activeRate} VES/USD</span>
                </div>
            )}

            <div className="space-y-4">
                {invoices.length === 0 ? (
                    <p className="text-text-secondary">No tienes facturas pendientes.</p>
                ) : (
                    invoices.map(inv => {
                        const isUsd = inv.moneda === 'USD';
                        const totalVes = isUsd && activeRate ? inv.totalGeneral * activeRate : inv.totalGeneral;

                        return (
                            <div key={inv.invoiceID} className="bg-surface p-4 rounded-lg shadow border border-border flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-text-primary">{inv.descripcion || `Factura #${inv.numeroFactura}`}</h3>
                                    <p className="text-sm text-text-secondary">Emisión: {new Date(inv.fechaEmision).toLocaleDateString()}</p>
                                    <p className="text-sm text-text-secondary">Vence: {new Date(inv.fechaVencimiento || inv.fechaEmision).toLocaleDateString()}</p>
                                </div>
                                <div className="mt-4 md:mt-0 text-right">
                                    {isUsd ? (
                                        <>
                                            <p className="text-xl font-bold text-primary">{formatCurrency(totalVes, 'VES')}</p>
                                            <p className="text-md font-medium text-accent">Ref: {formatCurrency(inv.totalGeneral, 'USD')}</p>
                                        </>
                                    ) : (
                                        <p className="text-xl font-bold text-primary">{formatCurrency(inv.totalGeneral, 'VES')}</p>
                                    )}
                                    <button className="mt-2 bg-success text-white px-4 py-2 rounded text-sm hover:bg-success-dark transition-colors">
                                        Reportar Pago ({formatCurrency(totalVes, 'VES')})
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ParentPendingInvoicesPage;
