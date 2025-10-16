import React, { useEffect, useState } from 'react';
import { StudentGradesVM, User, Lapso } from '../../types';
import { apiService } from '../../services/apiService';
import Modal from '../../components/Modal';
import { useAuth } from '../../hooks/useAuth';

interface StudentGradesModalProps {
    student: User;
    classroomId: number;
    onClose: () => void;
}

const StudentGradesModal: React.FC<StudentGradesModalProps> = ({ student, classroomId, onClose }) => {
    const { user: authUser } = useAuth();
    const [gradesData, setGradesData] = useState<StudentGradesVM | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedLapsoId, setSelectedLapsoId] = useState<number | null>(null);
    const [overallAvg, setOverallAvg] = useState<string>('—');
    const [lapsoAvg, setLapsoAvg] = useState<string>('—');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    useEffect(() => {
        if (!authUser?.schoolId) return;

        // Fetch initial data: lapsos to populate the dropdown
        apiService.getLapsos(authUser.schoolId).then(lapsos => {
            if (lapsos.length > 0) {
                const initialLapsoId = lapsos[0].lapsoID;
                setSelectedLapsoId(initialLapsoId);
            } else {
                setLoading(false);
            }
        }).catch(() => setError('No se pudieron cargar los lapsos.'));
        
        // Fetch overall average
        apiService.getStudentOverallAverage(student.userID, authUser.schoolId).then(res => {
            setOverallAvg(res.overallAverage?.toFixed(2) ?? '—');
        }).catch(() => setOverallAvg('—'));

    }, [student, authUser]);

    useEffect(() => {
        if (selectedLapsoId === null || !authUser?.schoolId) return;
        
        setLoading(true);
        // Fetch grades for the selected lapso
        apiService.getStudentGradesByLapso(student.userID, student.userName, selectedLapsoId, authUser.schoolId)
            .then(setGradesData)
            .catch(() => {
                setError('No se pudieron cargar las notas.');
                setGradesData(null);
            })
            .finally(() => setLoading(false));

        // Fetch average for the selected lapso
        apiService.getStudentLapsoAverage(student.userID, selectedLapsoId, authUser.schoolId).then(res => {
             setLapsoAvg(res.averageGrade?.toFixed(2) ?? '—');
        }).catch(() => setLapsoAvg('—'));

    }, [student, selectedLapsoId, authUser]);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Notas por Lapso — ${student.userName}`}>
             <div className="bg-surface p-3 rounded-md shadow-sm border flex justify-between items-center mb-4">
                <div className="font-bold">Promedio general: <span className="ml-2 text-info-dark">{overallAvg}</span></div>
                <button className="bg-success text-on-primary text-sm py-1 px-3 rounded hover:bg-opacity-80" title="Funcionalidad no implementada">
                    Imprimir boleta (PDF)
                </button>
            </div>
            
            {error && <p className="text-danger mb-4">{error}</p>}

            <div className="bg-background p-3 rounded-md shadow-sm border mb-4">
                <div className="flex flex-wrap items-center gap-4">
                    <label htmlFor="lapsoSelect" className="font-bold">Lapso:</label>
                    <select
                        id="lapsoSelect"
                        value={selectedLapsoId || ''}
                        onChange={e => setSelectedLapsoId(Number(e.target.value))}
                        className="form-select border-border rounded-md shadow-sm"
                        disabled={!gradesData?.lapsos}
                    >
                        {(gradesData?.lapsos ?? []).map(l => (
                            <option key={l.lapsoID} value={l.lapsoID}>
                                {l.nombre} ({new Date(l.fechaInicio).toLocaleDateString()} - {new Date(l.fechaFin).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                    <span className="bg-info-light text-info-text text-sm font-semibold px-2.5 py-0.5 rounded">
                        Promedio del lapso: <span className="font-bold">{lapsoAvg}</span>
                    </span>
                </div>
            </div>

            {loading && <p>Cargando notas...</p>}
            
            {!loading && !error && gradesData?.groups && gradesData.groups.length > 0 ? (
                <div className="space-y-2">
                    {gradesData.groups.map((group, idx) => {
                        const collapseId = `collapse_${idx}`;
                        return (
                             <div key={idx} className="border border-border rounded-md">
                                <h2>
                                    <button 
                                        type="button" 
                                        className="flex items-center justify-between w-full p-3 font-medium text-left text-text-primary bg-background hover:bg-border"
                                        onClick={() => toggleAccordion(collapseId)}
                                    >
                                        <span>
                                            {group.courseName}
                                            <span className="ml-2 bg-info text-on-primary text-xs font-bold px-2 py-1 rounded-full">{group.items.length}</span>
                                        </span>
                                        <svg className={`w-6 h-6 shrink-0 transition-transform ${openAccordion === collapseId ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                                    </button>
                                </h2>
                                {openAccordion === collapseId && (
                                     <div className="p-3 border-t border-border">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-border">
                                                <thead className="bg-background">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Evaluación</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Nota</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Fecha</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Comentarios</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-surface divide-y divide-border">
                                                    {group.items.map((item, itemIdx) => (
                                                        <tr key={itemIdx}>
                                                            <td className="px-4 py-2 whitespace-nowrap">{item.evaluacion}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap">{item.displayGrade}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString() : '—'}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap">{item.comments || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : !loading && (
                <div className="bg-info-light text-info-dark p-4 rounded">No hay notas registradas en este lapso para el estudiante.</div>
            )}
            
            <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default StudentGradesModal;