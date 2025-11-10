import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Product, MonthlyGenerationResult, MonthlyARSummary } from '../../types';
import { CashIcon, CalendarIcon } from '../../components/icons';

type FormInputs = {
    TargetYear: number;
    TargetMonth: number;
    ProductID: number;
    TasaIva: number;
    Cantidad: number;
    Serie: string;
    Moneda: string;
    CondicionPago: string;
};

const MonthlyGenerationPage: React.FC = () => {
    // State management
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [summary, setSummary] = useState<MonthlyARSummary[]>([]);
    const [loading, setLoading] = useState({ products: true, summary: true });
    const [error, setError] = useState('');
    const [generationResult, setGenerationResult] = useState<MonthlyGenerationResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Form management
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            TargetYear: new Date().getFullYear(),
            TargetMonth: new Date().getMonth() + 1,
            TasaIva: 16,
            Cantidad: 1,
            Serie: 'A',
            Moneda: 'VES',
            CondicionPago: 'Contado'
        }
    });

    const fetchSummary = async () => {
        if (!user?.schoolId) return;
        setLoading(p => ({ ...p, summary: true }));
        try {
            const summaryData = await apiService.getMonthlyArSummary(user.schoolId);
            setSummary(summaryData);
        } catch {
             setError('No se pudo cargar el resumen mensual.');
        } finally {
             setLoading(p => ({ ...p, summary: false }));
        }
    }

    // Data fetching
    useEffect(() => {
        if (user?.schoolId) {
            // Fetch products
            setLoading(p => ({ ...p, products: true }));
            apiService.getProductsWithAudiences(user.schoolId)
                .then(data => setProducts(data.map(p => p.product)))
                .catch(() => setError('No se pudieron cargar los productos.'))
                .finally(() => setLoading(p => ({ ...p, products: false })));
            
            fetchSummary();
        }
    }, [user]);

    // Handlers
    const handleGeneration = async (data: FormInputs, dryRun: boolean) => {
        if (!user?.schoolId) return;
        setIsGenerating(true);
        setGenerationResult(null);
        setError('');
        
        try {
            const result = await apiService.generateMonthly({
                ...data,
                SchoolID: user.schoolId,
                DryRun: dryRun
            });
            setGenerationResult(result);
            if (!dryRun && !result.error) {
                // Refresh summary after successful generation
                await fetchSummary();
            }
        } catch (err: any) {
            setError(err.message || `Error durante la ${dryRun ? 'previsualización' : 'generación'}.`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const onPreview: SubmitHandler<FormInputs> = (data) => handleGeneration(data, true);
    const onRun: SubmitHandler<FormInputs> = (data) => {
        if (window.confirm(`¿Está seguro de que desea generar ${generationResult?.candidatos || 'varias'} facturas para ${data.TargetMonth}/${data.TargetYear}? Esta acción no se puede deshacer.`)) {
            handleGeneration(data, false);
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

    return (
        <div>
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center"><CalendarIcon /><span className="ml-2">Generación Mensual de Facturas</span></h1>

            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generation Form */}
                <div className="bg-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Generar Facturas</h2>
                    <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Año</label>
                                <select {...register('TargetYear', { valueAsNumber: true })} className={inputClasses}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Mes</label>
                                <select {...register('TargetMonth', { valueAsNumber: true })} className={inputClasses}>
                                    {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Producto a Facturar</label>
                            <select {...register('ProductID', { required: 'Producto es requerido', valueAsNumber: true })} className={inputClasses}>
                                {loading.products ? <option>Cargando...</option> : products.map(p => <option key={p.productID} value={p.productID}>{p.name} ({p.salePrice.toFixed(2)})</option>)}
                            </select>
                            {errors.ProductID && <p className="text-danger text-xs mt-1">{errors.ProductID.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Tasa IVA (%)</label>
                                <input type="number" {...register('TasaIva', { valueAsNumber: true })} className={inputClasses}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Cantidad</label>
                                <input type="number" {...register('Cantidad', { valueAsNumber: true })} className={inputClasses}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Serie</label>
                                <input {...register('Serie')} className={inputClasses}/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Moneda</label>
                                <input {...register('Moneda')} className={inputClasses}/>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end space-x-2">
                             <button type="button" onClick={handleSubmit(onPreview)} disabled={isGenerating} className="bg-secondary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:opacity-50">
                                {isGenerating ? 'Procesando...' : 'Previsualizar'}
                            </button>
                            <button type="button" onClick={handleSubmit(onRun)} disabled={isGenerating || !generationResult || !generationResult.dryRun} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-gray-400">
                                {isGenerating ? 'Procesando...' : 'Generar Facturas'}
                            </button>
                        </div>
                    </form>

                    {generationResult && (
                        <div className={`mt-4 p-4 rounded ${generationResult.error ? 'bg-danger-light text-danger-text' : 'bg-info-light text-info-text'}`}>
                            <p className="font-bold">{generationResult.message}</p>
                            {generationResult.error ? <p>{generationResult.error}</p> : (
                                <>
                                    <p>Estudiantes candidatos para facturación: <strong>{generationResult.candidatos}</strong></p>
                                    <p>Facturas {generationResult.dryRun ? 'a generar' : 'generadas'}: <strong>{generationResult.facturasGeneradas}</strong></p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Summary Table */}
                <div className="bg-surface p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center"><CashIcon /><span className="ml-2">Resumen de Cobranza Mensual</span></h2>
                    {loading.summary ? <p>Cargando resumen...</p> : (
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-header sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-text-on-primary uppercase">Período</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-text-on-primary uppercase">Total Facturado</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-text-on-primary uppercase">Total Pagado</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-text-on-primary uppercase">Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {summary.map(s => (
                                        <tr key={`${s.periodYear}-${s.periodMonth}`}>
                                            <td className="px-3 py-2">{s.periodMonth}/{s.periodYear}</td>
                                            <td className="px-3 py-2 text-right">{s.totalBilled.toFixed(2)} ({s.totalInvoices})</td>
                                            <td className="px-3 py-2 text-right text-success-text">{s.totalCollected.toFixed(2)} ({s.totalInvoices - s.pendingInvoices})</td>
                                            <td className="px-3 py-2 text-right text-danger-text font-semibold">{s.accountsReceivable.toFixed(2)} ({s.pendingInvoices})</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyGenerationPage;