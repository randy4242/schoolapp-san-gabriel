
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
            Promise.all([
                apiService.getProductWithAudiences(parseInt(id!), user.schoolId),
                apiService.getUsers(user.schoolId) // Fetch all users for name resolution
            ]).then(([{ product, audiences: fetchedAudiences }, allUsers]) => {
                setValue('sku', product.sku);
                setValue('name', product.name);
                setValue('description', product.description || '');
                setValue('costPrice', product.costPrice);
                setValue('salePrice', product.salePrice);
                setValue('isActive', product.isActive);
                
                const userMap = new Map(allUsers.map(u => [u.userID, u.userName]));
                const roleMap = new Map(ROLES.map(r => [r.id, r.name]));

                const audienceStates: AudienceState[] = fetchedAudiences.map(a => {
                    const targetType = (a.targetType || 'All') as 'All' | 'Role' | 'User' | 'Classroom';
                    let display = `${targetType}:${a.targetID}`; // Fallback display
                    if (targetType === 'All') {
                        display = 'Todos';
                    } else if (targetType === 'Role' && a.targetID) {
                        display = roleMap.get(a.targetID) || `Rol #${a.targetID}`;
                    } else if (targetType === 'User' && a.targetID) {
                        display = userMap.get(a.targetID) || `Usuario #${a.targetID}`;
                    }
                    return { targetType, targetID: a.targetID || null, display };
                });
                setAudiences(audienceStates);

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
        if (!userSearch.trim() || !user?.schoolId || !user.userId) return;
        const result = await apiService.globalSearch(user.schoolId, user.userId, userSearch);
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

    const inputStyle = "p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";
    const btnBase = "py-2 px-4 rounded font-semibold transition-colors";
    const btnPrimary = "bg-primary text-text-on-primary hover:bg-primary/90 disabled:bg-secondary";
    const btnSecondary = "bg-secondary text-text-on-primary hover:bg-secondary/90";
    const btnSmOutline = "py-1 px-2 text-sm rounded border";

    return (
        <div className="max-w-3xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar' : 'Crear'} Producto</h1>
            {error && <p className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</p>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium">SKU</label>
                        <input {...register('sku', { required: 'SKU es requerido' })} className={`mt-1 w-full ${inputStyle}`} />
                        {errors.sku && <p className="text-danger text-xs">{errors.sku.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Nombre</label>
                        <input {...register('name', { required: 'Nombre es requerido' })} className={`mt-1 w-full ${inputStyle}`} />
                        {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Descripción</label>
                    <textarea {...register('description')} rows={3} className={`mt-1 w-full ${inputStyle}`} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium">Precio de Costo</label>
                        <input type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className={`mt-1 w-full ${inputStyle}`} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Precio de Venta</label>
                        <input type="number" step="0.01" {...register('salePrice', { required: 'Precio es requerido', valueAsNumber: true })} className={`mt-1 w-full ${inputStyle}`} />
                        {errors.salePrice && <p className="text-danger text-xs">{errors.salePrice.message}</p>}
                    </div>
                    <div className="flex items-center mt-6">
                        <input type="checkbox" {...register('isActive')} id="isActive" className="h-4 w-4 rounded border-border text-primary focus:ring-accent" />
                        <label htmlFor="isActive" className="ml-2 text-sm font-medium">Activo</label>
                    </div>
                </div>

                <hr className="my-6"/>

                <h3 className="text-lg font-semibold">Audiencia</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                    <button type="button" onClick={() => addAudience({ targetType: 'All', targetID: null, display: 'Todos' })} className={`${btnSmOutline} border-secondary text-secondary hover:bg-secondary/10`}>Todos</button>
                    {ROLES.filter(r => [1,2,3,11].includes(r.id)).map(r => (
                        <button key={r.id} type="button" onClick={() => addAudience({ targetType: 'Role', targetID: r.id, display: r.name })} className={`${btnSmOutline} border-primary text-primary hover:bg-primary/10`}>{r.name}</button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Buscar usuario..." className={`flex-grow ${inputStyle}`} />
                    <button type="button" onClick={handleUserSearch} className={`${btnBase} ${btnSmOutline} border-info text-info hover:bg-info/10`}>Agregar</button>
                </div>

                <div className="border rounded p-2 min-h-[40px] bg-background">
                    {audiences.length === 0 
                        ? <span className="text-sm text-text-tertiary">Sin selección. Por defecto será "Todos".</span>
                        : audiences.map((a, i) => (
                            <span key={i} className="inline-flex items-center bg-background border text-text-secondary text-sm font-medium mr-2 mb-2 px-2.5 py-0.5 rounded">
                                {a.display}
                                <button type="button" onClick={() => removeAudience(i)} className="ml-2 text-danger hover:text-danger-text">&times;</button>
                            </span>
                        ))
                    }
                </div>
                <input type="hidden" {...register('audiencesJson')} />

                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/products" className={`${btnBase} bg-background text-text-primary hover:bg-border`}>Cancelar</Link>
                    <button type="submit" disabled={loading} className={`${btnBase} ${btnPrimary}`}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductFormPage;
