import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useNotifications } from '../../hooks/useNotifications';

type PostType = 'invoice' | 'payment' | 'purchase' | 'payroll' | 'inventory';

const GLPostingPage: React.FC = () => {
    const [loading, setLoading] = useState<PostType | null>(null);
    const [results, setResults] = useState<Record<PostType, { success?: string, error?: string }>>({
        invoice: {}, payment: {}, purchase: {}, payroll: {}, inventory: {}
    });
    
    const { register, handleSubmit, resetField } = useForm();

    const handlePost = async (type: PostType, id: number) => {
        if (!id || isNaN(id)) {
            setResults(prev => ({ ...prev, [type]: { error: 'Por favor, ingrese un ID válido.' } }));
            return;
        }

        setLoading(type);
        setResults(prev => ({ ...prev, [type]: {} }));

        try {
            switch (type) {
                case 'invoice': await apiService.postGlInvoice(id); break;
                case 'payment': await apiService.postGlPayment(id); break;
                case 'purchase': await apiService.postGlPurchase(id); break;
                case 'payroll': await apiService.postGlPayroll(id); break;
                case 'inventory': await apiService.postGlInventoryMovement(id); break;
            }
            setResults(prev => ({ ...prev, [type]: { success: `ID ${id} posteado correctamente.` } }));
            resetField(type);
        } catch (err: any) {
            const message = err.message || `Error al postear el ID ${id}.`;
            setResults(prev => ({ ...prev, [type]: { error: message } }));
        } finally {
            setLoading(null);
        }
    };

    const PostCard: React.FC<{ type: PostType, title: string }> = ({ type, title }) => (
        <form onSubmit={handleSubmit(data => handlePost(type, Number(data[type])))} className="bg-surface p-4 rounded-lg shadow-md border space-y-3">
            <h3 className="font-semibold text-lg">{title}</h3>
            <input
                type="number"
                {...register(type)}
                placeholder={`ID de ${title.toLowerCase()}`}
                className="w-full p-2 border border-border rounded"
                disabled={loading === type}
            />
            <button type="submit" disabled={loading === type} className="w-full bg-primary text-white py-2 rounded hover:bg-opacity-90 disabled:bg-gray-400">
                {loading === type ? 'Posteando...' : 'Postear'}
            </button>
            {results[type].success && <p className="text-sm text-success-text mt-2">{results[type].success}</p>}
            {results[type].error && <p className="text-sm text-danger-text mt-2">{results[type].error}</p>}
        </form>
    );

    return (
        <div>
            <h1 className="text-2xl font-bold text-text-primary mb-6">Posteos al Libro Contable (GL)</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <PostCard type="invoice" title="Factura de Venta" />
                <PostCard type="payment" title="Pago/Cobro" />
                <PostCard type="purchase" title="Compra" />
                <PostCard type="payroll" title="Nómina" />
                <PostCard type="inventory" title="Mov. de Inventario" />
            </div>
        </div>
    );
};

export default GLPostingPage;
