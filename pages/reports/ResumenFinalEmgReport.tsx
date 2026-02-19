import React from 'react';
import { ReportEmgClassroomResponse, Classroom } from '../../types';

interface ResumenFinalEmgReportProps {
  data: ReportEmgClassroomResponse;
  classroom: Classroom | null;
  templateRef: React.RefObject<HTMLDivElement>;
}

const ResumenFinalEmgReport: React.FC<ResumenFinalEmgReportProps> = ({ data, classroom, templateRef }) => {
    
    const studentRows = Array.from({ length: 35 }, (_, i) => {
        const student = data.rows.find(s => s.nro === i + 1);
        // The number of subject columns should be exactly 9, padding if necessary (comentario para publicar vercel)
        const subjectCells = student ? student.subjectCells : [];
        const paddedSubjectCells = [...subjectCells, ...Array(Math.max(0, 9 - subjectCells.length)).fill('')];

        if (student) {
            return (
                <tr key={i}>
                    <td className="tcenter">{student.nro}</td>
                    <td>{student.cedula}</td>
                    <td style={{fontSize: '7px'}}>{student.nombreCompleto}</td>
                    <td>{student.lugarNac || ''}</td>
                    <td className="tcenter"></td> {/* EF - No data available in model */}
                    <td className="tcenter">{student.sexo || ''}</td>
                    <td className="tcenter">{student.diaNac || ''}</td>
                    <td className="tcenter">{student.mesNac || ''}</td>
                    <td className="tcenter">{student.anioNac || ''}</td>
                    {paddedSubjectCells.map((cell, j) => (
                        <td key={j} className="tcenter">{cell || ''}</td>
                    ))}
                    <td>{student.grupo || ''}</td>
                </tr>
            );
        }
        return (
             <tr key={i} style={{height: '1.2em'}}>
                <td className="tcenter">{i + 1}</td>
                {/* Render 18 empty cells to complete the row structure */}
                {Array.from({ length: 18 }).map((_, j) => <td key={`empty-${i}-${j}`}>&nbsp;</td>)}
            </tr>
        )
    });

    const formatGradeName = (name: string | undefined): string => {
        if (!name) return '';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('primer') || lowerName.startsWith('1')) return 'PRIMERO';
        if (lowerName.includes('segundo') || lowerName.startsWith('2')) return 'SEGUNDO';
        if (lowerName.includes('tercer') || lowerName.startsWith('3')) return 'TERCERO';
        if (lowerName.includes('cuarto') || lowerName.startsWith('4')) return 'CUARTO';
        if (lowerName.includes('quinto') || lowerName.startsWith('5')) return 'QUINTO';
        return name.toUpperCase();
    };


    return (
        <>
            <style>{`
                .resumen-sheet {
                    font-family: Arial, sans-serif;
                    background-color: #ffffff;
                    font-size: 8px;
                    width: 800px;
                    margin: auto;
                    padding: 10px 20px;
                    box-sizing: border-box;
                    color: #000;
                }
                .resumen-sheet .resumen-header-container { display: flex; align-items: flex-start; margin-bottom: -1px; }
                .resumen-sheet .logo-container { width: 150px; padding-top: 10px; }
                .resumen-sheet .logo-container img { max-width: 100%; }
                .resumen-sheet .title-container { flex: 1; text-align: center; }
                .resumen-sheet .main-title { font-weight: bold; font-size: 14px; margin-top: 10px; margin-right: -230px}
                .resumen-sheet .format-code { font-size: 10px; margin-bottom: 1px; margin-right: -145px }
                .resumen-sheet .section-I-wrapper { display: flex; justify-content: flex-end; }
                .resumen-sheet .section-I { padding: 2px 4px; display: flex; gap: 10px; align-items: baseline; }
                .resumen-sheet .section-I .info-item { display: flex; align-items: flex-end; }
                .resumen-sheet .section-I .info-item label { font-weight: bold; font-size: 8px; white-space: nowrap; margin-right: 4px; }
                .resumen-sheet .section-I .info-item span { border-bottom: 1px solid black; min-width: 80px; text-align: center; font-size: 9px; padding: 0 2px; }
                
                .resumen-sheet .section-II { padding: 4px; }
                .resumen-sheet .section-II .section-title { font-weight: bold; font-size: 9px; margin-bottom: -3px; }
                .resumen-sheet .section-II .info-rows { display: flex; flex-direction: column; gap: 4px; }
                .resumen-sheet .section-II .info-row { display: flex; gap: 10px; }
                .resumen-sheet .section-II .info-item-ii { display: flex; align-items: flex-end; flex-grow: 1; flex-shrink: 1; }
                .resumen-sheet .section-II .info-item-ii label { font-weight: bold; font-size: 8px; white-space: nowrap; margin-right: 4px; }
                .resumen-sheet .section-II .info-item-ii span { border-bottom: 1px solid black; width: 100%; font-size: 9px; padding-bottom: 1px; }

                .resumen-sheet .row { display: flex; gap: 8px; }
                .resumen-sheet .mt8 { margin-top: 8px; }
                .resumen-sheet .mt12 { margin-top: 12px; }
                .resumen-sheet .frame { border: 1px solid #000; padding: 4px; }
                .resumen-sheet .tiny { font-size: 6px; height: 1.5em; }
                .resumen-sheet .kvs { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }
                .resumen-sheet .kvs label { font-weight: bold; }
                .resumen-sheet .nowrap { white-space: nowrap; }
                .resumen-sheet .section-h { font-weight: bold; margin-top: 8px; margin-bottom: 2px; font-size: 10px; }
                .resumen-sheet table { width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; }
                .resumen-sheet th, .resumen-sheet td { border: 1px solid #000; padding: 1px 2px; text-align: left; vertical-align: middle; }
                .resumen-sheet th { font-weight: bold; text-align: center; vertical-align: middle; }
                .resumen-sheet .tcenter { text-align: center; }
                .resumen-sheet .xs { font-size: 7px; }
                .resumen-sheet .rot { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
                .resumen-sheet .tbl-main .part-header { font-size: 6px; line-height: 1.1; vertical-align: top; }
                .resumen-sheet .totals .bold { font-weight: bold; }
                .resumen-sheet .totals .box { border: 1px solid #000; padding: 2px 4px; text-align: center; }
                .resumen-sheet .no-border { border: none; }
                .resumen-sheet .no-border td { border: none; }
                
                .resumen-sheet .profesores-curso-table th, .resumen-sheet .profesores-curso-table td { height: 1.4em; }
                .resumen-sheet .profesores-curso-table .font-normal { font-weight: normal; }
                .resumen-sheet .profesores-curso-table .xs-header { font-size: 6px; line-height: 1; }

                .resumen-sheet .footer-block { width: 100%; border: 1px solid #000; border-collapse: collapse; }
                .resumen-sheet .footer-block td { vertical-align: top; }
                .resumen-sheet .footer-block .details-cell { width: 65%; border-right: 1px solid #000; padding: 0; }
                .resumen-sheet .footer-block .header-title { padding: 4px; border-bottom: 1px solid #000; font-size: 10px; }
                .resumen-sheet .footer-block .label-row,
                .resumen-sheet .footer-block .data-row,
                .resumen-sheet .footer-block .firma-row {
                    padding: 2px 4px;
                    border-bottom: 1px solid #000;
                    min-height: 1.5em; 
                    box-sizing: border-box;
                }
                .resumen-sheet .footer-block .data-row { text-align: center; }
                .resumen-sheet .footer-block .firma-row { min-height: 3em; border-bottom: none; }

                .resumen-sheet .footer-block .seal-cell {
                    width: 35%;
                    text-align: center;
                    vertical-align: middle;
                    font-weight: bold;
                    font-size: 9px;
                    padding: 4px;
                }
            `}</style>
            <div className="resumen-sheet" ref={templateRef}>
                <div className="resumen-header-container">
                    <div className="logo-container">
                        <img src="https://i.postimg.cc/fTy5MXtB/db882d55-605e-41b6-8bad-426cafddd4a7-removalai-preview.png" alt="Ministerio" />
                    </div>

                    <div className="title-container">
                        <div className="main-title">RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL</div>
                        <div className="format-code">Código del formato: EMG</div>
                        
                        <div className="section-I-wrapper">
                            <div className="section-I">
                                <div className="info-item">
                                    <label>I. Año Escolar:</label>
                                    <span>{data.anioEscolar || ''}</span>
                                </div>
                                <div className="info-item">
                                    <label>Tipo de Evaluación:</label>
                                    <span>{data.tipoEvaluacion || ''}</span>
                                </div>
                                <div className="info-item">
                                    <label>Mes y Año:</label>
                                    <span>{data.mesAnio || ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section-II">
                    <div className="section-title">II. Datos de la Institución Educativa:</div>
                    <div className="info-rows">
                        <div className="info-row">
                            <div className="info-item-ii" style={{ flex: 2 }}>
                                <label>Código:</label>
                                <span>{data.schoolCode || ''}</span>
                            </div>
                            <div className="info-item-ii" style={{ flex: 10 }}>
                                <label>Denominación y Epónimo:</label>
                                <span>{data.schoolName || ''}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-item-ii" style={{ flex: 9 }}>
                                <label>Dirección:</label>
                                <span>{data.address || ''}</span>
                            </div>
                            <div className="info-item-ii" style={{ flex: 3 }}>
                                <label>Teléfono:</label>
                                <span>{data.phone || ''}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-item-ii" style={{ flex: 1 }}>
                                <label>Municipio:</label>
                                <span>{data.municipality || ''}</span>
                            </div>
                            <div className="info-item-ii" style={{ flex: 1 }}>
                                <label>Entidad Federal:</label>
                                <span>{data.entity || ''}</span>
                            </div>
                            <div className="info-item-ii" style={{ flex: 2 }}>
                                <label>CDCEE:</label>
                                <span>{data.entity || ''}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-item-ii" style={{ flex: 9 }}>
                                <label>Director (a):</label>
                                <span>{data.director || ''}</span>
                            </div>
                            <div className="info-item-ii" style={{ flex: 3 }}>
                                <label>Cédula de Identidad:</label>
                                <span>{data.directorCI || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="row" style={{justifyContent: 'space-between'}}>
                    <div className="section-h">III. Identificación del Estudiante:</div>
                    <div className="section-h">IV. Resumen Final del Rendimiento:</div>
                </div>

                <table className="tbl-main">
                    <thead>
                        <tr>
                            <th rowSpan={3} style={{width: '2%'}}>N°</th>
                            <th rowSpan={3} style={{width: '9%'}}>Cédula de Identidad</th>
                            <th rowSpan={3} style={{width: '20%'}}>Nombre y apellidos</th>
                            <th rowSpan={3} style={{width: '10%'}}>Lugar de Nacimiento</th>
                            <th rowSpan={3} style={{width: '2%'}}>EF</th>
                            <th rowSpan={3} className="rot" style={{width: '2%'}}>SEXO</th>
                            <th colSpan={3}>FECHA DE NACIMIENTO</th>
                            <th colSpan={9}>ÁREAS DE FORMACIÓN</th>
                            <th rowSpan={2} className="part-header" style={{width: '10%'}}>PARTICIPACIÓN EN<br/>GRUPOS DE CREACIÓN,<br/>RECREACIÓN Y<br/>PRODUCCIÓN</th>
                        </tr>
                        <tr>
                            <th rowSpan={2} style={{width: '3%'}}>DÍA</th>
                            <th rowSpan={2} style={{width: '3%'}}>MES</th>
                            <th rowSpan={2} style={{width: '4%'}}>AÑO</th>
                            <th colSpan={9}>ÁREA COMÚN</th>
                        </tr>
                        <tr>
                            {Array.from({ length: 9 }).map((_, i) => (
                                <th key={i} style={{width: '3%'}}>{i + 1}</th>
                            ))}
                            <th>GRUPO</th>
                        </tr>
                    </thead>
                    <tbody>{studentRows}</tbody>
                </table>
                
                <div className="row mt8">
                    <div className="frame" style={{ flex: 1 }}>
                        <table className="no-border" style={{ width: '100%' }}>
                            <tbody>
                            <tr className="totals">
                                <td style={{ width: '240px' }} className="bold">Total de Área de Formación</td>
                                <td className="bold">Inscritos</td><td className="box">{data.inscritos}</td>
                                <td className="bold">Inasistentes</td><td className="box">{data.inasistentes}</td>
                                <td className="bold">Aprobados</td><td className="box">{data.aprobados}</td>
                                <td className="bold">No Aprobados</td><td className="box">{data.noAprobados}</td>
                                <td className="bold">No Cursantes</td><td className="box">{data.noCursantes}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <table className="profesores-curso-table mt8">
                    <thead>
                        <tr>
                            <th colSpan={5}>V. Profesores por Áreas:</th>
                            <th colSpan={2}>VI. Identificación del Curso:</th>
                        </tr>
                        <tr>
                            <th rowSpan={2} style={{ width: '3%' }}>N°</th>
                            <th colSpan={2}>Áreas de Formación</th>
                            <th rowSpan={2}>Apellidos y Nombres:</th>
                            <th rowSpan={2}>Cédula de Identidad:</th>
                            <th rowSpan={2} style={{width: '10%'}}>Firma:</th>
                            <th colSpan={2}>PLAN DE ESTUDIO:</th>
                        </tr>
                        <tr>
                            <th style={{ width: '5%' }}></th>
                            <th style={{ width: '25%' }}></th>
                            <th colSpan={2} className="font-normal">EDUCACIÓN MEDIA GENERAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="tcenter">1</td>
                            <td className="tcenter">CA</td>
                            <td>Castellano</td>
                            <td></td><td></td><td></td>
                            <th colSpan={2}>CÓDIGO:</th>
                        </tr>
                        <tr>
                            <td className="tcenter">2</td>
                            <td className="tcenter">ILE</td>
                            <td>Inglés y otras Lenguas Extranjeras</td>
                            <td></td><td></td><td></td>
                            <td colSpan={2} className="tcenter">31059</td>
                        </tr>
                        <tr>
                            <td className="tcenter">3</td>
                            <td className="tcenter">MA</td>
                            <td>Matemáticas</td>
                            <td></td><td></td><td></td>
                            <th colSpan={2}>AÑO CURSADO:</th>
                        </tr>
                        <tr>
                            <td className="tcenter">4</td>
                            <td className="tcenter">EF</td>
                            <td>Educación Física</td>
                            <td></td><td></td><td></td>
                            <td colSpan={2} className="tcenter">{formatGradeName(classroom?.name)}</td>
                        </tr>
                        <tr>
                            <td className="tcenter">5</td>
                            <td className="tcenter">AP</td>
                            <td>Arte y Patrimonio</td>
                            <td></td><td></td><td></td>
                            <th colSpan={2}>SECCIÓN:</th>
                        </tr>
                        <tr>
                            <td className="tcenter">6</td>
                            <td className="tcenter">CN</td>
                            <td>Ciencias Naturales</td>
                            <td></td><td></td><td></td>
                            <td colSpan={2} className="tcenter">{classroom?.name ? classroom.name.slice(-1).toUpperCase() : ''}</td>
                        </tr>
                        <tr>
                            <td className="tcenter">7</td>
                            <td className="tcenter">GHC</td>
                            <td>Geografía, Historia y Ciudadanía</td>
                            <td></td><td></td><td></td>
                            <td colSpan={2} rowSpan={1}></td>
                        </tr>
                        <tr>
                            <td className="tcenter">8</td>
                            <td className="tcenter">OC</td>
                            <td>Orientación y Convivencia</td>
                            <td></td><td></td><td></td>
                            <th className="xs-header">N° DE ESTUDIANTES<br/>POR SECCIÓN</th>
                            <th className="xs-header">N° DE ESTUDIANTES EN<br/>ESTA PÁGINA</th>
                        </tr>
                        <tr>
                            <td className="tcenter">9</td>
                            <td className="tcenter xs" style={{lineHeight: 0.8}}><div style={{transform: 'scaleY(0.8)'}}>P<br/>G<br/>C<br/>R<br/>P</div></td>
                            <td className="xs">Participación en Grupos de Creación, Recreación y Producción</td>
                            <td></td><td></td><td></td>
                            <td className="tcenter">{data.inscritos}</td>
                            <td className="tcenter">{data.rows.length}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="section-h">VII. Observaciones</div>
                <div className="frame tiny">&nbsp;</div>
                
                <div className="row mt12">
                    <div style={{ flex: 1 }}>
                        <table className="footer-block">
                            <tbody>
                                <tr>
                                    <td className="details-cell">
                                        <div className="bold header-title">VIII. Fecha de Remisión:</div>
                                        <div className="label-row">Director(a)</div>
                                        <div className="label-row">Apellidos y Nombres:</div>
                                        <div className="data-row">{data.director || ''}</div>
                                        <div className="label-row">Cédula de Identidad:</div>
                                        <div className="data-row">{data.directorCI || ''}</div>
                                        <div className="firma-row">Firma:</div>
                                    </td>
                                    <td className="seal-cell">
                                        SELLO DE LA <br /> INSTITUCIÓN EDUCATIVA
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ flex: 1 }}>
                        <table className="footer-block">
                            <tbody>
                                <tr>
                                    <td className="details-cell">
                                        <div className="bold header-title">IX. Fecha de Recepción:</div>
                                        <div className="label-row">Funcionario Receptor</div>
                                        <div className="label-row">Apellidos y Nombres:</div>
                                        <div className="data-row">&nbsp;</div>
                                        <div className="label-row">Cédula de Identidad:</div>
                                        <div className="data-row">&nbsp;</div>
                                        <div className="firma-row">Firma:</div>
                                    </td>
                                    <td className="seal-cell">
                                        SELLO DEL CENTRO DE <br /> DESARROLLO DE LA <br /> CALIDAD EDUCATIVA <br /> ESTADAL
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResumenFinalEmgReport;