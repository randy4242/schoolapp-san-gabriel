import React, { useState, useEffect, useMemo } from 'react';
import { Type } from "@google/genai";
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { User } from '../../types';
import Modal from '../../components/Modal';
import { SpinnerIcon, SparklesIcon, CheckIcon, XIcon } from '../../components/icons';

interface AiNameAssignmentModalProps {
    users: User[]; // Full list of users to filter internally
    onClose: () => void;
    onSuccess: () => void;
}

interface NameCandidate {
    userId: number;
    originalName: string;
    nombre: string | null;
    apellido: string | null;
}

// --- Row Component ---
interface CandidateRowProps {
    c: NameCandidate;
    onChange: (userId: number, field: 'nombre' | 'apellido', value: string) => void;
}

const CandidateRow: React.FC<CandidateRowProps> = ({ c, onChange }) => (
    <div className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border border-border bg-surface hover:bg-background transition-colors">
        <div className="col-span-4 text-sm text-text-secondary truncate" title={c.originalName}>
            {c.originalName}
        </div>
        <div className="col-span-4">
            <input
                type="text"
                value={c.nombre || ''}
                onChange={(e) => onChange(c.userId, 'nombre', e.target.value)}
                placeholder="Nombre"
                className="w-full text-sm p-1 border border-border rounded focus:ring-accent focus:border-accent"
            />
        </div>
        <div className="col-span-4">
            <input
                type="text"
                value={c.apellido || ''}
                onChange={(e) => onChange(c.userId, 'apellido', e.target.value)}
                placeholder="Apellido"
                className="w-full text-sm p-1 border border-border rounded focus:ring-accent focus:border-accent"
            />
        </div>
    </div>
);

