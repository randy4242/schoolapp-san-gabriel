import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PurchaseListItem, WithholdingType } from '../../types';
import { PercentageIcon } from '../../components/icons';

type FormInputs = {
    purchaseID: number;
    withholdingTypeID: number;
    ratePercent: number;
    issueDate: string;
};

const WithholdingFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
    const [types, setTypes] = useState<WithholdingType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            issueDate: new Date().toISOString().split('T')[0],
            ratePercent: 75, // Default for IVA in many cases
        }
    });

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getPurchases(user.schoolId, { pageSize: 1000 }), // Get a large list of recent purchases
                apiService.getWithholdingTypes()
            ]).then(([purchasesData, typesData]) => {
                setPurchases(purchasesData.items.filter(p => p.status !== 'Annulled'));
                setTypes(typesData);
            }).catch(err => {
                setError('No se pudieron cargar los datos necesarios.');
            }).finally(() => setLoading(false));
        }
    }, [user]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user) {
            setError('Error de autenticación.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiService.generatePurchaseWithholding({
                ...data,
                createdByUserID: user.userId,
            });
            navigate('/withholdings');
        } catch (err: any) {
            setError(err.message || 'Error al generar la retención.');
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center"><PercentageIcon /><span className="ml-2">Generar Retención de Compra</span></h1>
            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}

            {loading ? <p>Cargando datos...</p> : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Compra a Retener</label>
                        <select {...register('purchaseID', { required: 'Debe seleccionar una compra', valueAsNumber: true })} className={inputClasses}>
                            <option value="">-- Seleccione una compra --</option>
                            {purchases.map(p => (
                                <option key={p.purchaseID} value={p.purchaseID}>
                                    #{p.purchaseID} - {p.supplierName} ({p.totalGeneral.toFixed(2)} {p.moneda}) - {new Date(p.fecha).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                        {errors.purchaseID && <p className="text-danger text-xs mt-1">{errors.purchaseID.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Tipo de Retención</label>
                            <select {...register('withholdingTypeID', { required: 'Debe seleccionar un tipo', valueAsNumber: true })} className={inputClasses}>
                                {types.map(t => <option key={t.withholdingTypeID} value={t.withholdingTypeID}>{t.name}</option>)}
                            </select>
                            {errors.withholdingTypeID && <p className="text-danger text-xs mt-1">{errors.withholdingTypeID.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Tasa (%)</label>
                            <input type="number" step="0.01" {...register('ratePercent', { required: 'La tasa es requerida', valueAsNumber: true, min: 0, max: 100 })} className={inputClasses} />
                            {errors.ratePercent && <p className="text-danger text-xs mt-1">{errors.ratePercent.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Fecha de Emisión</label>
                        <input type="date" {...register('issueDate', { required: 'La fecha es requerida' })} className={inputClasses} />
                        {errors.issueDate && <p className="text-danger text-xs mt-1">{errors.issueDate.message}</p>}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to="/withholdings" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                        <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                            {loading ? 'Generando...' : 'Generar Retención'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default WithholdingFormPage;
