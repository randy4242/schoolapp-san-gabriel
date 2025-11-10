
import React from 'react';
import { ReportEmgClassroomResponse, User } from '../../types';

interface CertificadoTemplateProps {
  reportData: ReportEmgClassroomResponse;
  student: User;
  templateRef: React.RefObject<HTMLDivElement>;
}

// --- Helper Functions & Components ---

const numberToLetter = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined || num === '') return '';
    const n = Math.round(Number(num));
    if (isNaN(n) || n < 0 || n > 20) return String(num); // return original value if out of range
    const letters = [
        'Cero', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez',
        'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve', 'Veinte'
    ];
    return letters[n];
};

interface SubjectRowProps {
    subject: string;
    gradeNum: string;
    gradeLet: string;
    showInstEduc?: boolean;
}

const SubjectRow: React.FC<SubjectRowProps> = ({ subject, gradeNum, gradeLet, showInstEduc = false }) => (
  <tr>
    <td className="border border-black px-1 text-left h-5 font-semibold text-[9px]">{subject}</td>
    <td className="border border-black px-1 text-center">{gradeNum}</td>
    <td className="border border-black px-1 text-center">{gradeLet}</td>
    <td className="border border-black px-1"></td> {/* T-E */}
    <td className="border border-black px-1"></td> {/* Mes */}
    <td className="border border-black px-1"></td> {/* Año */}
    {showInstEduc && <td className="border border-black text-center">{'1'}</td>} {/* Inst Educ. */}
  </tr>
);


// FIX: Changed component definition to React.FC to resolve typing issue with children prop.
const VerticalHeaderText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <th rowSpan={2} className="border border-black w-6 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="transform -rotate-90 whitespace-nowrap text-[9px] font-normal">
          {children}
        </span>
      </div>
    </th>
);

interface InfoFieldProps {
    label: string;
    className?: string;
    lineClassName?: string;
    value?: string | number | null;
    noBorder?: boolean;
}
const InfoField: React.FC<InfoFieldProps> = ({ label, className = '', lineClassName = '', value = '', noBorder = false }) => (
  <div className={`flex items-end ${className}`}>
    <span className="font-bold whitespace-nowrap mr-2">{label}</span>
    <div className={`flex-grow relative ${lineClassName || 'h-4'} ${noBorder ? '' : 'border-b border-black'}`}>
      <span className="absolute bottom-0 left-1 font-normal">{value}</span>
    </div>
  </div>
);


