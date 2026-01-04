
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, User, Grade } from '../../types';
import Modal from '../../components/Modal';
import { CameraIcon, EyeIcon, SpinnerIcon, ClipboardCheckIcon, XIcon, PlusIcon, BeakerIcon } from '../../components/icons';

// --- Helper Components & Functions ---

const ImagePreviewModal: React.FC<{
    imageUrl: string;
    studentName: string;
    onClose: () => void;
}> = ({ imageUrl, studentName, onClose }) => {
    
    useEffect(() => {
        return () => {
            if (imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
        }
    }, [imageUrl]);
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Imagen de Evaluación - ${studentName}`}>
            <img src={imageUrl} alt={`Evidencia para ${studentName}`} className="max-w-full max-h-[70vh] mx-auto" />
            <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};


type FormValues = {
  grades: {
    gradeID: number | null;
    userID: number;
    userName: string;
    gradeValue: string;
    gradeText: string;
    comments: string;
    hasGrade: boolean;
    hasImage: boolean;
  }[];
};

interface PotentialMatch {
    extractedName: string;
    targetIndex: number;
    targetName: string;
    gradeValue: number | null;
    gradeText: string | null;
}

const AssignGradesPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [gradeMode, setGradeMode] = useState<'numeric' | 'text' | 'both'>('both');
    const [viewingImage, setViewingImage] = useState<{ imageUrl: string; studentName: string } | null>(null);
    const [isUploading, setIsUploading] = useState<number | null>(null);

    // AI Import States
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [aiError, setAiError] = useState('');
    
    // AI Input States
    const [aiTab, setAiTab] = useState<'files' | 'text'>('files');
    const [aiFiles, setAiFiles] = useState<File[]>([]);
    const [aiText, setAiText] = useState('');
    
    // New AI States for UI feedback
    const [aiWarnings, setAiWarnings] = useState<string[]>([]);
    const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { control, handleSubmit, setValue, getValues } = useForm<FormValues>({
        defaultValues: {
            grades: []
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "grades"
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!evaluationId || !user?.schoolId) return;
            try {
                setLoading(true);
                const evalId = parseInt(evaluationId);
                
                // 1. Fetch Evaluation first
                const evalData = await apiService.getEvaluationById(evalId, user.schoolId);
                setEvaluation(evalData);

                // Robustness: Resolve Classroom ID
                // If evaluation doesn't have it, try to get it from the Course
                let targetClassroomId = evalData.classroomID;
                if (!targetClassroomId && evalData.courseID) {
                    try {
                        const courseData = await apiService.getCourseById(evalData.courseID, user.schoolId);
                        if (courseData.classroomID) {
                            targetClassroomId = courseData.classroomID;
                        }
                    } catch (e) {
                        console.warn("Could not fetch course details for fallback classroom ID");
                    }
                }

                // 2. Fetch Students with Fallback
                let studentData: User[] = [];
                try {
                    studentData = await apiService.getStudentsForEvaluation(evalId);
                } catch (err: any) {
                    // Ignore 404 from primary fetch if we have a fallback
                    console.warn("Primary student fetch failed, trying fallback...", err.message);
                    
                    if (targetClassroomId) {
                        try {
                            studentData = await apiService.getStudentsByClassroom(targetClassroomId, user.schoolId);
                        } catch (fallbackErr: any) {
                             if (fallbackErr.message && (fallbackErr.message.includes("No se encontraron") || fallbackErr.message.includes("Not Found"))) {
                                studentData = [];
                            } else {
                                throw new Error(fallbackErr.message || "No se pudieron cargar los estudiantes del salón.");
                            }
                        }
                    } else {
                        if (err.message && (err.message.includes("No se encontraron") || err.message.includes("Not Found"))) {
                            studentData = [];
                        } else {
                            throw err;
                        }
                    }
                }

                // 3. Fetch Grades
                const gradeData = await apiService.getGradesForEvaluation(evalId, user.schoolId).catch(() => []);
                
                let classroomName = '';
                if (targetClassroomId) {
                    try {
                        const classroomData = await apiService.getClassroomById(targetClassroomId, user.schoolId);
                        classroomName = classroomData.name.toLowerCase();
                    } catch (e) { console.warn("Could not fetch classroom name", e); }
                }
                
                if (classroomName.includes('año')) setGradeMode('numeric');
                else if (classroomName.includes('grado')) setGradeMode('text');
                else setGradeMode('both');
                
                studentData.sort((a, b) => a.userName.localeCompare(b.userName));
                
                const gradeMap = new Map<number, Grade>();
                gradeData.forEach(g => gradeMap.set(g.userID, g));

                const studentGradeData = studentData.map(student => {
                    const existingGrade = gradeMap.get(student.userID);
                    return {
                        gradeID: existingGrade?.gradeID ?? null,
                        userID: student.userID,
                        userName: student.userName,
                        gradeValue: existingGrade?.gradeValue?.toString() ?? '',
                        gradeText: existingGrade?.gradeText ?? '',
                        comments: existingGrade?.comments ?? '',
                        hasGrade: !!existingGrade,
                        hasImage: existingGrade?.hasImage ?? false,
                    };
                });
                
                replace(studentGradeData);

            } catch (err: any) {
                setError(err.message || 'No se pudo cargar la información para asignar notas.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [evaluationId, user, replace]);
    
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

    const readExcelFile = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    resolve(`--- CONTENIDO DEL ARCHIVO: ${file.name} ---\n${csv}\n--- FIN DEL ARCHIVO ---`);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAiFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setAiFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleAiAnalyze = async () => {
        if (aiTab === 'files' && aiFiles.length === 0) {
            setAiError("Por favor, seleccione al menos un archivo.");
            return;
        }
        if (aiTab === 'text' && !aiText.trim()) {
            setAiError("Por favor, ingrese el texto a analizar.");
            return;
        }

        setAiAnalyzing(true);
        setAiError('');
        setAiWarnings([]);
        setPotentialMatches([]);

        try {
            // FIX: Updated model to gemini-3-flash-preview.
            const modelId = 'gemini-3-flash-preview';
            const promptParts: any[] = [];
            
            // 1. Build Prompt Parts
            let textContext = "";

            if (aiTab === 'files') {
                for (const file of aiFiles) {
                    const isSpreadsheet = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
                    if (isSpreadsheet) {
                        const csvData = await readExcelFile(file);
                        promptParts.push({ text: csvData });
                    } else {
                        // Image / PDF
                        const imagePart = await fileToGenerativePart(file);
                        promptParts.push(imagePart);
                    }
                }
                textContext = "Analiza los documentos adjuntos (imágenes o datos de hojas de cálculo).";
            } else {
                // Text Mode
                promptParts.push({ text: `TEXTO PROPORCIONADO POR EL USUARIO:\n${aiText}` });
                textContext = "Analiza el texto proporcionado.";
            }

            const systemPrompt = `
                ${textContext}
                Contexto: Estás extrayendo notas para una evaluación escolar.
                
                Extrae una lista de estudiantes con sus notas. Devuelve un JSON ARRAY.
                
                Campos por objeto:
                - studentName: Nombre completo del estudiante (string).
                - gradeValue: Nota numérica (number). Si no hay, null.
                - gradeText: Nota literal (string, ejemplo: A, B, C). Si no hay, null.

                Instrucciones:
                1. Si la nota es solo texto (A, B, C...), ponla en gradeText.
                2. Si la nota es un número (0-20), ponla en gradeValue.
                3. NO INVENTES DATOS.
                4. Si hay múltiples archivos o secciones, combina todos los resultados en una sola lista.
            `;

            // Prepend system prompt
            promptParts.unshift({ text: systemPrompt });

            const response = await geminiService.generateContent({
                model: modelId,
                contents: promptParts,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                studentName: { type: Type.STRING },
                                gradeValue: { type: Type.NUMBER },
                                gradeText: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("No se obtuvo respuesta de la IA.");
            
            const extractedData: { studentName: string, gradeValue: number | null, gradeText: string | null }[] = JSON.parse(jsonText);
            
            // --- Advanced Matching Logic ---
            // Tokenize: split string into words, remove accents, lowercase
            const tokenize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1); 
            
            const currentFields = getValues('grades');
            const notFoundNames: string[] = [];
            const matchesToConfirm: PotentialMatch[] = [];

            extractedData.forEach(extracted => {
                const extractedTokens = tokenize(extracted.studentName);
                
                let bestMatchIndex = -1;
                let maxScore = 0;

                currentFields.forEach((field, index) => {
                    const fieldTokens = tokenize(field.userName);
                    // Calculate intersection count
                    const intersection = extractedTokens.filter(token => fieldTokens.includes(token));
                    const score = intersection.length / Math.max(extractedTokens.length, 1); 

                    if (score > maxScore) {
                        maxScore = score;
                        bestMatchIndex = index;
                    }
                });

                const roundedGradeValue = extracted.gradeValue !== null ? Math.round(extracted.gradeValue) : null;

                // Thresholds logic
                if (maxScore === 1 && bestMatchIndex !== -1) {
                    // Perfect match
                    if (roundedGradeValue !== null) setValue(`grades.${bestMatchIndex}.gradeValue`, String(roundedGradeValue));
                    if (extracted.gradeText !== null) setValue(`grades.${bestMatchIndex}.gradeText`, extracted.gradeText);
                    setValue(`grades.${bestMatchIndex}.comments`, "");
                } else if (maxScore >= 0.5 && bestMatchIndex !== -1) {
                    // Partial match
                    matchesToConfirm.push({
                        extractedName: extracted.studentName,
                        targetIndex: bestMatchIndex,
                        targetName: currentFields[bestMatchIndex].userName,
                        gradeValue: roundedGradeValue,
                        gradeText: extracted.gradeText
                    });
                } else {
                    // No reliable match
                    notFoundNames.push(extracted.studentName);
                }
            });

            setPotentialMatches(matchesToConfirm);
            setAiWarnings(notFoundNames);
            setIsAiModalOpen(false); // Close modal to show results on page

        } catch (err: any) {
            console.error("AI Error:", err);
            setAiError("Error al analizar. Asegúrate de que los archivos/texto sean legibles.");
        } finally {
            setAiAnalyzing(false);
        }
    };

    const confirmMatch = (match: PotentialMatch, idxInState: number) => {
        // Apply the grade
        if (match.gradeValue !== null) setValue(`grades.${match.targetIndex}.gradeValue`, String(match.gradeValue));
        if (match.gradeText !== null) setValue(`grades.${match.targetIndex}.gradeText`, match.gradeText);
        setValue(`grades.${match.targetIndex}.comments`, ""); // Reset comments

        // Remove from potential matches
        setPotentialMatches(prev => prev.filter((_, i) => i !== idxInState));
    };

    const discardMatch = (idxInState: number) => {
        setPotentialMatches(prev => prev.filter((_, i) => i !== idxInState));
    };

    const discardAllMatches = () => {
        setPotentialMatches([]);
    };

    const clearWarnings = () => {
        setAiWarnings([]);
    };

    // --- Standard Handlers ---

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0];
        const grade = fields[index];
        if (!file || !user || !evaluationId || !evaluation) return;
    
        setIsUploading(grade.userID);
        setError('');
        
        try {
            let gradeIdToUse = grade.gradeID;
    
            if (!gradeIdToUse) {
                const currentGradeData = getValues(`grades.${index}`);
                
                await apiService.assignGrade({
                    userID: currentGradeData.userID,
                    evaluationID: parseInt(evaluationId),
                    courseID: evaluation.courseID,
                    schoolID: user.schoolId,
                    gradeValue: currentGradeData.gradeValue ? parseFloat(currentGradeData.gradeValue) : null,
                    gradeText: currentGradeData.gradeText || null,
                    comments: currentGradeData.comments || null,
                });
                
                const updatedGrades = await apiService.getGradesForEvaluation(parseInt(evaluationId), user.schoolId);
                const newGrade = updatedGrades.find(g => g.userID === grade.userID);
    
                if (newGrade && newGrade.gradeID) {
                    gradeIdToUse = newGrade.gradeID;
                    setValue(`grades.${index}.gradeID`, newGrade.gradeID);
                    setValue(`grades.${index}.hasGrade`, true);
                } else {
                    throw new Error("No se pudo guardar la nota para obtener un ID.");
                }
            }
            
            await apiService.uploadGradeImageFile(gradeIdToUse, file);
            setValue(`grades.${index}.hasImage`, true);
    
        } catch (err: any) {
            setError(err.message || "Error al subir la imagen.");
        } finally {
            setIsUploading(null);
            if (event.target) event.target.value = '';
        }
    };
    
    const handleViewImage = async (index: number) => {
        const grade = fields[index];
        if (grade.gradeID) {
            setIsUploading(grade.userID);
            try {
                const imageUrl = `${apiService.getBaseUrl()}api/grades/${grade.gradeID}/image/file`;
                const response = await fetch(imageUrl, { headers: apiService.getAuthHeaders() });
                if (!response.ok) throw new Error("Imagen no encontrada.");
                
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setViewingImage({
                    imageUrl: objectUrl,
                    studentName: grade.userName
                });
            } catch (e: any) {
                setError(e.message || "No se pudo cargar la imagen.");
            } finally {
                 setIsUploading(null);
            }
        }
    };

    // Keyboard Navigation Logic
    const handleKeyDown = (e: React.KeyboardEvent, index: number, type: 'value' | 'text' | 'comment') => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            const nextIndex = index + 1;
            const nextInputId = `grade-${type}-${nextIndex}`;
            const nextElement = document.getElementById(nextInputId);
            if (nextElement) {
                nextElement.focus();
            }
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!evaluationId || !user?.schoolId || !evaluation) {
            setError('Error de configuración.');
            return;
        }

        setSaving(true);
        setError('');

        const promises = data.grades.map(grade => {
            if (grade.gradeValue || grade.gradeText || grade.comments) {
                return apiService.assignGrade({
                    userID: grade.userID,
                    evaluationID: parseInt(evaluationId),
                    courseID: evaluation.courseID,
                    schoolID: user.schoolId,
                    gradeValue: grade.gradeValue ? parseFloat(grade.gradeValue) : null,
                    gradeText: grade.gradeText || null,
                    comments: grade.comments || null,
                });
            }
            return Promise.resolve();
        });

        try {
            await Promise.all(promises);
            navigate('/evaluations');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar las notas.');
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) return <p>Cargando estudiantes y notas...</p>;
    if (error) return <p className="text-danger bg-danger-light p-2 rounded">{error}</p>;

    return (
        <div className="bg-surface p-8 rounded-lg shadow-md">
            {viewingImage && (
                <ImagePreviewModal
                    imageUrl={viewingImage.imageUrl}
                    studentName={viewingImage.studentName}
                    onClose={() => setViewingImage(null)}
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary mb-1">Asignar Notas</h1>
                    <h2 className="text-lg text-secondary">
                        Evaluación: <span className="font-semibold text-info-dark">{evaluation?.title}</span>
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => setIsAiModalOpen(true)}
                        className="bg-accent text-text-on-accent px-4 py-2 rounded-md hover:bg-accent/90 flex items-center gap-2 font-semibold shadow-sm"
                    >
                        <ClipboardCheckIcon /> Importar con IA
                    </button>
                    <button 
                        type="button"
                        onClick={() => navigate(`/evaluations/evaluate-ai/${evaluationId}`)}
                        className="bg-info text-white px-4 py-2 rounded-md hover:bg-info-dark flex items-center gap-2 font-semibold shadow-sm"
                    >
                        <BeakerIcon /> Evaluar con IA
                    </button>
                </div>
            </div>

            {/* AI Feedback Sections */}
            {aiWarnings.length > 0 && (
                <div className="mb-6 border-l-4 border-danger bg-danger-light/20 p-4 rounded shadow-sm relative">
                    <button onClick={clearWarnings} className="absolute top-2 right-2 text-danger hover:text-danger-dark"><XIcon className="w-4 h-4"/></button>
                    <h3 className="font-bold text-danger text-lg mb-2">Advertencia: Estudiantes no encontrados</h3>
                    <p className="text-sm text-text-secondary mb-2">Los siguientes nombres detectados no tuvieron coincidencia exacta en la lista:</p>
                    <ul className="list-disc list-inside text-sm text-text-primary grid grid-cols-1 md:grid-cols-2 gap-1">
                        {aiWarnings.map((name, i) => <li key={i} className="truncate">{name}</li>)}
                    </ul>
                </div>
            )}

            {potentialMatches.length > 0 && (
                <div className="mb-6 border-l-4 border-warning bg-warning/10 p-4 rounded shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-warning-dark text-lg">Coincidencias Encontradas ({potentialMatches.length})</h3>
                        <button onClick={discardAllMatches} className="text-xs text-text-secondary hover:text-danger underline">Descartar todo</button>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">La IA encontró coincidencias parciales. Confirme si desea asignar la nota.</p>
                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                        {potentialMatches.map((match, i) => (
                            <div key={i} className="flex items-center justify-between bg-surface p-3 rounded border border-border shadow-sm">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-text-tertiary block">En Documento:</span>
                                        <span className="font-medium text-text-primary">{match.extractedName}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-tertiary block">En Lista (Sistema):</span>
                                        <span className="font-bold text-primary">{match.targetName}</span>
                                    </div>
                                </div>
                                <div className="mx-4 text-center min-w-[80px]">
                                    <span className="block text-xs text-text-tertiary">Nota</span>
                                    <span className="font-bold text-lg">
                                        {match.gradeValue !== null ? match.gradeValue : (match.gradeText || '-')}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => confirmMatch(match, i)} className="bg-success text-white p-1.5 rounded hover:bg-success-dark" title="Aceptar">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </button>
                                    <button onClick={() => discardMatch(i)} className="bg-background border border-border text-text-secondary p-1.5 rounded hover:bg-danger-light hover:text-danger" title="Descartar">
                                        <XIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)}>
                {fields.length === 0 ? (
                    <div className="bg-warning/20 text-warning-dark p-4 rounded-md mb-6">
                        No se encontraron estudiantes asociados a esta evaluación o al salón del curso. 
                        Por favor, verifique que el curso tenga un salón asignado y que el salón tenga estudiantes.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Estudiante</th>
                                    {(gradeMode === 'numeric' || gradeMode === 'both') && <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase w-32">Nota Num.</th>}
                                    {(gradeMode === 'text' || gradeMode === 'both') && <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase w-32">Nota Txt.</th>}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Comentarios</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase w-24">Imagen</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {fields.map((field, index) => (
                                    <tr key={field.id} className={field.hasGrade ? 'bg-success-light/30' : ''}>
                                        <td className="px-4 py-2 whitespace-nowrap font-medium">
                                            {field.userName}
                                            {field.hasGrade && <span className="ml-2 text-xs font-semibold bg-success text-text-on-primary px-2 py-0.5 rounded-full">Cargada</span>}
                                        </td>
                                        {(gradeMode === 'numeric' || gradeMode === 'both') && (
                                            <td className="px-4 py-2">
                                                <Controller 
                                                    name={`grades.${index}.gradeValue`} 
                                                    control={control} 
                                                    render={({ field }) => (
                                                        <input 
                                                            id={`grade-value-${index}`}
                                                            type="number" 
                                                            step="1" 
                                                            {...field} 
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'value')}
                                                            className="w-full p-2 bg-surface text-text-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent" 
                                                        />
                                                    )} 
                                                />
                                            </td>
                                        )}
                                        {(gradeMode === 'text' || gradeMode === 'both') && (
                                            <td className="px-4 py-2">
                                                <Controller 
                                                    name={`grades.${index}.gradeText`} 
                                                    control={control} 
                                                    render={({ field }) => (
                                                        <input 
                                                            id={`grade-text-${index}`}
                                                            {...field} 
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'text')}
                                                            className="w-full p-2 bg-surface text-text-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent" 
                                                        />
                                                    )} 
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-2">
                                            <Controller 
                                                name={`grades.${index}.comments`} 
                                                control={control} 
                                                render={({ field }) => (
                                                    <input 
                                                        id={`grade-comment-${index}`}
                                                        {...field} 
                                                        onKeyDown={(e) => handleKeyDown(e, index, 'comment')}
                                                        className="w-full p-2 bg-surface text-text-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent" 
                                                    />
                                                )} 
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center space-x-2 h-10">
                                                {isUploading === field.userID ? (
                                                    <SpinnerIcon className="text-primary" />
                                                ) : (
                                                    <>
                                                        {field.hasImage && (
                                                            <button type="button" onClick={() => handleViewImage(index)} className="cursor-pointer text-info hover:text-info-dark p-2 rounded-full hover:bg-background" title="Ver imagen">
                                                                <EyeIcon />
                                                            </button>
                                                        )}
                                                        
                                                        <input type="file" accept="image/*" id={`image-upload-${index}`} className="hidden" onChange={(e) => handleImageUpload(e, index)} />
                                                        <label htmlFor={`image-upload-${index}`} className="cursor-pointer text-secondary hover:text-primary p-2 rounded-full hover:bg-background" title={field.hasImage ? "Reemplazar imagen" : "Subir imagen"}>
                                                            <CameraIcon />
                                                        </label>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t">
                    <Link to="/evaluations" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                    <button type="submit" disabled={saving} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                        {saving ? 'Guardando...' : 'Guardar Notas'}
                    </button>
                </div>
            </form>

            {/* AI Import Modal */}
            {isAiModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAiModalOpen(false)} title="Importar Notas con IA">
                    <div className="p-4">
                        <div className="flex border-b border-border mb-4">
                            <button 
                                className={`flex-1 py-2 text-center font-medium ${aiTab === 'files' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                onClick={() => setAiTab('files')}
                            >
                                Subir Archivos
                            </button>
                            <button 
                                className={`flex-1 py-2 text-center font-medium ${aiTab === 'text' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                onClick={() => setAiTab('text')}
                            >
                                Pegar Texto
                            </button>
                        </div>

                        {aiError && <p className="bg-danger-light text-danger p-2 rounded mb-4 text-sm">{aiError}</p>}
                        
                        {aiTab === 'files' && (
                            <div className="space-y-4">
                                <p className="text-text-secondary text-sm">
                                    Seleccione uno o varios archivos (Imágenes, Excel, PDF). La IA combinará la información.
                                </p>
                                <div 
                                    className={`border-2 border-dashed rounded-lg p-6 transition-colors text-center ${aiAnalyzing ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-primary/50 hover:bg-background cursor-pointer'}`}
                                    onClick={() => !aiAnalyzing && fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        multiple 
                                        accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls,.csv"
                                        onChange={handleFilesSelect}
                                        disabled={aiAnalyzing}
                                    />
                                    <div className="flex flex-col items-center text-text-tertiary hover:text-primary">
                                        <span className="text-3xl mb-2">📂</span>
                                        <span>Haz clic para seleccionar archivos</span>
                                    </div>
                                </div>
                                
                                {aiFiles.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                        {aiFiles.map((f, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-background p-2 rounded text-sm border border-border">
                                                <span className="truncate">{f.name}</span>
                                                <button onClick={() => removeFile(idx)} className="text-danger hover:text-danger-text ml-2 p-1">
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {aiTab === 'text' && (
                            <div>
                                <p className="text-text-secondary text-sm mb-2">
                                    Pegue aquí la lista de estudiantes y notas (desde Excel, Word, etc.).
                                </p>
                                <textarea
                                    className="w-full p-3 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm h-48"
                                    placeholder="Ej: Juan Perez 18, Maria Gomez 20..."
                                    value={aiText}
                                    onChange={e => setAiText(e.target.value)}
                                    disabled={aiAnalyzing}
                                />
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsAiModalOpen(false)}
                                className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border"
                                disabled={aiAnalyzing}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAiAnalyze}
                                disabled={aiAnalyzing}
                                className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-90 disabled:bg-secondary flex items-center"
                            >
                                {aiAnalyzing ? <><SpinnerIcon className="mr-2" /> Analizando...</> : "Procesar Datos"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AssignGradesPage;
