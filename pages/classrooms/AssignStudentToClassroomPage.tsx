
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, Classroom } from '../../types';

type FormInputs = {
    selectedUserId: number;
    selectedClassroomId: number;
};

const AssignStudentToClassroomPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();

    const [students, setStudents] = useState<User[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [studentSearch, setStudentSearch] = useState('');
    const [classroomSearch, setClassroomSearch] = useState('');

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getStudents(user.schoolId),
                apiService.getClassrooms(user.schoolId)
            ]).then(([studentData, classroomData]) => {
                setStudents(studentData);
                setClassrooms(classroomData);
            }).catch(() => {
                setError('No se pudo cargar la lista de estudiantes o salones.');
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [user]);

    const filteredStudents = useMemo(() => {
        if (!studentSearch) return students;
        const query = studentSearch.toLowerCase();
        return students.filter(s => 
            s.userName.toLowerCase().includes(query) || 
            (s.cedula && s.cedula.toLowerCase().includes(query))
        );
    }, [students, studentSearch]);

    const filteredClassrooms = useMemo(() => {
        if (!classroomSearch) return classrooms;
        const query = classroomSearch.toLowerCase();
        return classrooms.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query)
        );
    }, [classrooms, classroomSearch]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            await apiService.assignStudentToClassroom(data.selectedUserId, data.selectedClassroomId);
            setSuccess('Estudiante asignado al salón correctamente.');
            setTimeout(() => navigate('/classrooms'), 1500);
        } catch (err: any) {
            setError(err.message || 'Error al asignar el estudiante.');
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <p>Cargando datos...</p>;

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Asignar Estudiante a Salón</h1>

            {error && <div className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</div>}
            {success && <div className="bg-success-light text-success-text p-3 rounded mb-4">{success}</div>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="studentSearch" className="block text-sm font-medium text-text-secondary mb-1">
                        Estudiante
                        <small className="text-text-tertiary ml-2">{filteredStudents.length} / {students.length}</small>
                    </label>
                    <input
                        id="studentSearch"
                        type="text"
                        placeholder="Buscar por nombre o cédula..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full p-2 bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-2"
                    />
                    <select
                        {...register('selectedUserId', { required: 'Debe seleccionar un estudiante', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                        <option value="">-- Seleccione un estudiante --</option>
                        {filteredStudents.map(student => (
                            <option key={student.userID} value={student.userID}>
                                {student.userName} ({student.cedula})
                            </option>
                        ))}
                    </select>
                    {errors.selectedUserId && <p className="text-danger text-xs mt-1">{errors.selectedUserId.message}</p>}
                </div>

                <div>
                    <label htmlFor="classroomSearch" className="block text-sm font-medium text-text-secondary mb-1">
                        Salón
                         <small className="text-text-tertiary ml-2">{filteredClassrooms.length} / {classrooms.length}</small>
                    </label>
                     <input
                        id="classroomSearch"
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={classroomSearch}
                        onChange={e => setClassroomSearch(e.target.value)}
                        className="w-full p-2 bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-2"
                    />
                    <select
                        {...register('selectedClassroomId', { required: 'Debe seleccionar un salón', valueAsNumber: true })}
                        className="w-full p-2 border border-border rounded bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                        <option value="">-- Seleccione un salón --</option>
                        {filteredClassrooms.map(classroom => (
                            <option key={classroom.classroomID} value={classroom.classroomID}>
                                {classroom.name}
                            </option>
                        ))}
                    </select>
                    {errors.selectedClassroomId && <p className="text-danger text-xs mt-1">{errors.selectedClassroomId.message}</p>}
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                     <Link to="/classrooms" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                        Volver
                    </Link>
                    <button type="submit" disabled={submitting} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary transition-colors">
                        {submitting ? 'Asignando...' : 'Asignar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignStudentToClassroomPage;
