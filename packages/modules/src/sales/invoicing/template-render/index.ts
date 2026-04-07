/**
 * sales/invoicing/template-render
 *
 * Feature: render invoice PDFs for dispatch and storage.
 * Owner: sales domain
 * Read path: generateInvoicePdf, generateGstr1Pdf, generatePnlPdf
 */
export * from "./contracts/dto";
export { generateInvoicePdf, generateGstr1Pdf, generatePnlPdf } from "../../../utils/pdf";
