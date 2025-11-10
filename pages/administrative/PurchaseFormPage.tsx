import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Product } from '../../types';
import { ShoppingCartIcon } from '../../components/icons';
import CreateProductModal from './CreateProductModal';

type FormInputs = {
    supplierName: string;
    supplierRif: string;
    fecha: string;
    moneda: string;
    condicionPago: string;
    serie: string;
    lines: {
        productID: number;
        descripcion: string;
        cantidad: number;
        unitCost: number;
        taxRate: number;
    }[];
};

const PurchaseFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            fecha: new Date().toISOString().split('T')[0],
            moneda: 'VES',
            condicionPago: 'Contado',
            serie: 'C',
            lines: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'lines'
    });

    const watchLines = watch('lines');
    const totals = React.useMemo(() => {
        return watchLines.reduce((acc, line) => {
            const cantidad = Number(line.cantidad) || 0;
            const unitCost = Number(line.unitCost) || 0;
            const taxRate = Number(line.taxRate) || 0;
            const subtotal = cantidad * unitCost;
            const iva = subtotal * (taxRate / 100);
            acc.subtotal += subtotal;
            acc.iva += iva;
            acc.total += subtotal + iva;
            return acc;
        }, { subtotal: 0, iva: 0, total: 0 });
    }, [watchLines]);

    useEffect(() => {
        if (user?.schoolId) {
            apiService.getProductsWithAudiences(user.schoolId)
                .then(data => setProducts(data.map(p => p.product).sort((a, b) => a.name.localeCompare(b.name))))
                .catch(() => setError('No se pudieron cargar los productos.'))
                .finally(() => setLoading(false));
        }
    }, [user]);
    
    const handleProductChange = (index: number, productId: string) => {
        const product = products.find(p => p.productID === Number(productId));
        if (product) {
            setValue(`lines.${index}.descripcion`, product.name);
            setValue(`lines.${index}.unitCost`, product.costPrice);
        }
    };
    
    const handleProductCreated = (newProduct: Product) => {
        setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
        append({
            productID: newProduct.productID,
            descripcion: newProduct.name,
            cantidad: 1,
            unitCost: newProduct.costPrice,
            taxRate: 16,
        });
        setIsCreateProductModalOpen(false);
    };

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError('Error de autenticación.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiService.createPurchase({
                ...data,
                schoolID: user.schoolId,
                createdByUserID: user.userId,
                lines: data.lines.map(l => ({...l, productID: Number(l.productID)}))
            });
            navigate('/purchases');
        } catch (err: any) {
            setError(err.message || 'Error al registrar la compra.');
            setLoading(false);
        }
    };
    
    const inputClasses = "p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center"><ShoppingCartIcon /><span className="ml-2">Registrar Nueva Compra</span></h1>
            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}
            
            {isCreateProductModalOpen && (
                <CreateProductModal
                    onClose={() => setIsCreateProductModalOpen(false)}
                    onProductCreated={handleProductCreated}
                />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Header */}
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Datos de la Compra</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input {...register('supplierName', { required: true })} placeholder="Nombre del Proveedor" className={inputClasses} />
                        <input {...register('supplierRif', { required: true })} placeholder="RIF del Proveedor" className={inputClasses} />
                        <input type="date" {...register('fecha', { required: true })} className={inputClasses} />
                        <input {...register('serie')} placeholder="Serie" className={inputClasses} />
                        <input {...register('moneda')} placeholder="Moneda" className={inputClasses} />
                        <input {...register('condicionPago')} placeholder="Condición de Pago" className={inputClasses} />
                    </div>
                </fieldset>
                
                {/* Lines */}
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold">Items de la Compra</legend>
                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                                <Controller control={control} name={`lines.${index}.productID`} rules={{required: true}} render={({field}) => (
                                    <select {...field} onChange={e => { field.onChange(e); handleProductChange(index, e.target.value); }} className={`${inputClasses} col-span-3`}>
                                        <option value="">Seleccionar producto</option>
                                        {products.map(p => <option key={p.productID} value={p.productID}>{p.name}</option>)}
                                    </select>
                                )} />
                                <input {...register(`lines.${index}.descripcion`)} placeholder="Descripción" className={`${inputClasses} col-span-3`} />
                                <input type="number" step="any" {...register(`lines.${index}.cantidad`, { valueAsNumber: true, required: true, min: 0.01 })} placeholder="Cant." className={`${inputClasses} col-span-1`} />
                                <input type="number" step="any" {...register(`lines.${index}.unitCost`, { valueAsNumber: true, required: true, min: 0 })} placeholder="Costo Unit." className={`${inputClasses} col-span-2`} />
                                <input type="number" step="any" {...register(`lines.${index}.taxRate`, { valueAsNumber: true, required: true, min: 0 })} placeholder="IVA %" className={`${inputClasses} col-span-2`} />
                                <button type="button" onClick={() => remove(index)} className="text-danger hover:text-danger-dark col-span-1 text-2xl font-bold">&times;</button>
                            </div>
                        ))}
                    </div>
                     <div className="mt-4 flex justify-between items-center">
                        <button type="button" onClick={() => append({ productID: 0, descripcion: '', cantidad: 1, unitCost: 0, taxRate: 16 })} className="text-sm text-primary hover:underline">
                            + Agregar Línea
                        </button>
                        <button type="button" onClick={() => setIsCreateProductModalOpen(true)} className="text-sm bg-accent text-text-on-accent py-1 px-3 rounded hover:bg-opacity-80">
                            + Nuevo Producto
                        </button>
                    </div>
                </fieldset>
                
                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-full md:w-1/2 text-sm space-y-1">
                         <div className="flex justify-between p-1"><span className="font-semibold">Subtotal:</span><span>{totals.subtotal.toFixed(2)}</span></div>
                         <div className="flex justify-between p-1"><span className="font-semibold">Monto IVA:</span><span>{totals.iva.toFixed(2)}</span></div>
                         <div className="flex justify-between font-bold text-lg border-t pt-1 p-1"><span >Total General:</span><span>{totals.total.toFixed(2)} {watch('moneda')}</span></div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/purchases" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                    <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary">
                        {loading ? 'Guardando...' : 'Guardar Compra'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PurchaseFormPage;