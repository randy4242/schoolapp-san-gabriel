import React from 'react';
import { ReportData } from '../../types';

interface CertificadoTemplateProps {
  data: ReportData;
  templateRef: React.RefObject<HTMLDivElement>;
}

const CertificadoTemplate: React.FC<CertificadoTemplateProps> = ({ data, templateRef }) => {

    const findGradeForSubject = (year: number, subjectName: string) => {
        return data.grades.find(g => g.year === year && g.area.toLowerCase().includes(subjectName.toLowerCase().substring(0, 5)));
    };

    const renderGradeRow = (year: number, subject: string) => {
        const grade = findGradeForSubject(year, subject);
        return (
            <tr key={`${year}-${subject}`}>
                <td>{subject}</td>
                <td>{grade ? `${grade.gradeNumber} ${grade.gradeLiteral}` : ''}</td>
                <td>{grade ? grade.type : ''}</td>
                <td>{grade ? grade.date : ''}</td>
                <td>{grade ? grade.institution : ''}</td>
            </tr>
        );
    };

    // Consistent subjects for each year
    const subjects = {
        year1: ['Castellano', 'Inglés y otras Lenguas Extranjeras', 'Matemáticas', 'Educación Física', 'Arte y Patrimonio', 'Ciencias Naturales', 'Geografía, Historia y Ciudadanía'],
        year2: ['Castellano', 'Inglés y otras Lenguas Extranjeras', 'Matemáticas', 'Educación Física', 'Arte y Patrimonio', 'Ciencias Naturales', 'Geografía, Historia y Ciudadanía'],
        year3: ['Castellano', 'Inglés y otras Lenguas Extranjeras', 'Matemáticas', 'Educación Fisica', 'Física', 'Química', 'Biologia', 'Geografía, Historia y Ciudadanía'],
        year4: ['Castellano', 'Inglés y otras Lenguas Extranjeras', 'Matemáticas', 'Educación Física', 'Física', 'Química', 'Biología', 'Geografía, Historia y Ciudadanía', 'Formación para la Soberania Nacional'],
        year5: ['Castellano', 'Inglés y otras Lenguas Extranjeras', 'Matemáticas', 'Educación Fisica', 'Fisica', 'Química', 'Biología', 'Ciencias de la Tierra', 'Geografía, Historia y Ciudadania', 'Formación para la Soberanía Nacional']
    };

    return (
        <>
            <style>{`
                .report-container {
                    font-family: Arial, sans-serif;
                    background-color: #ffffff;
                    font-size: 10px;
                    width: 780px;
                    margin: auto;
                    background: white;
                    padding: 15px;
                    box-sizing: border-box;
                }
                .report-container header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #000; padding-bottom: 5px; }
                .report-container .header-left, .report-container .header-right { text-align: left; }
                .report-container p { margin: 3px 0; font-size: 10px; }
                .report-container strong { font-size: 10px; }
                .report-container section { margin-top: 10px; }
                .report-container .bordered-section { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
                .report-container .details-flex { display: flex; justify-content: space-between; flex-wrap: wrap; }
                .report-container .details-flex div { width: 48%; min-width: 250px; }
                .report-container table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; word-wrap: break-word; }
                .report-container th, .report-container td { border: 1px solid #000; padding: 0px 3px 6px 3px; text-align: center; vertical-align: middle; }
                .report-container th { background-color: #f2f2f2; font-weight: bold; }
                .report-container .calificaciones-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .report-container .año { border: 1px solid #ccc; padding: 8px; page-break-inside: avoid; }
                .report-container .titulo-año { font-weight: bold; text-align: center; margin-bottom: 8px; font-size: 11px; }
                .report-container .observaciones-grid { display: flex; justify-content: space-around; gap: 15px; flex-wrap: wrap; }
                .report-container .observaciones-table { width: 100%; max-width: 350px; }
                .report-container footer { display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid #000; padding-top: 8px; flex-wrap: wrap; }
                .report-container .footer-section { width: 48%; min-width: 300px; text-align: center; margin-bottom: 15px; }
                .report-container .signature-box, .report-container .stamp-box { border: 1px solid #000; height: 70px; margin: 15px 0; padding: 5px; }
                .report-container .stamp-box { display: flex; align-items: center; justify-content: center; text-align: center; }
            `}</style>
            <div className="report-container" ref={templateRef}>
                <header>
                    <div className="header-left">
                        <p>Gobierno Bolivariano de Venezuela</p>
                        <p>Ministerio del Poder Popular para la Educación</p>
                    </div>
                    <div className="header-right">
                        <p><strong>CERTIFICACIÓN DE CALIFICACIONES EMG</strong></p>
                    </div>
                </header>

                <section className="bordered-section">
                    <p><strong>I. Plan de Estudio:</strong> EDUCACIÓN MEDIA GENERAL</p>
                    <p><strong>Código:</strong> 31059</p>
                    <p><strong>Lugar y fecha de Expedición:</strong> {data.issuePlaceDate}</p>
                </section>
                
                {/* School, Student data sections */}
                <section className="bordered-section">
                    <p><strong>II. Datos de la Institución Educativa...</strong></p>
                    <div className="details-flex">
                        <div>
                            <p><strong>Código:</strong> {data.school.code}</p>
                            <p><strong>Denominación y Epónimo:</strong> {data.school.name}</p>
                            <p><strong>Dirección:</strong> {data.school.address}</p>
                        </div>
                        <div>
                            <p><strong>Municipio:</strong> {data.school.municipality}</p>
                            <p><strong>Entidad Federal:</strong> {data.school.state}</p>
                            <p><strong>Teléfono:</strong> {data.school.phone}</p>
                            <p><strong>CDCEE:</strong> {data.school.cdcee}</p>
                        </div>
                    </div>
                </section>
                <section className="bordered-section">
                    <p><strong>III. Datos de Identificación del Estudiante</strong></p>
                    <div className="details-flex">
                        <div>
                            <p><strong>Cédula de Identidad:</strong> {data.student.cedula}</p>
                            <p><strong>Apellidos:</strong> {data.student.lastName}</p>
                            <p><strong>Nombres:</strong> {data.student.firstName}</p>
                        </div>
                        <div>
                            <p><strong>Fecha de Nacimiento:</strong> {data.student.birthDate}</p>
                            <p><strong>Lugar de nacimiento:</strong> {data.student.birthPlace}</p>
                        </div>
                    </div>
                </section>

                <section className="bordered-section">
                    <p><strong>IV. Instituciones educativas donde cursó Estudios</strong></p>
                    <table>
                        <thead><tr><th>No</th><th>Denominación y Epónimo</th><th>Localidad</th><th>E.F</th><th>No</th><th>Denominación y Epónimo</th><th>Localidad</th><th>E.F</th></tr></thead>
                        <tbody><tr><td>1</td><td>{data.school.name}</td><td>{data.school.municipality}</td><td>{data.school.state}</td><td>3</td><td></td><td></td><td></td></tr><tr><td>2</td><td></td><td></td><td></td><td>4</td><td></td><td></td><td></td></tr></tbody>
                    </table>
                </section>

                <section className="bordered-section">
                    <p><strong>V. Plan de Estudio:</strong> Educación Media General</p>
                    <div className="calificaciones-grid">
                        <div className="año">
                            <p className="titulo-año">PRIMER AÑO</p>
                            <table>
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                                <thead><tr><th>ÁREA DE FORMACIÓN</th><th>CALIFICACIÓN<br/>N° LETRAS</th><th>T-E</th><th>FECHA<br/>Mes Año</th><th>Inst. Educ.</th></tr></thead>
                                <tbody>
                                    {subjects.year1.map(s => renderGradeRow(1, s))}
                                </tbody>
                            </table>
                        </div>
                        <div className="año">
                            <p className="titulo-año">SEGUNDO AÑO</p>
                            <table>
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                                <thead><tr><th>ÁREA DE FORMACIÓN</th><th>CALIFICACIÓN<br/>N° LETRAS</th><th>T-E</th><th>FECHA<br/>Mes Año</th><th>Inst. Educ.</th></tr></thead>
                                <tbody>
                                     {subjects.year2.map(s => renderGradeRow(2, s))}
                                </tbody>
                            </table>
                        </div>
                        <div className="año">
                           <p className="titulo-año">TERCER AÑO</p>
                           <table>
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                               <thead><tr><th>ÁREA DE FORMACIÓN</th><th>CALIFICACIÓN<br/>N° LETRAS</th><th>T-E</th><th>FECHA<br/>Mes Año</th><th>Inst. Educ.</th></tr></thead>
                               <tbody>
                                   {subjects.year3.map(s => renderGradeRow(3, s))}
                               </tbody>
                           </table>
                        </div>
                         <div className="año">
                           <p className="titulo-año">CUARTO AÑO</p>
                           <table>
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                               <thead><tr><th>ÁREA DE FORMACIÓN</th><th>CALIFICACIÓN<br/>N° LETRAS</th><th>T-E</th><th>FECHA<br/>Mes Año</th><th>Inst. Educ.</th></tr></thead>
                               <tbody>
                                   {subjects.year4.map(s => renderGradeRow(4, s))}
                               </tbody>
                           </table>
                        </div>
                        <div className="año">
                           <p className="titulo-año">QUINTO AÑO</p>
                           <table>
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                               <thead><tr><th>ÁREA DE FORMACIÓN</th><th>CALIFICACIÓN<br/>N° LETRAS</th><th>T-E</th><th>FECHA<br/>Mes Año</th><th>Inst. Educ.</th></tr></thead>
                               <tbody>
                                   {subjects.year5.map(s => renderGradeRow(5, s))}
                               </tbody>
                           </table>
                        </div>
                    </div>
                </section>

                <section className="bordered-section">
                    <p><strong>VI. Observaciones</strong> Promedio: 0.00</p>
                </section>

                <footer>
                    <div className="footer-section">
                        <p><strong>VII. Institución Educativa</strong></p>
                        <p><strong>Director(a):</strong> {data.director.name}</p>
                        <p><strong>Cédula de Identidad:</strong> {data.director.cedula}</p>
                        <div className="signature-box"><p>Firma:</p></div>
                        <div className="stamp-box"><p>SELLO DE LA INSTITUCIÓN EDUCATIVA</p></div>
                    </div>
                    <div className="footer-section">
                        <p><strong>VIII. Centro de Desarrollo de la Calidad Educativa Estadal</strong></p>
                        <p><strong>Director(a):</strong></p><p><strong>Cédula de Identidad:</strong></p>
                        <div className="signature-box"><p>Firma:</p></div>
                        <div className="stamp-box"><p>SELLO DEL CENTRO DE DESARROLLO...</p></div>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default CertificadoTemplate;