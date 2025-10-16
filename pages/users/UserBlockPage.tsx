import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';

type FormInputs = {
    reason: string;
};

const UserBlockPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { register, handleSubmit } = useForm<FormInputs>();

    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUser = async () => {
        if (id && authUser?.schoolId) {
            setLoading(true);
            try {
                const userData = await apiService.getUserById(parseInt(id), authUser.schoolId);
                setTargetUser(userData);
            } catch (err) {
                setError('No se pudo cargar la información del usuario.');
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchUser();
    }, [id, authUser]);

    const handleBlock: SubmitHandler<FormInputs> = async (data) => {
        if (!targetUser || !authUser) return;
        setLoading(true);
        try {
            await apiService.blockUser(targetUser.userID, data.reason, authUser.userId);
            setSuccess('Usuario bloqueado correctamente.');
            setTimeout(() => navigate('/users'), 1500);
        } catch (err: any) {
            setError(err.message || 'Error al bloquear el usuario.');
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async () => {
        if (!targetUser) return;
        setLoading(true);
        try {
            await apiService.unblockUser(targetUser.userID);
            setSuccess('Usuario desbloqueado correctamente.');
            setTimeout(() => navigate('/users'), 1500);
        } catch (err: any) {
            setError(err.message || 'Error al desbloquear el usuario.');
        } finally {
            setLoading(false);
        }
    };

    const getRoleName = (roleId: number) => ROLES.find(r => r.id === roleId)?.name || 'Desconocido';

    if (loading && !targetUser) return <p>Cargando usuario...</p>;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Revisión de Bloqueo de Usuario</h1>
            
            {success && <div className="bg-success-light text-success p-3 rounded mb-4">{success}</div>}
            {error && <div className="bg-danger-light text-danger p-3 rounded mb-4">{error}</div>}

            {targetUser && (
                <div className="bg-surface p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-lg font-semibold mb-3">Detalles del Usuario</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Nombre:</strong> {targetUser.userName}</div>
                        <div><strong>Email:</strong> {targetUser.email}</div>
                        <div><strong>Teléfono:</strong> {targetUser.phoneNumber}</div>
                        <div><strong>Cédula:</strong> {targetUser.cedula}</div>
                        <div><strong>Rol:</strong> {getRoleName(targetUser.roleID)}</div>
                        <div><strong>Estado:</strong> 
                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${targetUser.isBlocked ? 'bg-danger-light text-danger-text' : 'bg-success-light text-success-text'}`}>
                                {targetUser.isBlocked ? 'Bloqueado' : 'Activo'}
                            </span>
                        </div>
                        {targetUser.isBlocked && (
                            <>
                                <div><strong>Motivo:</strong> {targetUser.blockedReason || '—'}</div>
                                <div><strong>Bloqueado el:</strong> {targetUser.blockedAt ? new Date(targetUser.blockedAt).toLocaleString('es-ES') : '—'}</div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {targetUser && !targetUser.isBlocked && (
                <div className="bg-surface p-6 rounded-lg shadow-md border-t-4 border-danger">
                     <div className="bg-warning/10 text-warning-dark p-3 rounded mb-4 text-sm">
                        Este usuario está activo. Si el pago fue rechazado por fraude u otra causa, puedes bloquear su acceso aquí abajo.
                    </div>
                    <form onSubmit={handleSubmit(handleBlock)}>
                        <h3 className="text-lg font-semibold text-danger mb-3">Bloquear Usuario</h3>
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-text-primary">Motivo (opcional)</label>
                            <input {...register('reason')} id="reason" className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent" maxLength={200} />
                        </div>
                        <div className="flex items-center space-x-4 mt-4">
                            <button type="submit" disabled={loading} className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                                {loading ? 'Bloqueando...' : 'Bloquear'}
                            </button>
                            <Link to="/users" className="text-secondary hover:underline">Cancelar</Link>
                        </div>
                    </form>
                </div>
            )}

            {targetUser && targetUser.isBlocked && (
                 <div className="bg-surface p-6 rounded-lg shadow-md border-t-4 border-success">
                    <div className="bg-info-light text-info-dark p-3 rounded mb-4 text-sm">
                       Este usuario ya está <strong>bloqueado</strong>. Puedes desbloquearlo si fue un error o ya se solventó la situación.
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={handleUnblock} disabled={loading} className="bg-success text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                           {loading ? 'Desbloqueando...' : 'Desbloquear'}
                        </button>
                        <Link to="/users" className="text-secondary hover:underline">Volver</Link>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default UserBlockPage;