const CertificadoTemplate: React.FC<CertificadoTemplateProps> = ({ reportData, student, templateRef }) => {
  const studentData = reportData.rows?.[0];

  const nameParts = (studentData?.nombreCompleto || student.userName || '').split(' ');
  const lastName = nameParts.slice(0, 2).join(' ');
  const firstName = nameParts.slice(2).join(' ');

  const lugarNac = studentData?.lugarNac || student.lugarNacimiento || '';
  let pais = 'VENEZUELA';
  let estado = '';
  let municipio = '';
  if (lugarNac) {
    const lugarParts = lugarNac.split(',').map(p => p.trim());
    if (lugarParts.length >= 2) {
        municipio = lugarParts[0];
        estado = lugarParts[1];
    } else if (lugarParts.length === 1) {
        municipio = lugarParts[0];
    }
  }

  const subjectsYear1And2 = ["Castellano", "Inglés y otras Lenguas Extranjeras", "Matemáticas", "Educación Física", "Arte y Patrimonio", "Ciencias Naturales", "Geografía, Historia y Ciudadanía"];
  const subjectsYear3 = ["Castellano", "Inglés y otras Lenguas Extranjeras", "Matemáticas", "Educación Física", "Física", "Química", "Biología", "Geografía, Historia y Ciudadanía"];
  const subjectsYear4 = [...subjectsYear3, "Formación para la Soberanía Nacional"];
  const subjectsYear5 = ["Castellano", "Inglés y otras Lenguas Extranjeras", "Matemáticas", "Educación Física", "Física", "Química", "Biología", "Ciencias de la Tierra", "Geografía, Historia y Ciudadanía", "Formación para la Soberanía Nacional"];

  const gradeMap = new Map();
  if (studentData) {
      reportData.subjectColumns.forEach((subject, index) => {
          gradeMap.set(subject, studentData.subjectCells[index]);
      });
  }

  const getGrade = (subject: string) => {
      const grade = gradeMap.get(subject);
      return grade !== undefined ? String(grade) : '';
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white shadow-lg text-xs leading-tight font-sans" ref={templateRef}>
    
        <div className="p-4">
            {/* --- Cabecera --- */}
            <header className="flex items-start mb-1">
              <div className="w-1/3">
                 <img src="https://i.postimg.cc/fTy5MXtB/db882d55-605e-41b6-8bad-426cafddd4a7-removalai-preview.png" alt="Ministerio de Educación" className="max-h-14 w-auto" />
              </div>
              <div className="w-2/3 pl-4">
                <h1 className="font-bold text-lg tracking-wider text-center underline">CERTIFICACIÓN DE CALIFICACIONES EMG</h1>
                <div className="border-t border-b border-black mt-1 py-1 px-2 text-left">
                    <div className="flex items-end justify-between">
                        <p className="font-bold">I. Plan de Estudio: EDUCACIÓN MEDIA GENERAL</p>
                        <InfoField label="Código:" value="31059" className="w-32" />
                    </div>
                     <InfoField label="Lugar y fecha de Expedición:" value={`${reportData.entity}, ${reportData.mesAnio}`} noBorder={true} />
                </div>
              </div>
            </header>

            {/* --- Sección II: Datos de la Institución --- */}
            <section className="border-b border-black py-1 mb-1">
              <p className="font-bold">II. Datos de la Institución Educativa o Centro de Desarrollo de la Calidad Educativa Estadal (CDCEE) que Emite la Certificación:</p>
              <div className="grid grid-cols-12 gap-x-4 gap-y-1 mt-1">
                <InfoField label="Código:" className="col-span-3" value={reportData.schoolCode}/>
                <InfoField label="Denominación y Epónimo:" className="col-span-9" value={reportData.schoolName}/>
                <InfoField label="Dirección:" className="col-span-8" value={reportData.address}/>
                <InfoField label="Teléfono:" className="col-span-4" value={reportData.phone}/>
                <InfoField label="Municipio:" className="col-span-4" value={reportData.municipality}/>
                <InfoField label="Entidad Federal:" className="col-span-4" value={reportData.entity}/>
                <InfoField label="CDCEE:" className="col-span-4" value={reportData.entity}/>
              </div>
            </section>

            {/* --- Sección III: Datos del Estudiante --- */}
            <section className="border-b border-black py-1 mb-2">
              <p className="font-bold">III. Datos de Identificación del Estudiante</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-1">
                 <InfoField label="Cédula de Identidad:" value={student.cedula || ''}/>
                 <InfoField label="Fecha de Nacimiento:" value={studentData && studentData.diaNac && studentData.mesNac && studentData.anioNac ? `${studentData.diaNac}/${studentData.mesNac}/${studentData.anioNac}` : ''}/>
                 <InfoField label="Apellidos:" value={lastName}/>
                 <InfoField label="Nombres:" value={firstName}/>
                 <div className="col-span-2 flex items-end space-x-4 mt-1">
                    <span className="font-bold whitespace-nowrap">Lugar de nacimiento:</span>
                    <InfoField label="País:" className="flex-grow" value={pais}/>
                    <InfoField label="Estado:" className="flex-grow" value={estado}/>
                    <InfoField label="Municipio:" className="flex-grow" value={municipio}/>
                </div>
              </div>
            </section>

            {/* --- Sección IV: Instituciones donde cursó estudios --- */}
            <section className="mb-2">
              <p className="font-bold">IV. Instituciones educativas donde cursó Estudios</p>
              <table className="w-full border-collapse text-center mt-1">
                <thead>
                  <tr>
                    <th className="border-2 border-black w-6">N°</th>
                    <th className="border-2 border-black text-[10px]">Denominación y Epónimo de la Institución Educativa</th>
                    <th className="border-2 border-black w-1/5 text-[10px]">Localidad</th>
                    <th className="border-2 border-black w-8">E.F</th>
                    <th className="border-2 border-black w-6">N°</th>
                    <th className="border-2 border-black text-[10px]">Denominación y Epónimo de la Institución Educativa</th>
                    <th className="border-2 border-black w-1/5 text-[10px]">Localidad</th>
                    <th className="border-2 border-black w-8">E.F</th>
                  </tr>
                </thead>
                <tbody>
                    <tr>
                      <td className="border-2 border-black h-5">{'1'}</td>
                      <td className="border-2 border-black text-left px-1">{reportData.schoolName}</td>
                      <td className="border-2 border-black text-left px-1">{reportData.municipality}</td>
                      <td className="border-2 border-black">{reportData.entity.substring(0,2)}</td>
                      <td className="border-2 border-black">{'3'}</td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                    </tr>
                    <tr>
                      <td className="border-2 border-black h-5">{'2'}</td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black">{'4'}</td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                      <td className="border-2 border-black"></td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="border-r-2 border-black"></td>
                        <td className="border-2 border-black h-5">{'5'}</td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                    </tr>
                </tbody>
              </table>
            </section>

            {/* --- Sección V: Plan de Estudio --- */}
            <section className="border-2 border-black p-1 mb-2">
                <p className="font-bold text-center">V. Plan de Estudio: Educación Media General</p>
                <div className="flex space-x-2">
                    {['PRIMER AÑO', 'SEGUNDO AÑO'].map((year, index) => (
                        <div className="w-1/2" key={year}>
                            <table className="w-full border-collapse text-center">
                                <thead>
                                    <tr><th colSpan={7} className="font-bold text-[10px]">{year}</th></tr>
                                    <tr>
                                        <th rowSpan={2} className="border border-black w-2/5 font-bold text-[9px]">ÁREA DE FORMACIÓN</th>
                                        <th colSpan={2} className="border border-black font-bold text-[9px]">CALIFICACIÓN</th>
                                        <th rowSpan={2} className="border border-black font-bold text-[9px]">T-E</th>
                                        <th colSpan={2} className="border border-black font-bold text-[9px]">FECHA</th>
                                        <VerticalHeaderText>Inst. Educ.</VerticalHeaderText>
                                    </tr>
                                    <tr>
                                        <th className="border border-black font-bold text-[9px]">N°</th>
                                        <th className="border border-black font-bold text-[9px]">LETRAS</th>
                                        <th className="border border-black font-bold text-[9px]">Mes</th>
                                        <th className="border border-black font-bold text-[9px]">Año</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectsYear1And2.map(subject => {
                                        const gradeNum = getGrade(subject);
                                        const gradeLet = numberToLetter(gradeNum);
                                        return <SubjectRow key={subject} subject={subject} gradeNum={gradeNum} gradeLet={gradeLet} showInstEduc={true} />;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="flex space-x-2 mt-2">
                     {['TERCER AÑO', 'CUARTO AÑO'].map((year) => (
                        <div className="w-1/2" key={year}>
                            <table className="w-full border-collapse text-center">
                                <thead>
                                    <tr><th colSpan={7} className="font-bold text-[10px]">{year}</th></tr>
                                    <tr>
                                        <th rowSpan={2} className="border border-black w-2/5 font-bold text-[9px]">ÁREA DE FORMACIÓN</th>
                                        <th colSpan={2} className="border border-black font-bold text-[9px]">CALIFICACIÓN</th>
                                        <th rowSpan={2} className="border border-black font-bold text-[9px]">T-E</th>
                                        <th colSpan={2} className="border border-black font-bold text-[9px]">FECHA</th>
                                        <VerticalHeaderText>Inst. Educ.</VerticalHeaderText>
                                    </tr>
                                    <tr>
                                        <th className="border border-black font-bold text-[9px]">N°</th>
                                        <th className="border border-black font-bold text-[9px]">LETRAS</th>
                                        <th className="border border-black font-bold text-[9px]">Mes</th>
                                        <th className="border border-black font-bold text-[9px]">Año</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(year === 'TERCER AÑO' ? subjectsYear3 : subjectsYear4).map(subject => {
                                        const gradeNum = getGrade(subject);
                                        const gradeLet = numberToLetter(gradeNum);
                                        return <SubjectRow key={subject} subject={subject} gradeNum={gradeNum} gradeLet={gradeLet} showInstEduc={true}/>;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="flex space-x-2 mt-2">
                    <div className="w-1/2">
                         <table className="w-full border-collapse text-center">
                            <thead>
                                <tr><th colSpan={7} className="font-bold text-[10px]">QUINTO AÑO</th></tr>
                                 <tr>
                                    <th rowSpan={2} className="border border-black w-2/5 font-bold text-[9px]">ÁREA DE FORMACIÓN</th>
                                    <th colSpan={2} className="border border-black font-bold text-[9px]">CALIFICACIÓN</th>
                                    <th rowSpan={2} className="border border-black font-bold text-[9px]">T-E</th>
                                    <th colSpan={2} className="border border-black font-bold text-[9px]">FECHA</th>
                                    <VerticalHeaderText>Inst. Educ.</VerticalHeaderText>
                                </tr>
                                <tr>
                                    <th className="border border-black font-bold text-[9px]">N°</th>
                                    <th className="border border-black font-bold text-[9px]">LETRAS</th>
                                    <th className="border border-black font-bold text-[9px]">Mes</th>
                                    <th className="border border-black font-bold text-[9px]">Año</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjectsYear5.map(subject => {
                                    const gradeNum = getGrade(subject);
                                    const gradeLet = numberToLetter(gradeNum);
                                    return <SubjectRow key={subject} subject={subject} gradeNum={gradeNum} gradeLet={gradeLet} showInstEduc={true}/>;
                                })}
                            </tbody>
                        </table>
                    </div>
                     <div className="w-1/2 flex flex-col justify-between">
                        <table className="w-full border-collapse text-center">
                            <thead>
                                <tr><th colSpan={3} className="font-bold text-[10px]">ÁREAS DE FORMACIÓN</th></tr>
                                <tr>
                                    <th className="border border-black w-1/2 font-bold text-[9px]">ÁREA DE FORMACIÓN</th>
                                    <th className="border border-black font-bold text-[9px]">AÑO</th>
                                    <th className="border border-black font-bold text-[9px]">LITERAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td rowSpan={5} className="border border-black text-center font-semibold text-[9px]">ORIENTACIÓN Y CONVIVENCIA</td>
                                    <td className="border border-black h-5 text-center">1°</td>
                                    <td className="border border-black"></td>
                                </tr>
                                {[2,3,4,5].map(i => ( <tr key={i}> <td className="border border-black h-5 text-center">{i}°</td> <td className="border border-black"></td> </tr> ))}
                            </tbody>
                        </table>
                         <table className="w-full border-collapse text-center mt-2">
                            <thead>
                                <tr>
                                    <th className="border border-black w-1/2 font-bold text-[9px]">ÁREA DE FORMACIÓN</th>
                                    <th className="border border-black font-bold text-[9px]">AÑO</th>
                                    <th className="border border-black font-bold text-[9px]">GRUPO</th>
                                    <th className="border border-black font-bold text-[9px]">LITERAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                 <tr>
                                    <td rowSpan={5} className="border border-black text-center font-semibold text-[9px]">PARTICIPACIÓN EN GRUPOS DE CREACIÓN, RECREACIÓN Y PRODUCCIÓN</td>
                                    <td className="border border-black h-5 text-center">1°</td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                </tr>
                                 {[2,3,4,5].map(i => ( <tr key={i}> <td className="border border-black h-5 text-center">{i}°</td> <td className="border border-black"></td> <td className="border border-black"></td> </tr> ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="p-1 mb-2">
                <div className="font-bold">VI. Observaciones Promedio: 0.00</div>
                <div className="h-4 border-b border-black mt-2"></div>
                <div className="h-4 border-b border-black mt-2"></div>
                <div className="h-4 border-b border-black mt-2"></div>
            </section>


            {/* --- Firmas y Sellos --- */}
            <footer className="grid grid-cols-2 gap-x-2">
                {[
                    { 
                        title: 'VII. Institución Educativa', 
                        seal: 'SELLO DE LA INSTITUCIÓN EDUCATIVA', 
                        validity: 'Para Efectos de su Validez Nacional',
                        director: reportData.director,
                        directorCI: reportData.directorCI
                    },
                    { 
                        title: 'VIII. Centro de Desarrollo de la Calidad Educativa Estadal', 
                        seal: 'SELLO DEL CENTRO DE DESARROLLO DE LA CALIDAD EDUCATIVA ESTADAL', 
                        validity: 'Para Efectos de su Validez Internacional',
                        director: '',
                        directorCI: ''
                    }
                ].map(({ title, seal, validity, director, directorCI }) => (
                    <div key={title}>
                        <p className="font-bold text-center mb-1 text-xs">{title}</p>
                        <table className="w-full border-collapse border-2 border-black text-[10px]">
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1 align-top h-7 w-1/2">Director(a):</td>
                                    <td rowSpan={7} className="border border-black p-1 w-1/2 text-center align-middle font-semibold text-xs">{seal}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 align-top h-7">Apellidos y Nombres:</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 align-middle h-7 font-normal text-center">{director}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 align-top h-7">Cédula de Identidad:</td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-1 align-middle h-7 font-normal text-center">{directorCI}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1 align-top h-7">Firma:</td>
                                </tr>
                                <tr>
                                   <td className="border border-black p-1 text-center font-bold h-7 align-middle">{validity}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))}
            </footer>
        </div>
    </div>
  );
}

export default CertificadoTemplate;
