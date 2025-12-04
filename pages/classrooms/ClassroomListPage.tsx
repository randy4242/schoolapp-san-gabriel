import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom } from '../../types';
import { EyeIcon, ChartBarIcon } from '../../components/icons';
import EditClassroomModal from './EditClassroomModal';
import ClassroomStudentsModal from './ClassroomStudentsModal';
import ClassroomStatsModal from './ClassroomStatsModal';
import Modal from '../../components/Modal';


const ClassroomListPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, hasPermission } = useAuth();
  
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [viewingStudentsClassroom, setViewingStudentsClassroom] = useState<Classroom | null>(null);
  const [viewingStatsClassroom, setViewingStatsClassroom] = useState<Classroom | null>(null);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();

  const canManageClassrooms = useMemo(() => hasPermission([6]), [hasPermission]);
  const allowedSchools = [5, 6, 7, 8, 9];

  const fetchClassrooms = async () => {
    if (user?.schoolId) {
      try {
        setLoading(true);
        const data = await apiService.getClassrooms(user.schoolId);
        setClassrooms(data);
        setError('');
      } catch (err) {
        setError('No se pudo cargar la lista de salones.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const handleSaveSuccess = () => {
      setEditingClassroom(null);
      fetchClassrooms();
  };

  const confirmDelete = async () => {
    if (!classroomToDelete) return;
    
    try {
      await apiService.deleteClassroom(classroomToDelete.classroomID);
      fetchClassrooms();
      setClassroomToDelete(null); // Close modal
    } catch (err) {
      setError('Error al eliminar el salón.');
      console.error(err);
      setClassroomToDelete(null); // Close modal
    }
  };
  
  // Helper to hide the internal tag [Tag] from the display name
  const getDisplayName = (name: string) => {
      if (user?.schoolId && allowedSchools.includes(user.schoolId)) {
          return name.replace(/^\[.*?\]\s*/, '');
      }
      return name;
  };
  
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(c => 
        getDisplayName(c.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classrooms, searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Lista de Salones</h1>
        {canManageClassrooms && (
          <Link to="/classrooms/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
            Crear Salón
          </Link>
        )}
      </div>
      
      <div className="mb-6">
        <input 
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-1/2 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
      </div>

      {loading && <p>Cargando salones...</p>}
      {error && <p className="text-danger">{error}</p>}
      
      {!loading && !error && (
        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {filteredClassrooms.map((c) => (
                <tr key={c.classroomID} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap">{getDisplayName(c.name)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setEditingClassroom(c)} className="text-warning hover:text-warning-dark p-1 rounded-md hover:bg-warning/10" title="Editar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onClick={() => setViewingStudentsClassroom(c)} className="text-info hover:text-info-dark p-1 rounded-md hover:bg-info-light" title="Ver Estudiantes">
                            <EyeIcon />
                        </button>
                        <button onClick={() => setViewingStatsClassroom(c)} className="text-success hover:text-success-text p-1 rounded-md hover:bg-success-light" title="Ver Estadísticas">
                            <ChartBarIcon />
                        </button>
                        <button onClick={() => setClassroomToDelete(c)} className="text-danger hover:text-danger-text p-1 rounded-md hover:bg-danger-light" title="Eliminar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {editingClassroom && (
        <EditClassroomModal
          classroom={editingClassroom}
          onClose={() => setEditingClassroom(null)}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
      
      {viewingStudentsClassroom && (
        <ClassroomStudentsModal
          classroomId={viewingStudentsClassroom.classroomID}
          classroomName={viewingStudentsClassroom.name}
          onClose={() => setViewingStudentsClassroom(null)}
        />
      )}
      
      {viewingStatsClassroom && (
        <ClassroomStatsModal
          classroomId={viewingStatsClassroom.classroomID}
          classroomName={viewingStatsClassroom.name}
          onClose={() => setViewingStatsClassroom(null)}
        />
      )}

      {classroomToDelete && (
        <Modal isOpen={!!classroomToDelete} onClose={() => setClassroomToDelete(null)} title="Confirmar Eliminación">
            <div>
                <p className="text-text-primary">
                    ¿Estás seguro de que quieres eliminar el salón "<strong>{getDisplayName(classroomToDelete.name)}</strong>"?
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                    Esta acción eliminará también las inscripciones y asociaciones relacionadas a este salón.
                </p>
            </div>
            <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-border">
                <button 
                    type="button" 
                    onClick={() => setClassroomToDelete(null)}
                    className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={confirmDelete}
                    className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark transition-colors"
                >
                    Sí, Eliminar
                </button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default ClassroomListPage;