import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Product } from '../../types';
import Modal from '../../components/Modal';

interface CreateProductModalProps {
    onClose: () => void;
    onProductCreated: (newProduct: Product) => void;
}

type ProductFormInputs = {
    sku: string;
    name: string;
    description: string | null;
    costPrice: number;
    salePrice: number;
};

const CreateProductModal: React.FC<CreateProductModalProps> = ({ onClose, onProductCreated }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm<ProductFormInputs>();

    const onSubmit: SubmitHandler<ProductFormInputs> = async (data) => {
        if (!user) {
            setError('Usuario no autenticado.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const payload = {
                ...data,
                schoolID: user.schoolId,
                isActive: true,
                audiences: [{ targetType: "All" as const, targetID: null }]
            };
            const newProduct = await apiService.createProduct(payload);
            onProductCreated(newProduct);
        } catch (err: any) {
            setError(err.message || 'Error al crear el producto.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <Modal isOpen={true} onClose={onClose} title="Crear Nuevo Producto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}
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
                    <div>
                        <label className="block text-sm font-medium">Precio de Venta</label>
                        <input type="number" step="0.01" {...register('salePrice', { required: 'Precio de venta es requerido', valueAsNumber: true, min: 0 })} className={inputClasses} />
                        {errors.salePrice && <p className="text-danger text-xs mt-1">{errors.salePrice.message}</p>}
                    </div>
                </div>
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