
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';
import { EyeIcon, EyeOffIcon } from '../../components/icons';

type FormInputs = Omit<User, 'userID' | 'schoolID' | 'isBlocked'> & { password?: string };

const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [cedulaPrefix, setCedulaPrefix] = useState('V');
  const [cedulaNumber, setCedulaNumber] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

  useEffect(() => {
    if (isEditMode && user?.schoolId) {
      setLoading(true);
      apiService.getUserById(parseInt(id!), user.schoolId)
        .then(userData => {
          setValue('userName', userData.userName);
          setValue('email', userData.email);
          setValue('phoneNumber', userData.phoneNumber);
          setValue('roleID', userData.roleID);
          if (userData.cedula && userData.cedula.includes('-')) {
              const parts = userData.cedula.split('-');
              setCedulaPrefix(parts[0]);
              setCedulaNumber(parts[1]);
          } else if (userData.cedula) {
              setCedulaNumber(userData.cedula);
          }
        })
        .catch(err => setError('No se pudo cargar el usuario.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, setValue, user?.schoolId]);

  useEffect(() => {
    if (cedulaNumber) {
        setValue('cedula', `${cedulaPrefix}-${cedulaNumber}`);
    } else {
        setValue('cedula', '');
    }
  }, [cedulaPrefix, cedulaNumber, setValue]);

  const handleUseCedulaAsPassword = () => {
    if (cedulaNumber) {
        setValue('password', cedulaNumber, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
      setError("No se ha podido identificar el colegio.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      if (isEditMode) {
        const payload: Partial<User> & { passwordHash?: string } = {
            ...data,
            userID: parseInt(id!),
            schoolID: user.schoolId,
        };
        if(data.password) {
            payload.passwordHash = data.password;
        }
        await apiService.updateUser(parseInt(id!), payload);
      } else {
        const payload = {
            ...data,
            schoolID: user.schoolId,
            passwordHash: data.password || '', 
        };
        await apiService.createUser(payload);
      }
      navigate('/users');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary">{isEditMode ? 'Editar Usuario' : 'Crear Usuario'}</h1>
      </div>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      
      {loading && isEditMode ? <p>Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre de Usuario</label>
            <input 
                {...register('userName', { required: 'El nombre es requerido' })} 
                className={inputClass}
            />
            {errors.userName && <p className="text-danger text-xs mt-1">{errors.userName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Email</label>
            <input 
                type="email" 
                {...register('email', { required: 'El email es requerido' })} 
                className={inputClass}
            />
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary">Cédula</label>
            <div className="flex items-center space-x-2">
                <select 
                value={cedulaPrefix} 
                onChange={(e) => setCedulaPrefix(e.target.value)}
                className="mt-1 block w-24 px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                >
                <option value="V">V</option>
                <option value="CE">CE</option>
                <option value="E">E</option>
                <option value="P">P</option>
                </select>
                <input 
                type="text"
                value={cedulaNumber}
                onChange={(e) => setCedulaNumber(e.target.value)}
                placeholder="Número de Cédula"
                className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
                <button 
                    type="button" 
                    onClick={handleUseCedulaAsPassword}
                    disabled={!cedulaNumber}
                    className="mt-1 whitespace-nowrap px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-text-primary bg-surface hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Usar como Contraseña
                </button>
            </div>
            <input type="hidden" {...register('cedula', { required: 'La cédula es requerida' })} />
            {errors.cedula && <p className="text-danger text-xs mt-1">{errors.cedula.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Teléfono</label>
            <input 
                {...register('phoneNumber', { required: 'El teléfono es requerido' })} 
                className={inputClass}
            />
            {errors.phoneNumber && <p className="text-danger text-xs mt-1">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Contraseña {isEditMode && '(dejar en blanco para no cambiar)'}</label>
            <div className="relative mt-1">
                <input 
                    type={showPassword ? 'text' : 'password'} 
                    {...register('password', { required: !isEditMode, minLength: { value: isEditMode ? 0 : 1, message: 'La contraseña es requerida' }})} 
                    className="block w-full pl-3 pr-10 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Rol</label>
            <select {...register('roleID', { valueAsNumber: true, required: 'El rol es requerido' })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                <option value="">Seleccione un rol</option>
                {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            {errors.roleID && <p className="text-danger text-xs mt-1">{errors.roleID.message}</p>}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link to="/users" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserFormPage;
