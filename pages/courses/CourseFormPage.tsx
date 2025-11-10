import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

type ScheduleBlock = {
    start: string;
    end: string;
};

const CourseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<Record<string, ScheduleBlock[]>>({});
  
  // State for new additional teachers UI
  const [selectedAdditionalTeacherIds, setSelectedAdditionalTeacherIds] = useState<Set<number>>(new Set());
  const [teacherSearch, setTeacherSearch] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

  useEffect(() => {
    if (user?.schoolId) {
        setLoading(true);
        apiService.getTeachers(user.schoolId)
            .then(setTeachers)
            .catch(() => setError('No se pudieron cargar los profesores.'))
            .finally(() => setLoading(false));
    }
  }, [setValue, user?.schoolId]);

    useEffect(() => {
        const parts: string[] = [];
        Object.keys(schedule).sort((a,b) => parseInt(a) - parseInt(b)).forEach(day => {
            schedule[day].forEach(block => {
                if (block.start && block.end) {
                    parts.push(`${day}@${block.start}-${block.end}`);
                }
            });
        });
        const scheduleString = parts.join('|');
        setValue('dayOfWeek', scheduleString, { shouldValidate: true, shouldDirty: true });
    }, [schedule, setValue]);

    // Sync selectedAdditionalTeacherIds with form state
    useEffect(() => {
        setValue('additionalTeacherIDs', Array.from(selectedAdditionalTeacherIds));
    }, [selectedAdditionalTeacherIds, setValue]);

    const handleDayToggle = (day: string) => {
        setSchedule(current => {
            const newSchedule = { ...current };
            if (newSchedule[day]) {
                delete newSchedule[day];
            } else {
                newSchedule[day] = [{ start: '', end: '' }];
            }
            return newSchedule;
        });
    };
    
    const handleAddBlock = (day: string) => {
        setSchedule(current => ({
            ...current,
            [day]: [...(current[day] || []), { start: '', end: '' }]
        }));
    };
    
    const handleRemoveBlock = (day: string, blockIndex: number) => {
        setSchedule(current => {
            const newSchedule = { ...current };
            const updatedBlocks = newSchedule[day].filter((_, index) => index !== blockIndex);
            if (updatedBlocks.length === 0) {
                delete newSchedule[day];
            } else {
                newSchedule[day] = updatedBlocks;
            }
            return newSchedule;
        });
    };
    
    const handleBlockChange = (day: string, blockIndex: number, part: 'start' | 'end', value: string) => {
        setSchedule(current => {
            const newSchedule = { ...current };
            const updatedBlocks = [...newSchedule[day]];
            updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], [part]: value };
            newSchedule[day] = updatedBlocks;
            return newSchedule;
        });
    };

    const handleTeacherSelection = (teacherId: number) => {
        setSelectedAdditionalTeacherIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(teacherId)) {
                newSet.delete(teacherId);
            } else {
                newSet.add(teacherId);
            }
            return newSet;
        });
    };

    const filteredTeachers = useMemo(() => {
        if (!teacherSearch) return teachers;
        const lowercasedQuery = teacherSearch.toLowerCase();
        return teachers.filter(t =>
            t.userName.toLowerCase().includes(lowercasedQuery) ||
            (t.cedula && t.cedula.includes(lowercasedQuery))
        );
    }, [teachers, teacherSearch]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
      setError("No se ha podido identificar el colegio.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    const additionalTeacherIDsString = Array.isArray(data.additionalTeacherIDs)
        ? (data.additionalTeacherIDs as number[]).join(',')
        : '';

    try {
        const payload = { ...data, schoolID: user.schoolId, additionalTeacherIDs: additionalTeacherIDsString };
        await apiService.createCourse(payload as any);
        navigate('/courses');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Crear Curso</h1>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      
      {loading ? <p>Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre del Curso</label>
            <input {...register('name', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Descripción</label>
            <textarea {...register('description')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
          </div>
          
           <div>
                <label className="block text-sm font-medium text-text-primary">Días de la semana y horario</label>
                <div className="mt-2 space-y-3">
                    {daysOfWeekMap.map(({ value, label }) => {
                        const blocks = schedule[value] || [];
                        const isChecked = blocks.length > 0;
                        return (
                            <div key={value}>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`day-${value}`}
                                        checked={isChecked}
                                        onChange={() => handleDayToggle(value)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
                                    />
                                    <label htmlFor={`day-${value}`} className="ml-2 block text-sm text-text-primary">{label}</label>
                                </div>
                                {isChecked && (
                                    <div className="mt-2 ml-6 space-y-2 p-2 bg-background rounded">
                                        {blocks.map((block, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <label className="text-sm">Inicio:</label>
                                                <input 
                                                    type="time"
                                                    value={block.start}
                                                    onChange={(e) => handleBlockChange(value, index, 'start', e.target.value)}
                                                    className="block w-32 px-2 py-1 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm"
                                                />
                                                <label className="text-sm">Fin:</label>
                                                <input 
                                                    type="time"
                                                    value={block.end}
                                                    onChange={(e) => handleBlockChange(value, index, 'end', e.target.value)}
                                                    className="block w-32 px-2 py-1 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent text-sm"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveBlock(value, index)}
                                                    className="text-danger hover:text-danger-dark text-xl font-bold leading-none"
                                                    title="Eliminar bloque"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => handleAddBlock(value)}
                                            className="text-sm text-primary hover:underline mt-2"
                                        >
                                            + Agregar Bloque
                                        </button>
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
            <select {...register('userID', { valueAsNumber: true, required: 'Debe seleccionar un profesor' })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                <option value="">Seleccione un profesor</option>
                {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
            </select>
            {errors.userID && <p className="text-danger text-xs mt-1">{errors.userID.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Profesores Adicionales (Opcional)</label>
            <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                value={teacherSearch}
                onChange={e => setTeacherSearch(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
            <div className="mt-2 border border-border rounded-md h-40 overflow-y-auto p-2 bg-background">
                {filteredTeachers.map(teacher => (
                    <div key={teacher.userID} className="flex items-center p-1 rounded hover:bg-surface">
                        <input
                            type="checkbox"
                            id={`teacher-${teacher.userID}`}
                            checked={selectedAdditionalTeacherIds.has(teacher.userID)}
                            onChange={() => handleTeacherSelection(teacher.userID)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-accent"
                        />
                        <label htmlFor={`teacher-${teacher.userID}`} className="ml-2 block text-sm text-text-primary cursor-pointer">
                            {teacher.userName} <span className="text-text-tertiary">({teacher.cedula})</span>
                        </label>
                    </div>
                ))}
            </div>
            <input type="hidden" {...register('additionalTeacherIDs')} />
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
