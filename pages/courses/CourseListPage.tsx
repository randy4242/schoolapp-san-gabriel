import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Teacher } from '../../types';
import { EyeIcon } from '../../components/icons';
import EditCourseModal from './EditCourseModal';
import CourseStudentsModal from './CourseStudentsModal';

const availableDays: Record<string, string> = {
    "1": "Lunes",
    "2": "Martes",
    "3": "Miércoles",
    "4": "Jueves",
    "5": "Viernes",
    "6": "Sábado",
    "0": "Domingo",
    "No asignado": "No asignado"
};

type ParsedSchedule = { day: string; time: string };

const parseDayOfWeek = (dayOfWeek: string | null | undefined): ParsedSchedule[] => {
    if (!dayOfWeek || !dayOfWeek.trim()) return [];
    
    const val = dayOfWeek.trim();

    if (val.includes('@')) {
        return val.split('|').map(entry => {
            const parts = entry.split('@');
            if (parts.length !== 2 || !parts[0]) return null;
            return { day: parts[0], time: parts[1] || '—' };
        }).filter((p): p is ParsedSchedule => p !== null);
    }
    
    return val.split(',').map(day => ({ day: day.trim(), time: '—' })).filter(p => p.day);
};

const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState('all');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewingStudentsCourse, setViewingStudentsCourse] = useState<Course | null>(null);
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  const canCreateCourse = useMemo(() => hasPermission([6]), [hasPermission]);

  const fetchCoursesAndTeachers = async () => {
    if (user?.schoolId) {
      try {
        setLoading(true);
        const [courseData, teacherData] = await Promise.all([
          apiService.getCourses(user.schoolId),
          apiService.getTeachers(user.schoolId)
        ]);
        setCourses(courseData);
        setTeachers(teacherData);
        setError('');
      } catch (err) {
        setError('No se pudo cargar la lista de cursos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCoursesAndTeachers();
  }, [user]);
  
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const handleSaveSuccess = () => {
      setEditingCourse(null);
      fetchCoursesAndTeachers();
  }

  const displayData = useMemo(() => {
    const courseListWithDetails = courses.map(course => {
        const teacherName = teachers.find(t => t.userID === course.userID)?.userName || 'No asignado';
        const schedule = parseDayOfWeek(course.dayOfWeek);
        return {
          ...course,
          teacherName,
          schedule: schedule.length > 0 ? schedule : [{ day: 'No asignado', time: '—' }],
        };
    });

    const filteredByName = courseListWithDetails.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
      
    const grouped: Record<string, typeof filteredByName> = {};
    
    const daysToRender = dayFilter === 'all' ? Object.keys(availableDays) : [dayFilter];

    daysToRender.forEach(dayKey => {
      const coursesForDay = filteredByName.filter(c => c.schedule.some(s => s.day === dayKey));
      if (coursesForDay.length > 0) {
        grouped[dayKey] = coursesForDay;
      }
    });
    
    return grouped;
  }, [courses, teachers, searchTerm, dayFilter]);

  const handleDelete = async (courseId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este curso?')) {
      try {
        if (user?.schoolId) {
          await apiService.deleteCourse(courseId, user.schoolId);
          fetchCoursesAndTeachers();
        }
      } catch (err) {
        setError('Error al eliminar el curso.');
        console.error(err);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Lista de Cursos</h1>
        {canCreateCourse && (
          <Link to="/courses/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
            Crear Curso
          </Link>
        )}
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input 
            type="text"
            placeholder="Buscar por nombre de curso..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-1/2 p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          />
          <select 
            value={dayFilter}
            onChange={e => setDayFilter(e.target.value)}
            className="w-full md:w-1/4 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          >
            <option value="all">Todos los días</option>
            {Object.entries(availableDays).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ))}
          </select>
      </div>

      {loading && <p>Cargando cursos...</p>}
      {error && <p className="text-danger">{error}</p>}
      
      {!loading && !error && Object.keys(displayData).length === 0 && (
          <p className="text-secondary">No se encontraron cursos que coincidan con los filtros aplicados.</p>
      )}

      {!loading && !error && Object.keys(displayData).map((dayKey) => {
        const coursesForDay = displayData[dayKey];
        return (
          <div key={dayKey} className="mb-6 bg-surface p-4 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-primary border-b border-border pb-2 mb-3">{availableDays[dayKey]}</h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                      <thead className="bg-background">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Nombre</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Descripción</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Profesor/a</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Horario</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Acciones</th>
                      </tr>
                      </thead>
                      <tbody className="bg-surface divide-y divide-border">
                      {coursesForDay.map(course => {
                          const scheduleForThisDay = course.schedule.find(s => s.day === dayKey)?.time || '—';
                          return (
                              <tr key={`${course.courseID}-${dayKey}`} className="hover:bg-background">
                                  <td className="px-6 py-4 whitespace-nowrap">{course.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap max-w-sm truncate">{course.description}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{course.teacherName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{scheduleForThisDay}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                          <button onClick={() => setEditingCourse(course)} className="text-warning hover:text-warning-dark p-1 rounded-md hover:bg-warning/10" title="Editar">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                          </button>
                                          <button onClick={() => setViewingStudentsCourse(course)} className="text-info hover:text-info-dark p-1 rounded-md hover:bg-info-light" title="Ver Estudiantes">
                                              <EyeIcon />
                                          </button>
                                          <button onClick={() => handleDelete(course.courseID)} className="text-danger hover:text-danger-text p-1 rounded-md hover:bg-danger-light" title="Eliminar">
                                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          )
                      })}
                      </tbody>
                  </table>
              </div>
          </div>
        );
      })}
      
      {editingCourse && (
          <EditCourseModal
            course={editingCourse}
            teachers={teachers}
            onClose={() => setEditingCourse(null)}
            onSaveSuccess={handleSaveSuccess}
          />
      )}

      {viewingStudentsCourse && (
          <CourseStudentsModal
            courseId={viewingStudentsCourse.courseID}
            courseName={viewingStudentsCourse.name}
            onClose={() => setViewingStudentsCourse(null)}
          />
      )}
    </div>
  );
};

export default CourseListPage;