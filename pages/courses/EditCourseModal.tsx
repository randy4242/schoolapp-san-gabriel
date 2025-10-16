import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Teacher } from '../../types';
import Modal from '../../components/Modal';

interface EditCourseModalProps {
    course: Course;
    teachers: Teacher[];
    onClose: () => void;
    onSaveSuccess: () => void;
}

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

const EditCourseModal: React.FC<EditCourseModalProps> = ({ course, teachers, onClose, onSaveSuccess }) => {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>({
      defaultValues: {
          name: course.name,
          description: course.description,
          userID: course.userID,
          additionalTeacherIDs: course.additionalTeacherIDs || [],
      }
  });

  useEffect(() => {
    if (course.dayOfWeek) {
        const parsedSchedule: ScheduleItem[] = course.dayOfWeek
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
  }, [course]);

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
      : [];

    try {
      const payload = { ...data, schoolID: user.schoolId, additionalTeacherIDs };
      await apiService.updateCourse(course.courseID, user.schoolId, payload);
      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Editar Curso">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}

            <div>
                <label className="block text-sm font-medium text-text-primary">Nombre del Curso</label>
                <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary">Descripción</label>
                <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
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
                                    <input type="checkbox" id={`day-edit-${value}`} checked={isChecked} onChange={() => updateScheduleItem(value, 'toggle')} className="h-4 w-4 rounded border-border text-primary focus:ring-accent" />
                                    <label htmlFor={`day-edit-${value}`} className="ml-2 block text-sm text-text-primary">{label}</label>
                                </div>
                                {isChecked && (
                                    <div className="mt-2 ml-6 flex items-center space-x-2 p-2 bg-background rounded">
                                        <label className="text-sm">Inicio:</label>
                                        <input type="time" value={currentItem?.start || ''} onChange={(e) => updateScheduleItem(value, 'start', e.target.value)} className="block w-32 px-2 py-1 border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm" />
                                        <label className="text-sm">Fin:</label>
                                        <input type="time" value={currentItem?.end || ''} onChange={(e) => updateScheduleItem(value, 'end', e.target.value)} className="block w-32 px-2 py-1 border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                <input type="hidden" {...register('dayOfWeek')} />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary">Profesor Principal</label>
                <select {...register('userID', { valueAsNumber: true, required: 'Debe seleccionar un profesor' })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                    <option value="">Seleccione un profesor</option>
                    {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
                </select>
                {errors.userID && <p className="text-danger text-xs mt-1">{errors.userID.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-text-primary">Profesores Adicionales (Opcional)</label>
                <select multiple {...register('additionalTeacherIDs')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface rounded-md shadow-sm h-32 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                    {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
                </select>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    </Modal>
  );
};

export default EditCourseModal;