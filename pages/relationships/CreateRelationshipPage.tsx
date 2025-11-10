import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';

type FormInputs = {
    parentId: number;
    childId: number;
};

const CreateRelationshipPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();

    const [parents, setParents] = useState<User[]>([]);
    const [children, setChildren] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [parentSearch, setParentSearch] = useState('');
    const [childSearch, setChildSearch] = useState('');

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getParents(user.schoolId),
                apiService.getStudents(user.schoolId)
            ]).then(([parentData, childData]) => {
                setParents(parentData);
                setChildren(childData);
            }).catch(() => {
                setError('No se pudo cargar la lista de padres o estudiantes.');
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [user]);

    const filteredParents = useMemo(() => {
        if (!parentSearch) return parents;
        const query = parentSearch.toLowerCase();
        return parents.filter(p => 
            p.userName.toLowerCase().includes(query) || 
            (p.cedula && p.cedula.toLowerCase().includes(query))
        );
    }, [parents, parentSearch]);

    const filteredChildren = useMemo(() => {
        if (!childSearch) return children;
        const query = childSearch.toLowerCase();
        return children.filter(c => 
            c.userName.toLowerCase().includes(query) || 
            (c.cedula && c.cedula.toLowerCase().includes(query))
        );
    }, [children, childSearch]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError('Error de autenticación.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiService.createRelationship(data.parentId, data.childId);
            setSuccess('Relación creada exitosamente.');
            setTimeout(() => navigate('/relationships'), 1500);
        } catch (err: any) {
            setError(err.message || 'Error al crear la relación.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Crear Relación Padre-Hijo</h1>

            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-success-light text-success-text p-3 rounded mb-4">{success}</div>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="parentSearch" className="block text-sm font-medium text-text-secondary mb-1">
                        Padre/Representante
                        <span className="text-xs text-text-tertiary ml-2">{filteredParents.length} / {parents.length}</span>
                    </label>
                    <input
                        id="parentSearch"
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        value={parentSearch}
                        onChange={e => setParentSearch(e.target.value)}
                        className="w-full p-2 bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-2"
                    />
                    <select
                        {...register('parentId', { required: 'Debe seleccionar un padre', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                        <option value="">Seleccione un padre</option>
                        {filteredParents.map(p => (
                            <option key={p.userID} value={p.userID}>
                                {p.userName} ({p.cedula})
                            </option>
                        ))}
                    </select>
                    {errors.parentId && <p className="text-danger text-xs mt-1">{errors.parentId.message}</p>}
                </div>

                <div>
                    <label htmlFor="childSearch" className="block text-sm font-medium text-text-secondary mb-1">
                        Hijo/Estudiante
                        <span className="text-xs text-text-tertiary ml-2">{filteredChildren.length} / {children.length}</span>
                    </label>
                    <input
                        id="childSearch"
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        value={childSearch}
                        onChange={e => setChildSearch(e.target.value)}
                        className="w-full p-2 bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-2"
                    />
                    <select
                        {...register('childId', { required: 'Debe seleccionar un hijo', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                        <option value="">Seleccione un estudiante</option>
                        {filteredChildren.map(c => (
                            <option key={c.userID} value={c.userID}>
                                {c.userName} ({c.cedula})
                            </option>
                        ))}
                    </select>
                    {errors.childId && <p className="text-danger text-xs mt-1">{errors.childId.message}</p>}
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/relationships" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                        Cancelar
                    </Link>
                    <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary transition-colors">
                        {loading ? 'Creando...' : 'Crear Relación'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateRelationshipPage;