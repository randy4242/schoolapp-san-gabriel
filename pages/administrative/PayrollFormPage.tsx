
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { BriefcaseIcon } from '../../components/icons';
import { PayrollPreviewResponse, ExchangeRate, User } from '../../types';
import UpdateExchangeRateModal from '../../components/UpdateExchangeRateModal';
import { EmployeeBonusModal, BonusItem } from '../../components/EmployeeBonusModal';

type CustomAllowance = {
    name: string;
    amount: number;
    isUsd: boolean;
};

type EmployeeRow = {
    userId: number;
    userName: string;
    isSelected: boolean;
    useMinSalary: boolean;
    customSalary: number;
    roleName: string;
    originalBaseSalary?: number; // To track changes
    bonuses: BonusItem[];
};

type FormInputs = {
    periodYear: number;
    periodMonth: number;
    transportAllow: number;
    isrPercent: number;
    pensionPercent: number;
    notes: string;
    isBaseUsd: boolean;
    minReferenceSalary: number;
    isMinSalaryUsd: boolean;
    customAllowances: CustomAllowance[];
};

const formatMoney = (n: number, currency: string = 'VES') => {
    return `${currency} ` + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PayrollFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [error, setError] = useState('');
    const [previewResult, setPreviewResult] = useState<PayrollPreviewResponse | null>(null);
    const [activeRate, setActiveRate] = useState<ExchangeRate | null>(null);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);

    // Bonus Modal State
    const [editingBonusEmployeeId, setEditingBonusEmployeeId] = useState<number | null>(null);
    const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);

    // Global Bonus Feedback State
    const [isApplyingBonuses, setIsApplyingBonuses] = useState(false);
    const [justAppliedBonuses, setJustAppliedBonuses] = useState(false);

    // Employee List State
    const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([]);

    const { register, control, handleSubmit, getValues, watch, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            periodYear: new Date().getFullYear(),
            periodMonth: new Date().getMonth() + 1,
            transportAllow: 0,
            isrPercent: 0,
            pensionPercent: 0,
            notes: '',
            isBaseUsd: false, // Global switch
            minReferenceSalary: 130, // Default value
            isMinSalaryUsd: false,
            customAllowances: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "customAllowances"
    });

    const watchedAllowances = watch("customAllowances");
    const isBaseUsd = watch("isBaseUsd");
    const minReferenceSalary = watch("minReferenceSalary");
    const isMinSalaryUsd = watch("isMinSalaryUsd");

    useEffect(() => {
        if (user?.schoolId) {
            fetchInitialData();
        }
    }, [user?.schoolId]);

    const fetchInitialData = async () => {
        if (!user?.schoolId) return;
        setIsLoadingEmployees(true);
        try {
            // 1. Fetch Rates
            const rates = await apiService.getExchangeRates(user.schoolId);
            const current = rates.find(r => r.isActive && r.currencyTo === 'VES' && r.currencyFrom === 'USD');
            if (current) setActiveRate(current);

            // 2. Fetch Users (Employees)
            const allUsers = await apiService.getUsers(user.schoolId);
            // Filter out Students (Role 1), Parents (Role 3, 11) - Adjust based on ROLES const
            // ROLES: 1=Estudiante, 2=Profesor, 3=Padre, 6=Admin, 7=SuperAdmin, 8=Coord, 9=JefeDept, 10=Auxiliar, 11=Madre
            const employees = allUsers.filter(u => ![1, 3, 11, 4].includes(u.roleID)); // Added 4 just in case

            const rows: EmployeeRow[] = employees.map(u => ({
                userId: u.userID,
                userName: u.userName,
                isSelected: true, // Default to selected
                useMinSalary: false, // Default to custom/current
                customSalary: u.baseSalary || 0,
                roleName: getRoleName(u.roleID),
                originalBaseSalary: u.baseSalary || 0,
                bonuses: []
            }));

            setEmployeeRows(rows);

        } catch (e: any) {
            console.error("Error loading data", e);
            setError("Error cargando datos iniciales: " + e.message);
        } finally {
            setIsLoadingEmployees(false);
        }
    };

    const getRoleName = (roleId: number) => {
        const roles = {
            2: 'Profesor', 6: 'Admin', 8: 'Coordinador', 9: 'Jefe Dept.', 10: 'Auxiliar/Obrero'
        };
        return (roles as any)[roleId] || 'Empleado';
    };

    const handleRateUpdated = (newRate: ExchangeRate) => {
        setActiveRate(newRate);
    };

    // --- Employee List Handlers ---

    const toggleEmployeeSelection = (index: number) => {
        const newRows = [...employeeRows];
        newRows[index].isSelected = !newRows[index].isSelected;
        setEmployeeRows(newRows);
    };

    const toggleUseMinSalary = (index: number) => {
        const newRows = [...employeeRows];
        newRows[index].useMinSalary = !newRows[index].useMinSalary;
        setEmployeeRows(newRows);
    };

    const updateCustomSalary = (index: number, value: number) => {
        const newRows = [...employeeRows];
        newRows[index].customSalary = value;
        setEmployeeRows(newRows);
    };

    const handleSaveEmployeeBonuses = (userId: number, newBonuses: BonusItem[]) => {
        setEmployeeRows(prev => prev.map(row =>
            row.userId === userId ? { ...row, bonuses: newBonuses } : row
        ));
    };

    const applyGlobalBonusesToSelection = () => {
        setIsApplyingBonuses(true);
        // Snapshot current global allowances
        const rate = activeRate?.rate || 1;

        // Use fields array to get the stable ID, but data from watchedAllowances (or getValues) for latest inputs
        const currentValues = getValues().customAllowances;

        const globalSnapshots: BonusItem[] = fields.map((field, i) => {
            const val = currentValues[i];
            const amountVes = val.isUsd ? val.amount * rate : val.amount;
            return {
                id: `global-${Date.now()}-${i}`,
                name: val.name,
                amount: amountVes,
                isUsd: false, // Converted to VES
                type: 'GLOBAL',
                sourceFieldId: field.id // Link to source for sync deletion
            };
        });

        setTimeout(() => {
            setEmployeeRows(prev => prev.map(row => {
                if (!row.isSelected) return row;
                // Remove existing GLOBAL bonuses, keep MANUAL, add new GLOBAL
                const keptManual = row.bonuses.filter(b => b.type === 'MANUAL');
                return { ...row, bonuses: [...keptManual, ...globalSnapshots] };
            }));

            setIsApplyingBonuses(false);
            setJustAppliedBonuses(true);
            setTimeout(() => setJustAppliedBonuses(false), 2000);
        }, 300); // Small delay for visual feedback
    };

    const handleDeleteGlobalBonus = (index: number, fieldId: string) => {
        remove(index); // Remove from form definition

        // Sync removal from all employees
        setEmployeeRows(prev => prev.map(row => {
            const newBonuses = row.bonuses.filter(b => b.sourceFieldId !== fieldId);
            if (newBonuses.length === row.bonuses.length) return row; // No change
            return { ...row, bonuses: newBonuses };
        }));
    };

    const assignMinToSelected = () => {
        // Here we just set the toggle to TRUE for all selected
        const newRows = employeeRows.map(row => {
            if (row.isSelected) {
                return { ...row, useMinSalary: true };
            }
            return row;
        });
        setEmployeeRows(newRows);
    };

    // Calculate Summary
    const summary = useMemo(() => {
        const rate = activeRate?.rate || 0;
        let totalExtraUsd = 0;
        let totalExtraVes = 0;

        watchedAllowances?.forEach(a => {
            if (a.isUsd) {
                totalExtraUsd += (a.amount || 0);
            } else {
                totalExtraVes += (a.amount || 0);
            }
        });

        const equivalentVesFromUsd = totalExtraUsd * rate;
        const totalVes = totalExtraVes + equivalentVesFromUsd;

        return { totalExtraUsd, totalVes };

    }, [watchedAllowances, activeRate]);

    const getCalculatedSalary = (row: EmployeeRow) => {
        let baseVal = 0;
        let currency = isBaseUsd ? 'USD' : 'VES';

        if (row.useMinSalary) {
            // Use global min reference
            // Check if global min is in USD or VES
            let minVal = minReferenceSalary;

            // Convert min salary to the TARGET base currency (isBaseUsd) to display consistently
            // Logic:
            // 1. Convert MinRef to VES first (standardize)
            let minValInVes = isMinSalaryUsd ? minVal * (activeRate?.rate || 1) : minVal;

            // 2. If target is USD, convert back
            if (isBaseUsd) {
                baseVal = minValInVes / (activeRate?.rate || 1);
            } else {
                baseVal = minValInVes;
            }
        } else {
            baseVal = row.customSalary;
        }
        return { val: baseVal, currency };
    };

    const getDisplayEquivalent = (val: number, isValInUsd: boolean) => {
        if (!activeRate) return null;
        if (isValInUsd) {
            // Show VES equivalent
            return formatMoney(val * activeRate.rate, 'VES');
        }
        return null;
    };

    const getCalculatedBonusVes = (bonuses: BonusItem[]) => {
        const rate = activeRate?.rate || 1;
        return bonuses.reduce((sum, b) => {
            const val = b.isUsd ? b.amount * rate : b.amount;
            return sum + val;
        }, 0);
    };

    const getBonusNote = (bonuses: BonusItem[]) => {
        if (!bonuses.length) return '';
        // Group by name or just list limits?
        // E.g. "Aguinaldo (Global), Puntualidad"
        const names = bonuses.map(b => b.name).filter(Boolean);
        return [...new Set(names)].join(' + ');
    };


    const preProcessSalaries = async () => {
        const updates: Promise<void>[] = [];
        const rate = activeRate?.rate || 1;

        employeeRows.forEach(row => {
            if (!row.isSelected) return;

            let finalValueVes = 0;

            if (row.useMinSalary) {
                // Calculate Min Salary in VES for storage
                let minVal = minReferenceSalary;
                if (isMinSalaryUsd) {
                    minVal = minReferenceSalary * rate;
                } else {
                    minVal = minReferenceSalary; // Already VES
                }
                finalValueVes = minVal;
            } else {
                // Manual Entry
                // If isBaseUsd is ON, the input is USD -> Convert to VES
                if (isBaseUsd) {
                    finalValueVes = row.customSalary * rate;
                } else {
                    finalValueVes = row.customSalary;
                }
            }

            // Detect change (epsilon for floats)
            // We assume originalBaseSalary is in standard system currency (VES likely, or whatever is stored)
            if (Math.abs(finalValueVes - (row.originalBaseSalary || 0)) > 0.001 || row.useMinSalary) {
                updates.push(apiService.updateUserBaseSalary({
                    userID: row.userId,
                    baseSalary: finalValueVes
                }));
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates);
        }
    };

    const onPreview: SubmitHandler<FormInputs> = async (data) => {
        if (!user) { setError("Error de autenticación."); return; }

        setIsProcessing(true);
        setError('');
        setPreviewResult(null);

        try {
            await preProcessSalaries();

            // Prepare Employees Details Payload (New TVP Requirement)
            const details = employeeRows
                .filter(r => r.isSelected)
                .map(r => {
                    const salaryInfo = getCalculatedSalary(r);
                    const rate = activeRate?.rate || 1;
                    let finalBase = salaryInfo.val;
                    if (salaryInfo.currency === 'USD') {
                        finalBase = salaryInfo.val * rate;
                    }
                    const finalBonus = getCalculatedBonusVes(r.bonuses);
                    const bonusNote = getBonusNote(r.bonuses);

                    return {
                        employeeUserID: r.userId,
                        baseSalary: finalBase,
                        individualAllowance: finalBonus,
                        allowanceNote: bonusNote,
                        isSelected: true
                    };
                });

            const payload = {
                periodYear: Number(data.periodYear),
                periodMonth: Number(data.periodMonth),
                transportAllow: Number(data.transportAllow),
                isrPercent: Number(data.isrPercent),
                pensionPercent: Number(data.pensionPercent),
                notes: data.notes || "",
                schoolID: Number(user.schoolId),
                createdByUserID: Number(user.userId),
                dryRun: true,
                exchangeRate: Number(activeRate?.rate || 1),
                isUsd: Boolean(data.isBaseUsd),
                customAllowances: [], // Backend SP maps @OtherAllow from this, but we moved it to individual lines to avoid double counting per instructions
                employeesDetails: details
            };

            const result = await apiService.previewPayroll(payload);
            setPreviewResult(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al previsualizar la nómina.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunGeneration = async () => {
        if (!user) { setError("Error de autenticación."); return; }

        setIsProcessing(true);
        setError('');

        try {
            await preProcessSalaries();

            const details = employeeRows
                .filter(r => r.isSelected) // Filter ONLY selected
                .map(r => {
                    const salaryInfo = getCalculatedSalary(r);
                    const rate = activeRate?.rate || 1;
                    let finalBase = salaryInfo.val;
                    if (salaryInfo.currency === 'USD') {
                        finalBase = salaryInfo.val * rate;
                    }
                    const finalBonus = getCalculatedBonusVes(r.bonuses);
                    const bonusNote = getBonusNote(r.bonuses);

                    return {
                        employeeUserID: r.userId,
                        baseSalary: finalBase,
                        individualAllowance: finalBonus,
                        allowanceNote: bonusNote,
                        isSelected: true
                    };
                });

            const data = getValues();
            const payload = {
                periodYear: Number(data.periodYear),
                periodMonth: Number(data.periodMonth),
                transportAllow: Number(data.transportAllow),
                isrPercent: Number(data.isrPercent),
                pensionPercent: Number(data.pensionPercent),
                notes: data.notes || "",
                schoolID: Number(user.schoolId),
                createdByUserID: Number(user.userId),
                dryRun: false,
                exchangeRate: Number(activeRate?.rate || 1),
                isUsd: Boolean(data.isBaseUsd), // This tells backend "Treat BaseSalary column as USD"
                customAllowances: [], // Cleared to prevent backend double counting
                employeesDetails: details
            };

            const result = await apiService.runPayroll(payload);
            if (result && result.payrollId) {
                navigate(`/payroll/detail/${result.payrollId}`);
            } else {
                setError("La nómina se procesó pero no se recibió un ID.");
                setPreviewResult(null);
            }
        } catch (err: any) {
            setError(err.message || 'Error al generar la nómina.');
        } finally {
            setIsProcessing(false);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50";
    const smallInputClasses = "px-2 py-1 bg-surface text-text-primary border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm";

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-text-primary flex items-center"><BriefcaseIcon /><span className="ml-2">Generar Nueva Nómina</span></h1>

                {/* Exchange Rate Display */}
                <div className="bg-background-paper px-4 py-2 rounded-lg shadow border border-border flex items-center space-x-4">
                    <div>
                        <span className="text-secondary text-xs uppercase font-bold block">Tasa BCV del Día</span>
                        <span className="text-xl font-mono font-bold text-primary">
                            {activeRate ? activeRate.rate.toFixed(2) : "---"} VES
                        </span>
                    </div>
                    <button
                        onClick={() => setIsRateModalOpen(true)}
                        className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-accent-dark transition-colors"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {/* SUMMARY PANEL CONFIRMATION */}
            {previewResult && previewResult.summary && (
                <div className="bg-white border-l-4 border-success p-4 rounded shadow-md flex justify-between items-center animate-fadeIn">
                    <div>
                        <h3 className="text-lg font-bold text-success-dark">Resumen de Nómina (Vista Previa)</h3>
                        <div className="flex space-x-6 mt-2 text-sm">
                            <div>
                                <span className="block text-gray-500">Empleados</span>
                                <span className="font-semibold text-lg">{previewResult.summary.employees}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">Total Devengado (VES)</span>
                                <span className="font-semibold text-lg text-primary">{formatMoney(previewResult.summary.gross, 'VES')}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">Deducciones (VES)</span>
                                <span className="font-semibold text-lg text-danger">{formatMoney(previewResult.summary.ded, 'VES')}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">Neto a Pagar (VES)</span>
                                <span className="font-bold text-xl text-success-text">{formatMoney(previewResult.summary.net, 'VES')}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={handleRunGeneration}
                            className="bg-success text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-success-dark transition-transform transform hover:scale-105"
                        >
                            Confirmar y Ejecutar Nómina
                        </button>
                    </div>
                </div>
            )}

            {error && <div className="bg-danger-light text-danger-text p-3 rounded">{error}</div>}

            <form onSubmit={handleSubmit(onPreview)} className="space-y-6">

                {/* Main Configuration + Min Salary */}
                <div className="bg-surface p-6 rounded-lg shadow-md space-y-4">
                    <h2 className="text-lg font-semibold text-secondary border-b pb-2 mb-4">Configuración General</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium">Período (Año / Mes)</label>
                            <div className="flex space-x-2">
                                <select {...register('periodYear', { valueAsNumber: true })} className={inputClasses}>
                                    {[...Array(5)].map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                                </select>
                                <select {...register('periodMonth', { valueAsNumber: true })} className={inputClasses}>
                                    {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Bonificación Transporte</label>
                            <div className="relative">
                                <input type="number" step="0.01" {...register('transportAllow', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                                <span className="absolute right-3 top-2 text-gray-400 text-sm">VES</span>
                            </div>
                        </div>

                        {/* Reference Min Salary */}
                        <div>
                            <label className="block text-sm font-medium text-primary">Sueldo Mínimo de Referencia</label>
                            <div className="flex space-x-2">
                                <input
                                    type="number" step="0.01"
                                    {...register('minReferenceSalary', { valueAsNumber: true, min: 0 })}
                                    className={inputClasses}
                                />
                                <div className="flex flex-col justify-center space-y-1">
                                    <button type="button" onClick={() => setValue('isMinSalaryUsd', false)} className={`text-xs px-2 py-0.5 rounded ${!isMinSalaryUsd ? 'bg-primary text-white' : 'bg-gray-200'}`}>VES</button>
                                    <button type="button" onClick={() => setValue('isMinSalaryUsd', true)} className={`text-xs px-2 py-0.5 rounded ${isMinSalaryUsd ? 'bg-success text-white' : 'bg-gray-200'}`}>USD</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Switches ROW */}
                    <div className="flex items-center space-x-8 pt-4 border-t border-gray-100">
                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...register('isBaseUsd')} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ms-3 text-sm font-medium text-text-primary">¿Sueldos base en BD son USD?</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <div>
                            <label className="block text-sm font-medium">% ISLR</label>
                            <input type="number" step="0.01" {...register('isrPercent', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">% Pensión/SSO</label>
                            <input type="number" step="0.01" {...register('pensionPercent', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium">Notas</label>
                            <input {...register('notes')} className={inputClasses} />
                        </div>
                    </div>
                </div>

                {/* Dynamic Bonuses */}
                <div className="bg-surface p-6 rounded-lg shadow-md space-y-4">
                    <h2 className="text-lg font-semibold text-secondary">Asignaciones Especiales (Bonos Globales)</h2>
                    <div className="flex space-x-2 items-center">
                        <button
                            type="button"
                            onClick={applyGlobalBonusesToSelection}
                            disabled={isApplyingBonuses}
                            className={`px-3 py-1 rounded text-sm font-bold flex items-center transition-all shadow-sm transform active:scale-95 ${justAppliedBonuses
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'
                                }`}
                            title="Calcula y aplica estos bonos a los empleados seleccionados"
                        >
                            {isApplyingBonuses ? (
                                <span className="animate-spin mr-2">⏳</span>
                            ) : justAppliedBonuses ? (
                                <span className="mr-2">✓</span>
                            ) : (
                                <span className="mr-2">✨</span>
                            )}
                            {justAppliedBonuses ? 'Aplicado' : 'Aplicar a Nómina'}
                        </button>
                        <button
                            type="button"
                            onClick={() => append({ name: '', amount: 0, isUsd: true })}
                            className="bg-accent-light text-accent-dark px-3 py-1 rounded hover:bg-opacity-80 text-sm font-bold flex items-center shadow-sm"
                        >
                            + Añadir Bono Global
                        </button>
                    </div>
                </div>

                {fields.length === 0 && (
                    <p className="text-text-secondary italic text-sm text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                        No hay bonos globales configurados.
                    </p>
                )}

                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded shadow-sm animate-fadeIn">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                {/* Name Input */}
                                <input
                                    placeholder="Concepto (Ej. Prima Navidad)"
                                    {...register(`customAllowances.${index}.name` as const, { required: true })}
                                    className="px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-full"
                                />

                                <div className="flex space-x-2">
                                    {/* Amount Input */}
                                    <input
                                        type="number" step="0.01"
                                        placeholder="Monto"
                                        {...register(`customAllowances.${index}.amount` as const, { valueAsNumber: true, min: 0 })}
                                        className="px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-full text-right"
                                    />

                                    {/* Currency Select */}
                                    <select
                                        {...register(`customAllowances.${index}.isUsd` as const)}
                                        className="px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-24"
                                    >
                                        <option value="true">USD</option>
                                        <option value="false">VES</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleDeleteGlobalBonus(index, field.id)}
                                className="ml-4 text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="Eliminar y sincronizar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Real-time Summary */}
                {watchedAllowances.length > 0 && activeRate && (
                    <div className="mt-4 bg-gray-50 p-3 rounded text-sm text-right border-t border-dashed border-gray-300">
                        <p className="text-text-secondary">
                            Total Extra USD: <span className="font-bold text-gray-800">{formatMoney(summary.totalExtraUsd, 'USD')}</span>
                        </p>
                        <p className="text-primary font-bold text-lg mt-1">
                            Valor Actual Global en VES: {formatMoney(summary.totalVes, 'VES')}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                            (Presiona "Aplicar a Nómina" para reflejar esto en los empleados)
                        </p>
                    </div>
                )}


                {/* EMPLOYEES CHECKLIST TABLE */}
                <div className="bg-surface p-6 rounded-lg shadow-md space-y-4">

                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-semibold text-secondary">Lista de Empleados</h2>
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={assignMinToSelected}
                                className="text-sm bg-info-light text-info-text px-3 py-1 rounded hover:bg-info hover:text-white transition-colors shadow-sm"
                            >
                                Asignar Sueldo Mín. a Seleccionados
                            </button>
                        </div>
                    </div>

                    {isLoadingEmployees ? <div className="text-center py-4">Cargando empleados...</div> : (
                        <div className="overflow-x-auto border border-border rounded-md">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-10">
                                            <input type="checkbox" className="h-4 w-4 rounded"
                                                checked={employeeRows.every(r => r.isSelected)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setEmployeeRows(employeeRows.map(r => ({ ...r, isSelected: checked })));
                                                }}
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">¿Sueldo Mín?</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sueldo Base ({isBaseUsd ? 'USD' : 'VES'})</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bono Extra ({isBaseUsd ? 'USD' : 'VES'})</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 uppercase bg-gray-100">TOTAL A COBRAR (VES)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-border">
                                    {employeeRows.map((row, idx) => {
                                        const salaryInfo = getCalculatedSalary(row);
                                        const equivalentRender = getDisplayEquivalent(salaryInfo.val, isBaseUsd);

                                        // Calculation for Total Column
                                        const rate = activeRate?.rate || 1;
                                        let baseVes = 0;
                                        // 1. Base Salary 
                                        if (salaryInfo.currency === 'USD') {
                                            baseVes = salaryInfo.val * rate;
                                        } else {
                                            baseVes = salaryInfo.val;
                                        }

                                        // 2. Individual Bonus (Snapshot-based)
                                        const indBonusVes = getCalculatedBonusVes(row.bonuses);

                                        // 3. Global Allowances (Removed from automatic sum, relying on snapshot)
                                        const globalBonusesVes = 0;

                                        // 4. Transport Allowance
                                        const transportVes = watch('transportAllow') || 0;

                                        const totalToPayVes = baseVes + indBonusVes + globalBonusesVes + transportVes;

                                        return (
                                            <tr key={row.userId} className={!row.isSelected ? 'opacity-50 bg-gray-50' : ''}>
                                                <td className="px-4 py-2 align-middle">
                                                    <input type="checkbox" checked={row.isSelected} onChange={() => toggleEmployeeSelection(idx)} className="h-4 w-4 text-primary rounded" />
                                                </td>
                                                <td className="px-4 py-2 font-medium text-text-primary align-middle">
                                                    <div>{row.userName}</div>
                                                    <div className="text-xs text-text-secondary">{row.roleName}</div>
                                                </td>
                                                <td className="px-4 py-2 align-middle text-center">
                                                    <div className="flex justify-center items-center h-full">
                                                        <div className="relative inline-block w-10 select-none transition duration-200 ease-in">
                                                            <input
                                                                type="checkbox"
                                                                id={`toggle-min-${idx}`}
                                                                checked={row.useMinSalary}
                                                                onChange={() => toggleUseMinSalary(idx)}
                                                                disabled={!row.isSelected}
                                                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                            />
                                                            <label htmlFor={`toggle-min-${idx}`} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${row.useMinSalary ? 'bg-success' : 'bg-gray-300'}`}></label>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right align-middle">
                                                    <div className="flex flex-col items-end">
                                                        <input
                                                            type="number" step="0.01"
                                                            value={salaryInfo.val}
                                                            onChange={(e) => updateCustomSalary(idx, parseFloat(e.target.value) || 0)}
                                                            disabled={!row.isSelected || row.useMinSalary}
                                                            className={`text-right w-32 border border-gray-300 rounded px-2 py-1 ${row.useMinSalary ? 'bg-gray-100 text-gray-500' : 'bg-white focus:ring-2 focus:ring-accent/50'}`}
                                                        />
                                                        {equivalentRender && (
                                                            <span className="text-xs text-info-text mt-0.5 font-mono">
                                                                Min: {equivalentRender}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right align-middle">
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="font-bold text-gray-800 text-sm">
                                                                {formatMoney(getCalculatedBonusVes(row.bonuses), 'VES')}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingBonusEmployeeId(row.userId);
                                                                    setIsBonusModalOpen(true);
                                                                }}
                                                                disabled={!row.isSelected}
                                                                className="text-white bg-blue-500 hover:bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs disabled:opacity-50"
                                                                title="Editar Bonos"
                                                            >
                                                                ✎
                                                            </button>
                                                        </div>
                                                        {row.bonuses.length > 0 && (
                                                            <span className="text-[10px] text-gray-500 mt-1 max-w-[120px] truncate block" title={getBonusNote(row.bonuses)}>
                                                                {getBonusNote(row.bonuses)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-2 text-right align-middle font-bold text-gray-900 bg-gray-50">
                                                    {formatMoney(totalToPayVes, 'VES')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                    }
                </div >


                <div className="flex justify-end space-x-2 pt-4">
                    <Link to="/payroll" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                    <button type="submit" disabled={isProcessing} className="bg-secondary text-text-on-primary py-2 px-6 rounded hover:bg-opacity-80 disabled:opacity-50 font-bold shadow-sm">
                        {isProcessing && !previewResult ? 'Procesando...' : 'Previsualizar Nómina'}
                    </button>
                </div>
            </form >

            {previewResult && (
                <div className="bg-surface p-6 rounded-lg shadow-md space-y-4 border-t-4 border-info">
                    <h2 className="text-xl font-semibold text-info-dark">Resultado de la Previsualización</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-info-light rounded-md">
                        <div><div className="text-sm">Empleados</div><div className="text-lg font-bold">{previewResult.summary.employees}</div></div>
                        <div><div className="text-sm">Bruto (VES)</div><div className="text-lg font-bold">{formatMoney(previewResult.summary.gross)}</div></div>
                        <div><div className="text-sm">Deducciones</div><div className="text-lg font-bold text-danger-text">{formatMoney(previewResult.summary.ded)}</div></div>
                        <div><div className="text-sm">Neto (VES)</div><div className="text-lg font-bold text-success-text">{formatMoney(previewResult.summary.net)}</div></div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header-light">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium">Empleado</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Base</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Asig.</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Deduc.</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Neto</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border text-sm">
                                {previewResult.detail.map((line, idx) => (
                                    <tr key={`${line.employeeUserID} -${idx} `}>
                                        <td className="px-2 py-1">{line.employeeName}</td>
                                        <td className="px-2 py-1 text-right text-text-secondary">{formatMoney(line.baseAmount)}</td>
                                        <td className="px-2 py-1 text-right text-success">{formatMoney(line.transportAllow + line.otherAllow)}</td>
                                        <td className="px-2 py-1 text-right text-danger-text">({formatMoney(line.isr + line.pension + line.otherDed)})</td>
                                        <td className="px-2 py-1 text-right font-bold text-primary">{formatMoney(line.netPay)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleRunGeneration} disabled={isProcessing} className="bg-primary text-text-on-primary py-3 px-8 rounded hover:bg-opacity-90 disabled:bg-secondary font-bold text-lg shadow-md transition-transform hover:-translate-y-0.5">
                            {isProcessing ? 'Generando...' : 'CONFIRMAR Y GENERAR NÓMINA'}
                        </button>
                    </div>
                </div>
            )}

            <UpdateExchangeRateModal
                isOpen={isRateModalOpen}
                onClose={() => setIsRateModalOpen(false)}
                currentRate={activeRate?.rate || 0}
                onRateUpdated={handleRateUpdated}
            />

            {/* Bonus Modal */}
            {
                isBonusModalOpen && editingBonusEmployeeId && (
                    <EmployeeBonusModal
                        isOpen={isBonusModalOpen}
                        onClose={() => {
                            setIsBonusModalOpen(false);
                            setEditingBonusEmployeeId(null);
                        }}
                        employeeName={employeeRows.find(r => r.userId === editingBonusEmployeeId)?.userName || ''}
                        currentBonuses={employeeRows.find(r => r.userId === editingBonusEmployeeId)?.bonuses || []}
                        onSave={(newBonuses) => handleSaveEmployeeBonuses(editingBonusEmployeeId, newBonuses)}
                        activeRate={activeRate?.rate || 1}
                    />
                )
            }

            <style>{`
    .toggle - checkbox:checked {
    right: 0;
    border - color: #68D391;
}
                .toggle - checkbox: checked + .toggle - label {
    background - color: #68D391;
}
                .toggle - checkbox {
    right: 0px;
}
`}</style>
        </div >
    );
};

export default PayrollFormPage;

