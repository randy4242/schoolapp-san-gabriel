import React from 'react';
import { Certificate } from '../../types';

interface CertificateTemplateProps {
    data: Certificate;
    templateRef: React.RefObject<HTMLDivElement>;
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({ data, templateRef }) => {
    const {
        schoolName = "SchoolApp",
        schoolCode = "S1934D0810",
        certificateType = "CONSTANCIA",
        content,
        signatoryName = "MENDOZA CARRILLO PEDRO ÁNGEL",
        signatoryTitle = "Director(a)",
        address = "AV. SALVADOR FEO LA CRUZ SECTOR MAÑONGO - NAGUANAGUA, Carabobo",
        phones = "Teléfonos: 0241-8426475"
    } = data;

    const formattedContent = content.split('\n').map((line, index) => (
        <React.Fragment key={index}>
            {line}
            <br />
        </React.Fragment>
    ));

    const isSolvencia = certificateType.toUpperCase().includes("SOLVENCIA");

    return (
        <>
            <style>{`
                .cert-page {
                    position: relative;
                    min-height: 24cm;
                    padding: 1.5cm 2.5cm 2.5cm 2.5cm;
                    font: 12pt "Times New Roman", Times, serif;
                    line-height: 1.65;
                    color: #000;
                    box-sizing: border-box;
                    height: 100%;
                }
                .cert-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 50px;
                    padding-top: 0px;
                    position: relative;
                }
                .cert-logo {
                    width: 100px;
                }
                .cert-logo img {
                    width: 100%;
                    height: auto;
                }
                .cert-header-text {
                    text-align: center;
                    flex-grow: 1;
                    margin: 0 20px;
                    line-height: 1.2;
                }
                .cert-school-name {
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 14pt;
                    margin-bottom: 2px;
                }
                .cert-school-code {
                    font-size: 10pt;
                }
                .cert-doc-title {
                    margin: 20px 0 40px 0;
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 14pt;
                    text-decoration: underline;
                }
                .cert-content {
                    margin-top: 30px;
                    text-align: justify;
                }
                .cert-signature {
                    margin-top: 120px;
                    text-align: center;
                    page-break-inside: avoid;
                    line-height: 1.3;
                    border-top: 1px solid #000;
                    width: 300px;
                    margin-left: auto;
                    margin-right: auto;
                    padding-top: 5px;
                }
                .cert-sign-name {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-top: 0;
                    margin-bottom: 0;
                }
                .cert-sign-title {
                    margin-top: 0;
                    font-size: 11pt;
                }
                .cert-footer {
                    position: absolute;
                    left: 2.5cm;
                    right: 2.5cm;
                    bottom: 1.5cm;
                    text-align: center;
                    font-size: 9pt;
                    color: #000;
                    border-top: 2px solid #3498db; /* Blue line as in example */
                    padding-top: 4px;
                    line-height: 1.1;
                    font-style: italic;
                }
                /* Solvencia Specifics */
                .solvencia-header-text {
                     font-size: 16pt;
                     font-family: "Arial", sans-serif;
                     font-weight: bold;
                     font-style: italic;
                }
                .ministerio-logo {
                    width: 150px;
                }
            `}</style>
            <div className="cert-page" ref={templateRef}>
                {isSolvencia ? (
                    <div className="cert-header">
                        <div className="cert-logo">
                            <img src="https://i.postimg.cc/6pSzkmqn/roques-logo.png" alt="Colegio Logo" />
                        </div>
                        <div className="cert-header-text">
                            <div className="cert-school-name" style={{ fontStyle: 'italic', fontFamily: 'Arial' }}>UNIDAD EDUCATIVA</div>
                            <div className="cert-school-name" style={{ fontSize: '18pt', fontFamily: 'Arial' }}>COLEGIO LOS ROQUES</div>
                            <div className="cert-school-code" style={{ fontWeight: 'bold' }}>Inscrito en el M.P.P.E. {schoolCode}</div>
                            <div className="cert-school-code" style={{ fontWeight: 'bold' }}>Rif: J-50677625-1</div>
                            <div className="cert-school-code" style={{ fontWeight: 'bold' }}>Valencia - Edo. Carabobo</div>
                        </div>
                        <div className="cert-logo ministerio-logo">
                            <img src="https://jfywkgbqxijdfwqsscqa.supabase.co/storage/v1/object/public/assets/Ministerio%20del%20Poder%20popular%20para%20la%20educacion%20Logo.jpg" alt="Ministerio Logo" />
                        </div>
                    </div>
                ) : (
                    <div className="cert-header">
                        <div className="cert-logo">
                            <img src="https://i.postimg.cc/TwvTg2P6/LOGO-VERTICAL-BLANCO-Y-ROJO.png" alt="SchoolApp Logo" />
                        </div>
                        <div className="cert-header-text">
                            <div className="cert-school-name">{schoolName}</div>
                            <div className="cert-school-code">Inscrito en el M.P.P.E {schoolCode}</div>
                        </div>
                    </div>
                )}

                {/* Horizontal Blue Line for Solvencia */}
                {isSolvencia && <div style={{ borderBottom: '2px solid #3498db', marginBottom: '30px' }}></div>}

                <h1 className="cert-doc-title">{certificateType.toUpperCase()}</h1>

                <div className="cert-content">
                    {formattedContent}
                </div>

                <div className="cert-signature">
                    <div className="cert-sign-name">{signatoryName}</div>
                    <div className="cert-sign-title">{signatoryTitle}</div>
                </div>

                <div className="cert-footer">
                    {isSolvencia ? (
                        <>
                            <div style={{ fontWeight: 'bold' }}>Dirección: Urbanización Trigal Norte Avenida 92 Atlántico/Saturno casa No. 155-100</div>
                            <div style={{ fontWeight: 'bold', color: '#0056b3' }}>Correo: uelosroquescentral@gmail.com</div>
                            <div style={{ fontWeight: 'bold' }}>Para Confirmación de solvencias administrativas comunicarse con el Celular: 0414-430.31.08</div>
                        </>
                    ) : (
                        <>
                            <div className="addr">{address}</div>
                            <div className="phone">{phones}</div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default CertificateTemplate;