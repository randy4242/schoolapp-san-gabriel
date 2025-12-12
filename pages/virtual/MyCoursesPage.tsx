
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Course, Enrollment } from '../../types';
import { BookOpenIcon } from '../../components/icons';
import CourseMatesModal from './CourseMatesModal';

interface DisplayCourse {
    id: number;
    name: string;
    description: string;
}

const MyCoursesPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const [courses, setCourses] = useState<DisplayCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingMatesFor, setViewingMatesFor] = useState<DisplayCourse | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            setLoading(true);
            setError('');
            try {
                const isStudent = hasPermission([1, 3, 11]);
                const isTeacher = hasPermission([2, 8, 9, 10]); // Teacher, coordinator, jefe, aux
                const isAdmin = hasPermission([6, 7]);

                if (isStudent) {
                    const enrollments: Enrollment[] = await apiService.getEnrollmentsForUser(user.userId, user.schoolId);
                    const courseDetailsPromises = enrollments.map(e => apiService.getCourseById(e.courseID, user.schoolId));
                    const fullCourses = await Promise.all(courseDetailsPromises);
                    const studentCourses: DisplayCourse[] = fullCourses.map(c => ({
                        id: c.courseID,
                        name: c.name,
                        description: c.description
                    }));
                    setCourses(studentCourses);
                } else if (isTeacher) {
                    const taughtCourses: Course[] = await apiService.getTaughtCourses(user.userId, user.schoolId);
                    const teacherCourses: DisplayCourse[] = taughtCourses.map(c => ({
                        id: c.courseID,
                        name: c.name,
                        description: c.description
                    }));
                    setCourses(teacherCourses);
                } else if (isAdmin) {
                     const allCourses: Course[] = await apiService.getCourses(user.schoolId);
                     const adminCourses: DisplayCourse[] = allCourses.map(c => ({
                        id: c.courseID,
                        name: c.name,
                        description: c.description
                    }));
                    setCourses(adminCourses);
                } else {
                    setCourses([]);
                }
            } catch (err) {
                setError('No se pudieron cargar los cursos.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user, hasPermission]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary mb-6">Mis Cursos</h1>
            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            {!loading && !error && (
                courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => setViewingMatesFor(course)}
                                className="bg-surface p-6 rounded-lg shadow-md flex flex-col text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                <div className="flex items-center mb-3">
                                    <div className="bg-primary text-text-on-primary rounded-full h-10 w-10 flex-shrink-0 flex items-center justify-center p-2 mr-4">
                                        <BookOpenIcon />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">{course.name}</h3>
                                </div>
                                <p className="text-text-secondary mt-2 flex-grow text-sm">{course.description || 'Sin descripción.'}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                        <p className="text-text-secondary">No tienes cursos asignados.</p>
                     </div>
                )
            )}

            {viewingMatesFor && (
                <CourseMatesModal
                    courseId={viewingMatesFor.id}
                    courseName={viewingMatesFor.name}
                    onClose={() => setViewingMatesFor(null)}
                />
            )}
        </div>
    );
};

export default MyCoursesPage;