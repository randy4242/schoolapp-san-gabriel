
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { StudentGradesVM, Lapso, Child } from '../../types';
import { DocumentTextIcon, UserCircleIcon } from '../../components/icons';

const MyGradesPage: React.FC = () => {
    const { user } = useAuth();
    const [gradesData, setGradesData] = useState<StudentGradesVM | null>(null);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [children, setChildren] = useState<Child[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
    const [selectedLapsoId, setSelectedLapsoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [averageScore, setAverageScore] = useState<string>('—');

    const isParent = user && [3, 11].includes(user.roleId);
    const isStudent = user && user.roleId === 1;

    // 1. Fetch Initial Data (Lapsos and Children if parent)
    useEffect(() => {
        const init = async () => {
            if (!user?.schoolId) return;
            setLoading(true);
            try {
                const lapsosData = await apiService.getLapsos(user.schoolId);
                setLapsos(lapsosData);
                
                if (lapsosData.length > 0) {
                    setSelectedLapsoId(lapsosData[lapsosData.length - 1].lapsoID); 
                }

                if (isParent) {
                    const childrenData = await apiService.getChildrenOfParent(user.userId, user.schoolId);
                    setChildren(childrenData);
                    if (childrenData.length > 0) {
                        setSelectedChildId(childrenData[0].userID);
                    }
                } else if (isStudent) {
                    setSelectedChildId(user.userId);
                }

            } catch (err: any) {
                console.error("Initialization error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user, isParent, isStudent]);

    // 2. Fetch Grades when Lapso or Student changes
    useEffect(() => {
        const fetchGrades = async () => {
            if (!user?.schoolId || !selectedLapsoId || !selectedChildId) return;
            
            setLoading(true);
            setError('');
            try {
                const studentName = isParent 
                    ? children.find(c => c.userID === selectedChildId)?.userName || 'Estudiante'
                    : user.userName;

                // Fetch Grades List
                const data = await apiService.getStudentGradesByLapso(
                    selectedChildId, 
                    studentName, 
                    selectedLapsoId, 
                    user.schoolId
                );
                
                if (data && data.groups) {
                    setGradesData(data);
                    // Abrir automáticamente el primer grupo si solo hay uno
                    if (data.groups.length === 1) setOpenAccordion('group-0');
                } else {
                    setGradesData(null);
                }

                // Fetch Average for this specific lapso
                try {
                    const avgData = await apiService.getStudentLapsoAverage(selectedChildId, selectedLapsoId, user.schoolId);
                    setAverageScore(avgData.averageGrade ? avgData.averageGrade.toFixed(2) : '—');
                } catch (e) {
                    setAverageScore('—');
                }
                
            } catch (err: any) {
                // Si falla por 404, el apiService ya devuelve algo que no lanza error, 
                // pero si hay un error real de red, lo capturamos aquí.
                console.error("Error loading grades:", err);
                setGradesData(null);
                setAverageScore('—');
            } finally {
                setLoading(false);
            }
        };

        fetchGrades();
    }, [selectedLapsoId, selectedChildId, user, isParent, children]);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    if (!isStudent && !isParent) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-text-primary mb-4">Calificaciones</h1>
                <p className="text-text-secondary">Esta vista está disponible solo para Estudiantes y Representantes.</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6 flex items-center">
                <DocumentTextIcon className="mr-3 w-8 h-8 text-primary" />
                Calificaciones
            </h1>

            <div className="bg-surface p-4 rounded-lg shadow-md border border-border mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {isParent && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Estudiante</label>
                        <div className="relative">
                            <select
                                value={selectedChildId || ''}
                                onChange={(e) => setSelectedChildId(Number(e.target.value))}
                                className="w-full p-2 pl-8 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                            >
                                {children.length === 0 && <option value="">No hay hijos asociados</option>}
                                {children.map(child => (
                                    <option key={child.userID} value={child.userID}>{child.userName}</option>
                                ))}
                            </select>
                            <UserCircleIcon className="w-5 h-5 text-text-tertiary absolute left-2 top-2.5 pointer-events-none" />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Lapso Académico</label>
                    <select
                        value={selectedLapsoId || ''}
                        onChange={(e) => setSelectedLapsoId(Number(e.target.value))}
                        className="w-full p-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        {lapsos.length === 0 && <option value="">No hay lapsos configurados</option>}
                        {lapsos.map(lapso => (
                            <option key={lapso.lapsoID} value={lapso.lapsoID}>{lapso.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-primary/5 p-2 rounded border border-primary/20 flex flex-col justify-center items-center h-full min-h-[60px]">
                    <span className="text-xs text-primary font-bold uppercase tracking-wider">Promedio Lapso</span>
                    <span className="text-2xl font-bold text-primary">{averageScore}</span>
                </div>
            </div>

            {error && <div className="bg-danger-light text-danger p-4 rounded-lg mb-4">{error}</div>}
            
            {loading ? (
                <div className="flex flex-col items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="mt-4 text-text-secondary">Cargando calificaciones...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {!gradesData || gradesData.groups.length === 0 ? (
                        <div className="text-center py-12 bg-surface rounded-lg border border-dashed border-border">
                            <p className="text-text-secondary">No se encontraron calificaciones registradas para el estudiante en este lapso.</p>
                        </div>
                    ) : (
                        gradesData.groups.map((group, idx) => {
                            const isOpen = openAccordion === `group-${idx}`;
                            const validGrades = group.items.filter(i => i.gradeValue !== null).map(i => i.gradeValue as number);
                            const subjectAvg = validGrades.length > 0 
                                ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(2) 
                                : '';

                            return (
                                <div key={idx} className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
                                    <button 
                                        onClick={() => toggleAccordion(`group-${idx}`)}
                                        className="w-full flex justify-between items-center p-4 bg-surface hover:bg-background transition-colors text-left"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                                            <span className="font-bold text-lg text-primary">{group.courseName}</span>
                                            {subjectAvg && <span className="text-xs bg-success-light text-success-text px-2 py-0.5 rounded-full font-bold">Prom: {subjectAvg}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="bg-info-light text-info-text text-xs font-bold px-2 py-1 rounded-full">
                                                {group.items.length} Eval.
                                            </span>
                                            <svg className={`w-5 h-5 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="border-t border-border">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-border">
                                                    <thead className="bg-header-light bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Evaluación</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
                                                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Nota</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Comentarios</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-surface divide-y divide-border">
                                                        {group.items.map((item, itemIdx) => (
                                                            <tr key={itemIdx} className="hover:bg-background/50">
                                                                <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.evaluacion}</td>
                                                                <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                                                                    {item.date ? new Date(item.date).toLocaleDateString('es-ES') : '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-center font-bold text-primary">
                                                                    {item.displayGrade}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-text-secondary italic">
                                                                    {item.comments || '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default MyGradesPage;
