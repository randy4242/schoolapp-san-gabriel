import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Product, User } from '../../types';
import Modal from '../../components/Modal';

interface CreateProductModalProps {
    onClose: () => void;
    onProductCreated: (newProduct: Product) => void;
    isExpense?: boolean;
}

type ProductFormInputs = {
    sku: string;
    name: string;
    description: string | null;
    costPrice: number;
    salePrice: number;
};

const CreateProductModal: React.FC<CreateProductModalProps> = ({ onClose, onProductCreated, isExpense = false }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currency, setCurrency] = useState<'VES' | 'USD'>('VES');
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm<ProductFormInputs>();

    // Audience Selection State
    const [parents, setParents] = useState<User[]>([]);
    const [audienceType, setAudienceType] = useState<'All' | 'User'>('All');
    const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

    React.useEffect(() => {
        if (user?.schoolId) {
            apiService.getUsers(user.schoolId).then(users => {
                // Filter for parents (Role 3)
                setParents(users.filter(u => u.roleID === 3));
            }).catch(console.error);
        }
    }, [user?.schoolId]);

    const onSubmit: SubmitHandler<ProductFormInputs> = async (data) => {
        if (!user) {
            setError('Usuario no autenticado.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            if (!isExpense && audienceType === 'User' && !selectedParentId) {
                setError('Debe seleccionar un padre específico.');
                setIsSubmitting(false);
                return;
            }

            const audiencesPayload = (isExpense || audienceType === 'All')
                ? [{ targetType: "All" as const, targetID: null }]
                : [{ targetType: "User" as const, targetID: selectedParentId }];

            const payload = {
                ...data,
                schoolID: user.schoolId,
                isActive: true,
                trackInventory: true,
                costPrice: Number(data.costPrice),
                salePrice: isExpense ? 0 : Number(data.salePrice),
                currency: currency,
                audiences: audiencesPayload
            };
            console.log("Sending Payload:", payload);
            const newProduct = await apiService.createProduct(payload);
            onProductCreated(newProduct);
        } catch (err: any) {
            setError(err.message || 'Error al crear el producto.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/50";
    const currencyButtonClass = (btnCurrency: 'VES' | 'USD') => `px-3 py-1 text-sm font-bold border ${currency === btnCurrency ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-border hover:bg-gray-100'}`;

    return (
        <Modal isOpen={true} onClose={onClose} title={isExpense ? "Registrar Nuevo Ítem de Compra" : "Crear Nuevo Producto"}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}

                <div className="flex justify-end mb-2">
                    <div className="flex rounded-md shadow-sm">
                        <button type="button" onClick={() => setCurrency('VES')} className={`${currencyButtonClass('VES')} rounded-l-md`}>VES</button>
                        <button type="button" onClick={() => setCurrency('USD')} className={`${currencyButtonClass('USD')} rounded-r-md border-l-0`}>USD</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">SKU</label>
                        <input {...register('sku', { required: 'SKU es requerido' })} className={inputClasses} />
                        {errors.sku && <p className="text-danger text-xs mt-1">{errors.sku.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nombre</label>
                        <input {...register('name', { required: 'Nombre es requerido' })} className={inputClasses} />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Descripción</label>
                    <textarea {...register('description')} rows={2} className={inputClasses} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Precio de Costo</label>
                        <input type="number" step="0.01" {...register('costPrice', { required: 'Costo es requerido', valueAsNumber: true, min: 0 })} className={inputClasses} />
                        {errors.costPrice && <p className="text-danger text-xs mt-1">{errors.costPrice.message}</p>}
                    </div>

                    {!isExpense && (
                        <div>
                            <label className="block text-sm font-medium">Precio de Venta ({currency})</label>
                            <input type="number" step="0.01" {...register('salePrice', { required: !isExpense, valueAsNumber: true, min: 0 })} className={inputClasses} />
                            {errors.salePrice && <p className="text-danger text-xs mt-1">{errors.salePrice.message}</p>}
                        </div>
                    )}
                </div>

                {!isExpense && (
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2">Tipo de Audiencia</label>
                        <div className="flex space-x-4 mb-2">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    value="All"
                                    checked={audienceType === 'All'}
                                    onChange={() => { setAudienceType('All'); setSelectedParentId(null); }}
                                    className="form-radio text-primary"
                                />
                                <span className="ml-2 text-sm">General (Para todos)</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    value="User"
                                    checked={audienceType === 'User'}
                                    onChange={() => setAudienceType('User')}
                                    className="form-radio text-primary"
                                />
                                <span className="ml-2 text-sm">Personalizado (Padre Específico)</span>
                            </label>
                        </div>

                        {audienceType === 'User' && (
                            <div className="animate-fadeIn">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Padre</label>
                                <select
                                    className={inputClasses}
                                    value={selectedParentId || ''}
                                    onChange={e => setSelectedParentId(Number(e.target.value))}
                                >
                                    <option value="">-- Seleccione --</option>
                                    {parents.map(p => (
                                        <option key={p.userID} value={p.userID}>{p.userName} ({p.email})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                        {isSubmitting ? 'Creando...' : 'Crear Producto'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateProductModal;