
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
        if (student) {
            return (
                <tr key={i}>
                    <td className="tcenter">{student.nro}</td>
                    <td>{student.cedula}</td>
                    <td>{student.nombreCompleto}</td>
                    <td>{student.lugarNac || ''}</td>
                    <td className="tcenter">{student.sexo || ''}</td>
                    <td className="tcenter"></td>
                    <td className="tcenter"></td>
                    <td className="tcenter"></td>
                    {data.subjectColumns.map((_, j) => (
                        <td key={j} className="tcenter">{student.subjectCells[j] || ''}</td>
                    ))}
                    <td className="tcenter">{student.grupo || ''}</td>
                </tr>
            );
        }
        return (
             <tr key={i} style={{height: '1.2em'}}>
                <td className="tcenter">{i + 1}</td>
                <td colSpan={5 + data.subjectColumns.length}></td>
                <td></td>
            </tr>
        )
    });

    return (
        <>
            <style>{`
                .resumen-sheet {
                    font-family: Arial, sans-serif;
                    background-color: #ffffff;
                    font-size: 8px;
                    width: 780px;
                    margin: auto;
                    padding: 15px;
                    box-sizing: border-box;
                    color: #000;
                }
                .resumen-sheet .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 5px; }
                .resumen-sheet .logo { width: 80px; text-align: center; }
                .resumen-sheet .logo img { max-width: 100%; height: auto; }
                .resumen-sheet .title { font-size: 14px; font-weight: bold; text-align: center; }
                .resumen-sheet .subtitle { font-size: 10px; text-align: center; }
                .resumen-sheet .row { display: flex; gap: 8px; }
                .resumen-sheet .mt8 { margin-top: 8px; }
                .resumen-sheet .mt12 { margin-top: 12px; }
                .resumen-sheet .frame { border: 1px solid #000; padding: 4px; }
                .resumen-sheet .tiny { font-size: 6px; height: 1.5em; }
                .resumen-sheet .kvs { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }
                .resumen-sheet .kvs label { font-weight: bold; }
                .resumen-sheet .nowrap { white-space: nowrap; }
                .resumen-sheet .section-h { font-weight: bold; margin-top: 8px; margin-bottom: 2px; }
                .resumen-sheet table { width: 100%; border-collapse: collapse; font-size: 8px; }
                .resumen-sheet th, .resumen-sheet td { border: 1px solid #000; padding: 1px 3px; text-align: left; vertical-align: middle; }
                .resumen-sheet th { font-weight: bold; text-align: center; }
                .resumen-sheet .tcenter { text-align: center; }
                .resumen-sheet .xs { font-size: 7px; }
                .resumen-sheet .rot { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
                .resumen-sheet .tbl-main .w-ci { width: 70px; }
                .resumen-sheet .tbl-main .w-name { width: 150px; }
                .resumen-sheet .tbl-main .w-place { width: 60px; }
                .resumen-sheet .tbl-main .narrow { width: 20px; }
                .resumen-sheet .tbl-main .w-group { width: 50px; }
                .resumen-sheet .totals .bold { font-weight: bold; }
                .resumen-sheet .totals .box { border: 1px solid #000; padding: 2px 4px; text-align: center; }
                .resumen-sheet .no-border { border: none; }
                .resumen-sheet .no-border td { border: none; }
                .resumen-sheet .sign-box { border: 1px solid #000; height: 70px; margin-top: 4px; }
            `}</style>
            <div className="resumen-sheet" ref={templateRef}>
                <div className="header">
                    <div className="logo"><img src="https://i.postimg.cc/13TKK215/ministerio.png" alt="Ministerio" /></div>
                    <div>
                        <div className="title">RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL</div>
                        <div className="subtitle">Código del formato: EMG</div>
                    </div>
                    <div className="logo">LOGO INSTITUCIÓN</div>
                </div>

                <div className="row mt8">
                    <div className="frame" style={{ flex: 1 }}>
                        <div className="kvs">
                            <label>I. Año Escolar:</label><div>{data.anioEscolar || ''}</div>
                            <label>Tipo de Evaluación:</label><div>{data.tipoEvaluacion || ''}</div>
                            <label>Mes y Año:</label><div>{data.mesAnio || ''}</div>
                            <label className="nowrap">II. Datos de la Institución Educativa:</label><div></div>
                            <label>Código:</label><div>{data.schoolCode || ''}</div>
                            <label>Denominación y Epónimo:</label><div>{data.schoolName || ''}</div>
                            <label>Dirección:</label><div>{data.address || ''}</div>
                            <label>Teléfono:</label><div>{data.phone || ''}</div>
                            <label>Municipio:</label><div>{data.municipality || ''}</div>
                            <label>Entidad Federal:</label><div>{data.entity || ''}</div>
                            <label>Director (a):</label><div>{data.director || ''}</div>
                            <label>Cédula de Identidad:</label><div>{data.directorCI || ''}</div>
                        </div>
                    </div>
                </div>

                <div className="section-h">III. Identificación del Estudiante:</div>
                <div className="section-h">IV. Resumen Final del Rendimiento:</div>
                <table className="tbl-main">
                    <thead>
                        <tr>
                            <th className="narrow" rowSpan={2}>N°</th>
                            <th className="w-ci" rowSpan={2}>Cédula de Identidad</th>
                            <th className="w-name" rowSpan={2}>Nombre y apellidos</th>
                            <th className="w-place" rowSpan={2}>Lugar de Nacimiento</th>
                            <th className="rot" rowSpan={2} style={{width: '20px'}}>SEXO</th>
                            <th colSpan={3}>FECHA DE NACIMIENTO</th>
                            <th colSpan={data.subjectColumns.length}>ÁREAS DE FORMACIÓN<br /><span className="xs">(ÁREA COMÚN)</span></th>
                            <th className="w-group" rowSpan={2}>GRUPO</th>
                        </tr>
                        <tr>
                            <th className="xs">M/F</th>
                            <th className="xs">D</th>
                            <th className="xs">M</th>
                            <th className="xs">A</th>
                            {data.subjectColumns.map((col, index) => (
                               <th key={index} className="narrow">{index + 1}</th>
                            ))}
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
                
                <div className="section-h">V. VI. Identificación del Curso</div>
                <div className='row'>
                <div className="frame" style={{flex: '1 1 50%'}}>
                    {/* Placeholder for teachers if data becomes available */}
                </div>
                <div className="frame" style={{flex: 1}}>
                    <div className="kvs">
                        <label>PLAN DE ESTUDIO:</label><div>EDUCACIÓN MEDIA GENERAL</div>
                        <label>AÑO CURSADO:</label><div>{classroom?.name || ''}</div>
                        <label>SECCIÓN:</label><div>{classroom?.name.slice(-1) || ''}</div>
                        <label>N° DE ESTUDIANTES POR SECCIÓN:</label><div>{data.inscritos}</div>
                        <label>N° DE ESTUDIANTES EN ESTA PÁGINA:</label><div>{data.rows.length}</div>
                    </div>
                </div>
                </div>

                <div className="section-h">VII. Observaciones</div>
                <div className="frame tiny">&nbsp;</div>
                
                <div className="row mt12">
                    <div className="frame" style={{ flex: 1 }}>
                        <div className="bold">VIII. Fecha de Remisión:</div>
                        <div className="kvs" style={{ marginTop: '6px' }}>
                            <label>Director(a)</label><div></div>
                            <label>Apellidos y Nombres:</label><div>{data.director || ''}</div>
                            <label>Cédula de Identidad:</label><div>{data.directorCI || ''}</div>
                        </div>
                        <div className="sign-box"><div className="tcenter" style={{ marginTop: '56px' }}>SELLO DE LA INSTITUCIÓN EDUCATIVA</div></div>
                    </div>

                    <div className="frame" style={{ flex: 1 }}>
                        <div className="bold">IX. Fecha de Recepción:</div>
                        <div className="kvs" style={{ marginTop: '6px' }}>
                            <label>Funcionario Receptor</label><div></div>
                            <label>Apellidos y Nombres:</label><div></div>
                            <label>Cédula de Identidad:</label><div></div>
                        </div>
                        <div className="sign-box"><div className="tcenter" style={{ marginTop: '56px' }}>SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL</div></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResumenFinalEmgReport;
