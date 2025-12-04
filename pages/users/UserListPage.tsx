
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';
import { BellIcon, BlockIcon, BookOpenIcon, CreditCardIcon, FamilyIcon, DocumentTextIcon, ShoppingCartIcon, SpinnerIcon } from '../../components/icons';
import TaughtCoursesModal from './TaughtCoursesModal';
import ParentPaymentsModal from './ParentPaymentsModal';
import ParentNotificationsModal from './ParentNotificationsModal';
import UserRelationshipsModal from './UserRelationshipsModal';
import UserDetailsModal from './UserDetailsModal';
import Modal from '../../components/Modal';

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [viewingCoursesFor, setViewingCoursesFor] = useState<User | null>(null);
  const [viewingPaymentsFor, setViewingPaymentsFor] = useState<User | null>(null);
  const [viewingNotificationsFor, setViewingNotificationsFor] = useState<User | null>(null);
  const [viewingRelationshipsFor, setViewingRelationshipsFor] = useState<User | null>(null);
  const [viewingDetailsFor, setViewingDetailsFor] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintRoles, setSelectedPrintRoles] = useState<number[]>([]);
  const [includeStudentDetails, setIncludeStudentDetails] = useState(true); // Default true
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const canManageUsers = useMemo(() => hasPermission([6]), [hasPermission]);

  const fetchUsers = async () => {
    if (user?.schoolId) {
      try {
        setLoading(true);
        const [usersData, schoolData] = await Promise.all([
            apiService.getUsers(user.schoolId),
            apiService.getSchoolName(user.schoolId)
        ]);
        setUsers(usersData);
        setSchoolName(schoolData);
        // Initialize print roles with empty
        setSelectedPrintRoles([]);
        setError('');
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar la lista de usuarios.');
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

  const confirmDelete = async () => {
    if (!userToDelete) return;

    const originalUsers = [...users];
    
    // Optimistic update: remove user from UI immediately
    setUsers(prevUsers => prevUsers.filter(u => u.userID !== userToDelete.userID));
    setError('');
    setUserToDelete(null); // Close modal immediately

    try {
      await apiService.deleteUser(userToDelete.userID);
      // On success, no need to refetch, UI is already updated.
    } catch (err: any) {
      // On failure, revert the state and show an error
      setUsers(originalUsers);
      setError(err.message || 'Ocurrió un error inesperado al eliminar el usuario.');
      console.error("Delete user error:", err);
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

  // --- Print Logic ---

  const handleOpenPrintModal = () => {
      // Initialize with NO roles selected by default (optimization)
      setSelectedPrintRoles([]);
      setIncludeStudentDetails(true);
      setIsPrintModalOpen(true);
  };

  const togglePrintRole = (roleId: number) => {
      setSelectedPrintRoles(prev => 
          prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      );
  };

  const selectAllRoles = () => {
      setSelectedPrintRoles(ROLES.map(r => r.id));
  };

  const deselectAllRoles = () => {
      setSelectedPrintRoles([]);
  };

  // Helper to enrich data with Classroom and Parents
  const enrichUsersWithDetails = async (baseUsers: User[]) => {
      if (!includeStudentDetails || !user?.schoolId) return baseUsers;

      // 1. Fetch Classrooms Map
      let classroomMap = new Map<number, string>();
      try {
          const classrooms = await apiService.getClassrooms(user.schoolId);
          classrooms.forEach(c => classroomMap.set(c.classroomID, c.name));
      } catch (e) {
          console.error("Error fetching classrooms for report", e);
      }

      // 2. Process Users (Parallel fetching for parents)
      const enriched = await Promise.all(baseUsers.map(async (u) => {
          // Only process details for students (Role 1)
          if (u.roleID !== 1) return u;

          let parentNames = '';
          try {
              const parents = await apiService.getParentsOfChild(u.userID, user.schoolId);
              parentNames = parents.map(p => p.userName).join(', ');
          } catch (e) {
              console.warn(`Error fetching parents for ${u.userName}`, e);
          }

          const classroomName = u.classroomID ? classroomMap.get(u.classroomID) : '';

          return {
              ...u,
              classroomName,
              parentNames
          };
      }));

      return enriched;
  };

  const getFilteredUsersForReport = () => {
      return users
          .filter(u => selectedPrintRoles.includes(u.roleID))
          .sort((a, b) => {
              // Sort by Role first, then Name
              if (a.roleID !== b.roleID) return a.roleID - b.roleID;
              return a.userName.localeCompare(b.userName);
          });
  };

  const handleGeneratePdf = async () => {
      const basicList = getFilteredUsersForReport();
      if (basicList.length === 0) {
          alert("No hay usuarios seleccionados para imprimir. Por favor seleccione al menos un rol.");
          return;
      }

      setIsGeneratingReport(true);
      try {
          const reportData = await enrichUsersWithDetails(basicList);
          setIsPrintModalOpen(false);
          navigate('/report-viewer', { 
              state: { 
                  reportData: reportData, 
                  reportType: 'user-list',
                  schoolName: schoolName 
              } 
          });
      } catch (e) {
          console.error(e);
          alert("Error al generar el reporte.");
      } finally {
          setIsGeneratingReport(false);
      }
  };

  const handleGenerateExcel = async () => {
      const basicList = getFilteredUsersForReport();
      if (basicList.length === 0) {
          alert("No hay usuarios seleccionados para exportar. Por favor seleccione al menos un rol.");
          return;
      }

      setIsGeneratingReport(true);
      try {
          const enrichedList = await enrichUsersWithDetails(basicList);

          // Format data for Excel
          const excelData = enrichedList.map((u: any, index) => {
              const baseData = {
                  "No.": index + 1,
                  "Nombre Completo": u.userName,
                  "Cédula": u.cedula || 'N/A',
                  "Correo Electrónico": u.email,
                  "Teléfono": u.phoneNumber || 'N/A',
                  "Rol": getRoleName(u.roleID),
                  "Estado": u.isBlocked ? 'Bloqueado' : 'Activo'
              };

              if (includeStudentDetails && u.roleID === 1) {
                  return {
                      ...baseData,
                      "Salón": u.classroomName || 'N/A',
                      "Padres/Representantes": u.parentNames || 'N/A'
                  };
              }
              return baseData;
          });

          const worksheet = XLSX.utils.json_to_sheet(excelData);
          
          // Auto-width columns
          const wscols = [
              { wch: 5 },  // No
              { wch: 30 }, // Nombre
              { wch: 15 }, // Cedula
              { wch: 30 }, // Email
              { wch: 15 }, // Telefono
              { wch: 15 }, // Rol
              { wch: 10 }, // Estado
              { wch: 20 }, // Salon
              { wch: 40 }, // Padres
          ];
          worksheet['!cols'] = wscols;

          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Usuarios");
          
          const fileName = `Lista_Usuarios_${schoolName.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
          XLSX.writeFile(workbook, fileName);
          
          setIsPrintModalOpen(false);
      } catch (e) {
          console.error(e);
          alert("Error al generar el Excel.");
      } finally {
          setIsGeneratingReport(false);
      }
  };

  const getRoleName = (roleId: number) => {
    return ROLES.find(r => r.id === roleId)?.name || 'Desconocido';
  };

  const isTeacherRole = (roleId: number) => [2, 6, 7, 8, 9, 10].includes(roleId);
  const isParentRole = (roleId: number) => [3, 11].includes(roleId);
  const isStudentRole = (roleId: number) => roleId === 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Lista de Usuarios</h1>
        {canManageUsers && (
          <div className="space-x-2">
              <button 
                onClick={handleOpenPrintModal} 
                className="bg-info text-text-on-primary py-2 px-4 rounded hover:bg-info-dark transition-colors inline-flex items-center"
                title="Configurar impresión o exportación"
              >
                <DocumentTextIcon className="w-5 h-5 mr-1"/> Imprimir Lista
              </button>
              <Link to="/users/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                Crear Usuario
              </Link>
          </div>
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
      {error && <p className="text-danger bg-danger-light p-3 rounded mb-4">{error}</p>}
      
      {!loading && (
        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Cédula</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.userID} onDoubleClick={() => setViewingDetailsFor(u)} className={`hover:bg-background cursor-pointer ${u.isBlocked ? 'bg-danger-light' : ''}`}>
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
                        {canManageUsers && (
                          <>
                            <Link to={`/users/edit/${u.userID}`} className="text-warning hover:text-warning-dark font-medium">Editar</Link>
                            <button onClick={() => setUserToDelete(u)} className="text-danger hover:text-danger-text">Eliminar</button>
                            <button onClick={() => navigate(`/users/block/${u.userID}`)} className="text-secondary hover:text-primary flex items-center gap-1">
                                <BlockIcon /> {u.isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                          </>
                        )}
                        {(isParentRole(u.roleID) || isStudentRole(u.roleID)) && (
                             <button onClick={() => setViewingRelationshipsFor(u)} className="text-info hover:text-info-dark flex items-center gap-1">
                                <FamilyIcon /> Relaciones
                            </button>
                        )}
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

      {/* --- Print Configuration Modal --- */}
      {isPrintModalOpen && (
          <Modal isOpen={true} onClose={() => !isGeneratingReport && setIsPrintModalOpen(false)} title="Configurar Impresión / Exportación">
              <div>
                  <p className="mb-2 text-text-secondary">Seleccione los roles que desea incluir en el reporte:</p>
                  
                  <div className="mb-4 flex gap-4">
                      <button 
                          onClick={selectAllRoles} 
                          className="text-sm text-primary hover:underline font-medium"
                          disabled={isGeneratingReport}
                      >
                          Seleccionar Todos
                      </button>
                      <button 
                          onClick={deselectAllRoles} 
                          className="text-sm text-secondary hover:underline font-medium"
                          disabled={isGeneratingReport}
                      >
                          Deseleccionar Todos
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-4 border p-3 rounded">
                      {ROLES.map(role => (
                          <label key={role.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-background rounded">
                              <input 
                                  type="checkbox" 
                                  checked={selectedPrintRoles.includes(role.id)} 
                                  onChange={() => togglePrintRole(role.id)}
                                  className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
                                  disabled={isGeneratingReport}
                              />
                              <span className="text-text-primary text-sm">{role.name}</span>
                          </label>
                      ))}
                  </div>

                  <div className="mb-6 border-t pt-4">
                      <label className="flex items-start space-x-2 cursor-pointer">
                          <input 
                              type="checkbox" 
                              checked={includeStudentDetails}
                              onChange={(e) => setIncludeStudentDetails(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-accent"
                              disabled={isGeneratingReport}
                          />
                          <div>
                              <span className="block text-sm font-semibold text-text-primary">Incluir Detalles de Estudiantes</span>
                              <span className="block text-xs text-text-secondary">Si se selecciona, se buscarán y mostrarán los <strong>Salones</strong> y <strong>Padres</strong> para los usuarios con rol de Estudiante. (Puede demorar más).</span>
                          </div>
                      </label>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t mt-2">
                      <div className="text-xs text-text-tertiary">
                          {selectedPrintRoles.length} roles seleccionados.
                      </div>
                      <div className="space-x-2 flex">
                          <button 
                              onClick={handleGenerateExcel} 
                              disabled={isGeneratingReport}
                              className="bg-success text-text-on-primary py-2 px-4 rounded hover:bg-success-text transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isGeneratingReport ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <span className="mr-1">📊</span>} 
                              Exportar Excel
                          </button>
                          <button 
                              onClick={handleGeneratePdf} 
                              disabled={isGeneratingReport}
                              className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isGeneratingReport ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DocumentTextIcon className="w-4 h-4 mr-1"/>} 
                              Imprimir PDF
                          </button>
                      </div>
                  </div>
              </div>
          </Modal>
      )}

      {userToDelete && (
        <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirmar Eliminación">
            <div>
                <p className="text-text-primary">
                    ¿Estás seguro de que quieres eliminar al usuario "<strong>{userToDelete.userName}</strong>"?
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                    Esta acción es irreversible y borrará todos sus datos relacionados, incluyendo historial de login, inscripciones y calificaciones.
                </p>
            </div>
            <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-border">
                <button 
                    type="button" 
                    onClick={() => setUserToDelete(null)}
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
      {viewingRelationshipsFor && (
          <UserRelationshipsModal
              user={viewingRelationshipsFor}
              onClose={() => setViewingRelationshipsFor(null)}
          />
      )}
      {viewingDetailsFor && (
          <UserDetailsModal
              user={viewingDetailsFor}
              onClose={() => setViewingDetailsFor(null)}
          />
      )}
    </div>
  );
};

export default UserListPage;
