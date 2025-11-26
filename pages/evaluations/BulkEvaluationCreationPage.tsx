
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { geminiClient } from '../../services/geminiService';
import { Course, Evaluation } from '../../types';
import { SpinnerIcon, TrashIcon, ClipboardCheckIcon, XIcon, PlusIcon, BookOpenIcon } from '../../components/icons';

interface ExtractedEvaluation {
    id: number; // Internal UI ID
    title: string;
    description: string;
    percentage: number;
    date: string;
    courseID: number | null; // The Matched Course ID
    courseName: string; // The raw course name from the doc or matched name
    isValid: boolean;
    creationError?: string;
}

const BulkEvaluationCreationPage: React.FC = () => {
    const { user: authUser, hasPermission } = useAuth();
    const navigate = useNavigate();

    // Steps: upload -> review
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    
    // Input Mode State
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isExcel, setIsExcel] = useState(false);
    const [inputText, setInputText] = useState('');
    
    // AI Config
    const [instructions, setInstructions] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');

    // Data
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [extractedEvaluations, setExtractedEvaluations] = useState<ExtractedEvaluation[]>([]);
    
    // Creation
    const [isCreating, setIsCreating] = useState(false);
    const [creationStatus, setCreationStatus] = useState<{success: number, failed: number} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

    // Load available courses for context matching
    useEffect(() => {
        if (authUser?.schoolId) {
            // Fetch logic: Admin gets all courses, Teacher gets their courses
            const fetchFn = hasPermission([6]) 
                ? apiService.getCourses(authUser.schoolId) 
                : apiService.getTaughtCourses(authUser.userId, authUser.schoolId);

            fetchFn.then(setAvailableCourses).catch(console.error);
        }
    }, [authUser, hasPermission]);

    // File Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
            if (['xls', 'xlsx', 'csv'].includes(fileType || '')) {
                setIsExcel(true);
                setImagePreview(null);
            } else if (selectedFile.type.startsWith('image/')) {
                setIsExcel(false);
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result as string);
                reader.readAsDataURL(selectedFile);
            } else {
                setIsExcel(false); // PDF or Text
                setImagePreview(null);
            }
        }
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
                    resolve(csv);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

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

    // Validation Logic
    const checkValidity = (ev: Partial<ExtractedEvaluation>): boolean => {
        const hasTitle = !!(ev.title || '').trim();
        const hasDate = !!(ev.date || '').trim();
        const hasCourse = !!ev.courseID; // Must be mapped to a real ID
        // Percentage is optional (can be 0)
        return hasTitle && hasDate && hasCourse;
    };

    // AI Analysis
    const handleAiAnalyze = async () => {
        if (inputMode === 'file' && !file) return;
        if (inputMode === 'text' && !inputText.trim()) {
            setError("Por favor, ingrese el texto a analizar.");
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const modelId = 'gemini-2.5-flash';
            const contents: any[] = [];
            let docContext = "";

            if (inputMode === 'file' && file) {
                if (isExcel) {
                    const csvData = await readExcelFile(file);
                    contents.push({ text: `Datos del documento (Excel/CSV):\n${csvData}` });
                    docContext = "Analiza las filas de datos.";
                } else {
                    const contentPart = await fileToGenerativePart(file);
                    contents.push(contentPart);
                    docContext = "Analiza el documento visualmente.";
                }
            } else {
                // Text mode
                contents.push({ text: `TEXTO PROPORCIONADO POR EL USUARIO:\n${inputText}` });
                docContext = "Analiza el texto proporcionado.";
            }

            // Prepare Course Context for matching
            const courseContext = availableCourses.map(c => `ID: ${c.courseID}, Name: "${c.name}"`).join('\n');

            const prompt = `
                ${docContext}
                Contexto: Eres un asistente administrativo escolar.
                Tu tarea es extraer una lista de evaluaciones (exámenes, tareas, proyectos) de la información provista.
                
                Instrucciones del Usuario: "${instructions}"
                
                Cursos Disponibles en Base de Datos:
                ${courseContext}
                
                REGLAS DE EXTRACCIÓN:
                1. Extrae: Título (title), Descripción (description), Porcentaje (percentage, número 0-100), Fecha (date, formato YYYY-MM-DD).
                2. IMPORTANTE: Intenta asociar cada evaluación a un 'courseID' de la lista de "Cursos Disponibles".
                   - Si encuentras una coincidencia clara (ej. documento dice "Matemáticas" y existe "Matemáticas 1er Año"), asigna el ID.
                   - Si no estás seguro, devuelve courseID: null.
                3. Si la fecha no es explícita, usa tu mejor criterio basado en las instrucciones del usuario o devuelve string vacío.
                
                Salida JSON Array:
                [{ title: string, description: string, percentage: number, date: string, courseID: number | null, courseName: string (nombre encontrado en doc) }]
            `;

            // Prepend prompt text
            contents.unshift({ text: prompt });

            const response = await geminiClient.models.generateContent({
                model: modelId,
                contents: contents,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                percentage: { type: Type.NUMBER },
                                date: { type: Type.STRING },
                                courseID: { type: Type.INTEGER },
                                courseName: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("No se obtuvo respuesta de la IA.");

            const rawEvaluations = JSON.parse(jsonText);

            const processed: ExtractedEvaluation[] = rawEvaluations.map((item: any, idx: number) => {
                const ev: ExtractedEvaluation = {
                    id: Date.now() + idx,
                    title: item.title || '',
                    description: item.description || '',
                    percentage: typeof item.percentage === 'number' ? item.percentage : 0,
                    date: item.date || '',
                    courseID: item.courseID || null,
                    courseName: item.courseName || '',
                    isValid: false
                };
                return { ...ev, isValid: checkValidity(ev) };
            });

            setExtractedEvaluations(processed);
            setStep('review');

        } catch (err: any) {
            console.error("AI Error:", err);
            setError("Error al analizar la información. Intente nuevamente con datos más claros.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // State Updates
    const handleEvaluationChange = (id: number, field: keyof ExtractedEvaluation, value: any) => {
        setExtractedEvaluations(prev => prev.map(ev => {
            if (ev.id === id) {
                const updated = { ...ev, [field]: value };
                // Clear error if edited
                if (updated.creationError) delete updated.creationError;
                updated.isValid = checkValidity(updated);
                return updated;
            }
            return ev;
        }));
    };

    const removeEvaluation = (id: number) => {
        setExtractedEvaluations(prev => prev.filter(ev => ev.id !== id));
    };

    const addManualEvaluation = () => {
        const newEv: ExtractedEvaluation = {
            id: Date.now(),
            title: '',
            description: '',
            percentage: 0,
            date: new Date().toISOString().split('T')[0],
            courseID: null,
            courseName: '',
            isValid: false
        };
        setExtractedEvaluations([...extractedEvaluations, newEv]);
    };

    // Bulk Create Action
    const handleBulkCreate = async () => {
        if (!authUser?.schoolId) return;

        // Check for errors
        const invalidCount = extractedEvaluations.filter(ev => !checkValidity(ev)).length;
        if (invalidCount > 0) {
            setError(`Hay ${invalidCount} evaluaciones incompletas. Corríjalas (bordes rojos) antes de guardar.`);
            return;
        }

        setIsCreating(true);
        setError('');
        let successCount = 0;
        let failedCount = 0;
        const remaining: ExtractedEvaluation[] = [];

        for (const ev of extractedEvaluations) {
            try {
                // Check total percentage validation if needed, for now just create.
                let description = ev.description;
                if (ev.percentage > 0) {
                    description = `${description ? description + '@' : ''}${ev.percentage}`;
                }

                await apiService.createEvaluation({
                    title: ev.title,
                    description: description,
                    date: ev.date,
                    courseID: ev.courseID!, // validated
                    userID: authUser.userId,
                    schoolID: authUser.schoolId
                });
                successCount++;
            } catch (err: any) {
                console.error(`Failed to create evaluation ${ev.title}`, err);
                failedCount++;
                remaining.push({
                    ...ev,
                    creationError: err.message || "Error al crear.",
                    isValid: false
                });
            }
        }

        setExtractedEvaluations(remaining);
        setCreationStatus({ success: successCount, failed: failedCount });
        setIsCreating(false);

        if (failedCount === 0 && remaining.length === 0) {
            setTimeout(() => navigate('/evaluations'), 1500);
        }
    };

    const hasInvalid = useMemo(() => extractedEvaluations.some(ev => !checkValidity(ev)), [extractedEvaluations]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center">
                <ClipboardCheckIcon className="w-8 h-8 mr-2" /> Crear Evaluaciones Masivas (IA)
            </h1>

            {/* Warning Modal */}
            {isBackConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-surface p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <h3 className="text-lg font-bold">¿Volver atrás?</h3>
                        <p className="mt-2 text-sm text-text-secondary">Se perderán los datos extraídos.</p>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button onClick={() => setIsBackConfirmOpen(false)} className="bg-background px-4 py-2 rounded border">Cancelar</button>
                            <button onClick={() => {
                                setStep('upload');
                                setExtractedEvaluations([]);
                                setFile(null);
                                setInputText('');
                                setError('');
                                setIsBackConfirmOpen(false);
                            }} className="bg-danger text-white px-4 py-2 rounded">Volver</button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'upload' && (
                <div className="max-w-3xl mx-auto bg-surface p-8 rounded-lg shadow-md">
                    <div className="flex border-b border-border mb-6">
                        <button 
                            className={`flex-1 py-2 text-center font-medium text-lg ${inputMode === 'file' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setInputMode('file')}
                        >
                            Subir Archivo
                        </button>
                        <button 
                            className={`flex-1 py-2 text-center font-medium text-lg ${inputMode === 'text' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setInputMode('text')}
                        >
                            Pegar Texto
                        </button>
                    </div>

                    <div className="mb-6">
                        {inputMode === 'file' ? (
                            <>
                                <p className="text-text-secondary mb-4 text-center">
                                    Sube un plan de evaluación (PDF, Excel, Imagen). La IA extraerá los datos y asignará los cursos automáticamente.
                                </p>
                                <div 
                                    className="border-2 border-dashed border-primary/50 rounded-lg p-10 cursor-pointer hover:bg-background transition-colors text-center mb-6"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf,.xlsx,.xls,.csv"
                                        onChange={handleFileChange} 
                                    />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded shadow" />
                                    ) : file ? (
                                        <div className="text-primary font-bold text-lg">📄 {file.name}</div>
                                    ) : (
                                        <div className="text-text-tertiary">
                                            <span className="block text-4xl mb-2">📂</span>
                                            Haz clic para seleccionar archivo
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-text-secondary mb-4 text-center">
                                    Pega aquí el contenido de tu plan de evaluación (texto de Word, Excel copiado, etc.).
                                </p>
                                <textarea
                                    className="w-full p-4 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm h-60"
                                    placeholder="Ejemplo:
Matemáticas - Examen 1 - 20% - 15/05/2025
Historia - Ensayo sobre la independencia - 10% - 20/05/2025..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                />
                            </>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-text-secondary mb-2">Instrucciones para la IA (Opcional)</label>
                        <textarea 
                            className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-accent/50 focus:outline-none"
                            rows={3}
                            placeholder="Ej: Todas las evaluaciones son para el año 2025. Si no hay fecha, pon 2025-12-01."
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-danger text-center mb-4 bg-danger-light p-2 rounded">{error}</p>}

                    <button 
                        onClick={handleAiAnalyze} 
                        disabled={(inputMode === 'file' && !file) || (inputMode === 'text' && !inputText) || isAnalyzing}
                        className="w-full bg-primary text-text-on-primary py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary flex justify-center items-center"
                    >
                        {isAnalyzing ? <><SpinnerIcon className="mr-2" /> Analizando...</> : "Procesar Información"}
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div>
                    <div className="bg-surface p-4 rounded-lg shadow-sm border mb-6 flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Revisión de Evaluaciones</h2>
                            <p className="text-sm text-text-secondary">Verifique los datos y asigne el curso correcto si es necesario.</p>
                        </div>
                        <button onClick={addManualEvaluation} className="bg-info text-white px-4 py-2 rounded hover:bg-info-dark flex items-center">
                            <PlusIcon className="w-4 h-4 mr-1" /> Agregar Manual
                        </button>
                    </div>

                    {creationStatus && (
                        <div className={`mb-4 p-4 rounded text-center ${creationStatus.failed === 0 ? 'bg-success-light text-success-text' : 'bg-warning/20 text-warning-dark'}`}>
                            Resultado: {creationStatus.success} creadas. {creationStatus.failed} fallidas.
                        </div>
                    )}
                    {error && <div className="mb-4 bg-danger-light text-danger p-3 rounded text-center font-bold">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-24">
                        {extractedEvaluations.map(ev => (
                            <div key={ev.id} className={`relative p-4 rounded-lg shadow border-2 transition-all bg-surface ${ev.isValid ? 'border-border' : 'border-danger'}`}>
                                <button onClick={() => removeEvaluation(ev.id)} className="absolute top-2 right-2 text-text-tertiary hover:text-danger"><XIcon className="w-5 h-5"/></button>
                                
                                {ev.creationError && <div className="mb-2 text-xs bg-danger text-white p-1 rounded">{ev.creationError}</div>}

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase">Título *</label>
                                        <input 
                                            type="text" 
                                            value={ev.title} 
                                            onChange={e => handleEvaluationChange(ev.id, 'title', e.target.value)}
                                            className={`w-full p-1 border-b bg-transparent focus:outline-none ${!ev.title ? 'border-danger' : 'border-border focus:border-accent'}`}
                                            placeholder="Ej. Examen Parcial"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase">Descripción</label>
                                        <textarea 
                                            rows={2}
                                            value={ev.description} 
                                            onChange={e => handleEvaluationChange(ev.id, 'description', e.target.value)}
                                            className="w-full p-1 border border-border rounded bg-transparent text-sm focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase">Fecha *</label>
                                            <input 
                                                type="date" 
                                                value={ev.date} 
                                                onChange={e => handleEvaluationChange(ev.id, 'date', e.target.value)}
                                                className={`w-full p-1 border-b bg-transparent focus:outline-none ${!ev.date ? 'border-danger' : 'border-border focus:border-accent'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase">Porcentaje (%)</label>
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                value={ev.percentage} 
                                                onChange={e => handleEvaluationChange(ev.id, 'percentage', parseFloat(e.target.value) || 0)}
                                                className="w-full p-1 border-b border-border bg-transparent focus:outline-none focus:border-accent"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase flex justify-between">
                                            <span>Curso *</span>
                                            {ev.courseName && <span className="text-[10px] text-info font-normal truncate max-w-[100px]" title={`Encontrado en doc: ${ev.courseName}`}>Doc: {ev.courseName}</span>}
                                        </label>
                                        <select 
                                            value={ev.courseID || ''} 
                                            onChange={e => handleEvaluationChange(ev.id, 'courseID', Number(e.target.value))}
                                            className={`w-full p-2 rounded border text-sm ${!ev.courseID ? 'border-danger bg-danger-light/10' : 'border-border bg-background'}`}
                                        >
                                            <option value="">-- Seleccionar Curso --</option>
                                            {availableCourses.map(c => (
                                                <option key={c.courseID} value={c.courseID}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Floating Footer */}
                    <div className="fixed bottom-0 left-0 right-0 bg-surface p-4 shadow-lg border-t border-border flex justify-end items-center gap-4 z-40 md:pl-64">
                        <div className="hidden sm:block text-sm text-text-secondary">
                            {extractedEvaluations.length} evaluaciones. 
                            {hasInvalid ? <span className="text-danger font-bold ml-1">Corrija los errores.</span> : <span className="text-success font-bold ml-1">Listo para guardar.</span>}
                        </div>
                        <button onClick={() => setIsBackConfirmOpen(true)} className="px-6 py-3 rounded border border-border hover:bg-background transition">
                            Atrás
                        </button>
                        <button 
                            onClick={handleBulkCreate} 
                            disabled={isCreating || hasInvalid || extractedEvaluations.length === 0}
                            className="bg-success text-text-on-primary px-8 py-3 rounded font-bold hover:bg-opacity-90 disabled:bg-secondary disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-1 transition-all flex items-center"
                        >
                            {isCreating ? <><SpinnerIcon className="mr-2"/> Guardando...</> : "Guardar Todo"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkEvaluationCreationPage;
