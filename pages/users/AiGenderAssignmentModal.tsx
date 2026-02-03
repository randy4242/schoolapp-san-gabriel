
import React, { useState, useEffect, useMemo } from 'react';
import { Type } from "@google/genai";
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { User } from '../../types';
import Modal from '../../components/Modal';
import { SpinnerIcon, SparklesIcon, MaleIcon, FemaleIcon, CheckIcon, XIcon } from '../../components/icons';

interface AiGenderAssignmentModalProps {
    users: User[]; // Full list of users to filter internally
    onClose: () => void;
    onSuccess: () => void;
}

interface GenderCandidate {
    userId: number;
    userName: string;
    gender: 'M' | 'F' | null;
    isAiUnsure: boolean;
}

// --- Extracted Component to prevent scroll reset ---
interface CandidateRowProps {
    c: GenderCandidate;
    onToggle: (userId: number, gender: 'M' | 'F') => void;
}

const CandidateRow: React.FC<CandidateRowProps> = ({ c, onToggle }) => (
    <div className={`flex items-center justify-between p-3 rounded-md border ${c.gender ? 'bg-surface border-border' : 'bg-warning/5 border-warning/30'}`}>
        <span className="font-medium text-text-primary text-sm truncate max-w-[200px]" title={c.userName}>
            {c.userName}
        </span>
        <div className="flex gap-3">
            <button 
                type="button"
                onClick={() => onToggle(c.userId, 'M')}
                className={`p-1.5 rounded-full transition-all ${c.gender === 'M' ? 'bg-info text-white shadow-md scale-110' : 'text-gray-400 hover:bg-gray-100'}`}
            >
                <MaleIcon className="w-5 h-5" />
            </button>
            <button 
                type="button"
                onClick={() => onToggle(c.userId, 'F')}
                className={`p-1.5 rounded-full transition-all ${c.gender === 'F' ? 'bg-pink-500 text-white shadow-md scale-110' : 'text-gray-400 hover:bg-gray-100'}`}
            >
                <FemaleIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const AiGenderAssignmentModal: React.FC<AiGenderAssignmentModalProps> = ({ users, onClose, onSuccess }) => {
    const [step, setStep] = useState<'initial' | 'analyzing' | 'review' | 'saving'>('initial');
    const [candidates, setCandidates] = useState<GenderCandidate[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState('');

    // 1. Detect users without gender (Max 100)
    useEffect(() => {
        const usersWithoutGender = users
            .filter(u => !u.sexo)
            .slice(0, 100)
            .map(u => ({
                userId: u.userID,
                userName: u.userName,
                gender: null,
                isAiUnsure: false
            }));
        setCandidates(usersWithoutGender);
    }, [users]);

    // 2. AI Analysis Logic
    // Función auxiliar para esperar (delay)
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 2. AI Analysis Logic (MEJORADA)
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
                const batchNames = candidates.map(c => ({ id: c.userId, name: c.userName }));
                
                // Prompt optimizado
                const prompt = `
                    Actúa como experto en nombres. Analiza esta lista JSON y asigna género ("M", "F" o null).
                    Entrada: ${JSON.stringify(batchNames)}
                    
                    REGLAS IMPORTANTES:
                    - Responde SOLAMENTE con el JSON Array válido.
                    - NO uses bloques de código markdown (\`\`\`json).
                    - Schema: [{ "id": number, "gender": "M" | "F" | null }]
                `;

                // Llamada a la API
                const response = await geminiService.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ text: prompt }],
                    config: {
                        responseMimeType: "application/json",
                        // Mantenemos tu schema, es útil
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.INTEGER },
                                    gender: { type: Type.STRING, nullable: true }
                                }
                            }
                        }
                    }
                });

                if (!response.text) throw new Error("Respuesta vacía de la IA");

                // --- LIMPIEZA DE JSON (Corrige el SyntaxError) ---
                // A veces la IA manda ```json al principio y ``` al final, o espacios extra.
                let cleanText = response.text;
                // Eliminar bloques markdown si existen
                cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
                // Eliminar posibles textos antes o después del array
                const firstBracket = cleanText.indexOf('[');
                const lastBracket = cleanText.lastIndexOf(']');
                
                if (firstBracket !== -1 && lastBracket !== -1) {
                    cleanText = cleanText.substring(firstBracket, lastBracket + 1);
                }

                const aiResults: { id: number, gender: 'M' | 'F' | null }[] = JSON.parse(cleanText);
                const resultMap = new Map(aiResults.map(r => [r.id, r.gender]));

                setCandidates(prev => prev.map(c => {
                    const aiGender = resultMap.get(c.userId);
                    return {
                        ...c,
                        gender: aiGender || null,
                        isAiUnsure: aiGender === null || aiGender === undefined
                    };
                }));

                setStep('review');
                success = true; // Salimos del bucle

            } catch (err: any) {
                console.error(`Intento ${attempt} fallido:`, err);
                
                // Si es el último intento, mostramos el error al usuario
                if (attempt >= MAX_RETRIES) {
                    const errorMessage = err.message?.includes('503') 
                        ? "Servidores de IA saturados (503). Intenta más tarde." 
                        : "Error al procesar la respuesta de la IA.";
                    setError(errorMessage);
                    setStep('initial');
                } else {
                    // Si falló pero quedan intentos, esperamos un poco (Exponential Backoff)
                    // Espera 1s, luego 2s, luego 4s...
                    await wait(1000 * Math.pow(2, attempt - 1));
                }
            }
        }
    };

    // 3. User Interaction Logic
    const toggleGender = (userId: number, gender: 'M' | 'F') => {
        setCandidates(prev => prev.map(c => {
            if (c.userId !== userId) return c;
            // If clicking the same gender, toggle off (back to null)?? No, usually we just want to switch.
            // Let's allow switching or confirming.
            return { ...c, gender: gender };
        }));
    };

    // 4. Save Logic
    const handleConfirm = async () => {
        // Only save users that have a gender assigned
        const toUpdate = candidates.filter(c => c.gender !== null);
        
        if (toUpdate.length === 0) {
            setError("No hay usuarios con género asignado para guardar.");
            return;
        }

        setStep('saving');
        setProgress({ current: 0, total: toUpdate.length });

        let successCount = 0;

        // Process in small parallel batches to not overload backend but be faster than serial
        const BATCH_SIZE = 5;
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (c) => {
                try {
                    // Finding original user to be safe with required fields
                    const originalUser = users.find(u => u.userID === c.userId);
                    if (!originalUser) return;

                    const payload = {
                        ...originalUser,
                        sexo: c.gender
                    };

                    await apiService.updateUser(c.userId, payload);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to update user ${c.userId}`, e);
                }
            }));
            setProgress(prev => ({ ...prev, current: Math.min(prev.current + BATCH_SIZE, prev.total) }));
        }

        onSuccess(); // Refresh parent list
        onClose();
    };

    // Computed Lists
    const unsureList = useMemo(() => candidates.filter(c => c.isAiUnsure), [candidates]);
    const sureList = useMemo(() => candidates.filter(c => !c.isAiUnsure), [candidates]);
    const readyCount = candidates.filter(c => c.gender !== null).length;

    return (
        <Modal isOpen={true} onClose={onClose} title="Asignación de Género con IA">
            <div className="flex flex-col h-[70vh]">
                {step === 'initial' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-6">
                        <div className="bg-primary/10 p-6 rounded-full">
                            <SparklesIcon className="w-16 h-16 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Detección Automática</h2>
                            <p className="text-text-secondary mt-2">
                                Se han detectado <strong>{candidates.length}</strong> usuarios sin género asignado.
                                <br/>
                                La IA analizará sus nombres para sugerir Masculino o Femenino.
                            </p>
                        </div>
                        {candidates.length > 0 ? (
                            <button 
                                onClick={startAnalysis}
                                className="bg-primary text-text-on-primary px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-transform hover:scale-105 shadow-lg flex items-center"
                            >
                                <SparklesIcon className="w-5 h-5 mr-2" /> Comenzar Análisis
                            </button>
                        ) : (
                            <div className="bg-success-light text-success-text p-4 rounded-md">
                                ¡Todos los usuarios visibles tienen género asignado!
                            </div>
                        )}
                        {error && <p className="text-danger">{error}</p>}
                    </div>
                )}

                {step === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <SpinnerIcon className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-lg font-medium text-text-primary">Analizando nombres...</p>
                        <p className="text-sm text-text-secondary">Esto puede tomar unos segundos.</p>
                    </div>
                )}

                {step === 'review' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-1 space-y-6">
                            {/* Unsure Section */}
                            {unsureList.length > 0 && (
                                <div>
                                    <div className="bg-warning/20 border-l-4 border-warning p-3 mb-3 rounded-r-md">
                                        <h3 className="font-bold text-warning-dark text-sm">⚠️ Revisión Requerida ({unsureList.length})</h3>
                                        <p className="text-xs text-text-secondary">La IA no pudo determinar el género con seguridad. Por favor asigna manualmente.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {unsureList.map(c => <CandidateRow key={c.userId} c={c} onToggle={toggleGender} />)}
                                    </div>
                                </div>
                            )}

                            {/* Sure Section */}
                            <div>
                                <h3 className="font-bold text-success text-sm mb-3 flex items-center">
                                    <CheckIcon className="w-4 h-4 mr-1"/>
                                    Sugerencias de la IA ({sureList.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {sureList.map(c => <CandidateRow key={c.userId} c={c} onToggle={toggleGender} />)}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border mt-2 bg-surface">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-secondary">
                                    <strong>{readyCount}</strong> usuarios listos para actualizar.
                                </span>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="px-4 py-2 border border-border rounded text-text-primary hover:bg-background">Cancelar</button>
                                    <button 
                                        onClick={handleConfirm} 
                                        disabled={readyCount === 0}
                                        className="bg-success text-white px-6 py-2 rounded font-bold hover:bg-success-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    >
                                        Confirmar Cambios
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

export default AiGenderAssignmentModal;
