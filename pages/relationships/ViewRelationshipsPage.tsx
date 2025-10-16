import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, Child } from '../../types';
import Modal from '../../components/Modal';

const ViewRelationshipsPage: React.FC = () => {
    const { user } = useAuth();
    const [parents, setParents] = useState<User[]>([]);
    const [selectedParent, setSelectedParent] = useState<User | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [parentSearch, setParentSearch] = useState('');
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [relationToDelete, setRelationToDelete] = useState<Child | null>(null);

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getParents(user.schoolId)
                .then(setParents)
                .catch(() => setError('No se pudo cargar la lista de padres.'))
                .finally(() => setLoading(false));
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

    const handleViewChildren = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParentId || !user?.schoolId) {
            setError('Por favor, seleccione un padre de la lista.');
            return;
        }
        
        const parent = parents.find(p => p.userID === Number(selectedParentId));
        setSelectedParent(parent || null);

        setLoadingChildren(true);
        setError('');
        setSuccess('');
        setChildren([]);

        try {
            const childData = await apiService.getChildrenOfParent(Number(selectedParentId), user.schoolId);
            setChildren(childData);
        } catch (err: any) {
            setError(err.message || 'Error al buscar los hijos.');
        } finally {
            setLoadingChildren(false);
        }
    };
    
    const handleDelete = async () => {
        if (!relationToDelete || !selectedParentId || !user?.schoolId) return;

        try {
            await apiService.deleteRelationship(relationToDelete.relationID);
            setSuccess(`Relación con ${relationToDelete.userName} eliminada.`);
            setRelationToDelete(null);
            // Refresh children list
            const childData = await apiService.getChildrenOfParent(Number(selectedParentId), user.schoolId);
            setChildren(childData);
        } catch (err: any) {
             setError(err.message || 'Error al eliminar la relación.');
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Ver Hijos por Padre</h1>
                <Link to="/relationships/create" className="bg-main-blue text-white py-2 px-4 rounded hover:bg-black transition-colors">
                    Crear Relación
                </Link>
            </div>
            
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <form onSubmit={handleViewChildren}>
                    <div className="mb-4">
                         <label htmlFor="parentSearch" className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar Padre/Representante
                        </label>
                        <input
                            id="parentSearch"
                            type="text"
                            placeholder="Nombre o cédula..."
                            value={parentSearch}
                            onChange={e => setParentSearch(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 focus:border-brand-yellow mb-2"
                        />
                        <select
                            value={selectedParentId}
                            onChange={e => setSelectedParentId(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 focus:border-brand-yellow"
                        >
                            <option value="">{loading ? 'Cargando padres...' : 'Seleccione un padre'}</option>
                            {filteredParents.map(p => (
                                <option key={p.userID} value={p.userID}>
                                    {p.userName} ({p.cedula})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" disabled={loadingChildren} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 disabled:bg-gray-400 transition-colors">
                        {loadingChildren ? 'Buscando...' : 'Ver Hijos'}
                    </button>
                </form>
            </div>
            
            {selectedParent && !loadingChildren && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Hijos de <span className="text-brand-yellow">{selectedParent.userName}</span></h2>
                    {children.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nombre del Hijo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {children.map(child => (
                                        <tr key={child.userID}>
                                            <td className="px-6 py-4 whitespace-nowrap">{child.userName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{child.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => setRelationToDelete(child)} className="text-red-600 hover:text-red-800 font-medium">
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">No se encontraron hijos para este padre.</p>
                    )}
                </div>
            )}
            
            {relationToDelete && (
                <Modal isOpen={true} onClose={() => setRelationToDelete(null)} title="Confirmar Eliminación">
                    <p>¿Estás seguro de que deseas eliminar la relación entre <strong>{selectedParent?.userName}</strong> y <strong>{relationToDelete.userName}</strong>? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end space-x-4 pt-6 mt-4 border-t">
                         <button type="button" onClick={() => setRelationToDelete(null)} className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleDelete} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors">
                            Eliminar
                        </button>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default ViewRelationshipsPage;
