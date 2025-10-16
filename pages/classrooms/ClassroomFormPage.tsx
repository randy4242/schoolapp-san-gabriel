import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom } from '../../types';

type FormInputs = Omit<Classroom, 'classroomID' | 'schoolID'>;

const ClassroomFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

  useEffect(() => {
    if (isEditMode && user?.schoolId) {
      setLoading(true);
      apiService.getClassroomById(parseInt(id!), user.schoolId)
        .then(data => {
          setValue('name', data.name);
          setValue('description', data.description);
        })
        .catch(err => setError('No se pudo cargar el salón.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, setValue, user?.schoolId]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
      setError("No se ha podido identificar el colegio.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      if (isEditMode) {
        const payload = { ...data, schoolID: user.schoolId, classroomID: parseInt(id!) };
        await apiService.updateClassroom(parseInt(id!), payload);
      } else {
        const payload = { ...data, schoolID: user.schoolId };
        await apiService.createClassroom(payload);
      }
      navigate('/classrooms');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el salón.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar Salón' : 'Crear Salón'}</h1>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      
      {loading && isEditMode ? <p>Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre del Salón</label>
            <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Descripción</label>
            <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link to="/classrooms" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ClassroomFormPage;