const AiNameAssignmentModal: React.FC<AiNameAssignmentModalProps> = ({ users, onClose, onSuccess }) => {
    const [step, setStep] = useState<'initial' | 'analyzing' | 'review' | 'saving'>('initial');
    const [candidates, setCandidates] = useState<NameCandidate[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState('');
    const [analysisType, setAnalysisType] = useState<'ai' | 'algorithm'>('ai');

    // 1. Detect users without name/surname (Max 50)
    // 1. Detect users without name/surname (Max 50)
    useEffect(() => {
        const limit = analysisType === 'ai' ? 20 : 100;

        const usersWithoutNames = users
            .filter(u => !u.nombre || !u.apellido)
            .slice(0, limit)
            .map(u => ({
                userId: u.userID,
                originalName: u.userName,
                nombre: null,
                apellido: null
            }));
        console.log(`[AiNameAssignment] Users without names found: ${users.filter(u => !u.nombre || !u.apellido).length}`);
        console.log(`[AiNameAssignment] Selecting batch of ${usersWithoutNames.length} users for analysis (${analysisType} mode).`);
        setCandidates(usersWithoutNames);
    }, [users, analysisType]);

    // 2. AI Analysis Logic
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startAnalysis = async () => {
        if (candidates.length === 0) return;
        setStep('analyzing');
        setError('');

        const MAX_RETRIES = 3;
        let attempt = 0;
        let success = false;

        while (attempt < MAX_RETRIES && !success) {
            try {
                attempt++;
                const batchNames = candidates.map(c => ({ id: c.userId, name: c.originalName }));
                console.log(`[AiNameAssignment] Sending batch to AI (Attempt ${attempt}):`, batchNames);

                const prompt = `
                    Actúa como un experto en nombres latinos/hispanos.
                    Analiza la lista de entrada y separa el campo "name" en "nombre" y "apellido".

                    REGLAS OBLIGATORIAS:
                    1. SIEMPRE intenta extraer un apellido.
                    2. Si la entrada tiene 2 palabras: Primera = Nombre, Segunda = Apellido. (Ej: "Juan Perez" -> Nombre: "Juan", Apellido: "Perez")
                    3. Si tiene 3 palabras: Generalmente Primer y Segundo Nombre + Apellido, o Nombre + 2 Apellidos. Prioriza sentido común hispano. (Ej: "Juan Jose Perez" -> Nombre: "Juan Jose", Apellido: "Perez").
                    4. Si tiene 4 palabras: 2 Nombres + 2 Apellidos. (Ej: "Juan Jose Perez Rodriguez" -> Nombre: "Juan Jose", Apellido: "Perez Rodriguez").
                    5. Si tiene 1 sola palabra: Ponla en Nombre y en Apellido pon un punto "." (NO LO DEJES VACIO).
                    6. Capitaliza correctamente (Juan Perez).
                    7. Devuelve el JSON exacto con la misma cantidad de elementos.
                    
                    Entrada: ${JSON.stringify(batchNames)}
                `;

                const response = await geminiService.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ text: prompt }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    nombre: { type: Type.STRING },
                                    apellido: { type: Type.STRING }
                                }
                            }
                        }
                    }
                });

                if (!response.text) throw new Error("Respuesta vacía de la IA");

                let aiResults: { id: number, nombre: string, apellido: string }[];
                try {
                    // Si la respuesta ya viene como objeto, úsala. Si es string, límpiala.
                    const textToParse = response.text.startsWith('```')
                        ? response.text.replace(/```json|```/g, "").trim()
                        : response.text.trim();

                    aiResults = JSON.parse(textToParse);
                } catch (e) {
                    console.error("Error parseando JSON de IA:", e);
                    throw new Error("La IA devolvió un formato inválido");
                }

                if (aiResults.length !== batchNames.length) {
                    console.warn("La IA omitió algunos usuarios. Reintentando...");
                    throw new Error("Inconsistencia en el número de resultados");
                }

                const resultMap = new Map(aiResults.map(r => [r.id, r]));

                setCandidates(prev => prev.map(c => {
                    const result = resultMap.get(c.userId);
                    return {
                        ...c,
                        nombre: result?.nombre || '',
                        apellido: result?.apellido || ''
                    };
                }));

                console.log("[AiNameAssignment] AI Results processed:", aiResults);

                setStep('review');
                success = true;

            } catch (err: any) {
                console.error(`Intento ${attempt} fallido:`, err);
                if (attempt >= MAX_RETRIES) {
                    setError("Error al procesar la respuesta de la IA. Intenta más tarde.");
                    setStep('initial');
                } else {
                    await wait(1000 * Math.pow(2, attempt - 1));
                }
            }
        }
    };

    // 3. User Interaction Logic
    const startAlgorithmAnalysis = () => {
        if (candidates.length === 0) return;
        setStep('analyzing');

        // Process ALL candidates, not just a batch, since it's instant
        const processed = candidates.map(c => {
            const original = c.originalName || '';
            const rawWords = original.trim().split(/\s+/);
            const units: string[] = [];
            let buffer: string[] = [];

            // Group connectors with the next word
            for (const word of rawWords) {
                if (['el', 'de', 'la', 'los', 'del'].includes(word.toLowerCase())) {
                    buffer.push(word);
                } else {
                    if (buffer.length > 0) {
                        units.push([...buffer, word].join(' '));
                        buffer = [];
                    } else {
                        units.push(word);
                    }
                }
            }
            // If trailing connectors exist (unlikely but safe to handle), append to last unit
            if (buffer.length > 0) {
                if (units.length > 0) {
                    units[units.length - 1] += ' ' + buffer.join(' ');
                } else {
                    units.push(buffer.join(' '));
                }
            }

            const count = units.length;

            let nombre: string | null = '';
            let apellido: string | null = '';

            if (count === 1) {
                nombre = units[0];
                apellido = null;
            } else if (count === 2) {
                nombre = units[0];
                apellido = units[1];
            } else if (count === 3) {
                nombre = units[0];
                apellido = `${units[1]} ${units[2]}`;
            } else if (count === 4) {
                nombre = `${units[0]} ${units[1]}`;
                apellido = `${units[2]} ${units[3]}`;
            } else if (count >= 5) {
                // Last 2 are surnames
                const surnameWords = units.slice(-2);
                const nameWords = units.slice(0, -2);
                apellido = surnameWords.join(' ');
                nombre = nameWords.join(' ');
            } else {
                // 0 words or empty
                nombre = original || null;
                apellido = null;
            }

            return { ...c, nombre, apellido };
        });

        // Simulate a small delay for better UX
        setTimeout(() => {
            setCandidates(processed);
            setStep('review');
        }, 500);
    };

    const handleNameChange = (userId: number, field: 'nombre' | 'apellido', value: string) => {
        setCandidates(prev => prev.map(c =>
            c.userId === userId ? { ...c, [field]: value } : c
        ));
    };

    // 4. Save Logic
    const handleConfirm = async () => {
        const toUpdate = candidates.filter(c => c.nombre);

        if (toUpdate.length === 0) {
            setError("No hay usuarios válidos para guardar.");
            return;
        }

        setStep('saving');
        setProgress({ current: 0, total: toUpdate.length });

        const BATCH_SIZE = 5;
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (c) => {
                try {
                    const originalUser = users.find(u => u.userID === c.userId);
                    if (!originalUser) return;

                    const payload = {
                        ...originalUser,
                        nombre: c.nombre,
                        apellido: c.apellido,
                        userName: `${c.nombre} ${c.apellido || ''}`.trim()
                    };

                    await apiService.updateUser(c.userId, payload);
                } catch (e) {
                    console.error(`Failed to update user ${c.userId}`, e);
                }
            }));
            setProgress(prev => ({ ...prev, current: Math.min(prev.current + BATCH_SIZE, prev.total) }));
        }

        onSuccess();
        onClose();
    };

    const readyCount = candidates.filter(c => c.nombre).length;

    return (
        <Modal isOpen={true} onClose={onClose} title="Asignación de Nombres con IA">
            <div className="flex flex-col h-[70vh]">
                {step === 'initial' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-6">
                        <div className="flex space-x-4 mb-4">
                            <button
                                onClick={() => setAnalysisType('ai')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${analysisType === 'ai' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                IA (Gemini)
                            </button>
                            <button
                                onClick={() => setAnalysisType('algorithm')}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${analysisType === 'algorithm' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Algoritmo (Reglas)
                            </button>
                        </div>

                        {analysisType === 'ai' ? (
                            <>
                                <div className="bg-primary/10 p-6 rounded-full">
                                    <SparklesIcon className="w-16 h-16 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">Detección Automática con IA</h2>
                                    <p className="text-text-secondary mt-2">
                                        Detectar usuarios sin nombre/apellido usando Inteligencia Artificial.
                                        <br />
                                        Se analizarán lotes de 20 usuarios.
                                    </p>
                                </div>
                                <button
                                    onClick={startAnalysis}
                                    className="bg-primary text-text-on-primary px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-transform hover:scale-105 shadow-lg flex items-center"
                                >
                                    <SparklesIcon className="w-5 h-5 mr-2" /> Comenzar Análisis IA (Lote de 20)
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="bg-primary/10 p-6 rounded-full">
                                    <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">Detección por Algoritmo</h2>
                                    <p className="text-text-secondary mt-2">
                                        Reglas estrictas basadas en cantidad de palabras.
                                        <br />
                                        Ignora conectores (de, la, los).
                                    </p>
                                </div>
                                <button
                                    onClick={startAlgorithmAnalysis}
                                    className="bg-primary text-text-on-primary px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-transform hover:scale-105 shadow-lg flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    Ejecutar Algoritmo (Todos)
                                </button>
                            </>
                        )}

                        {candidates.length === 0 && (
                            <div className="bg-success-light text-success-text p-4 rounded-md">
                                ¡Todos los usuarios visibles tienen nombre y apellido!
                            </div>
                        )}
                        {error && <p className="text-danger">{error}</p>}
                    </div>
                )}

                {step === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <SpinnerIcon className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-lg font-medium text-text-primary">Analizando y separando nombres...</p>
                    </div>
                )}

                {step === 'review' && (
                    <>
                        <div className="flex-none grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 font-bold text-xs uppercase text-text-secondary border-b">
                            <div className="col-span-4">Nombre Original</div>
                            <div className="col-span-4">Nombre (Sugerido)</div>
                            <div className="col-span-4">Apellido (Sugerido)</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {candidates.map(c => (
                                <CandidateRow key={c.userId} c={c} onChange={handleNameChange} />
                            ))}
                        </div>

                        <div className="pt-4 border-t border-border mt-2 bg-surface">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-secondary">
                                    <strong>{readyCount}</strong> usuarios listos.
                                </span>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-text-primary hover:bg-background">Cancelar</button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={readyCount === 0}
                                        className="bg-primary text-white px-6 py-2 rounded font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    >
                                        Confirmar y Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {step === 'saving' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-success h-2.5 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                        </div>
                        <p className="text-lg font-medium text-text-primary">Guardando cambios ({progress.current}/{progress.total})...</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AiNameAssignmentModal;
