
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { ROLES } from '../../types';
import { SpinnerIcon, UserCheckIcon, XIcon } from '../../components/icons';

// Define the extracted data structure
interface ExtractedUser {
    id: number; // internal UI id
    userName: string;
    cedulaPrefix: string; // New: V, E, P, etc.
    cedulaNumber: string; // New: Only numbers
    email: string;
    phoneNumber: string;
    roleID: number;
    isValid: boolean;
    creationError?: string; // To store backend errors per user
    isEmailManuallyEdited: boolean; // To track if the email was touched by the user
}

const CEDULA_PREFIXES = ['V', 'E', 'J', 'P', 'G', 'M'];

const BulkUserCreationPage: React.FC = () => {
    const { user: authUser, hasPermission } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [extractedUsers, setExtractedUsers] = useState<ExtractedUser[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [creationStatus, setCreationStatus] = useState<{success: number, failed: number} | null>(null);
    const [isExcel, setIsExcel] = useState(false);
    const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);


    // Configuration Options
    const [autoGenerateEmail, setAutoGenerateEmail] = useState(true);
    const [useCedulaAsPassword, setUseCedulaAsPassword] = useState(true);
    const [customEmailDomain, setCustomEmailDomain] = useState('schoolapp');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const canAccess = useMemo(() => {
        return hasPermission([6, 7]);
    }, [hasPermission]);

    if (!authUser) {
        // Still loading auth context, show a loader
        return <div>Cargando...</div>;
    }

    if (!canAccess) {
        return (
            <div className="text-center p-8 bg-surface rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-danger">Acceso Denegado</h1>
                <p className="text-secondary mt-2">Esta funcionalidad solo está disponible para usuarios con rol de Administrador o Super Admin.</p>
                <Link to="/dashboard" className="mt-4 inline-block bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                    Volver al Inicio
                </Link>
            </div>
        );
    }


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
                reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(selectedFile);
            } else {
                setIsExcel(false);
                setImagePreview(null);
            }
        }
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
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    // --- Helper logic ---
    const generateEmailFromData = (name: string, cedulaNumber: string, domain: string): string => {
        if (!name || !cedulaNumber) return '';
        
        // Normalize to remove accents (e.g., José -> Jose)
        const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z\s]/g, '');
        const parts = cleanName.split(/\s+/);
        const firstName = parts[0] || 'usuario';
        const lastName = parts.length > 1 ? parts[1] : '';
        
        const cleanCedula = cedulaNumber.replace(/[^0-9]/g, '');
        const lastTwoDigits = cleanCedula.length >= 2 ? cleanCedula.slice(-2) : '00';
        
        return `${firstName}${lastName}${lastTwoDigits}@${domain}.com`;
    };
    
    const checkValidity = (u: Partial<ExtractedUser>): boolean => {
        return !!((u.userName || '').trim() && (u.cedulaNumber || '').trim() && (u.email || '').trim());
    };

    // Name formatting helpers
    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/(?:^|\s|['"([{])+\S/g, (match) => match.toUpperCase());
    };

    const applyNameFormat = (format: 'uppercase' | 'lowercase' | 'capitalize') => {
        setExtractedUsers(prev => prev.map(u => {
            let newName = u.userName;
            if (format === 'uppercase') newName = u.userName.toUpperCase();
            if (format === 'lowercase') newName = u.userName.toLowerCase();
            if (format === 'capitalize') newName = toTitleCase(u.userName);
            
            // Check if email needs update after name change
            let newEmail = u.email;
            if (autoGenerateEmail && !u.isEmailManuallyEdited) {
                newEmail = generateEmailFromData(newName, u.cedulaNumber, customEmailDomain);
            }

            return { ...u, userName: newName, email: newEmail, isValid: checkValidity({ ...u, userName: newName, email: newEmail }) };
        }));
    };

    const applyGlobalRole = (roleIdStr: string) => {
        const roleId = Number(roleIdStr);
        if (!roleId) return;
        setExtractedUsers(prev => prev.map(u => ({ ...u, roleID: roleId })));
    };

    // Effect to apply auto-generation when toggled ON or domain changes in review step
    useEffect(() => {
        if (step !== 'review') return;
    
        setExtractedUsers(prev => prev.map(u => {
            let newEmail = u.email;
            let needsUpdate = false;
    
            if (autoGenerateEmail && !u.isEmailManuallyEdited) {
                const potentialNewEmail = generateEmailFromData(u.userName, u.cedulaNumber, customEmailDomain);
                if (potentialNewEmail !== u.email) {
                    newEmail = potentialNewEmail;
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                return { ...u, email: newEmail, isValid: checkValidity({ ...u, email: newEmail }) };
            }
            
            return u;
        }));
    }, [autoGenerateEmail, customEmailDomain, step]);

    const parseCedula = (rawCedula: string): { prefix: string, number: string } => {
        if (!rawCedula) return { prefix: 'V', number: '' };
        
        const clean = rawCedula.toUpperCase().trim();
        
        // Match explicit prefixes like "V-1234", "E 1234", "P1234"
        const match = clean.match(/^([VEJPGM])[- ]?(\d+)$/);
        if (match) {
            return { prefix: match[1], number: match[2] };
        }
        
        // Just numbers? Default to V
        const numsOnly = clean.replace(/[^0-9]/g, '');
        if (numsOnly.length > 0) {
            return { prefix: 'V', number: numsOnly };
        }

        return { prefix: 'V', number: '' };
    };

    const analyzeFile = async () => {
        if (inputMode === 'file' && !file) return;
        if (inputMode === 'text' && !inputText.trim()) {
            setError("Por favor, ingrese el texto a analizar.");
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const modelId = 'gemini-2.5-flash'; 

            let contentPart: any;
            let promptText = "";

            if (inputMode === 'file' && file) {
                if (isExcel) {
                     const csvData = await readExcelFile(file);
                     contentPart = { text: `Datos extraídos del archivo Excel/CSV:\n${csvData}` };
                     promptText = `Analiza los datos de texto (hoja de cálculo) y extrae usuarios.`;
                } else {
                     contentPart = await fileToGenerativePart(file);
                     promptText = `Analiza este documento visualmente y extrae la lista de personas.`;
                }
            } else {
                // Text Mode
                contentPart = { text: `TEXTO PROPORCIONADO POR EL USUARIO:\n${inputText}` };
                promptText = "Analiza el texto proporcionado y extrae la lista de personas.";
            }

            const prompt = `
                ${promptText}
                Instrucciones CRÍTICAS:
                1. Extrae: Nombre completo (userName), Cédula (cedula), Teléfono (phoneNumber), Rol (role).
                2. **NO INVENTES DATOS.** Si un campo (email, cédula, teléfono) no aparece explícitamente en el documento, devuélvelo como null o string vacío "".
                3. Si la cédula tiene letra (V, E, P), inclúyela. Si no, devuelve solo el número.
                4. Trata de inferir el rol (Estudiante, Profesor, Representante). Default: "Estudiante".
                
                Devuelve un JSON array puro.
            `;

            const response = await geminiService.generateContent({
                model: modelId,
                contents: [
                    { text: prompt },
                    contentPart
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                userName: { type: Type.STRING },
                                cedula: { type: Type.STRING },
                                email: { type: Type.STRING },
                                phoneNumber: { type: Type.STRING },
                                role: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("No se pudo obtener respuesta de la IA.");

            const rawUsers = JSON.parse(jsonText);
            
            // Transform to internal state
            const processedUsers: ExtractedUser[] = rawUsers.map((u: any, index: number) => {
                let roleID = 1; // Default Student
                const roleStr = (u.role || '').toLowerCase();
                if (roleStr.includes('profesor') || roleStr.includes('docente')) roleID = 2;
                if (roleStr.includes('representante') || roleStr.includes('padre')) roleID = 3;
                
                // Parse Cedula
                const { prefix, number } = parseCedula(u.cedula || '');

                let email = u.email || '';
                const isEmailManuallyEdited = !!email;

                if (!email && autoGenerateEmail) {
                    email = generateEmailFromData(u.userName, number, customEmailDomain);
                }

                const userObj: ExtractedUser = {
                    id: Date.now() + index,
                    userName: u.userName || '',
                    cedulaPrefix: prefix,
                    cedulaNumber: number,
                    email: email,
                    phoneNumber: u.phoneNumber || '',
                    roleID: roleID,
                    isValid: false,
                    isEmailManuallyEdited: isEmailManuallyEdited
                };
                
                return { ...userObj, isValid: checkValidity(userObj) };
            });

            setExtractedUsers(processedUsers);
            setStep('review');

        } catch (err: any) {
            console.error("AI Error:", err);
            setError("Ocurrió un error al analizar la información. Intente con datos más claros.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUserChange = (id: number, field: keyof Omit<ExtractedUser, 'id' | 'isValid' | 'creationError' | 'isEmailManuallyEdited'>, value: any) => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.id === id) {
                let updatedUser: ExtractedUser = { ...u, [field]: value };
    
                // Clear creation error on any edit
                if (updatedUser.creationError) {
                    delete updatedUser.creationError;
                }
    
                // If user edits email manually, lock it from auto-generation
                if (field === 'email') {
                    updatedUser.isEmailManuallyEdited = true;
                } 
                // If auto-generation is on and name/cedula changes, update email *only if not manually locked*
                else if (autoGenerateEmail && (field === 'userName' || field === 'cedulaNumber')) {
                    if (!updatedUser.isEmailManuallyEdited) {
                        updatedUser.email = generateEmailFromData(updatedUser.userName, updatedUser.cedulaNumber, customEmailDomain);
                    }
                }
                
                // Finally, update validity
                updatedUser.isValid = checkValidity(updatedUser);
                return updatedUser;
            }
            return u;
        }));
    };

    const removeUser = (id: number) => {
        setExtractedUsers(prev => prev.filter(u => u.id !== id));
    };
    
    const addUser = () => {
        const newUser: ExtractedUser = {
            id: Date.now(),
            userName: '',
            cedulaPrefix: 'V',
            cedulaNumber: '',
            email: '',
            phoneNumber: '',
            roleID: 1,
            isValid: false,
            isEmailManuallyEdited: false,
        };
        setExtractedUsers([...extractedUsers, newUser]);
    };

    const handleBulkCreate = async () => {
        if (!authUser?.schoolId) return;
        
        // Double check validation
        const invalidCount = extractedUsers.filter(u => !checkValidity(u)).length;
        if (invalidCount > 0) {
            setError("No se pueden crear usuarios. Corrija o elimine las tarjetas con errores (marcadas en rojo).");
            return;
        }

        setIsCreating(true);
        setError('');
        
        let successCount = 0;
        let failedCount = 0;

        const remainingUsers: ExtractedUser[] = [];

        for (const u of extractedUsers) {
            try {
                // Re-assemble cedula string
                const finalCedula = `${u.cedulaPrefix}-${u.cedulaNumber}`;
                const password = useCedulaAsPassword && u.cedulaNumber ? u.cedulaNumber : "123456";

                await apiService.createUser({
                    userName: u.userName,
                    cedula: finalCedula,
                    email: u.email,
                    phoneNumber: u.phoneNumber,
                    roleID: u.roleID,
                    schoolID: authUser.schoolId,
                    passwordHash: password 
                });
                successCount++;
            } catch (err: any) {
                console.error(`Failed to create user ${u.userName}`, err);
                failedCount++;
                // Keep in list with error message
                remainingUsers.push({
                    ...u,
                    creationError: err.message || "Error desconocido al crear usuario.",
                    isValid: false // Mark invalid visually
                });
            }
        }

        setExtractedUsers(remainingUsers);
        setCreationStatus({ success: successCount, failed: failedCount });
        setIsCreating(false);
        
        if (failedCount === 0 && remainingUsers.length === 0) {
            setTimeout(() => navigate('/users'), 1500);
        }
    };

    const ExcelIcon = () => (
        <svg className="w-20 h-20 text-success mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
    );

    const hasInvalidUsers = useMemo(() => {
        return extractedUsers.some(u => !checkValidity(u) || u.creationError);
    }, [extractedUsers]);


    return (
        <div className="p-6">
             {isBackConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-surface p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <h3 className="text-lg font-bold text-text-primary">¿Estás seguro?</h3>
                        <p className="mt-2 text-sm text-text-secondary">
                            Si vuelves atrás, perderás todos los datos extraídos y los cambios que hayas realizado.
                        </p>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button 
                                onClick={() => setIsBackConfirmOpen(false)}
                                className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    setStep('upload');
                                    setExtractedUsers([]);
                                    setFile(null);
                                    setInputText('');
                                    setImagePreview(null);
                                    setCreationStatus(null);
                                    setError('');
                                    setIsBackConfirmOpen(false);
                                }}
                                className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark transition-colors">
                                Sí, Volver
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-2xl font-bold text-text-primary mb-6">Crear Usuarios Masivamente con IA</h1>

            {step === 'upload' && (
                <div className="max-w-xl mx-auto bg-surface p-8 rounded-lg shadow-md text-center">
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
                                    Sube una imagen, PDF o archivo Excel (.xls, .xlsx) que contenga una lista de usuarios.
                                </p>
                                <div 
                                    className="border-2 border-dashed border-primary/50 rounded-lg p-10 cursor-pointer hover:bg-background transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf,.xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                                        onChange={handleFileChange} 
                                    />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded shadow" />
                                    ) : isExcel ? (
                                        <div>
                                            <ExcelIcon />
                                            <div className="text-primary font-bold">{file?.name}</div>
                                        </div>
                                    ) : file ? (
                                        <div className="text-primary font-bold">{file.name}</div>
                                    ) : (
                                        <div className="text-text-tertiary">
                                            <span className="block text-4xl mb-2">📂</span>
                                            Haz clic para seleccionar un archivo
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-text-secondary mb-4 text-center">
                                    Pega aquí la lista de usuarios (Nombre, Cédula, Email, etc.).
                                </p>
                                <textarea
                                    className="w-full p-4 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm h-60"
                                    placeholder="Ejemplo:
Juan Perez, V-12345678, juan@example.com, Estudiante
Maria Rodriguez, V-87654321, maria@example.com, Profesor"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                />
                            </>
                        )}
                    </div>

                    {error && <p className="text-danger mb-4">{error}</p>}

                    <button 
                        onClick={analyzeFile} 
                        disabled={(inputMode === 'file' && !file) || (inputMode === 'text' && !inputText) || isAnalyzing}
                        className="w-full bg-primary text-text-on-primary py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary flex justify-center items-center"
                    >
                        {isAnalyzing ? (
                            <>
                                <SpinnerIcon className="mr-2" /> Analizando con IA...
                            </>
                        ) : "Analizar y Extraer Datos"}
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div>
                    {/* Top Toolbar */}
                    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border mb-6">
                        {/* Row 1: Global Configurations */}
                        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border pb-4 mb-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex items-center cursor-pointer" title="Si falta el email, se generará uno automáticamente">
                                    <input type="checkbox" checked={autoGenerateEmail} onChange={e => setAutoGenerateEmail(e.target.checked)} className="mr-2 h-4 w-4 text-primary focus:ring-accent"/>
                                    <span className="text-sm font-medium text-text-primary">Autogenerar Email</span>
                                </label>

                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium text-text-primary">@</span>
                                    <input 
                                        type="text" 
                                        value={customEmailDomain} 
                                        onChange={e => setCustomEmailDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        className="p-1 border border-border rounded text-sm w-32 disabled:bg-background disabled:text-text-tertiary"
                                        aria-label="Dominio de email personalizado"
                                        disabled={!autoGenerateEmail}
                                    />
                                    <span className="text-sm font-medium text-text-primary">.com</span>
                                </div>

                                <label className="flex items-center cursor-pointer" title="La contraseña será igual a la cédula del usuario (solo números)">
                                    <input type="checkbox" checked={useCedulaAsPassword} onChange={e => setUseCedulaAsPassword(e.target.checked)} className="mr-2 h-4 w-4 text-primary focus:ring-accent"/>
                                    <span className="text-sm font-medium text-text-primary">Usar Cédula como Contraseña</span>
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={addUser} type="button" className="bg-info text-white px-3 py-2 rounded hover:bg-info-dark cursor-pointer">+ Agregar Manual</button>
                            </div>
                        </div>

                        {/* Row 2: Bulk Actions */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-text-secondary">Asignar Rol a Todos:</span>
                                <select 
                                    className="p-1 border border-border rounded bg-background text-text-primary text-sm"
                                    onChange={(e) => applyGlobalRole(e.target.value)}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {ROLES.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2 border-l border-border pl-4">
                                <span className="text-sm font-bold text-text-secondary">Formato Nombres:</span>
                                <button onClick={() => applyNameFormat('uppercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="MAYÚSCULAS">AA</button>
                                <button onClick={() => applyNameFormat('lowercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="minúsculas">aa</button>
                                <button onClick={() => applyNameFormat('capitalize')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="Nombre Propio">Aa</button>
                            </div>
                        </div>
                    </div>

                    {creationStatus && (
                        <div className={`mb-4 p-4 rounded text-center ${creationStatus.failed === 0 ? 'bg-success-light text-success-text' : 'bg-warning/20 text-warning-dark'}`}>
                            Resultado: {creationStatus.success} creados correctamente. {creationStatus.failed} fallidos.
                        </div>
                    )}
                    
                    {error && <div className="mb-4 bg-danger-light text-danger p-3 rounded text-center font-bold">{error}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {extractedUsers.map((u) => {
                            const isGreen = checkValidity(u) && !u.creationError;
                            
                            return (
                                <div 
                                    key={u.id} 
                                    className={`p-4 rounded-lg shadow-md border-2 transition-all relative ${
                                        isGreen ? 'bg-surface border-success/50' : 'bg-danger-light/10 border-danger/50'
                                    }`}
                                >
                                    <button 
                                        onClick={() => removeUser(u.id)} 
                                        className="absolute top-2 right-2 text-text-tertiary hover:text-danger p-1"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>

                                    {/* Status Indicator */}
                                    <div className="absolute top-2 left-2">
                                        {isGreen && <UserCheckIcon className="w-5 h-5 text-success" />}
                                    </div>

                                    <div className="space-y-3 mt-4">
                                        {u.creationError && (
                                            <div className="text-xs bg-danger text-white p-2 rounded">
                                                <strong>Error:</strong> {u.creationError}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase">Nombre Completo</label>
                                            <input 
                                                type="text" 
                                                value={u.userName} 
                                                onChange={(e) => handleUserChange(u.id, 'userName', e.target.value)}
                                                className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary ${!u.userName.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                                                placeholder="Requerido"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-text-secondary uppercase">Prefijo</label>
                                                <select 
                                                    value={u.cedulaPrefix}
                                                    onChange={(e) => handleUserChange(u.id, 'cedulaPrefix', e.target.value)}
                                                    className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary"
                                                >
                                                    {CEDULA_PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-text-secondary uppercase">Nº Cédula</label>
                                                <input 
                                                    type="text" 
                                                    value={u.cedulaNumber} 
                                                    onChange={(e) => handleUserChange(u.id, 'cedulaNumber', e.target.value.replace(/[^0-9]/g, ''))}
                                                    className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary ${!u.cedulaNumber.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                                                    placeholder="Solo números"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary uppercase">Teléfono</label>
                                                <input 
                                                    type="text" 
                                                    value={u.phoneNumber} 
                                                    onChange={(e) => handleUserChange(u.id, 'phoneNumber', e.target.value)}
                                                    className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary"
                                                    placeholder="Opcional"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-text-secondary uppercase">Rol</label>
                                                <select 
                                                    value={u.roleID} 
                                                    onChange={(e) => handleUserChange(u.id, 'roleID', Number(e.target.value))}
                                                    className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary"
                                                >
                                                    {ROLES.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary uppercase">Email</label>
                                            <input 
                                                type="email" 
                                                value={u.email} 
                                                onChange={(e) => handleUserChange(u.id, 'email', e.target.value)}
                                                className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary ${!u.email.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                                                placeholder="Requerido"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {extractedUsers.length === 0 && (
                        <div className="text-center py-8 text-secondary">Lista vacía. Agrega manualmente o vuelve a subir un archivo.</div>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 bg-surface p-4 shadow-lg border-t border-border flex justify-end items-center gap-4 z-40 md:pl-64">
                        <div className="text-sm text-text-secondary hidden sm:block">
                            {extractedUsers.length} usuarios en lista. 
                            {hasInvalidUsers ? <span className="text-danger font-bold ml-1">Hay errores pendientes.</span> : <span className="text-success font-bold ml-1">Todo listo.</span>}
                        </div>
                         <button onClick={() => setIsBackConfirmOpen(true)} className="bg-background text-text-primary py-3 px-6 rounded-lg hover:bg-border border border-border">
                            Atrás
                        </button>
                        <button 
                            onClick={handleBulkCreate} 
                            disabled={isCreating || hasInvalidUsers || extractedUsers.length === 0}
                            className="bg-success text-text-on-primary py-3 px-8 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary disabled:cursor-not-allowed shadow-md transform transition hover:-translate-y-1 flex items-center"
                            title={hasInvalidUsers ? "Corrija los errores antes de guardar" : "Guardar usuarios"}
                        >
                            {isCreating ? (
                                <><SpinnerIcon className="mr-2"/> Procesando...</>
                            ) : (
                                `Crear ${extractedUsers.length} Usuarios`
                            )}
                        </button>
                    </div>
                    <div className="h-24"></div> {/* Spacer for fixed footer */}
                </div>
            )}
        </div>
    );
};

export default BulkUserCreationPage;
