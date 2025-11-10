import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Classroom } from '../../types';

type FormInputs = {
    courseId: number;
    classroomId: number;
};

const AssignClassroomPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();

    const [courses, setCourses] = useState<Course[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    
    const [courseSearch, setCourseSearch] = useState('');
    const [classroomSearch, setClassroomSearch] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getCourses(user.schoolId),
                apiService.getClassrooms(user.schoolId)
            ]).then(([courseData, classroomData]) => {
                setCourses(courseData);
                setClassrooms(classroomData);
            }).catch(() => {
                setError('No se pudieron cargar los datos de cursos y salones.');
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [user]);

    const filteredCourses = useMemo(() => {
        if (!courseSearch) return courses;
        const query = courseSearch.toLowerCase();
        return courses.filter(c => 
            c.name.toLowerCase().includes(query)
        );
    }, [courses, courseSearch]);

    const filteredClassrooms = useMemo(() => {
        if (!classroomSearch) return classrooms;
        const query = classroomSearch.toLowerCase();
        return classrooms.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.description.toLowerCase().includes(query)
        );
    }, [classrooms, classroomSearch]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await apiService.assignClassroomToCourse(Number(data.courseId), Number(data.classroomId));
            setSuccess('Salón asignado al curso correctamente.');
            setTimeout(() => navigate('/courses'), 2000);
        } catch (err: any) {
            setError(err.message || 'Error al asignar el curso al salón.');
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) {
        return <p>Cargando...</p>;
    }

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Asignar Salón a Curso</h1>

            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-success-light text-success-text p-3 rounded mb-4">{success}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Curso */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1 flex justify-between">
                        <span>Curso</span>
                        <small className="text-text-tertiary">{filteredCourses.length} / {courses.length}</small>
                    </label>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={courseSearch}
                        onChange={e => setCourseSearch(e.target.value)}
                        className="w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 mb-2"
                    />
                    <select
                        {...register('courseId', { required: 'Debe seleccionar un curso', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        <option value="">-- Seleccione un Curso --</option>
                        {filteredCourses.map(c => (
                            <option key={c.courseID} value={c.courseID}>{c.name}</option>
                        ))}
                    </select>
                    {errors.courseId && <p className="text-danger text-xs mt-1">{errors.courseId.message}</p>}
                </div>

                {/* Salón */}
                <div>
                     <label className="block text-sm font-medium text-text-secondary mb-1 flex justify-between">
                        <span>Salón</span>
                        <small className="text-text-tertiary">{filteredClassrooms.length} / {classrooms.length}</small>
                    </label>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={classroomSearch}
                        onChange={e => setClassroomSearch(e.target.value)}
                        className="w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 mb-2"
                    />
                    <select
                        {...register('classroomId', { required: 'Debe seleccionar un salón', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        <option value="">-- Seleccione un Salón --</option>
                        {filteredClassrooms.map(c => (
                            <option key={c.classroomID} value={c.classroomID}>{c.name}</option>
                        ))}
                    </select>
                    {errors.classroomId && <p className="text-danger text-xs mt-1">{errors.classroomId.message}</p>}
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={() => navigate('/courses')} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary transition-colors">
                        {saving ? 'Asignando...' : 'Asignar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignClassroomPage;
