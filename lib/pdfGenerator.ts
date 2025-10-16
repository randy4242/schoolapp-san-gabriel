import React from 'react';

/**
 * NOTE: This functionality has been deprecated in favor of a print preview page.
 * The required libraries (jsPDF, html2canvas) have been removed.
 */
export const generatePdfFromRef = async (
    elementRef: React.RefObject<HTMLDivElement>,
    fileName: string
): Promise<void> => {
    console.warn('PDF generation is deprecated and will not function.');
};
