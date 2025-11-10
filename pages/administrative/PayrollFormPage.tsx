import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { BriefcaseIcon } from '../../components/icons';
import { PayrollPreviewResponse } from '../../types';

type FormInputs = {
  periodYear: number;
  periodMonth: number;
  transportAllow: number;
  ISRPercent: number;
  pensionPercent: number;
  notes: string;
};

const formatMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [previewResult, setPreviewResult] = useState<PayrollPreviewResponse | null>(null);

    const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            periodYear: new Date().getFullYear(),
            periodMonth: new Date().getMonth() + 1,
            transportAllow: 0,
            ISRPercent: 0,
            pensionPercent: 0,
            notes: ''
        }
    });

    const onPreview: SubmitHandler<FormInputs> = async (data) => {
        if (!user) {
            setError("Error de autenticación.");
            return;
        }

        setIsProcessing(true);
        setError('');
        setPreviewResult(null);
        
        const payload = {
            ...data,
            schoolID: user.schoolId,
            createdByUserID: user.userId,
            dryRun: true
        };

        try {
            const result = await apiService.previewPayroll(payload);
            setPreviewResult(result);
        } catch (err: any) {
            setError(err.message || 'Error al previsualizar la nómina.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunGeneration = async () => {
        if (!user) {
            setError("Error de autenticación.");
            return;
        }

        setIsProcessing(true);
        setError('');
        
        const data = getValues();
        const payload = {
            ...data,
            schoolID: user.schoolId,
            createdByUserID: user.userId,
            dryRun: false
        };

        try {
            const result = await apiService.runPayroll(payload);
            if (result && result.payrollId) {
                navigate(`/payroll/detail/${result.payrollId}`);
            } else {
                 setError("La nómina se procesó pero no se recibió un ID. Verifique el listado de nóminas.");
                 setPreviewResult(null);
            }
        } catch (err: any) {
            setError(err.message || 'Error al generar la nómina.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-text-primary flex items-center"><BriefcaseIcon /><span className="ml-2">Generar Nueva Nómina</span></h1>
            
            {error && <div className="bg-danger-light text-danger-text p-3 rounded">{error}</div>}

            <form onSubmit={handleSubmit(onPreview)} className="bg-surface p-6 rounded-lg shadow-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Año</label>
                        <select {...register('periodYear', { valueAsNumber: true })} className={inputClasses}>
                            {[...Array(5)].map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Mes</label>
                        <select {...register('periodMonth', { valueAsNumber: true })} className={inputClasses}>
                            {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Bono Transporte</label>
                        <input type="number" step="0.01" {...register('transportAllow', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">% ISLR</label>
                        <input type="number" step="0.01" {...register('ISRPercent', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">% Pensión</label>
                        <input type="number" step="0.01" {...register('pensionPercent', { valueAsNumber: true, min: 0 })} className={inputClasses} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium">Notas (opcional)</label>
                        <textarea {...register('notes')} rows={2} className={inputClasses} />
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Link to="/payroll" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                    <button type="submit" disabled={isProcessing} className="bg-secondary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:opacity-50">
                        {isProcessing && !previewResult ? 'Procesando...' : 'Previsualizar Nómina'}
                    </button>
                </div>
            </form>

            {previewResult && (
                <div className="bg-surface p-6 rounded-lg shadow-md space-y-4 border-t-4 border-info">
                    <h2 className="text-xl font-semibold text-info-dark">Resultado de la Previsualización</h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-info-light rounded-md">
                        <div><div className="text-sm">Empleados</div><div className="text-lg font-bold">{previewResult.summary.employees}</div></div>
                        <div><div className="text-sm">Bruto</div><div className="text-lg font-bold">{formatMoney(previewResult.summary.gross)}</div></div>
                        <div><div className="text-sm">Deducciones</div><div className="text-lg font-bold text-danger-text">{formatMoney(previewResult.summary.ded)}</div></div>
                        <div><div className="text-sm">Neto</div><div className="text-lg font-bold text-success-text">{formatMoney(previewResult.summary.net)}</div></div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header-light">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium">Empleado</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Base</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Asignaciones</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Deducciones</th>
                                    <th className="px-2 py-2 text-right text-xs font-medium">Neto a Pagar</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border text-sm">
                                {previewResult.detail.map(line => (
                                    <tr key={line.employeeUserID}>
                                        <td className="px-2 py-1">{line.employeeName}</td>
                                        <td className="px-2 py-1 text-right">{formatMoney(line.baseAmount)}</td>
                                        <td className="px-2 py-1 text-right">{formatMoney(line.transportAllow + line.otherAllow)}</td>
                                        <td className="px-2 py-1 text-right text-danger-text">({formatMoney(line.isr + line.pension + line.otherDed)})</td>
                                        <td className="px-2 py-1 text-right font-bold">{formatMoney(line.netPay)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end">
                        <button onClick={handleRunGeneration} disabled={isProcessing} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                             {isProcessing ? 'Generando...' : 'Generar y Guardar Nómina'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollFormPage;