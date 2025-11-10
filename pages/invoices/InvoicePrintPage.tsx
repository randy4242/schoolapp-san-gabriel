import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { InvoicePrintVM } from '../../types';

const InvoicePrintPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<InvoicePrintVM | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            setLoading(true);
            apiService.getInvoiceForPrint(parseInt(id))
                .then(setInvoice)
                .catch(() => setError('No se pudo cargar la factura.'))
                .finally(() => setLoading(false));
        }
    }, [id]);
    
    const M = (v: number) => v.toFixed(2);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');

    if (loading) {
        return <div className="p-8 text-center">Cargando factura...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-danger">{error}</p>
                <button onClick={() => navigate(-1)} className="mt-4 bg-primary text-white py-2 px-4 rounded">Volver</button>
            </div>
        );
    }

    if (!invoice) {
        return <div className="p-8 text-center">Factura no encontrada.</div>;
    }

    return (
        <>
            <style>{`
                body { font-family: Arial, Helvetica, sans-serif; color: #000; }
                .canvas { width: 95%; margin: 0 auto; }
                .hdr { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                .hdr-left, .hdr-right { font-size: 14px; }
                .hdr-right { text-align: right; }
                .title { text-align: center; font-weight: 800; margin: 12px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
                thead th { background: #f1f1f1; }
                .totals { width: 40%; margin-left: auto; margin-top: 10px; }
                .totals td { border: none; }
                .totals .row td:first-child { text-align: right; width: 60%; }
                .totals .row td:last-child { text-align: right; width: 40%; border-bottom: 1px solid #000; }
                .grand { font-weight: 800; }
                @media print { .no-print { display: none; } }
            `}</style>
            <div className="canvas">
                <div className="no-print" style={{ textAlign: 'right', margin: '10px 0' }}>
                    <button onClick={() => navigate(-1)} className="bg-gray-500 text-white py-1 px-3 rounded mr-2">Volver</button>
                    <button onClick={() => window.print()} className="bg-blue-600 text-white py-1 px-3 rounded">Imprimir</button>
                </div>

                <div className="hdr">
                    <div className="hdr-left">
                        <div><b>Colegio / Sede:</b> {invoice.schoolName}</div>
                        <div><b>Cliente:</b> {invoice.clienteNombre}</div>
                        <div><b>RIF/Cédula:</b> {invoice.clienteRifCedula}</div>
                        {invoice.clienteDireccionFiscal && <div><b>Dirección:</b> {invoice.clienteDireccionFiscal}</div>}
                        {invoice.clienteTelefono && <div><b>Teléfono:</b> {invoice.clienteTelefono}</div>}
                    </div>
                    <div className="hdr-right">
                        <div><b>Factura N°:</b> {invoice.numeroFactura}</div>
                        <div><b>Control N°:</b> {invoice.numeroControl}</div>
                        <div><b>Serie:</b> {invoice.serie}</div>
                        <div><b>Fecha:</b> {formatDate(invoice.fechaEmision)}</div>
                        <div><b>Condición:</b> {invoice.condicionPago}</div>
                        <div><b>Moneda:</b> {invoice.moneda}</div>
                        <div><b>Status:</b> {invoice.status}</div>
                    </div>
                </div>

                <div className="title">FACTURA</div>

                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '8%' }}>Cant</th>
                            <th>Descripción</th>
                            <th style={{ width: '12%' }}>P. Unit</th>
                            <th style={{ width: '10%' }}>Desc</th>
                            <th style={{ width: '10%' }}>IVA %</th>
                            <th style={{ width: '12%' }}>Base</th>
                            <th style={{ width: '12%' }}>IVA</th>
                            <th style={{ width: '12%' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lines?.length > 0 ? (
                            invoice.lines.map(l => (
                                <tr key={l.invoiceLineID}>
                                    <td style={{ textAlign: 'right' }}>{M(l.cantidad)}</td>
                                    <td>{l.descripcion}</td>
                                    <td style={{ textAlign: 'right' }}>{M(l.precioUnitario)}</td>
                                    <td style={{ textAlign: 'right' }}>{M(l.descuento)}</td>
                                    <td style={{ textAlign: 'right' }}>{l.tasaIva.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{M(l.montoBase)}</td>
                                    <td style={{ textAlign: 'right' }}>{M(l.montoIva)}</td>
                                    <td style={{ textAlign: 'right' }}>{M(l.totalLinea)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} style={{ textAlign: 'center' }}>Sin líneas</td></tr>
                        )}
                    </tbody>
                </table>

                <table className="totals">
                    <tbody>
                        <tr className="row"><td>Subtotal:</td><td>{M(invoice.subtotal)}</td></tr>
                        <tr className="row"><td>Descuento Total:</td><td>{M(invoice.descuentoTotal)}</td></tr>
                        <tr className="row"><td>Base Imponible:</td><td>{M(invoice.baseImponible)}</td></tr>
                        <tr className="row"><td>IVA:</td><td>{M(invoice.montoIva)}</td></tr>
                        <tr className="row"><td>Exento:</td><td>{M(invoice.exento)}</td></tr>
                        <tr className="row grand"><td>Total General:</td><td>{M(invoice.totalGeneral)}</td></tr>
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default InvoicePrintPage;
