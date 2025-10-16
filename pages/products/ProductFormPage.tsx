import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, AudiencePayload, User } from '../../types';

type FormInputs = {
    sku: string;
    name: string;
    description: string;
    costPrice: number;
    salePrice: number;
    isActive: boolean;
    audiencesJson: string;
};

type AudienceState = AudiencePayload & { display: string };

const ProductFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditMode = Boolean(id);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [audiences, setAudiences] = useState<AudienceState[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [searchedUsers, setSearchedUsers] = useState<User[]>([]);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: { isActive: true, audiencesJson: '[]' }
    });

    useEffect(() => {
        if (isEditMode && user?.schoolId) {
            setLoading(true);
            apiService.getProductWithAudiences(parseInt(id!), user.schoolId)
                .then(({ product, audiences }) => {
                    setValue('sku', product.sku);
                    setValue('name', product.name);
                    setValue('description', product.description || '');
                    setValue('costPrice', product.costPrice);
                    setValue('salePrice', product.salePrice);
                    setValue('isActive', product.isActive);
                    // This requires a more complex mapping to get display names
                    setAudiences(audiences.map(a => ({...a, display: `${a.targetType}:${a.targetID || 'All'}`})));
                })
                .catch(() => setError('No se pudo cargar el producto.'))
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, setValue, user?.schoolId]);

    useEffect(() => {
        const json = JSON.stringify(audiences.map(({ targetType, targetID }) => ({ targetType, targetID })));
        setValue('audiencesJson', json);
    }, [audiences, setValue]);
    
    const addAudience = (item: AudienceState) => {
        setAudiences(current => {
            if (item.targetType === 'All') return [item];
            const withoutAll = current.filter(a => a.targetType !== 'All');
            const exists = withoutAll.some(a => a.targetType === item.targetType && a.targetID === item.targetID);
            return exists ? withoutAll : [...withoutAll, item];
        });
    };
    
    const removeAudience = (index: number) => {
        setAudiences(current => current.filter((_, i) => i !== index));
    };

    const handleUserSearch = async () => {
        if (!userSearch.trim() || !user?.schoolId) return;
        const result = await apiService.globalSearch(user.schoolId, userSearch);
        if (result.users.length > 0) {
            const u = result.users[0];
            addAudience({ targetType: 'User', targetID: u.userID, display: u.userName });
            setUserSearch('');
        } else {
            alert('No se encontró ningún usuario.');
        }
    };

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }

        setError('');
        setLoading(true);

        const audiencePayload = JSON.parse(data.audiencesJson);
        const payload = {
            schoolID: user.schoolId,
            sku: data.sku,
            name: data.name,
            description: data.description,
            costPrice: data.costPrice,
            salePrice: data.salePrice,
            isActive: data.isActive,
            audiences: audiencePayload.length > 0 ? audiencePayload : [{targetType: "All", targetID: null}]
        };

        try {
            if (isEditMode) {
                await apiService.updateProduct(parseInt(id!), payload);
            } else {
                await apiService.createProduct(payload);
            }
            navigate('/products');
        } catch (err: any) {
            setError(err.message || `Ocurrió un error al guardar el producto.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{isEditMode ? 'Editar' : 'Crear'} Producto</h1>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium">SKU</label>
                        <input {...register('sku', { required: 'SKU es requerido' })} className="mt-1 w-full input-style" />
                        {errors.sku && <p className="text-red-500 text-xs">{errors.sku.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Nombre</label>
                        <input {...register('name', { required: 'Nombre es requerido' })} className="mt-1 w-full input-style" />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Descripción</label>
                    <textarea {...register('description')} rows={3} className="mt-1 w-full input-style" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium">Precio de Costo</label>
                        <input type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="mt-1 w-full input-style" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Precio de Venta</label>
                        <input type="number" step="0.01" {...register('salePrice', { required: 'Precio es requerido', valueAsNumber: true })} className="mt-1 w-full input-style" />
                        {errors.salePrice && <p className="text-red-500 text-xs">{errors.salePrice.message}</p>}
                    </div>
                    <div className="flex items-center mt-6">
                        <input type="checkbox" {...register('isActive')} id="isActive" className="h-4 w-4 rounded" />
                        <label htmlFor="isActive" className="ml-2 text-sm font-medium">Activo</label>
                    </div>
                </div>

                <hr className="my-6"/>

                <h3 className="text-lg font-semibold">Audiencia</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                    <button type="button" onClick={() => addAudience({ targetType: 'All', targetID: null, display: 'Todos' })} className="btn-sm btn-outline-secondary">Todos</button>
                    {ROLES.filter(r => [1,2,3,11].includes(r.id)).map(r => (
                        <button key={r.id} type="button" onClick={() => addAudience({ targetType: 'Role', targetID: r.id, display: r.name })} className="btn-sm btn-outline-primary">{r.name}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar usuario..." className="flex-grow input-style" />
                    <button type="button" onClick={handleUserSearch} className="btn btn-outline-info">Agregar</button>
                </div>

                <div className="border rounded p-2 min-h-[40px]">
                    {audiences.length === 0 
                        ? <span className="text-sm text-gray-500">Sin selección. Por defecto será "Todos".</span>
                        : audiences.map((a, i) => (
                            <span key={i} className="inline-flex items-center bg-gray-200 text-gray-800 text-sm font-medium mr-2 mb-2 px-2.5 py-0.5 rounded">
                                {a.display}
                                <button type="button" onClick={() => removeAudience(i)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
                            </span>
                        ))
                    }
                </div>
                <input type="hidden" {...register('audiencesJson')} />

                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/products" className="btn btn-secondary">Cancelar</Link>
                    <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
            <style>{`
                .input-style { 
                  padding: 0.5rem 0.75rem; 
                  border: 1px solid var(--color-login-inputBorder); 
                  border-radius: 0.25rem; 
                  background-color: var(--color-login-inputBg); 
                  color: var(--color-text-onPrimary);
                }
                .btn { padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 600; }
                .btn-primary { background-color: #191815; color: white; }
                .btn-secondary { background-color: #6c757d; color: white; }
                .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
                .btn-outline-secondary { border: 1px solid #6c757d; color: #6c757d; }
                .btn-outline-primary { border: 1px solid #0d6efd; color: #0d6efd; }
                .btn-outline-info { border: 1px solid #0dcaf0; color: #0dcaf0; }
            `}</style>
        </div>
    );
};

export default ProductFormPage;