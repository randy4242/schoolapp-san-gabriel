import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, Course, Enrollment } from '../../types';

type FormInputs = {
    courseId: number;
};

const AssignCoursePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();

    const [student, setStudent] = useState<User | null>(null);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [currentEnrollments, setCurrentEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.schoolId && userId) {
            setLoading(true);
            Promise.all([
                apiService.getUserById(parseInt(userId), user.schoolId),
                apiService.getCourses(user.schoolId),
                apiService.getEnrollmentsForUser(parseInt(userId), user.schoolId)
            ]).then(([studentData, courseData, enrollmentData]) => {
                setStudent(studentData);
                setAllCourses(courseData);
                setCurrentEnrollments(enrollmentData);
            }).catch(() => {
                setError('No se pudieron cargar los datos necesarios.');
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [userId, user]);

    const availableCourses = useMemo(() => {
        const enrolledCourseIds = new Set(currentEnrollments.map(e => e.courseID));
        return allCourses.filter(c => !enrolledCourseIds.has(c.courseID));
    }, [allCourses, currentEnrollments]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId || !userId) {
            setError('Error de configuración.');
            return;
        }
        setLoading(true);
        try {
            await apiService.createEnrollment({
                UserID: parseInt(userId),
                CourseID: data.courseId,
                SchoolID: user.schoolId
            });
            navigate(`/enrollments/student/${userId}`);
        } catch (err: any) {
            setError(err.message || 'Error al asignar el curso.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Asignar Curso</h1>
            {loading ? (
                <p>Cargando...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="p-4 bg-gray-100 rounded-md">
                        <p className="text-sm font-medium text-gray-600">Estudiante:</p>
                        <p className="text-lg font-semibold text-main-blue">{student?.userName}</p>
                    </div>

                    <div>
                        <label htmlFor="courseId" className="block text-sm font-medium text-gray-700">Curso a Inscribir</label>
                        <select
                            id="courseId"
                            {...register('courseId', { required: 'Debe seleccionar un curso', valueAsNumber: true })}
                            className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                            <option value="">Seleccione un curso disponible</option>
                            {availableCourses.length > 0 ? (
                                availableCourses.map(c => <option key={c.courseID} value={c.courseID}>{c.name}</option>)
                            ) : (
                                <option disabled>No hay más cursos disponibles para este estudiante</option>
                            )}
                        </select>
                        {errors.courseId && <p className="text-red-500 text-xs mt-1">{errors.courseId.message}</p>}
                    </div>
                    
                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to={`/enrollments/student/${userId}`} className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={loading} className="bg-main-blue text-white py-2 px-4 rounded hover:bg-black disabled:bg-gray-400">
                            {loading ? 'Asignando...' : 'Asignar Curso'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AssignCoursePage;