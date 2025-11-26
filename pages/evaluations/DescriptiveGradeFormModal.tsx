import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, User, Grade } from '../../types';
import Modal from '../../components/Modal';
import DescriptiveGradeSheet from '../../components/evaluations/DescriptiveGradeSheet';
import { SALA_1_INDICATORS, SALA_2_INDICATORS, SALA_3_INDICATORS } from '../../data/indicators';

interface DescriptiveGradeFormModalProps {
    student: User;
    evaluation: Evaluation;
    existingGrade: Grade | null;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const DescriptiveGradeFormModal: React.FC<DescriptiveGradeFormModalProps> = ({ student, evaluation, existingGrade, onClose, onSaveSuccess }) => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const getIndicators = () => {
        const courseName = evaluation.course?.name.toLowerCase() || '';
        if (courseName.includes('nivel 1') || courseName.includes('sala 1')) return SALA_1_INDICATORS;
        if (courseName.includes('nivel 2') || courseName.includes('sala 2')) return SALA_2_INDICATORS;
        if (courseName.includes('nivel 3') || courseName.includes('sala 3')) return SALA_3_INDICATORS;
        return SALA_1_INDICATORS; // Fallback to Sala 1
    };

    const indicators = getIndicators();

    const getDefaultValues = () => {
        if (existingGrade && existingGrade.gradeText?.startsWith('[DESCRIPTIVA]')) {
            try {
                const jsonString = existingGrade.gradeText.replace('[DESCRIPTIVA]', '');
                return JSON.parse(jsonString);
            } catch (e) {
                console.error("Failed to parse existing grade text:", e);
                return {};
            }
        }
        return {};
    };

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: getDefaultValues(),
    });

    const onSubmit = async (data: any) => {
        if (!user) return;
        setIsSaving(true);
        setError('');

        const gradeText = `[DESCRIPTIVA]${JSON.stringify(data)}`;

        try {
            await apiService.assignGrade({
                userID: student.userID,
                evaluationID: evaluation.evaluationID,
                courseID: evaluation.courseID,
                schoolID: user.schoolId,
                gradeValue: null,
                gradeText: gradeText,
                comments: "Nota Descriptiva",
            });
            onSaveSuccess();
        } catch (err: any) {
            setError(err.message || 'Error al guardar la nota descriptiva.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Planilla Descriptiva - ${student.userName}`}>
            <form onSubmit={handleSubmit(onSubmit)}>
                {error && <p className="text-danger bg-danger-light p-2 rounded mb-4">{error}</p>}
                
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                    <DescriptiveGradeSheet indicators={indicators} register={register} />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
                    <button type="button" onClick={onClose} disabled={isSaving} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary">
                        {isSaving ? 'Guardando...' : 'Guardar Planilla'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DescriptiveGradeFormModal;