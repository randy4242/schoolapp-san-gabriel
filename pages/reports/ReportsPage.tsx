import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { User, ReportData, Classroom, Lapso, ResumenFinalPrimariaReportData, ResumenFinalPrimariaStudent, ResumenFinalPrimariaResultado } from '../../types';

const ReportPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState<User[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    
    const [reportType, setReportType] = useState('certificado');
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [selectedClassroom, setSelectedClassroom] = useState<string>('');
    const [selectedLapsos, setSelectedLapsos] = useState<Set<number>>(new Set());
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getStudents(user.schoolId),
                apiService.getClassrooms(user.schoolId),
                apiService.getLapsos(user.schoolId)
            ]).then(([studentData, classroomData, lapsoData]) => {
                setStudents(studentData);
                setClassrooms(classroomData);
                setLapsos(lapsoData);
                setError('');
            }).catch(() => {
                setError('No se pudo cargar la lista de estudiantes, salones o lapsos.');
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [user]);

    const handleLapsoSelection = (lapsoId: number) => {
        setSelectedLapsos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lapsoId)) {
                newSet.delete(lapsoId);
            } else {
                newSet.add(lapsoId);
            }
            return newSet;
        });
    };

    const generateCertificadoMockData = (student: User): ReportData => {
        const grades = [
            { year: 1, area: 'Castellano', gradeNumber: '18', gradeLiteral: 'DIECIOCHO', type: 'T', date: 'Jul 2020', institution: '1' },
            { year: 2, area: 'Castellano', gradeNumber: '17', gradeLiteral: 'DIECISIETE', type: 'T', date: 'Jul 2021', institution: '1' },
            { year: 3, area: 'Física', gradeNumber: '19', gradeLiteral: 'DIECINUEVE', type: 'T', date: 'Jul 2022', institution: '1' },
        ];
        
        const nameParts = student.userName.split(' ');
        const lastName = nameParts.slice(0, 2).join(' ');
        const firstName = nameParts.slice(2).join(' ');

        return {
            issuePlaceDate: `Carabobo, ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
            school: { code: 'S1934D0810', name: 'Colegio San Gabriel Arcángel', address: 'AV. SALVADOR FEO LA CRUZ SECTOR MAÑONGO', municipality: 'NAGUANAGUA', state: 'CARABOBO', phone: '0241-8426475', cdcee: 'CARABOBO' },
            student: { cedula: student.cedula, lastName, firstName, birthDate: '07 DE SEPTIEMBRE DE 2013', birthPlace: 'País: VENEZUELA, Estado: CARABOBO, Municipio: VALENCIA' },
            director: { name: 'MENDOZA CARRILLO, PEDRO ANGEL', cedula: 'V-11351158' },
            grades,
        };
    };
    
    const generateResumenPrimariaMockData = (classroom: Classroom): ResumenFinalPrimariaReportData => {
        const resultados: ResumenFinalPrimariaResultado[] = ['A', 'B', 'C', 'D', 'E', 'P'];
        const studentList = students.filter(s => s.roleID === 1).slice(0, 20).map((s, i): ResumenFinalPrimariaStudent => ({
            nro: i + 1,
            cedula: s.cedula,
            fullName: s.userName.toUpperCase(),
            birthPlace: 'VALENCIA', ef: 'CA', sex: i % 2 === 0 ? 'M' : 'F',
            birthDay: '15', birthMonth: '03', birthYear: '2015',
            resultado: resultados[Math.floor(Math.random() * resultados.length)],
        }));
        const totals = studentList.reduce((acc, student) => { acc[student.resultado]++; return acc; }, { A: 0, B: 0, C: 0, D: 0, E: 0, P: 0 });
        return {
            schoolYear: '2023-2024', evaluationMonthYear: 'JULIO 2024', evaluationType: 'FINAL',
            school: { code: 'S1934D0810', name: 'Colegio San Gabriel Arcángel', address: 'AV. SALVADOR FEO LA CRUZ SECTOR MAÑONGO', phone: '0241-8426475', municipality: 'NAGUANAGUA', state: 'CARABOBO', dtoEsc: '10', cdcee: 'CARABOBO' },
            course: { grade: classroom.name.split(' ')[0] || '1ER GRADO', section: classroom.name.slice(-1) || 'A', studentsInSection: 25, studentsOnPage: studentList.length },
            students: studentList, totals: totals, teacher: { fullName: 'GOMEZ, ISABEL', cedula: 'V-98765432' },
            director: { name: 'MENDOZA CARRILLO, PEDRO ANGEL', cedula: 'V-11351158' },
            observations: `1 Lugar de nacimiento: ${studentList[0]?.birthPlace || 'VALENCIA'}`
        };
    };

    const handleGenerateReport = async () => {
        setGenerating(true);
        setError('');

        try {
            if (reportType === 'certificado') {
                if (!selectedStudent) throw new Error("Por favor, seleccione un estudiante.");
                const student = students.find(s => s.userID === parseInt(selectedStudent, 10));
                if (student) {
                    const data = generateCertificadoMockData(student);
                    navigate('/report-viewer', { state: { reportData: data, reportType: 'certificado' } });
                }
            } else if (reportType === 'resumen') {
                if (!selectedClassroom || selectedLapsos.size === 0) throw new Error("Por favor, seleccione un salón y al menos un lapso.");
                const classroom = classrooms.find(c => c.classroomID === parseInt(selectedClassroom, 10));
                if (classroom && user?.schoolId) {
                    const data = await apiService.getEmgClassroomReport(classroom.classroomID, user.schoolId, Array.from(selectedLapsos));
                    navigate('/report-viewer', { state: { reportData: data, reportType: 'resumen', classroom: classroom } });
                }
            } else if (reportType === 'resumen_primaria') {
                if (!selectedClassroom) throw new Error("Por favor, seleccione un salón.");
                const classroom = classrooms.find(c => c.classroomID === parseInt(selectedClassroom, 10));
                if (classroom) {
                    const data = generateResumenPrimariaMockData(classroom);
                    navigate('/report-viewer', { state: { reportData: data, reportType: 'resumen_primaria' } });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al generar el reporte.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Generación de Reportes</h1>

            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}

            <div className="space-y-6">
                <div>
                    <label htmlFor="report-type-select" className="block text-sm font-medium text-text-primary mb-2">Tipo de Reporte</label>
                    <select id="report-type-select" value={reportType} onChange={(e) => setReportType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-border bg-surface rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                        <option value="certificado">Certificado de Calificaciones (Individual)</option>
                        <option value="resumen">Resumen Final del Rendimiento (Salón)</option>
                        <option value="resumen_primaria">Resumen Final (Primaria)</option>
                    </select>
                </div>

                {reportType === 'certificado' && (
                    <div>
                        <label htmlFor="student-select" className="block text-sm font-medium text-text-primary mb-2">Seleccione un estudiante</label>
                        <select id="student-select" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} disabled={loading || generating} className="mt-1 block w-full px-3 py-2 border border-border bg-surface rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background">
                            <option value="">{loading ? 'Cargando...' : '--- Seleccione un estudiante ---'}</option>
                            {students.map(s => <option key={s.userID} value={s.userID}>{s.userName} - CI: {s.cedula}</option>)}
                        </select>
                    </div>
                )}

                {(reportType === 'resumen' || reportType === 'resumen_primaria') && (
                    <div>
                        <label htmlFor="classroom-select" className="block text-sm font-medium text-text-primary mb-2">Seleccione un Salón</label>
                        <select id="classroom-select" value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} disabled={loading || generating} className="mt-1 block w-full px-3 py-2 border border-border bg-surface rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background">
                            <option value="">{loading ? 'Cargando...' : '--- Seleccione un salón ---'}</option>
                            {classrooms.map(c => <option key={c.classroomID} value={c.classroomID}>{c.name}</option>)}
                        </select>
                    </div>
                )}
                
                {reportType === 'resumen' && (
                    <div className="border p-4 rounded-md">
                        <label className="block text-sm font-medium text-text-primary mb-2">Seleccione Lapsos</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {lapsos.map(lapso => (
                                <label key={lapso.lapsoID} className="flex items-center space-x-2 p-2 rounded-md hover:bg-background cursor-pointer">
                                    <input type="checkbox" checked={selectedLapsos.has(lapso.lapsoID)} onChange={() => handleLapsoSelection(lapso.lapsoID)} className="h-4 w-4 rounded border-border text-primary focus:ring-accent"/>
                                    <span>{lapso.nombre}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}


                <div className="text-center pt-4">
                    <button onClick={handleGenerateReport} disabled={generating || loading || (reportType === 'certificado' && !selectedStudent) || ((reportType === 'resumen' || reportType === 'resumen_primaria') && !selectedClassroom) || (reportType === 'resumen' && selectedLapsos.size === 0)} className="bg-primary text-text-on-primary py-2 px-6 rounded hover:bg-opacity-80 disabled:bg-secondary disabled:cursor-not-allowed transition-colors text-lg">
                        {generating ? 'Generando...' : 'Ver Reporte para Imprimir'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportPage;