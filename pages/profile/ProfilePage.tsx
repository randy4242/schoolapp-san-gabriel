import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { User, ROLES } from '../../types';
import { UserCircleIcon, EyeIcon, EyeOffIcon } from '../../components/icons';

type FormInputs = {
    userName: string;
    email: string;
    phoneNumber: string | null;
    password?: string;
    confirmPassword?: string;
};

const InfoItem: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => (
    <>
        <div>
            <div className="text-sm font-bold text-accent">{label}</div>
            <div className="mt-1 text-md text-text-primary">{value || 'No especificado'}</div>
        </div>
        <hr className="border-border-dark" />
    </>
);

const ProfilePage: React.FC = () => {
    const { user: authUser, login } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormInputs>();
    const password = watch('password');

    const fetchUser = async () => {
        if (authUser) {
            setLoading(true);
            try {
                const userData = await apiService.getUserById(authUser.userId, authUser.schoolId);
                setUser(userData);
                // Pre-fill form for edit mode
                setValue('userName', userData.userName);
                setValue('email', userData.email);
                setValue('phoneNumber', userData.phoneNumber);
            } catch (err) {
                setError('No se pudo cargar la información de tu perfil.');
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchUser();
    }, [authUser]);

    const userRole = useMemo(() => {
        if (!user) return 'Desconocido';
        return ROLES.find(r => r.id === user.roleID)?.name || 'Desconocido';
    }, [user]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!authUser) return;

        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const payload: Partial<User> & { passwordHash?: string } = {
                userName: data.userName,
                email: data.email,
                phoneNumber: data.phoneNumber,
            };
            if (data.password) {
                payload.passwordHash = data.password;
            }

            await apiService.updateUser(authUser.userId, payload);
            
            const updatedUser = await apiService.getUserById(authUser.userId, authUser.schoolId);
            setUser(updatedUser);
            // Re-login to update context and localStorage
            login(authUser.token, updatedUser);
            
            setIsEditMode(false);
            setSuccess('Perfil actualizado con éxito.');
            reset({ userName: updatedUser.userName, email: updatedUser.email, phoneNumber: updatedUser.phoneNumber, password: '', confirmPassword: '' });
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el perfil.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) return <div className="text-center p-8">Cargando perfil...</div>;
    
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {error && <p className="bg-danger-light text-danger-text p-3 rounded mb-4 text-center">{error}</p>}
            {success && <p className="bg-success-light text-success-text p-3 rounded mb-4 text-center">{success}</p>}

            {isEditMode ? (
                // EDIT MODE
                <div className="bg-surface p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold text-text-primary mb-6">Editar Perfil</h1>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Nombre de Usuario</label>
                            <input {...register('userName', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                            {errors.userName && <p className="text-danger text-xs mt-1">{errors.userName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Email</label>
                            <input type="email" {...register('email', { required: 'El email es requerido' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Teléfono</label>
                            <input {...register('phoneNumber')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        </div>

                        <hr className="my-4"/>
                        <p className="text-sm text-text-secondary">Deja los campos de contraseña en blanco si no deseas cambiarla.</p>
                        
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Nueva Contraseña</label>
                             <div className="relative mt-1">
                                <input type={showPassword ? 'text' : 'password'} {...register('password', { minLength: { value: 6, message: 'La contraseña debe tener al menos 6 caracteres' }})} className="block w-full pl-3 pr-10 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary">
                                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary">Confirmar Nueva Contraseña</label>
                            <div className="relative mt-1">
                                <input type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword', { validate: value => !password || value === password || 'Las contraseñas no coinciden' })} className="block w-full pl-3 pr-10 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary">
                                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>


                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={() => setIsEditMode(false)} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : user && (
                // VIEW MODE
                <div className="flex flex-col items-center">
                    <UserCircleIcon className="w-40 h-40 text-primary" />
                    <h1 className="text-4xl font-bold mt-4 text-text-primary">{user.userName}</h1>

                    <div className="mt-8 w-full max-w-lg bg-surface rounded-lg shadow-xl p-8">
                        <div className="space-y-4">
                            <InfoItem label="Correo electrónico" value={user.email} />
                            <InfoItem label="Cédula" value={user.cedula} />
                            <InfoItem label="Número de teléfono" value={user.phoneNumber} />
                            <InfoItem label="Rol" value={userRole} />
                        </div>
                    </div>
                    
                    <button onClick={() => setIsEditMode(true)} className="mt-8 bg-accent text-text-on-accent font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 shadow-lg transition-transform transform hover:scale-105">
                        Editar Perfil
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
