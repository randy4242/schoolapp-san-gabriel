import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, Parent, Child } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface UserRelationshipsModalProps {
    user: User;
    onClose: () => void;
}

const UserRelationshipsModal: React.FC<UserRelationshipsModalProps> = ({ user, onClose }) => {
    const { user: authUser } = useAuth();
    const [relationships, setRelationships] = useState<(Parent | Child)[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [mode, setMode] = useState<'view' | 'add'>('view');
    const [searchableUsers, setSearchableUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const isStudent = user.roleID === 1;
    const modalTitle = isStudent ? `Padres de ${user.userName}` : `Hijos de ${user.userName}`;
    
    const fetchRelationships = useCallback(async () => {
        if (!authUser?.schoolId) return;
        setLoading(true);
        setError('');
        try {
            const data = isStudent 
                ? await apiService.getParentsOfChild(user.userID, authUser.schoolId)
                : await apiService.getChildrenOfParent(user.userID, authUser.schoolId);
            setRelationships(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar las relaciones.');
        } finally {
            setLoading(false);
        }
    }, [user, authUser, isStudent]);

    useEffect(() => {
        fetchRelationships();
    }, [fetchRelationships]);
    
    const fetchSearchableUsers = useCallback(async () => {
        if (!authUser?.schoolId) return;
        try {
            const users = isStudent 
                ? await apiService.getParents(authUser.schoolId) 
                : await apiService.getStudents(authUser.schoolId);
            setSearchableUsers(users);
        } catch (err) {
            console.error("Failed to fetch users for relationship creation:", err);
        }
    }, [authUser, isStudent]);

    useEffect(() => {
        if (mode === 'add') {
            fetchSearchableUsers();
        }
    }, [mode, fetchSearchableUsers]);

    const filteredSearchableUsers = useMemo(() => {
        if (!searchTerm) return searchableUsers;
        return searchableUsers.filter(u => u.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchableUsers, searchTerm]);
    
    const handleDelete = async (relationId: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta relación?')) {
            try {
                await apiService.deleteRelationship(relationId);
                setSuccess('Relación eliminada.');
                fetchRelationships(); // Refresh list
            } catch (err: any) {
                setError(err.message || 'Error al eliminar.');
            }
        }
    };
    
    const handleAdd = async () => {
        if (!selectedUserId) return;
        try {
            const parentId = isStudent ? parseInt(selectedUserId) : user.userID;
            const childId = isStudent ? user.userID : parseInt(selectedUserId);
            await apiService.createRelationship(parentId, childId);
            setSuccess('Relación agregada.');
            fetchRelationships();
            setMode('view');
            setSearchTerm('');
            setSelectedUserId('');
        } catch (err: any) {
            setError(err.message || 'Error al agregar.');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={modalTitle}>
            {error && <p className="text-danger mb-2 p-2 bg-danger-light rounded">{error}</p>}
            {success && <p className="text-success mb-2 p-2 bg-success-light rounded">{success}</p>}
            
            {mode === 'view' && (
                <>
                    {loading && <p>Cargando...</p>}
                    {!loading && relationships.length > 0 ? (
                        <ul className="divide-y divide-border">
                            {relationships.map(rel => (
                                <li key={rel.relationID} className="py-2 flex justify-between items-center">
                                    <span>{rel.userName}</span>
                                    <button onClick={() => handleDelete(rel.relationID)} className="text-danger hover:text-danger-dark text-sm">Eliminar</button>
                                </li>
                            ))}
                        </ul>
                    ) : !loading && (
                        <p className="text-secondary">No se encontraron relaciones.</p>
                    )}
                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <button onClick={() => setMode('add')} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80">
                            Agregar Relación
                        </button>
                    </div>
                </>
            )}
            
            {mode === 'add' && (
                <div className="space-y-4">
                    <h3 className="font-semibold">{isStudent ? 'Buscar Padre/Representante' : 'Buscar Estudiante'}</h3>
                     <div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-border rounded mb-2"
                        />
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full p-2 border border-border rounded bg-surface"
                        >
                            <option value="">-- Seleccionar --</option>
                            {filteredSearchableUsers.map(u => <option key={u.userID} value={u.userID}>{u.userName}</option>)}
                        </select>
                    </div>
                     <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
                         <button onClick={() => setMode('view')} type="button" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</button>
                        <button onClick={handleAdd} disabled={!selectedUserId} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">Guardar</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default UserRelationshipsModal;