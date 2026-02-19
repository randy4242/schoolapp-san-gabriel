
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';
import { EyeIcon, EyeOffIcon, MaleIcon, FemaleIcon } from '../../components/icons';

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

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      sexo: null,
      nombre: '',
      apellido: ''
    }
  });

  const selectedSexo = watch('sexo');
  const nombre = watch('nombre');
  const apellido = watch('apellido');


  useEffect(() => {
    if (isEditMode && user?.schoolId) {
      setLoading(true);
      apiService.getUserById(parseInt(id!), user.schoolId)
        .then(userData => {
          setValue('userName', userData.userName);
          setValue('email', userData.email);
          setValue('phoneNumber', userData.phoneNumber);
          setValue('roleID', userData.roleID);
          setValue('roleID', userData.roleID);
          setValue('sexo', userData.sexo || null);
          setValue('nombre', userData.nombre || '');
          setValue('apellido', userData.apellido || '');

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

  // Auto-generate UserName
  useEffect(() => {
    const n = nombre || '';
    const a = apellido || '';
    if (n || a) {
      setValue('userName', `${n} ${a}`.trim());
    }
  }, [nombre, apellido, setValue]);

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
        if (data.password) {
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

      {loading && isEditMode ? <p className="text-center py-10">Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary">Nombre</label>
              <input
                {...register('nombre', { required: 'El nombre es requerido' })}
                className={inputClass}
                placeholder="Ej. Juan"
              />
              {errors.nombre && <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary">Apellido</label>
              <input
                {...register('apellido', { required: 'El apellido es requerido' })}
                className={inputClass}
                placeholder="Ej. Perez"
              />
              {errors.apellido && <p className="text-danger text-xs mt-1">{errors.apellido.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre de Usuario (Automático)</label>
            <input
              {...register('userName', { required: 'El nombre de usuario es requerido' })}
              className={`${inputClass} bg-gray-100 cursor-not-allowed`}
              placeholder="Nombre completo"
              readOnly
            />
            {errors.userName && <p className="text-danger text-xs mt-1">{errors.userName.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary">Email</label>
              <input
                type="email"
                {...register('email', { required: 'El email es requerido' })}
                className={inputClass}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary">Teléfono</label>
              <input
                {...register('phoneNumber', { required: 'El teléfono es requerido' })}
                className={inputClass}
                placeholder="04XX-XXXXXXX"
              />
              {errors.phoneNumber && <p className="text-danger text-xs mt-1">{errors.phoneNumber.message}</p>}
            </div>
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
                Usar C.I como Clave
              </button>
            </div>
            <input type="hidden" {...register('cedula', { required: 'La cédula es requerida' })} />
            {errors.cedula && <p className="text-danger text-xs mt-1">{errors.cedula.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CAMPO SEXO MANDATORIO */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Sexo <span className="text-danger">*</span></label>
              <div className="flex items-center space-x-3">
                <label className="flex-1 cursor-pointer group">
                  <input
                    type="radio"
                    value="M"
                    {...register('sexo', { required: 'Debe seleccionar el sexo' })}
                    className="hidden peer"
                  />
                  <div className="flex items-center justify-center px-4 py-2 border border-border rounded-lg text-text-secondary peer-checked:bg-info peer-checked:text-white peer-checked:border-info group-hover:bg-background transition-all">
                    <MaleIcon className="mr-2" /> Masculino
                  </div>
                </label>
                <label className="flex-1 cursor-pointer group">
                  <input
                    type="radio"
                    value="F"
                    {...register('sexo', { required: 'Debe seleccionar el sexo' })}
                    className="hidden peer"
                  />
                  <div className="flex items-center justify-center px-4 py-2 border border-border rounded-lg text-text-secondary peer-checked:bg-pink-500 peer-checked:text-white peer-checked:border-pink-500 group-hover:bg-background transition-all">
                    <FemaleIcon className="mr-2" /> Femenino
                  </div>
                </label>
              </div>
              {errors.sexo && <p className="text-danger text-xs mt-1">{errors.sexo.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Rol del Usuario</label>
              <select {...register('roleID', { valueAsNumber: true, required: 'El rol es requerido' })} className="block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                <option value="">Seleccione un rol</option>
                {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              {errors.roleID && <p className="text-danger text-xs mt-1">{errors.roleID.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Contraseña {isEditMode && '(dejar en blanco para no cambiar)'}</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: !isEditMode, minLength: { value: isEditMode ? 0 : 4, message: 'Mínimo 4 caracteres' } })}
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

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Link to="/users" className="bg-background text-text-primary py-2 px-6 rounded hover:bg-border transition-colors border">Cancelar</Link>
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-8 rounded hover:bg-opacity-90 disabled:bg-secondary transition-colors font-bold shadow-sm">
              {loading ? 'Procesando...' : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserFormPage;
