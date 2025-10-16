import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';
import { BellIcon, BlockIcon, BookOpenIcon, CreditCardIcon } from '../../components/icons';
import TaughtCoursesModal from './TaughtCoursesModal';
import ParentPaymentsModal from './ParentPaymentsModal';
import ParentNotificationsModal from './ParentNotificationsModal';

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [viewingCoursesFor, setViewingCoursesFor] = useState<User | null>(null);
  const [viewingPaymentsFor, setViewingPaymentsFor] = useState<User | null>(null);
  const [viewingNotificationsFor, setViewingNotificationsFor] = useState<User | null>(null);

  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const canCreateUser = useMemo(() => hasPermission([6]), [hasPermission]);

  const fetchUsers = async () => {
    if (user?.schoolId) {
      try {
        setLoading(true);
        const data = await apiService.getUsers(user.schoolId);
        setUsers(data);
        setError('');
      } catch (err) {
        setError('No se pudo cargar la lista de usuarios.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const handleDelete = async (userId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        if (user?.schoolId) {
          await apiService.deleteUser(userId, user.schoolId);
          fetchUsers();
        }
      } catch (err) {
        setError('Error al eliminar el usuario.');
        console.error(err);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
        const roleMatch = roleFilter === 'all' || u.roleID === parseInt(roleFilter);
        const searchMatch = (
            u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.cedula && u.cedula.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return roleMatch && searchMatch;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleName = (roleId: number) => {
    return ROLES.find(r => r.id === roleId)?.name || 'Desconocido';
  };

  const isTeacherRole = (roleId: number) => [2, 6, 7, 8, 9, 10].includes(roleId);
  const isParentRole = (roleId: number) => [3, 11].includes(roleId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Lista de Usuarios</h1>
        {canCreateUser && (
          <Link to="/users/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
            Crear Usuario
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input 
            type="text"
            placeholder="Buscar por nombre, email, cédula..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="md:col-span-2 w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          >
            <option value="all">Todos los Roles</option>
            {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
      </div>

      {loading && <p>Cargando usuarios...</p>}
      {error && <p className="text-danger">{error}</p>}
      
      {!loading && !error && (
        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Cédula</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.userID} className={`hover:bg-background ${u.isBlocked ? 'bg-danger-light' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">{u.userName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{u.cedula}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{u.phoneNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isBlocked ? 'bg-danger-light text-danger-text' : 'bg-success-light text-success-text'}`}>
                        {getRoleName(u.roleID)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center flex-wrap gap-2">
                        <Link to={`/users/edit/${u.userID}`} className="text-warning hover:text-warning-dark font-medium">Editar</Link>
                        <button onClick={() => handleDelete(u.userID)} className="text-danger hover:text-danger-text">Eliminar</button>
                        <button onClick={() => navigate(`/users/block/${u.userID}`)} className="text-secondary hover:text-primary flex items-center gap-1">
                            <BlockIcon /> {u.isBlocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        {isTeacherRole(u.roleID) && (
                            <button onClick={() => setViewingCoursesFor(u)} className="text-info hover:text-info-dark flex items-center gap-1">
                                <BookOpenIcon /> Cursos
                            </button>
                        )}
                        {isParentRole(u.roleID) && (
                            <>
                                <button onClick={() => setViewingNotificationsFor(u)} className="text-info hover:text-info-dark flex items-center gap-1">
                                    <BellIcon /> Notif.
                                </button>
                                <button onClick={() => setViewingPaymentsFor(u)} className="text-success hover:text-success-text flex items-center gap-1">
                                    <CreditCardIcon /> Pagos
                                </button>
                            </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewingCoursesFor && (
          <TaughtCoursesModal
              user={viewingCoursesFor}
              onClose={() => setViewingCoursesFor(null)}
          />
      )}
      {viewingPaymentsFor && (
          <ParentPaymentsModal
              user={viewingPaymentsFor}
              onClose={() => setViewingPaymentsFor(null)}
          />
      )}
      {viewingNotificationsFor && (
          <ParentNotificationsModal
              user={viewingNotificationsFor}
              onClose={() => setViewingNotificationsFor(null)}
          />
      )}
    </div>
  );
};

export default UserListPage;