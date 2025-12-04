import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom, BOLETA_LEVELS } from '../../types';

type FormInputs = {
    name: string;
    description: string;
};

const ClassroomFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [boletaType, setBoletaType] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();
  
  // Specific schools that require the strict boleta tagging system
  const allowedSchools = [5, 6, 7, 8, 9];
  const showBoletaSelect = user?.schoolId && allowedSchools.includes(user.schoolId);

  useEffect(() => {
    if (isEditMode && user?.schoolId) {
      setLoading(true);
      apiService.getClassroomById(parseInt(id!), user.schoolId)
        .then(data => {
          // Parse name to extract boleta tag if present: [Level] Name
          const match = data.name.match(/^\[(.*?)\]\s*(.*)/);
          if (match) {
              setBoletaType(match[1]); // The extracted level
              setValue('name', match[2]); // The visible name part
          } else {
              setValue('name', data.name);
          }
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
    
    if (showBoletaSelect && !boletaType) {
        setError("Para este colegio, es obligatorio seleccionar el Tipo de Boleta.");
        return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Inject tag if applicable: [Level] Name
      let finalName = data.name;
      if (showBoletaSelect && boletaType) {
          finalName = `[${boletaType}] ${data.name}`;
      }

      if (isEditMode) {
        const payload = { 
            name: finalName,
            description: data.description,
            schoolID: user.schoolId, 
            classroomID: parseInt(id!) 
        };
        await apiService.updateClassroom(parseInt(id!), payload);
      } else {
        const payload = { 
            name: finalName,
            description: data.description,
            schoolID: user.schoolId 
        };
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
            <input {...register('name', { required: 'El nombre es requerido' })} placeholder="Ej: Sección A, Los Girasoles..." className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          {showBoletaSelect && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <label className="block text-sm font-bold text-text-primary mb-1">Tipo de Boleta (Obligatorio)</label>
                  <p className="text-xs text-text-secondary mb-2">Seleccione el nivel académico para asegurar que se genere la boleta correcta.</p>
                  <select 
                      value={boletaType} 
                      onChange={(e) => setBoletaType(e.target.value)}
                      className="block w-full px-3 py-2 bg-white text-text-primary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                      <option value="">-- Seleccione Nivel --</option>
                      {BOLETA_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                  </select>
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary">Descripción</label>
            <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
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