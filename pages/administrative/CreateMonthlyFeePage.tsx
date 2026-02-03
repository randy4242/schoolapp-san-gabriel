
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { User, ExchangeRate } from '../../types';
import UpdateExchangeRateModal from '../../components/UpdateExchangeRateModal';

interface AudienceTarget {
    targetID: number;
    targetType: "User";
    customPrice?: number | null;
}

interface MonthlyFeeFormInputs {
    name: string;
    description: string;
    salePrice: number;
    audiences: {
        userId: number;
        userName: string;
        selected: boolean;
        applySubsidy: boolean;
        customPrice?: number | null;
        isScholarship: boolean;
    }[];
}

const CreateMonthlyFeePage: React.FC = () => {
    const { user } = useAuth();
    const token = user?.token;
    const navigate = useNavigate();
    const [isLoadingParents, setIsLoadingParents] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [activeRate, setActiveRate] = useState<ExchangeRate | null>(null);
    const [currency, setCurrency] = useState<'VES' | 'USD'>('VES');
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);

    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<MonthlyFeeFormInputs>({
        defaultValues: {
            name: '',
            description: '',
            salePrice: 0,
            audiences: []
        }
    });

    const { fields } = useFieldArray({
        control,
        name: "audiences"
    });

    // Watch audiences to conditionally render inputs (performance optimization could be done here if list is huge)
    const watchedAudiences = watch("audiences");
    const watchedSalePrice = watch("salePrice");

    // Calculate Summary
    const summary = React.useMemo(() => {
        if (!watchedAudiences) return { standard: 0, subsidized: 0, excluded: 0 };
        let standard = 0;
        let subsidized = 0;
        let excluded = 0;

        watchedAudiences.forEach(a => {
            if (a.isScholarship) {
                excluded++;
            } else if (a.selected) {
                if (a.applySubsidy) {
                    subsidized++;
                } else {
                    standard++;
                }
            }
        });
        return { standard, subsidized, excluded };
    }, [watchedAudiences]);

    useEffect(() => {
        if (user?.schoolId) {
            fetchData();
        }
    }, [user?.schoolId]);

    const fetchData = async () => {
        if (!user?.schoolId) return;
        setIsLoadingParents(true);
        try {
            // Load parents
            const parentsResp = await fetch(`https://siscamoruco.somee.com/api/users?schoolId=${user?.schoolId}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (!parentsResp.ok) throw new Error('Error al cargar padres');
            const users: User[] = await parentsResp.json();
            const parents = users.filter(u => u.roleID === 3 || u.roleID === 11);

            setValue("audiences", parents.map(p => ({
                userId: p.userID,
                userName: p.userName,
                selected: false,
                applySubsidy: false,
                customPrice: null,
                isScholarship: false
            })));

            // Load exchange rates
            const rates = await apiService.getExchangeRates(user.schoolId);
            const current = rates.find(r => r.isActive && r.currencyTo === 'VES' && r.currencyFrom === 'USD'); // Assuming USD -> VES direction
            if (current) {
                setActiveRate(current);
            }

        } catch (error) {
            console.error(error);
            setSubmitError("No se pudieron cargar los datos iniciales.");
        } finally {
            setIsLoadingParents(false);
        }
    };

    const handleRateUpdated = (newRate: ExchangeRate) => {
        setActiveRate(newRate);
    };

    const handleScholarshipToggle = (index: number, isChecked: boolean) => {
        setValue(`audiences.${index}.isScholarship`, isChecked);
        if (isChecked) {
            setValue(`audiences.${index}.selected`, false);
            setValue(`audiences.${index}.applySubsidy`, false);
            setValue(`audiences.${index}.customPrice`, null);
        }
    };

    const onSubmit: SubmitHandler<MonthlyFeeFormInputs> = async (data) => {
        if (!user || !token) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // Calculate final price based on currency
            let finalSalePrice = data.salePrice;
            if (currency === 'USD' && activeRate) {
                finalSalePrice = data.salePrice * activeRate.rate;
            }

            // Transform form data to payload
            const selectedAudiences = data.audiences.filter(a => a.selected && !a.isScholarship);

            if (selectedAudiences.length === 0) {
                setSubmitError("Debes seleccionar al menos un padre para facturar.");
                setIsSubmitting(false);
                return;
            }

            const payloadAudiences = selectedAudiences.map(a => {
                // Also convert custom price if subsidized
                let finalCustomPrice = a.customPrice;
                // NOTE: Assuming customPrice input respects the SAME currency as the main price for simplicity, 
                // or we could force customPrice to always be in base currency.
                // Given the complexities, let's assume customPrice is always entered in the selected currency too.
                if (a.applySubsidy && typeof a.customPrice === 'number' && currency === 'USD' && activeRate) {
                    finalCustomPrice = a.customPrice * activeRate.rate;
                }

                return {
                    targetID: a.userId,
                    targetType: "User" as const,
                    customPrice: a.applySubsidy ? finalCustomPrice : null
                };
            });

            const payload = {
                name: data.name,
                description: data.description,
                salePrice: finalSalePrice,
                audiences: payloadAudiences,
                // Hidden automatic fields
                sku: "MENS-" + Date.now(),
                costPrice: 0,
                type: "S",
                isActive: true,
                schoolID: user.schoolId
            };

            const response = await fetch(`https://siscamoruco.somee.com/api/products/generate-monthly-fee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Error al crear la mensualidad');
            }

            const newProduct = await response.json();

            // Redirect with state
            navigate('/administrative/monthly-generation', {
                state: { productID: newProduct.productID }
            });

        } catch (error: any) {
            console.error(error);
            setSubmitError(error.message || "Error desconocido al procesar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/50";
    const checkboxClasses = "h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent";

    return (
        <div className="p-6 max-w-4xl mx-auto bg-background-paper rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-primary">Generar Mensualidad</h1>

            {submitError && (
                <div className="mb-4 p-3 bg-danger-light text-danger rounded border border-danger">
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre Mensualidad</label>
                        <input
                            {...register('name', { required: 'Nombre es requerido' })}
                            className={inputClasses}
                            placeholder="Ej: Mensualidad Febrero 2026"
                        />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Precio Estándar</label>
                        <div className="flex space-x-2">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('salePrice', { required: 'Precio es requerido', min: 0, valueAsNumber: true })}
                                    className={inputClasses}
                                />
                            </div>
                            <div className="flex items-center bg-surface border border-border rounded px-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrency('VES')}
                                    className={`px-2 py-1 rounded text-sm font-bold ${currency === 'VES' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-gray-100'}`}
                                >
                                    VES
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrency('USD')}
                                    className={`px-2 py-1 rounded text-sm font-bold ${currency === 'USD' ? 'bg-success text-white' : 'text-text-secondary hover:bg-gray-100'}`}
                                >
                                    USD
                                </button>
                            </div>
                        </div>

                        {errors.salePrice && <p className="text-danger text-xs mt-1">{errors.salePrice.message}</p>}

                        {/* Dynamic Conversion Display */}
                        {currency === 'USD' && activeRate && (
                            <div className="mt-1 flex items-center text-sm text-text-secondary">
                                <span>Tasa: {activeRate.rate} VES/USD</span>
                                <button
                                    type="button"
                                    onClick={() => setIsRateModalOpen(true)}
                                    className="ml-2 text-accent hover:text-accent-dark font-medium text-xs underline"
                                >
                                    Editar Tasa
                                </button>
                                <span className="mx-2">—</span>
                                <span>Equivalente a: <span className="font-bold text-primary">{(watchedSalePrice * activeRate.rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} VES</span></span>
                            </div>
                        )}
                        {currency === 'USD' && !activeRate && (
                            <div className="mt-1 flex items-center">
                                <p className="text-xs text-warning-text">No se encontró tasa activa.</p>
                                <button
                                    type="button"
                                    onClick={() => setIsRateModalOpen(true)}
                                    className="ml-2 text-accent hover:text-accent-dark font-medium text-xs underline"
                                >
                                    Definir Tasa
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                        {...register('description')}
                        className={inputClasses}
                        rows={3}
                    />
                </div>

                {/* Summary Section */}
                <div className="bg-info-light text-info-text p-4 rounded-md text-sm grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="font-bold text-lg">{summary.standard}</p>
                        <p>Pagarán Precio Estándar</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{summary.subsidized}</p>
                        <p>Pagarán con Subsidio</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-warning-text">{summary.excluded}</p>
                        <p>Excluidos (Beca 100%)</p>
                    </div>
                </div>

                {/* Parents List */}
                <div className="border-t pt-4">
                    <h2 className="text-lg font-semibold mb-4 text-secondary">Selección de Padres</h2>
                    {isLoadingParents ? (
                        <p className="text-text-secondary">Cargando padres...</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 border border-border rounded p-2">
                            {fields.map((field, index) => {
                                const isScholarship = watchedAudiences[index]?.isScholarship;

                                return (
                                    <div key={field.id} className={`flex items-center justify-between p-3 rounded border ${isScholarship ? 'bg-gray-100 border-gray-300' : 'bg-surface border-border hover:bg-background'}`}>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                {...register(`audiences.${index}.selected`)}
                                                className={checkboxClasses}
                                                disabled={isScholarship}
                                            />
                                            <div>
                                                <div className="font-medium text-text-primary">
                                                    {watchedAudiences[index]?.userName}
                                                </div>
                                                {isScholarship && <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full">Excluido por Beca</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            {/* Scholarship Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleScholarshipToggle(index, !isScholarship)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${isScholarship ? 'bg-primary text-white border-primary' : 'bg-transparent text-text-secondary border-border hover:bg-gray-100'}`}
                                            >
                                                {isScholarship ? 'Beca Activa' : 'Aplicar Beca 100%'}
                                            </button>

                                            {/* Subsidy Logic (only show if selected and NOT scholarship) */}
                                            {watchedAudiences[index]?.selected && !isScholarship && (
                                                <div className="flex items-center space-x-4 animate-fadeIn">
                                                    <div className="flex items-center space-x-2">
                                                        <label className="text-sm cursor-pointer select-none" htmlFor={`subsidy-${index}`}>Subsidio</label>
                                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                                            <input
                                                                type="checkbox"
                                                                id={`subsidy-${index}`}
                                                                {...register(`audiences.${index}.applySubsidy`)}
                                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                            />
                                                            <label htmlFor={`subsidy-${index}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                                        </div>
                                                    </div>

                                                    {watchedAudiences[index]?.applySubsidy && (
                                                        <div className="w-32">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="Precio Esp."
                                                                {...register(`audiences.${index}.customPrice`, {
                                                                    valueAsNumber: true,
                                                                    required: watchedAudiences[index]?.applySubsidy ? "Requerido" : false
                                                                })}
                                                                className="p-1 px-2 border border-border rounded w-full text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {fields.length === 0 && <p className="text-center text-text-secondary">No se encontraron padres.</p>}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/administrative/monthly-generation')}
                        className="mr-3 px-4 py-2 border border-border rounded text-text-primary hover:bg-surface"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-primary text-text-on-primary rounded hover:bg-opacity-90 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Generando...' : 'Generar Mensualidad'}
                    </button>
                </div>
            </form>

            <UpdateExchangeRateModal
                isOpen={isRateModalOpen}
                onClose={() => setIsRateModalOpen(false)}
                currentRate={activeRate?.rate || 0}
                onRateUpdated={handleRateUpdated}
            />

            <style>{`
                .toggle-checkbox:checked {
                    right: 0;
                    border-color: #68D391;
                }
                .toggle-checkbox:checked + .toggle-label {
                    background-color: #68D391;
                }
                .toggle-checkbox {
                     right: 0px; /* adjusted manually in class but logic needs standard css */
                }
            `}</style>
        </div>
    );
};

export default CreateMonthlyFeePage;
