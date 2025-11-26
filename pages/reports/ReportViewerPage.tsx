
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CertificadoTemplate from './CertificacionEmgReport';
import ResumenFinalEmgReport from './ResumenFinalEmgReport';
import ResumenFinalPrimariaReport from './ResumenFinalPrimariaReport';
import CertificateTemplate from '../certificates/CertificateTemplate';
import DescriptiveGradeReport from './DescriptiveGradeReport';
import BoletaReport from './BoletaReport';

const ReportViewerPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { reportData, reportType, classroom, student, evaluation, grade } = location.state || {};
    const templateRef = React.useRef<HTMLDivElement>(null);

    if (!reportData && reportType !== 'descriptive-grade') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
                <div className="bg-surface p-8 rounded-lg shadow-md text-center">
                    <h2 className="text-xl font-bold text-danger mb-4">Error al cargar el reporte</h2>
                    <p>No se encontraron datos para mostrar. Por favor, genere un reporte primero.</p>
                    <button onClick={() => navigate('/reports')} className="mt-6 bg-primary text-text-on-primary py-2 px-6 rounded hover:bg-opacity-80 transition-colors">
                        Volver a Reportes
                    </button>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        switch (reportType) {
            case 'boleta':
                navigate('/boletas');
                break;
            case 'certificate':
                navigate('/certificates');
                break;
            case 'resumen':
            case 'resumen_primaria':
            case 'certificado':
                navigate('/reports');
                break;
            default:
                navigate(-1);
                break;
        }
    };

    return (
        <div className="bg-background p-4 print:p-0 print:bg-white">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        margin: 0;
                        padding: 0;
                        transform: scale(1);
                        box-shadow: none;
                    }
                    .no-print {
                        display: none !important;
                    }
                    html, body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
            <div className="no-print max-w-4xl mx-auto mb-4 flex justify-between items-center bg-surface p-4 rounded shadow">
                 <h1 className="text-xl font-bold text-text-primary">Vista de Impresión de Reporte</h1>
                <div>
                    <button onClick={handleBack} className="bg-secondary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 mr-2 transition-colors">Volver</button>
                    <button onClick={handlePrint} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">Imprimir</button>
                </div>
            </div>

            <div id="print-section" className="print-container bg-surface shadow-lg mx-auto" style={{ width: '210mm' }}>
                {reportType === 'certificado' && <CertificadoTemplate reportData={reportData} student={student} templateRef={templateRef} />}
                {reportType === 'resumen' && <ResumenFinalEmgReport data={reportData} classroom={classroom} templateRef={templateRef} />}
                {reportType === 'resumen_primaria' && <ResumenFinalPrimariaReport data={reportData} templateRef={templateRef} />}
                {reportType === 'certificate' && <CertificateTemplate data={reportData} templateRef={templateRef} />}
                {reportType === 'descriptive-grade' && <DescriptiveGradeReport student={student} evaluation={evaluation} grade={grade} templateRef={templateRef} />}
                {reportType === 'boleta' && <BoletaReport data={reportData} templateRef={templateRef} />}
            </div>
        </div>
    );
};

export default ReportViewerPage;
