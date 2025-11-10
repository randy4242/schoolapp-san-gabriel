import React from 'react';
import { ReportRrdeaClassroomResponse } from '../../types';

interface ResumenFinalPrimariaReportProps {
  data: ReportRrdeaClassroomResponse;
  templateRef: React.RefObject<HTMLDivElement>;
}

const ResumenFinalPrimariaReport: React.FC<ResumenFinalPrimariaReportProps> = ({ data, templateRef }) => {
    
    // Create 20 rows for the main student data table
    const studentDataRows = Array.from({ length: 20 }, (_, i) => {
        const student = data.rows[i];
        if (student) {
            const isPromoted = student.resultado === 'A' || student.resultado === 'B';
            return (
                <tr key={`data-${i}`}>
                  <td className="tcenter">{String(i + 1).padStart(2, '0')}</td>
                  <td>{student.cedula}</td>
                  <td>{student.lugarNac}</td>
                  <td className="tcenter">{student.efEdo}</td>
                  <td className="tcenter">{student.sexo}</td>
                  <td className="tcenter">{student.diaNac || ''}</td>
                  <td className="tcenter">{student.mesNac || ''}</td>
                  <td className="tcenter">{student.anioNac || ''}</td>
                  <td className="tcenter">{student.resultado === 'A' ? 'X' : ''}</td>
                  <td className="tcenter">{student.resultado === 'B' ? 'X' : ''}</td>
                  <td className="tcenter">{student.resultado === 'C' ? 'X' : ''}</td>
                  <td className="tcenter">{student.resultado === 'D' ? 'X' : ''}</td>
                  <td className="tcenter">{student.resultado === 'E' ? 'X' : ''}</td>
                  <td className="tcenter">{isPromoted ? '*' : ''}</td>
                </tr>
            );
        }
        return (
             <tr key={`data-empty-${i}`} style={{ height: '1.5em' }}>
                <td className="tcenter">{String(i + 1).padStart(2, '0')}</td>
                {/* 13 empty cells */}
                {Array.from({ length: 13 }).map((_, j) => <td key={j}></td>)}
            </tr>
        )
    });

    // Create 20 rows for the student name table
    const studentNameRows = Array.from({ length: 20 }, (_, i) => {
        const student = data.rows[i];
        let apellidos = '';
        let nombres = '';
        if(student) {
            // A simple split logic for names, assuming the first 1 or 2 words are surnames
            const nameParts = student.apellidosNombres.split(' ');
            if (nameParts.length > 2) {
                apellidos = nameParts.slice(0, 2).join(' ');
                nombres = nameParts.slice(2).join(' ');
            } else {
                apellidos = nameParts.slice(0, 1).join(' ');
                nombres = nameParts.slice(1).join(' ');
            }
        }

        return (
            <tr key={`name-${i}`} style={{ height: '1.5em' }}>
                <td className="tcenter">{i + 1}</td>
                <td>{apellidos}</td>
                <td>{nombres}</td>
            </tr>
        )
    });

    const observaciones = data.rows
        .map((student, index) => ({ student, nro: index + 1 }))
        .filter(({ student }) => student.efEdo === 'EX')
        .map(({ nro }) => `${nro} Lugar de nacimiento: Estados Unidos América`)
        .join(', ');
    
    return (
        <>
            <style>{`
                .resumen-primaria-sheet {
                    font-family: serif;
                    background-color: #ffffff;
                    font-size: 8px; /* Base font size */
                    width: 100%;
                    max-width: 800px; /* Control width */
                    margin: auto;
                    padding: 15px;
                    box-sizing: border-box;
                    color: #000;
                }
                .resumen-primaria-sheet table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                    table-layout: auto;
                }
                .resumen-primaria-sheet th, .resumen-primaria-sheet td {
                    border: 1px solid #000;
                    padding: 1px 3px;
                    text-align: left;
                    vertical-align: middle;
                    height: 1.5em; /* Set a consistent row height */
                }
                .resumen-primaria-sheet th {
                    font-weight: bold;
                    text-align: center;
                }
                .resumen-primaria-sheet .tcenter { text-align: center; }
                .resumen-primaria-sheet .bold { font-weight: bold; }
                .resumen-primaria-sheet .info-item {
                    display: flex;
                    align-items: baseline;
                    font-size: 8px; /* Smaller font for info items */
                }
                .resumen-primaria-sheet .info-item label {
                    font-weight: bold;
                    white-space: nowrap;
                    margin-right: 4px;
                }
                .resumen-primaria-sheet .info-item span {
                    width: 100%;
                    border-bottom: 1px solid black;
                    padding-left: 5px;
                    font-weight: normal;
                    line-height: 1.2;
                    min-height: 10px;
                 }
                 .resumen-primaria-sheet .no-border-val span {
                    border-bottom: none;
                 }
                .resumen-primaria-sheet .section-title {
                    font-weight: bold;
                    font-size: 9px;
                    margin: 4px 0 2px 0;
                }
                
                /* Header */
                .header-container {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 5px;
                }
                .header-logo {
                    display: flex;
                    align-items: flex-start;
                }
                .header-logo img { height: 35px; margin-right: 5px; }
                .header-logo-text { font-size: 7px; font-weight: bold; line-height: 1.1; }
                .header-title-block {
                    flex-grow: 1;
                    text-align: center;
                }
                .header-title-block .main-title { font-size: 14px; font-weight: bold; }
                .header-title-block .sub-title { font-size: 10px; font-weight: bold; }
                .header-title-block .format-code { font-size: 8px; }

                /* Sections */
                .section-frame {
                    border: 1px solid #000;
                    padding: 2px 4px;
                }
                .grid-container {
                    display: grid;
                    gap: 1px 10px;
                }
                
                /* Main Table */
                #main-student-table th, #main-student-table td { font-size: 7.5px; }
                #main-student-table .small-th { font-size: 7px; line-height: 1; }

                /* Names Table */
                #names-table { margin-top: 5px; }
                #names-table .teacher-info {
                    font-size: 7px;
                    text-align: left;
                    padding: 2px;
                }
                
                /* Observations */
                .observations-box {
                    border-bottom: 1px solid #000;
                    height: 1.2em;
                    font-size: 8px;
                    padding-left: 2px;
                }
                
                /* Footer / Signatures */
                .footer-container {
                    display: flex;
                    gap: 10px;
                    margin-top: 8px;
                }
                .footer-box {
                    flex: 1;
                    border: 1px solid #000;
                    display: flex;
                    flex-direction: column;
                }
                .footer-box .footer-title {
                    font-weight: bold;
                    padding: 2px;
                    font-size: 9px;
                    border-bottom: 1px solid #000;
                }
                .footer-box .content {
                    padding: 4px;
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .footer-box .content .label {
                    font-size: 8px;
                }
                .footer-box .content .value {
                    font-size: 8px;
                    text-align: center;
                    border-bottom: 1px solid #000;
                    height: 1.4em;
                    margin-top: 2px;
                }
                .footer-box .seal-area {
                    border-top: 1px solid #000;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    font-weight: bold;
                    text-align: center;
                }
            `}</style>
            <div className="resumen-primaria-sheet" ref={templateRef}>
                {/* Header */}
                <div className="header-container">
                    <div className="header-logo">
                        <img src="https://i.postimg.cc/fTy5MXtB/db882d55-605e-41b6-8bad-426cafddd4a7-removalai-preview.png" alt="Logo" />
                         <div className="header-logo-text">
                            <div>Gobierno</div>
                            <div>Bolivariano</div>
                            <div>de Venezuela</div>
                        </div>
                         <div className="header-logo-text" style={{marginLeft: '10px'}}>
                            <div>Ministerio del Poder Popular</div>
                            <div>para la Educación</div>
                        </div>
                    </div>
                    <div className="header-title-block">
                        <div className="main-title">RESUMEN FINAL DEL RENDIMIENTO ESTUDIANTIL</div>
                        <div className="sub-title">(Educación Primaria)</div>
                        <div className="format-code">Código del formato: RR-DEA-06-04</div>
                    </div>
                </div>

                {/* Section I */}
                <div className="section-frame grid-container" style={{ gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'baseline' }}>
                    <div className="info-item no-border-val"><label>I. Plan de Estudio:</label><span style={{fontWeight: 'bold'}}>{data.planEstudio}</span></div>
                    <div></div>
                    <div className="info-item no-border-val"><label>COD:</label><span style={{width: '80px', fontWeight: 'bold'}}>{data.planCodigo}</span></div>
                </div>
                <div className="section-frame grid-container" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1px' }}>
                    <div className="info-item"><label>Año Escolar:</label><span>{data.anioEscolar}</span></div>
                    <div className="info-item"><label>Mes y Año de la Evaluación:</label><span>{data.mesAnio}</span></div>
                </div>

                {/* Section II */}
                <div className="section-title">II. Datos del Plantel:</div>
                <div className="section-frame">
                    <div className="grid grid-cols-12 gap-x-4 items-baseline">
                        <div className="info-item col-span-4"><label>Cód.Plantel:</label><span>{data.plantelCodigo}</span></div>
                        <div className="info-item col-span-6"><label>Nombre:</label><span>{data.plantelNombre}</span></div>
                        <div className="info-item col-span-2"><label>Dtto.esc.:</label><span>{data.distritoEscolar}</span></div>
                    </div>
                     <div className="grid grid-cols-12 gap-x-4 items-baseline mt-1">
                        <div className="info-item col-span-8"><label>Dirección:</label><span>{data.direccion}</span></div>
                        <div className="info-item col-span-4"><label>Teléfono:</label><span>{data.telefono}</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 items-baseline mt-1">
                         <div className="info-item"><label>Municipio:</label><span>{data.municipio}</span></div>
                         <div className="info-item"><label>Entidad Federal:</label><span>{data.entidad}</span></div>
                         <div className="info-item"><label>CDCEE:</label><span>{data.cdcee}</span></div>
                    </div>
                </div>

                {/* Section III */}
                <div className="section-title">III. Identificación del Curso:</div>
                <div className="section-frame">
                     <div className="grid grid-cols-4 gap-x-4">
                         <div className="info-item"><label>Grado:</label><span>{data.grado}</span></div>
                         <div className="info-item"><label>Sección:</label><span>{data.seccion}</span></div>
                         <div className="info-item"><label>N° de Estudiantes de la Sección:</label><span>{data.numeroEstudiantesSeccion}</span></div>
                         <div className="info-item"><label>Número de Estudiantes en esta Página:</label><span>{data.numeroEstudiantesEnPagina}</span></div>
                    </div>
                </div>
                
                {/* Section IV */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div className="section-title" style={{margin: 0}}>IV. Resumen Final del Rendimiento:</div>
                    <div className="info-item no-border-val"><label>Tipo de Evaluación:</label><span style={{fontWeight: 'bold'}}>Trimestre</span></div>
                </div>

                <table id="main-student-table">
                    <thead>
                        <tr>
                            <th rowSpan={3} style={{width: '2.5%'}}>N°</th>
                            <th rowSpan={3} style={{width: '10%'}}>Cédula de Identidad o Cédula Escolar</th>
                            <th rowSpan={3}>Lugar de Nacimiento</th>
                            <th rowSpan={3} style={{width: '2.5%'}}>E.F.</th>
                            <th rowSpan={3} style={{width: '2.5%'}}>Sexo</th>
                            <th colSpan={3}>Fecha de Nacimiento</th>
                            <th colSpan={6}>Resultados de la Evaluación</th>
                        </tr>
                        <tr>
                            <th rowSpan={2} style={{width: '3.5%'}}>Día</th>
                            <th rowSpan={2} style={{width: '3.5%'}}>Mes</th>
                            <th rowSpan={2} style={{width: '4%'}}>Año</th>
                            <th colSpan={5}>Literal</th>
                            <th rowSpan={2} className="small-th" style={{width: '2.5%'}}>P</th>
                        </tr>
                        <tr>
                            <th className="small-th" style={{width: '2.5%'}}>A</th>
                            <th className="small-th" style={{width: '2.5%'}}>B</th>
                            <th className="small-th" style={{width: '2.5%'}}>C</th>
                            <th className="small-th" style={{width: '2.5%'}}>D</th>
                            <th className="small-th" style={{width: '2.5%'}}>E</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentDataRows}
                        <tr className="totals-row">
                            <td colSpan={8} className="tcenter bold">TOTALES</td>
                            <td className="tcenter bold">{String(data.totalA).padStart(2, '0')}</td>
                            <td className="tcenter bold">{String(data.totalB).padStart(2, '0')}</td>
                            <td className="tcenter bold">{String(data.totalC).padStart(2, '0')}</td>
                            <td className="tcenter bold">{String(data.totalD).padStart(2, '0')}</td>
                            <td className="tcenter bold">{String(data.totalE).padStart(2, '0')}</td>
                            <td className="tcenter bold">{String(data.totalP).padStart(2, '0')}*</td>
                        </tr>
                    </tbody>
                </table>
                
                <table id="names-table">
                    <thead>
                        <tr>
                            <th style={{width: '2.5%'}}>N°</th>
                            <th style={{width: '30%'}}>Apellidos</th>
                            <th>Nombres</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentNameRows}
                        <tr>
                            <td colSpan={3} className="teacher-info">
                                <div style={{display: 'flex', justifyContent: 'space-between', gap: '10px'}}>
                                    <div className="info-item no-border-val" style={{ flex: '2 1 0%'}}><label>Apellidos y Nombres del Docente</label><span style={{borderBottom: '1px dotted #000'}}>IZAGUIRRE DOUGLAS</span></div>
                                    <div className="info-item no-border-val" style={{ flex: '1 1 0%'}}><label>Número de C.I.</label><span style={{borderBottom: '1px dotted #000'}}></span></div>
                                    <div className="info-item no-border-val" style={{ flex: '1 1 0%'}}><label>Firma:</label><span style={{borderBottom: '1px dotted #000'}}></span></div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                {/* V. Observaciones */}
                <div className="section-title">V. Observaciones</div>
                <div className="observations-box">
                    {observaciones}
                </div>
                
                {/* VI & VII. Signatures */}
                <div className="footer-container">
                    <div className="footer-box">
                        <div className="footer-title">VI Fecha de Remisión:</div>
                        <div className="content">
                            <div>
                                <div className="label">Director(a)</div>
                                <div className="label">Apellidos y Nombres</div>
                                <div className="value">MENDOZA CARRILLO PEDRO ÁNGEL</div>
                                <div className="label">Número de C.I.:</div>
                                <div className="value">V-11351158</div>
                                <div className="label">Firma:</div>
                                <div className="value" style={{height: '2em'}}></div>
                            </div>
                        </div>
                        <div className="seal-area">SELLO DEL PLANTEL</div>
                    </div>
                    <div className="footer-box">
                        <div className="footer-title">VII Fecha de Recepción:</div>
                         <div className="content">
                           <div>
                                <div className="label">Funcionario Receptor</div>
                                <div className="label">Apellidos y Nombres</div>
                                <div className="value">&nbsp;</div>
                                <div className="label">Número de C.I.:</div>
                                <div className="value">&nbsp;</div>
                                <div className="label">Firma:</div>
                                <div className="value" style={{height: '2em'}}></div>
                           </div>
                        </div>
                        <div className="seal-area">SELLO DEL CENTRO DE<br/>DESARROLLO DE LA CALIDAD<br/>EDUCATIVA ESTADAL</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResumenFinalPrimariaReport;