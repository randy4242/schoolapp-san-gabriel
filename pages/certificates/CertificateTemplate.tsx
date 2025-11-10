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
                    align-items: flex-start;
                    margin-bottom: 70px;
                    padding-top: 15px;
                }
                .cert-logo {
                    position: absolute;
                    top: 0cm;
                    left: 0cm;
                }
                .cert-logo img {
                    width: 100px;
                    height: auto;
                }
                .cert-header-text {
                    text-align: center;
                    flex-grow: initial;
                    margin-left: 10px;
                    line-height: 1.2;
                }
                .cert-school-name {
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 14pt;
                    margin-bottom: 2px;
                }
                .cert-school-code {
                    font-size: 11pt;
                }
                .cert-doc-title {
                    margin: 0;
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 14pt;
                }
                .cert-content {
                    margin-top: 30px;
                    text-align: justify;
                }
                .cert-signature {
                    margin-top: 60px;
                    text-align: center;
                    page-break-inside: avoid;
                    line-height: 1.3;
                }
                .cert-sign-name {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-top: 0;
                    margin-bottom: 0;
                }
                .cert-sign-title {
                    margin-top: 0;
                    font-size: 12pt;
                }
                .cert-footer {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -1cm;
                    text-align: center;
                    font-size: 10pt;
                    color: #000;
                    border-top: 1px solid #000;
                    padding-top: 4px;
                    line-height: 1.1;
                }
            `}</style>
            <div className="cert-page" ref={templateRef}>
                <div className="cert-header">
                    <div className="cert-logo">
                        <img src="https://i.postimg.cc/TwvTg2P6/LOGO-VERTICAL-BLANCO-Y-ROJO.png" alt="SchoolApp Logo" />
                    </div>
                    <div className="cert-header-text">
                        <div className="cert-school-name">{schoolName}</div>
                        <div className="cert-school-code">Inscrito en el M.P.P.E {schoolCode}</div>
                    </div>
                </div>

                <h1 className="cert-doc-title">{certificateType.toUpperCase()}</h1>

                <div className="cert-content">
                    {formattedContent}
                </div>

                <div className="cert-signature">
                    <div className="cert-sign-name">{signatoryName}</div>
                    <div className="cert-sign-title">{signatoryTitle}</div>
                </div>

                <div className="cert-footer">
                    <div className="addr">{address}</div>
                    <div className="phone">{phones}</div>
                </div>
            </div>
        </>
    );
};

export default CertificateTemplate;