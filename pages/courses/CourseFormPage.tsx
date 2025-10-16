import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Teacher } from '../../types';

type FormInputs = Omit<Course, 'courseID' | 'schoolID' | 'teacherName'>;

const daysOfWeekMap = [
    { value: "1", label: "Lunes" },
    { value: "2", label: "Martes" },
    { value: "3", label: "Miércoles" },
    { value: "4", label: "Jueves" },
    { value: "5", label: "Viernes" },
    { value: "6", label: "Sábado" },
    { value: "0", label: "Domingo" },
];

type ScheduleItem = {
    day: string;
    start: string;
    end: string;
};

const CourseFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

  useEffect(() => {
    if (user?.schoolId) {
        setLoading(true);
        apiService.getTeachers(user.schoolId)
            .then(setTeachers)
            .catch(() => setError('No se pudieron cargar los profesores.'));

        if (isEditMode) {
            apiService.getCourseById(parseInt(id!), user.schoolId)
                .then(courseData => {
                    setValue('name', courseData.name);
                    setValue('description', courseData.description);
                    setValue('userID', courseData.userID);
                    setValue('additionalTeacherIDs', courseData.additionalTeacherIDs || []);

                    if (courseData.dayOfWeek) {
                        const parsedSchedule: ScheduleItem[] = courseData.dayOfWeek
                            .split('|')
                            .map(part => {
                                const [day, times] = part.split('@');
                                if (!day || !times || !times.includes('-')) return null;
                                const [start, end] = times.split('-');
                                return { day, start, end };
                            })
                            .filter((item): item is ScheduleItem => item !== null);
                        setSchedule(parsedSchedule);
                    }
                })
                .catch(() => setError('No se pudo cargar el curso.'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }
  }, [id, isEditMode, setValue, user?.schoolId]);

    useEffect(() => {
        const scheduleString = schedule
            .sort((a,b) => parseInt(a.day) - parseInt(b.day))
            .filter(item => item.start && item.end)
            .map(item => `${item.day}@${item.start}-${item.end}`)
            .join('|');
        setValue('dayOfWeek', scheduleString, { shouldValidate: true, shouldDirty: true });
    }, [schedule, setValue]);

    const updateScheduleItem = (day: string, part: 'start' | 'end' | 'toggle', value?: string) => {
        setSchedule(currentSchedule => {
            const existing = currentSchedule.find(item => item.day === day);
            if (part === 'toggle') {
                if (existing) {
                    return currentSchedule.filter(item => item.day !== day);
                } else {
                    return [...currentSchedule, { day, start: '', end: '' }];
                }
            }
            if (existing) {
                return currentSchedule.map(item => item.day === day ? { ...item, [part]: value || '' } : item);
            }
            return currentSchedule;
        });
    };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
      setError("No se ha podido identificar el colegio.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    const additionalTeacherIDs = Array.isArray(data.additionalTeacherIDs) 
      ? data.additionalTeacherIDs.map(id => Number(id))
      : data.additionalTeacherIDs ? [Number(data.additionalTeacherIDs)].filter(Boolean) : [];


    try {
      if (isEditMode) {
        const payload = { ...data, schoolID: user.schoolId, additionalTeacherIDs };
        await apiService.updateCourse(parseInt(id!), user.schoolId, payload);
      } else {
        const payload = { ...data, schoolID: user.schoolId, additionalTeacherIDs };
        await apiService.createCourse(payload);
      }
      navigate('/courses');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar Curso' : 'Crear Curso'}</h1>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      
      {loading ? <p>Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre del Curso</label>
            <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Descripción</label>
            <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
          </div>
          
           <div>
                <label className="block text-sm font-medium text-text-primary">Días de la semana y horario</label>
                <div className="mt-2 space-y-3">
                    {daysOfWeekMap.map(({ value, label }) => {
                        const currentItem = schedule.find(item => item.day === value);
                        const isChecked = !!currentItem;
                        return (
                            <div key={value}>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`day-${value}`}
                                        checked={isChecked}
                                        onChange={() => updateScheduleItem(value, 'toggle')}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
                                    />
                                    <label htmlFor={`day-${value}`} className="ml-2 block text-sm text-text-primary">{label}</label>
                                </div>
                                {isChecked && (
                                    <div className="mt-2 ml-6 flex items-center space-x-2 p-2 bg-background rounded">
                                        <label className="text-sm">Inicio:</label>
                                        <input 
                                            type="time"
                                            value={currentItem.start}
                                            onChange={(e) => updateScheduleItem(value, 'start', e.target.value)}
                                            className="block w-32 px-2 py-1 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm"
                                        />
                                        <label className="text-sm">Fin:</label>
                                        <input 
                                            type="time"
                                            value={currentItem.end}
                                            onChange={(e) => updateScheduleItem(value, 'end', e.target.value)}
                                            className="block w-32 px-2 py-1 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                <input type="hidden" {...register('dayOfWeek')} />
                {errors.dayOfWeek && <p className="text-danger text-xs mt-1">{errors.dayOfWeek.message}</p>}
            </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Profesor Principal</label>
            <select {...register('userID', { valueAsNumber: true, required: 'Debe seleccionar un profesor' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                <option value="">Seleccione un profesor</option>
                {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
            </select>
            {errors.userID && <p className="text-danger text-xs mt-1">{errors.userID.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Profesores Adicionales (Opcional)</label>
            <select multiple {...register('additionalTeacherIDs')} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm h-32 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link to="/courses" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CourseFormPage;