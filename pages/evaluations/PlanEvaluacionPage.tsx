import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, Course, Classroom } from '../../types';
import { CalendarIcon, SchoolIcon } from '../../components/icons';

const PlanEvaluacionPage: React.FC = () => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filters
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedClassroom, setSelectedClassroom] = useState<string>('');

    const { user } = useAuth();

    const fetchData = async () => {
        if (user?.schoolId && user?.userId) {
            try {
                setLoading(true);
                setError('');
                const [evalData, allCourses, allClassrooms] = await Promise.all([
                    apiService.getEvaluations(user.schoolId, user.userId),
                    apiService.getCourses(user.schoolId),
                    apiService.getClassrooms(user.schoolId)
                ]);
                
                // Filter only NON-EVALUABLE evaluations
                const planEvals = evalData.filter(e => e.description?.includes('| No evaluado |'));
                setEvaluations(planEvals);
                setCourses(allCourses);
                setClassrooms(allClassrooms);
            } catch (err: any) {
                setError('No se pudo cargar el plan de evaluación.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const cleanDescription = (desc: string | null | undefined) => {
        if (!desc) return 'Sin descripción.';
        return desc
            .replace('| No evaluado |', '')
            .replace(/@@OVERRIDE:.*$/, '')
            .split('@')[0]
            .trim();
    };

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(e => {
            const courseMatch = !selectedCourse || e.courseID === Number(selectedCourse);
            const classroomMatch = !selectedClassroom || e.classroomID === Number(selectedClassroom);
            return courseMatch && classroomMatch;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [evaluations, selectedCourse, selectedClassroom]);

    const classroomMap = useMemo(() => new Map(classrooms.map(c => [c.classroomID, c.name])), [classrooms]);
    const courseMap = useMemo(() => new Map(courses.map(c => [c.courseID, c.name])), [courses]);

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-primary text-white rounded-xl shadow-lg">
                        <CalendarIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-text-primary">Plan de Evaluación</h1>
                </div>
                <p className="text-text-secondary text-lg">Cronograma informativo de actividades y temas del lapso.</p>
            </header>

            {/* Filters Bar */}
            <div className="bg-surface p-4 rounded-2xl shadow-sm border border-border mb-8 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-text-tertiary uppercase mb-1">Filtrar por Salón</label>
                    <div className="relative">
                        <select 
                            value={selectedClassroom} 
                            onChange={e => setSelectedClassroom(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent/50 outline-none transition-all appearance-none"
                        >
                            <option value="">Todos los Salones</option>
                            {classrooms.map(c => <option key={c.classroomID} value={c.classroomID}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-text-tertiary uppercase mb-1">Filtrar por Curso</label>
                    <div className="relative">
                        <select 
                            value={selectedCourse} 
                            onChange={e => setSelectedCourse(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent/50 outline-none transition-all appearance-none"
                        >
                            <option value="">Todos los Cursos</option>
                            {courses.map(c => <option key={c.courseID} value={c.courseID}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {(selectedCourse || selectedClassroom) && (
                    <button 
                        onClick={() => { setSelectedCourse(''); setSelectedClassroom(''); }}
                        className="mt-5 text-sm text-accent hover:underline font-bold"
                    >
                        Limpiar Filtros
                    </button>
                )}
            </div>

            {error && <div className="bg-danger-light text-danger p-4 rounded-lg mb-6 shadow-sm border border-danger/20">{error}</div>}

            {filteredEvaluations.length > 0 ? (
                <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pb-8">
                    {filteredEvaluations.map((ev) => {
                        const classroomName = classroomMap.get(ev.classroomID || 0) || 'General';
                        const courseName = courseMap.get(ev.courseID) || 'Curso';
                        const date = new Date(ev.date);
                        
                        return (
                            <div key={ev.evaluationID} className="relative pl-8 animate-fade-in-down">
                                {/* Dot on timeline */}
                                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-primary rounded-full border-4 border-white shadow-sm"></div>
                                
                                <div className="bg-surface rounded-2xl p-6 shadow-md border border-transparent hover:border-primary/20 hover:shadow-xl transition-all group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-center bg-background rounded-xl p-2 min-w-[60px]">
                                                <span className="block text-xs font-bold text-accent uppercase">{date.toLocaleString('es-ES', { month: 'short' })}</span>
                                                <span className="block text-xl font-black text-primary">{date.getDate()}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{ev.title}</h3>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        No evaluable
                                                    </span>
                                                    <span className="text-xs text-text-tertiary flex items-center">
                                                        <SchoolIcon className="w-3 h-3 mr-1" /> {classroomName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                                            <span className="text-xs font-bold text-primary block uppercase tracking-wider">Materia</span>
                                            <span className="font-semibold text-text-primary text-sm">{courseName}</span>
                                        </div>
                                    </div>

                                    <div className="prose prose-sm text-text-secondary">
                                        <p className="whitespace-pre-wrap">{cleanDescription(ev.description)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border shadow-sm">
                    <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <p className="text-text-secondary text-lg">No hay cronogramas informativos registrados con estos filtros.</p>
                </div>
            )}
        </div>
    );
};

export default PlanEvaluacionPage;