
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Type } from "@google/genai";
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { Evaluation, User } from '../../types';
import { SpinnerIcon, CameraIcon, XIcon, BeakerIcon } from '../../components/icons';

interface StudentSubmission {
    userId: number;
    userName: string;
    file: File | null;
    textSubmission: string;
    // Results
    aiGrade: number | null;
    aiFeedback: string;
    isProcessed: boolean;
    error?: string;
    isProcessing: boolean;
}

const AiEvaluationPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Context Data
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [students, setStudents] = useState<StudentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Step 1: Rubric / Answer Key
    const [rubricType, setRubricType] = useState<'file' | 'text'>('file');
    const [rubricFile, setRubricFile] = useState<File | null>(null);
    const [rubricText, setRubricText] = useState('');
    const rubricInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchContext = async () => {
            if (!evaluationId || !user?.schoolId) return;
            try {
                setLoading(true);
                const evalId = parseInt(evaluationId);
                const [evalData, studentList] = await Promise.all([
                    apiService.getEvaluationById(evalId, user.schoolId),
                    apiService.getStudentsForEvaluation(evalId)
                ]);
                
                setEvaluation(evalData);
                
                // Initialize student states
                setStudents(studentList.map(s => ({
                    userId: s.userID,
                    userName: s.userName,
                    file: null,
                    textSubmission: '',
                    aiGrade: null,
                    aiFeedback: '',
                    isProcessed: false,
                    isProcessing: false
                })).sort((a,b) => a.userName.localeCompare(b.userName)));

            } catch (err) {
                setError("Error cargando la evaluación.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchContext();
    }, [evaluationId, user]);

    // --- File Handlers ---

    const handleRubricFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setRubricFile(e.target.files[0]);
    };

    const handleStudentFile = (userId: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setStudents(prev => prev.map(s => s.userId === userId ? { ...s, file, isProcessed: false } : s));
        }
    };

    const handleStudentText = (userId: number, text: string) => {
        setStudents(prev => prev.map(s => s.userId === userId ? { ...s, textSubmission: text, isProcessed: false } : s));
    };

    // --- AI Logic ---

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: {
                data: await base64EncodedDataPromise,
                mimeType: file.type,
            },
        };
    };

    const evaluateStudent = async (studentIndex: number) => {
        const student = students[studentIndex];
        if ((!student.file && !student.textSubmission) || (!rubricFile && !rubricText)) {
            return; // Missing inputs
        }

        // Update UI to processing
        setStudents(prev => prev.map((s, i) => i === studentIndex ? { ...s, isProcessing: true, error: undefined } : s));

        try {
            // FIX: Updated model to gemini-3-flash-preview.
            const modelId = 'gemini-3-flash-preview';
            const contents: any[] = [];

            // 1. Add Rubric
            if (rubricType === 'file' && rubricFile) {
                contents.push({ text: "REFERENCIA / HOJA DE RESPUESTAS CORRECTAS (PATRÓN):" });
                contents.push(await fileToGenerativePart(rubricFile));
            } else {
                contents.push({ text: `REFERENCIA / CRITERIOS DE EVALUACIÓN:\n${rubricText}` });
            }

            // 2. Add Student Work
            contents.push({ text: "RESPUESTA DEL ESTUDIANTE A EVALUAR:" });
            if (student.file) {
                contents.push(await fileToGenerativePart(student.file));
            } else {
                contents.push({ text: student.textSubmission });
            }

            // 3. System Prompt
            const prompt = `
                Actúa como un profesor estricto pero justo. Tu tarea es calificar la respuesta del estudiante basándote ÚNICAMENTE en la Referencia/Patrón proporcionado.
                
                Detalles de la evaluación:
                - Título: ${evaluation?.title}
                - Descripción: ${evaluation?.description}
                - Escala de Nota: 0 a 20 puntos.
                
                Instrucciones:
                1. Compara la respuesta del estudiante con el patrón.
                2. Asigna una nota numérica (0-20). Sé preciso.
                3. Provee una justificación breve (feedback) explicando por qué obtuvo esa nota. Menciona aciertos y errores.
                
                Salida JSON obligatoria:
                {
                    "grade": number,
                    "justification": "string"
                }
            `;
            contents.push({ text: prompt });

            // Call API
            const response = await geminiService.generateContent({
                model: modelId,
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            grade: { type: Type.NUMBER },
                            justification: { type: Type.STRING }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            
            setStudents(prev => prev.map((s, i) => i === studentIndex ? {
                ...s,
                isProcessing: false,
                isProcessed: true,
                aiGrade: result.grade,
                aiFeedback: result.justification
            } : s));

        } catch (err: any) {
            console.error(err);
            setStudents(prev => prev.map((s, i) => i === studentIndex ? {
                ...s,
                isProcessing: false,
                error: "Error al evaluar. Intente nuevamente."
            } : s));
        }
    };

    const handleEvaluateAll = async () => {
        // Process one by one to avoid rate limits / UI freeze, or parallel if robust
        const toProcess = students.map((s, i) => ({ s, i })).filter(item => (item.s.file || item.s.textSubmission) && !item.s.isProcessed);
        
        for (const item of toProcess) {
            await evaluateStudent(item.i);
        }
    };

    const handleSaveGrades = async () => {
        if (!user?.schoolId || !evaluationId) return;
        const processed = students.filter(s => s.isProcessed && s.aiGrade !== null);
        if (processed.length === 0) return;

        if(!window.confirm(`¿Guardar notas para ${processed.length} estudiantes?`)) return;

        setLoading(true);
        try {
            const promises = processed.map(s => apiService.assignGrade({
                userID: s.userId,
                evaluationID: parseInt(evaluationId),
                courseID: evaluation!.courseID,
                schoolID: user.schoolId,
                gradeValue: s.aiGrade,
                gradeText: null,
                comments: s.aiFeedback
            }));
            
            await Promise.all(promises);
            navigate(`/evaluations/assign/${evaluationId}`);
        } catch (err) {
            setError("Error al guardar las notas en la base de datos.");
            setLoading(false);
        }
    };

    if (loading && !evaluation) return <div className="p-8">Cargando...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center">
                        <BeakerIcon className="w-8 h-8 mr-2 text-info" /> Evaluador IA
                    </h1>
                    <p className="text-secondary">Evaluación: {evaluation?.title}</p>
                </div>
                <Link to={`/evaluations/assign/${evaluationId}`} className="text-primary hover:underline">Volver a Asignación Manual</Link>
            </div>

            {error && <div className="bg-danger-light text-danger p-3 rounded mb-4">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Rubric Config */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface p-6 rounded-lg shadow-md border border-info/30">
                        <h2 className="text-lg font-bold mb-4 text-info-dark">1. Patrón de Respuestas / Rúbrica</h2>
                        <div className="flex mb-4 border-b border-border">
                            <button 
                                className={`flex-1 py-2 ${rubricType === 'file' ? 'border-b-2 border-primary font-bold' : 'text-secondary'}`}
                                onClick={() => setRubricType('file')}
                            >
                                Subir Archivo
                            </button>
                            <button 
                                className={`flex-1 py-2 ${rubricType === 'text' ? 'border-b-2 border-primary font-bold' : 'text-secondary'}`}
                                onClick={() => setRubricType('text')}
                            >
                                Escribir Texto
                            </button>
                        </div>

                        {rubricType === 'file' ? (
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-background transition"
                                onClick={() => rubricInputRef.current?.click()}
                            >
                                <input type="file" ref={rubricInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleRubricFile} />
                                {rubricFile ? (
                                    <div className="text-success font-bold truncate">{rubricFile.name}</div>
                                ) : (
                                    <div className="text-gray-400 text-sm">Click para subir (PDF/Imagen)</div>
                                )}
                            </div>
                        ) : (
                            <textarea 
                                className="w-full p-2 border rounded h-40 text-sm"
                                placeholder="Escribe aquí las respuestas correctas o criterios de evaluación..."
                                value={rubricText}
                                onChange={e => setRubricText(e.target.value)}
                            />
                        )}
                        <p className="text-xs text-secondary mt-2">Este documento servirá de base para que la IA califique a los estudiantes.</p>
                    </div>

                    <div className="bg-surface p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4">Acciones Globales</h2>
                        <button 
                            onClick={handleEvaluateAll}
                            className="w-full bg-accent text-text-on-accent py-3 rounded-lg font-bold hover:bg-accent/90 mb-4 flex justify-center items-center"
                            disabled={loading || (!rubricFile && !rubricText)}
                        >
                            <BeakerIcon className="w-5 h-5 mr-2" /> Evaluar Todos
                        </button>
                        
                        <button 
                            onClick={handleSaveGrades}
                            className="w-full bg-success text-text-on-primary py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50"
                            disabled={loading || students.filter(s => s.isProcessed).length === 0}
                        >
                            Guardar Notas ({students.filter(s => s.isProcessed).length})
                        </button>
                    </div>
                </div>

                {/* Right Column: Students */}
                <div className="lg:col-span-2">
                    <div className="bg-surface rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 bg-header text-text-on-primary font-bold flex justify-between">
                            <span>Estudiantes ({students.length})</span>
                            <span className="text-xs font-normal opacity-80">Suba el examen de cada alumno</span>
                        </div>
                        <div className="divide-y divide-border max-h-[800px] overflow-y-auto">
                            {students.map((student, index) => (
                                <div key={student.userId} className="p-4 hover:bg-background transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-lg">{student.userName}</div>
                                        <div className="flex items-center gap-2">
                                            {student.isProcessing && <span className="text-info text-xs flex items-center"><SpinnerIcon className="w-3 h-3 mr-1"/> Analizando...</span>}
                                            {student.isProcessed && <span className="text-success text-xs font-bold">Evaluado</span>}
                                            {student.error && <span className="text-danger text-xs">{student.error}</span>}
                                            
                                            <button 
                                                onClick={() => evaluateStudent(index)}
                                                disabled={student.isProcessing || (!student.file && !student.textSubmission)}
                                                className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-opacity-90 disabled:opacity-50"
                                            >
                                                Evaluar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Input Area */}
                                        <div className="border p-2 rounded bg-gray-50">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-bold text-secondary">Entrega del Estudiante</span>
                                                <div className="flex gap-2">
                                                    <label className="cursor-pointer text-xs text-info hover:underline">
                                                        Subir Archivo
                                                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleStudentFile(student.userId, e)} />
                                                    </label>
                                                </div>
                                            </div>
                                            {student.file ? (
                                                <div className="flex justify-between items-center bg-white p-1 border rounded text-sm">
                                                    <span className="truncate max-w-[150px]">{student.file.name}</span>
                                                    <button onClick={() => setStudents(prev => prev.map(s => s.userId === student.userId ? {...s, file: null} : s))} className="text-danger"><XIcon className="w-4 h-4"/></button>
                                                </div>
                                            ) : (
                                                <textarea 
                                                    className="w-full p-1 border rounded text-xs h-16"
                                                    placeholder="O pegar texto de la respuesta..."
                                                    value={student.textSubmission}
                                                    onChange={(e) => handleStudentText(student.userId, e.target.value)}
                                                />
                                            )}
                                        </div>

                                        {/* Result Area */}
                                        <div className={`border p-2 rounded relative ${student.isProcessed ? 'bg-success-light/20 border-success/30' : 'bg-gray-50 border-dashed'}`}>
                                            <span className="text-xs font-bold text-secondary absolute top-2 left-2">Resultado IA</span>
                                            {student.isProcessed ? (
                                                <div className="mt-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-bold">Nota:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 p-1 border rounded text-right font-bold text-primary"
                                                            value={student.aiGrade ?? ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setStudents(prev => prev.map(s => s.userId === student.userId ? {...s, aiGrade: isNaN(val) ? null : val} : s));
                                                            }}
                                                        />
                                                    </div>
                                                    <textarea 
                                                        className="w-full p-1 border rounded text-xs h-12"
                                                        value={student.aiFeedback}
                                                        onChange={(e) => setStudents(prev => prev.map(s => s.userId === student.userId ? {...s, aiFeedback: e.target.value} : s))}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                                                    Esperando evaluación...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiEvaluationPage;
