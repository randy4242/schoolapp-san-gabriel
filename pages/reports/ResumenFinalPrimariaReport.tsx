import React from 'react';
import { ResumenFinalPrimariaReportData } from '../../types';

interface ResumenFinalPrimariaReportProps {
  data: ResumenFinalPrimariaReportData;
  templateRef: React.RefObject<HTMLDivElement>;
}

const ResumenFinalPrimariaReport: React.FC<ResumenFinalPrimariaReportProps> = ({ data, templateRef }) => {
    
    const studentRows = Array.from({ length: 20 }, (_, i) => {
        const student = data.students[i];
        if (student) {
            return (
                <tr key={i}>
                  <td className="tcenter">{String(i + 1).padStart(2, '0')}</td>
                  <td>{student.cedula}</td>
                  <td>{student.fullName}</td>
                  <td>{student.birthPlace}</td>
                  <td className="tcenter">{student.ef}</td>
                  <td className="tcenter">{student.sex}</td>
                  <td className="tcenter">{student.birthDay}</td>
                  <td className="tcenter">{student.birthMonth}</td>
                  <td className="tcenter">{student.birthYear}</td>
                  <td className="tcenter">{student.resultado === 'A' ? '•' : ''}</td>
                  <td className="tcenter">{student.resultado === 'B' ? '•' : ''}</td>
                  <td className="tcenter">{student.resultado === 'C' ? '•' : ''}</td>
                  <td className="tcenter">{student.resultado === 'D' ? '•' : ''}</td>
                  <td className="tcenter">{student.resultado === 'E' ? '•' : ''}</td>
                  <td className="tcenter">{student.resultado === 'P' ? '•' : ''}</td>
                </tr>
            );
        }
        return (
             <tr key={i} style={{ height: '1.5em' }}>
                <td className="tcenter">{String(i + 1).padStart(2, '0')}</td>
                <td colSpan={14}></td>
            </tr>
        )
    });

    const studentNameRows = Array.from({ length: 20 }, (_, i) => {
        const student = data.students[i];
        const [lastName = '', firstName = ''] = student ? student.fullName.split(', ') : [];
        return (
            <tr key={i} style={{ height: '1.5em' }}>
                <td className="tcenter">{i + 1}</td>
                <td>{lastName}</td>
                <td>{firstName}</td>
            </tr>
        )
    });

    return (
        <>
            <style>{`
                .primaria-sheet { font-family: Arial, Helvetica, sans-serif; color:#000; margin:0;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size:11px; line-height:1.25; padding: 15px; }
                .primaria-sheet .sheet{ width:100% }
                .primaria-sheet .row{ display:flex; gap:8px; align-items:stretch }
                .primaria-sheet .mt8{ margin-top:8px } .mt12{ margin-top:12px }
                .primaria-sheet .title{ font-weight:700; text-align:center; font-size:16px; letter-spacing:.2px }
                .primaria-sheet .subtitle{ text-align:center; font-size:12px; font-weight:700 }
                .primaria-sheet .header{ display:grid; grid-template-columns: 120px 1fr 120px; gap:10px; align-items:center }
                .primaria-sheet .logo{ border:1px solid #000; height:42px; display:flex; align-items:center; justify-content:center; font-size:9px }
                .primaria-sheet .logo img { max-height: 40px; }
                .primaria-sheet .frame{ border:1px solid #000; padding:6px }
                .primaria-sheet .section-h{ background:#ececec; border:1px solid #000; padding:3px 6px; font-weight:700; margin-top:8px }
                .primaria-sheet .kvs{ display:grid; grid-template-columns: 160px 1fr 120px 1fr; gap:4px; row-gap:6px }
                .primaria-sheet .kvs label{ font-weight:700 }
                .primaria-sheet table{ border-collapse:collapse; width:100% }
                .primaria-sheet th, .primaria-sheet td{ border:1px solid #000; padding:2px 4px; vertical-align:middle }
                .primaria-sheet .tcenter{text-align:center} .tright{text-align:right}
                .primaria-sheet .xs{ font-size:9px } .tiny{ font-size:8.5px }
                .primaria-sheet .w-n{ width:22px } .w-ci{ width:110px } .w-place{ width:120px } .w-ef{ width:30px } .w-sex{ width:28px } .w-dmy{ width:26px } .w-res{ width:24px }
                .primaria-sheet .no-border td,.no-border th{ border:none }
                .primaria-sheet .sign-box{ border:1px solid #000; height:110px; padding:6px }
            `}</style>
            <div className="primaria-sheet" ref={templateRef}>
                <div className="sheet">
                    <div className="header">
                        <div className="logo">
                             <img src="https://i.postimg.cc/13TKK215/ministerio.png" alt="Ministerio" />
                        </div>
                        <div>
                        <div className="title">RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL</div>
                        <div className="subtitle">(Educación Primaria)</div>
                        </div>
                        <div className="logo">LOGO INSTITUCIÓN</div>
                    </div>

                    <div className="section-h">I. Plan de Estudio: <span style={{fontWeight:700}}>EDUCACIÓN PRIMARIA</span> &nbsp;&nbsp;
                        <span className="xs">Código del formato: RR-DEA-06-04</span> &nbsp;&nbsp; <span className="xs">COD.: 21000</span>
                    </div>
                    <div className="frame">
                        <div className="kvs">
                        <label>Año Escolar:</label><div>{data.schoolYear}</div>
                        <label>Mes y Año de la Evaluación:</label><div>{data.evaluationMonthYear}</div>
                        <label>Tipo de Evaluación:</label><div>{data.evaluationType}</div>
                        </div>
                    </div>

                    <div className="section-h">II. Datos del Plantel:</div>
                    <div className="frame">
                        <div className="kvs">
                        <label>Cód. Plantel:</label><div>{data.school.code}</div>
                        <label>Nombre:</label><div>{data.school.name}</div>
                        <label>Dirección:</label><div>{data.school.address}</div>
                        <label>Teléfono:</label><div>{data.school.phone}</div>
                        <label>Municipio:</label><div>{data.school.municipality}</div>
                        <label>Entidad Federal:</label><div>{data.school.state}</div>
                        <label>Dto. esc.:</label><div>{data.school.dtoEsc}</div>
                        <label>CDCEE:</label><div>{data.school.cdcee}</div>
                        </div>
                    </div>
                    
                    <div className="section-h">III. Identificación del Curso:</div>
                    <div className="frame">
                        <div className="kvs">
                        <label>Grado:</label><div>{data.course.grade}</div>
                        <label>Sección:</label><div>{data.course.section}</div>
                        <label>N° de Estudiantes de la Sección:</label><div>{data.course.studentsInSection}</div>
                        <label>Número de Estudiantes en esta Página:</label><div>{data.course.studentsOnPage}</div>
                        </div>
                    </div>
                    
                    <div className="section-h">IV. Resumen Final del Rendimiento:</div>
                    <table>
                        <thead>
                        <tr>
                            <th className="w-n">N°</th>
                            <th className="w-ci">Cédula de Identidad o Cédula Escolar</th>
                            <th>Apellidos y Nombres</th>
                            <th className="w-place">Lugar de Nacimiento</th>
                            <th className="w-ef">E.F.</th>
                            <th className="w-sex">Sexo</th>
                            <th colSpan={3}>Fecha de Nacimiento</th>
                            <th colSpan={6}>Resultados de la Evaluación</th>
                        </tr>
                        <tr>
                            <th></th><th></th><th></th><th></th>
                            <th className="xs">CA/EX</th>
                            <th className="xs">M/F</th>
                            <th className="w-dmy xs">Día</th><th className="w-dmy xs">Mes</th><th className="w-dmy xs">Año</th>
                            <th className="w-res">A</th><th className="w-res">B</th><th className="w-res">C</th><th className="w-res">D</th><th className="w-res">E</th><th className="w-res">P</th>
                        </tr>
                        </thead>
                        <tbody>
                            {studentRows}
                            <tr>
                                <td className="tcenter" colSpan={9}><strong>TOTALES</strong></td>
                                <td className="tcenter">{data.totals.A}</td>
                                <td className="tcenter">{data.totals.B}</td>
                                <td className="tcenter">{data.totals.C}</td>
                                <td className="tcenter">{data.totals.D}</td>
                                <td className="tcenter">{data.totals.E}</td>
                                <td className="tcenter">{data.totals.P}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="mt8">
                        <thead>
                        <tr>
                            <th style={{width:'26px'}}>N°</th>
                            <th style={{width:'45%'}}>Apellidos</th>
                            <th>Nombres</th>
                        </tr>
                        </thead>
                        <tbody>
                            {studentNameRows}
                            <tr>
                                <td colSpan={3} className="tiny">Apellidos y Nombres del Docente: {data.teacher.fullName} — Número de C.I.: {data.teacher.cedula} — Firma: ____________</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="section-h">V. Observaciones</div>
                    <div className="frame tiny">{data.observations}</div>
                    
                    <div className="row mt12">
                        <div className="frame" style={{flex:1}}>
                        <div style={{fontWeight:700}}>VI. Fecha de Remisión:</div>
                        <div className="kvs" style={{marginTop:'6px'}}>
                            <label>Director(a)</label><div></div>
                            <label>Apellidos y Nombres:</label><div>{data.director.name}</div>
                            <label>Número de C.I.:</label><div>{data.director.cedula}</div>
                        </div>
                        <div className="sign-box">
                            <div className="tcenter" style={{marginTop:'56px'}}>SELLO DEL PLANTEL</div>
                        </div>
                        </div>
                        <div className="frame" style={{flex:1}}>
                        <div style={{fontWeight:700}}>VII. Fecha de Recepción:</div>
                        <div className="kvs" style={{marginTop:'6px'}}>
                            <label>Funcionario Receptor</label><div></div>
                            <label>Apellidos y Nombres:</label><div></div>
                            <label>Número de C.I.:</label><div></div>
                        </div>
                        <div className="sign-box">
                            <div className="tcenter" style={{marginTop:'56px'}}>SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL</div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResumenFinalPrimariaReport;
