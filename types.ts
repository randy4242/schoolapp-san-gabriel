
// FIX: Replaced file content with actual type definitions to resolve circular dependencies and missing exports.
export interface AuthenticatedUser {
    token: string;
    schoolId: number;
    userId: number;
    userName: string;
    email: string;
    roleId: number;
}

export interface DashboardStats {
    totalUsers: number;
    students: number;
    teachers: number;
    parents: number;
    courses: number;
    schoolName: string;
}

export interface User {
    userID: number;
    userName:string;
    email: string;
    phoneNumber: string | null;
    cedula: string | null;
    roleID: number;
    schoolID: number;
    isBlocked: boolean;
    blockedReason?: string | null;
    blockedAt?: string | null;
    lugarNacimiento?: string;
    classroomID?: number | null;
}

export interface UserDetails {
    userID: number;
    userName: string;
    email: string;
    cedula: string | null;
    phoneNumber: string | null;
    schoolID: number;
    classroomID: number | null;
    roleID: number;
    isBlocked: boolean;
    school: {
        schoolID: number;
        name: string;
        address: string;
        phone: string;
        email: string;
        schoolYear: string;
    };
    classroom: {
        classroomID: number;
        name: string;
        description: string;
        schoolID: number;
    } | null;
    role: {
        roleID: number;
        display: string;
    };
    enrollments: {
        enrollmentID: number;
        userID: number;
        courseID: number;
        course: {
            courseID: number;
            schoolID: number;
            classroomID: number | null;
        };
    }[];
    courses: any[];
}


export const ROLES = [
    { id: 1, name: 'Estudiante' },
    { id: 2, name: 'Profesor' },
    { id: 3, name: 'Representante' },
    { id: 6, name: 'Admin' },
    { id: 7, name: 'Super Admin' },
    { id: 8, name: 'Coordinador' },
    { id: 9, name: 'Profesor Jefe' },
    { id: 10, name: 'Profesor Auxiliar' },
    { id: 11, name: 'Madre' }
];

export const BOLETA_LEVELS = [
    "Sala 1",
    "Sala 2",
    "Sala 3",
    "Primer Grado",
    "Segundo Grado",
    "Tercer Grado",
    "Cuarto Grado",
    "Quinto Grado",
    "Sexto Grado"
];

export interface Course {
    courseID: number;
    name: string;
    description: string;
    userID: number; // teacher's user ID
    teacherName?: string;
    dayOfWeek: string | null;
    additionalTeacherIDs?: number[] | string;
    schoolID: number;
    // FIX: Add optional classroomID to align with its usage in AssignGradesPage.tsx.
    classroomID?: number | null;
}

export type Teacher = User;

export interface Classroom {
    classroomID: number;
    name: string;
    description: string;
    schoolID: number;
}

export interface Student {
    studentID: number;
    studentName: string;
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    justifiedAbsent: number;
    observation: number;
}

export interface CourseAttendance {
    courseName: string;
    summary: AttendanceSummary;
}

export interface StudentAttendance {
    studentID: number;
    studentName: string;
    summary: AttendanceSummary;
}

export interface ClassroomAttendanceStats {
    overall: AttendanceSummary;
    byCourse: CourseAttendance[];
    byStudent: StudentAttendance[];
}

export interface Lapso {
    lapsoID: number;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
}

export interface StudentGradeItem {
    evaluacion: string;
    displayGrade: string | number;
    date: string | null;
    comments: string;
}

export interface StudentGradesGroup {
    courseName: string;
    items: StudentGradeItem[];
}

export interface StudentGradesVM {
    studentId: number;
    studentName: string;
    selectedLapsoId: number;
    lapsos: Lapso[];
    groups: StudentGradesGroup[];
}

export interface LapsoGradeApiItem {
    course: { name: string } | null;
    evaluation: { title: string, date: string | null } | null;
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
}

export interface StudentAttendanceStats {
    studentID: number;
    studentName: string;
    overall: AttendanceSummary;
    byCourse: {
        courseID: number;
        courseName: string;
        summary: AttendanceSummary;
    }[];
}

export interface AuthResponse {
    token: string;
}

export interface Evaluation {
    evaluationID: number;
    title: string;
    description: string;
    date: string;
    courseID: number;
    course?: { name: string };
    lapso?: Lapso;
    userID: number;
    schoolID: number;
    classroomID?: number | null;
    createdAt: string;
    lapsoID?: number | null;
}

export interface Grade {
    gradeID: number;
    userID: number;
    courseID: number;
    evaluationID: number;
    schoolID: number;
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
    hasImage: boolean;
}

export interface StudentGradeData {
    userID: number;
    userName: string;
    gradeValue: string;
    gradeText: string;
    comments: string;
}

export interface Child {
    relationID: number;
    userID: number;
    userName: string;
    email: string;
}

export interface Parent {
    relationID: number;
    userID: number;
    userName: string;
    email: string;
}

export interface LoginHistoryRecord {
    historyID: number;
    userName: string;
    loginTime: string;
    loginSuccess: boolean;
    loginMessage: string | null;
}

export enum PaymentStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export enum PaymentMethod {
    PagoMovil = 'PagoMovil',
    Transfer = 'Transfer'
}

export interface Payment {
    paymentID: number;
    createdAt: string;
    amount: number;
    currency: string;
    referenceNumber: string | null;
    status: PaymentStatus;
    method: PaymentMethod;
    pm_CedulaRif?: string | null;
    pm_Phone?: string | null;
    pm_BankOrigin?: string | null;
    pm_BankDest?: string | null;
    tr_CedulaRif?: string | null;
    tr_FullName?: string | null;
    tr_BankDest?: string | null;
    tr_AccountNumber?: string | null;
    invoiceID?: number | null;
    notes?: string | null;
}

export interface Notification {
    notifyID: number;
    title: string;
    content: string;
    date: string;
    isRead: boolean;
}

export interface ReportEmgRow {
    nro: number;
    cedula: string;
    nombreCompleto: string;
    lugarNac: string | null;
    sexo: 'M' | 'F' | null;
    diaNac?: string;
    mesNac?: string;
    anioNac?: string;
    subjectCells: (string | number)[];
    grupo: string | null;
}

export interface ReportEmgClassroomResponse {
    entity: string;
    mesAnio: string;
    schoolCode: string;
    schoolName: string;
    address: string;
    municipality: string;
    phone: string;
    director: string;
    directorCI: string;
    subjectColumns: string[];
    rows: ReportEmgRow[];
    anioEscolar?: string;
    tipoEvaluacion?: string;
    inscritos?: number;
    inasistentes?: number;
    aprobados?: number;
    noAprobados?: number;
    noCursantes?: number;
}

export interface ExtracurricularActivity {
    activityID: number;
    name: string;
    description: string;
    dayOfWeek: number;
    userID: number | null; // Teacher ID
    schoolID: number;
}

export interface Certificate {
    certificateId: number;
    userId: number;
    studentName: string;
    certificateType: string;
    issueDate: string;
    content: string;
    signatoryName?: string; // Made optional
    signatoryTitle?: string; // Made optional
    schoolId: number;
    schoolName?: string;
    schoolCode?: string;
    address?: string;
    phones?: string;
}

export interface CertificateGeneratePayload {
    userId: number;
    certificateType: string;
    signatoryName?: string;
    signatoryTitle?: string;
    content: string;
    schoolId: number;
    issueDate?: string;
}

export interface Product {
    productID: number;
    sku: string;
    name: string;
    description: string | null;
    costPrice: number;
    salePrice: number;
    isActive: boolean;
    createdAt: string;
    schoolID: number;
    trackInventory?: boolean;
}

export interface ProductAudience {
    productAudienceID: number;
    targetTypeRaw: string | null; // "All", "Role", "User", "Classroom"
    targetID: number | null;
}

export interface ProductWithAudiences {
    product: Product;
    audiences: ProductAudience[];
}

export interface AudiencePayload {
    targetType: string;
    targetID: number | null;
}

export interface Enrollment {
    enrollmentID: number;
    userID: number;
    courseID: number;
    courseName: string;
    enrollmentDate: string;
}

export interface ReportRrdeaClassroomResponse {
    planEstudio: string;
    planCodigo: string;
    anioEscolar: string;
    mesAnio: string;
    plantelCodigo: string;
    plantelNombre: string;
    direccion: string;
    telefono: string;
    municipio: string;
    entidad: string;
    distritoEscolar: string;
    cdcee: string;
    grado: string;
    seccion: string;
    numeroEstudiantesSeccion: number;
    numeroEstudiantesEnPagina: number;
    totalA: number;
    totalB: number;
    totalC: number;
    totalD: number;
    totalE: number;
    totalP: number;
    rows: {
        apellidosNombres: string;
        cedula: string;
        lugarNac: string;
        efEdo: string;
        sexo: string;
        diaNac: string;
        mesNac: string;
        anioNac: string;
        resultado: string;
    }[];
}

export interface AttendanceRecord {
    attendanceID: number;
    date: string;
    status: string;
    isJustified: boolean | null;
    minutesLate: number | null;
    notes: string | null;
    studentName: string;
    courseName: string;
}

export interface AttendanceEditPayload {
    status: string;
    isJustified?: boolean;
    minutesLate?: number;
    notes?: string;
}

export interface ExtracurricularEnrollmentPayload {
    UserID: number;
    ActivityID: number;
    SchoolID: number;
}

export interface EnrolledStudent {
    userID: number;
    studentName: string;
}

export interface ClassroomAverage {
    classroomID: number;
    classroomName: string;
    averageGrade: number;
}

export interface ClassroomStudentAveragesResponse {
    classroomId: number;
    classroomName: string;
    studentAverages: {
        studentId: number;
        studentName: string;
        averageGrade: number;
        totalGrades: number;
    }[];
}

export interface MedicalInfo {
    medicalInfoID: number;
    userID: number;
    bloodType: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    medications: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    notes: string | null;
}

export interface ApprovePaymentResponse {
    message: string;
    invoiceId: number | null;
}

export interface InvoiceLinePrintVM {
    invoiceLineID: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    tasaIva: number;
    montoBase: number;
    montoIva: number;
    totalLinea: number;
}

export interface InvoicePrintVM {
    invoiceID: number;
    schoolName: string;
    numeroFactura: string;
    numeroControl: string;
    serie: string;
    fechaEmision: string;
    condicionPago: string;
    moneda: string;
    status: string;
    clienteNombre: string;
    clienteRifCedula: string;
    clienteDireccionFiscal: string | null;
    clienteTelefono: string | null;
    subtotal: number;
    descuentoTotal: number;
    baseImponible: number;
    exento: number;
    montoIva: number;
    totalGeneral: number;
    lines: InvoiceLinePrintVM[];
}

export interface PendingInvoice {
    invoiceID: number;
    schoolID: number;
    numeroFactura: string;
    fechaEmision: string;
    clienteNombre: string;
    totalGeneral: number;
}

export interface PaginatedInvoices {
    total: number;
    page: number;
    pageSize: number;
    items: {
        invoiceID: number;
        numeroFactura: string;
        clienteNombre: string;
        fechaEmision: string;
        status: string;
        totalGeneral: number;
    }[];
}

export interface GenerateInvoicesRunDto {
    TargetYear: number;
    TargetMonth: number;
    SchoolID: number;
    ProductID: number;
    TasaIva: number;
    Cantidad: number;
    Serie: string;
    Moneda: string;
    CondicionPago: string;
    DryRun: boolean;
}

export interface MonthlyGenerationResult {
    message: string;
    dryRun: boolean;
    target: {
        targetYear: number;
        targetMonth: number;
        schoolID: number;
        productID: number;
    };
    candidatos: number;
    facturasGeneradas: number;
    error?: string;
}

export interface MonthlyARSummary {
    schoolID: number;
    periodYear: number;
    periodMonth: number;
    currency: string;
    totalInvoices: number;
    openInvoices: number;
    pendingInvoices: number;
    totalBilled: number;
    totalCollected: number;
    invoicesWithAR: number;
    accountsReceivable: number;
}

// Purchases Module Types
export interface PurchaseLineCreate {
    productID: number;
    descripcion: string;
    cantidad: number;
    unitCost: number;
    taxRate: number;
}

export interface PurchaseCreatePayload {
    schoolID: number;
    supplierName: string;
    supplierRif: string;
    fecha: string;
    moneda: string;
    condicionPago: string;
    serie: string;
    createdByUserID: number;
    lines: PurchaseLineCreate[];
}

export interface PurchaseListItem {
    purchaseID: number;
    schoolID: number;
    fecha: string;
    supplierName: string;
    supplierRif: string;
    subtotal: number;
    montoIva: number;
    totalGeneral: number;
    status: 'Issued' | 'Annulled' | 'Paid';
    moneda: string;
    serie: string;
}

export interface PaginatedPurchases {
    total: number;
    page: number;
    pageSize: number;
    items: PurchaseListItem[];
}

export interface PurchaseHeader {
    purchaseID: number;
    schoolID: number;
    fecha: string;
    supplierName: string;
    supplierRif: string;
    subtotal: number;
    montoIva: number;
    totalGeneral: number;
    status: string;
    moneda: string;
    serie: string;
}

export interface PurchaseLineDetail {
    purchaseLineID: number;
    purchaseID: number;
    productID: number;
    descripcion: string;
    cantidad: number;
    unitCost: number;
    taxRate: number;
    montoBase: number;
    montoIva: number;
    totalLinea: number;
}

export interface PurchaseDetail {
    header: PurchaseHeader;
    lines: PurchaseLineDetail[];
}

export interface PurchaseCreationResponse {
    purchaseId: number;
}

// Payroll Module Types
export interface PayrollRunPayload {
  schoolID: number;
  periodYear: number;
  periodMonth: number;
  transportAllow: number;
  ISRPercent: number;
  pensionPercent: number;
  notes: string | null;
  createdByUserID: number | null;
  dryRun: boolean;
  forceRegen?: boolean;
}

export interface PayrollPreviewResponse {
  dryRun: boolean;
  target: {
    schoolID: number;
    periodYear: number;
    periodMonth: number;
  };
  summary: {
    employees: number;
    gross: number;
    ded: number;
    net: number;
  };
  periodId: number | null;
  payrollId: number | null;
  detail: {
    employeeUserID: number;
    employeeName: string;
    baseAmount: number;
    transportAllow: number;
    otherAllow: number;
    isr: number;
    pension: number;
    otherDed: number;
    netPay: number;
  }[];
}

export interface PayrollRunResponse {
  dryRun: boolean;
  target: {
    schoolID: number;
    periodYear: number;
    periodMonth: number;
  };
  summary: {
    employees: number;
    gross: number;
    ded: number;
    net: number;
  };
  periodId: number;
  payrollId: number;
}


export interface PayrollListItem {
    payrollID: number;
    schoolID: number;
    periodYear: number;
    periodMonth: number;
    employees: number;
    grossTotal: number;
    deductionsTotal: number;
    netTotal: number;
    status: string;
    createdAt: string;
    notes: string | null;
}

export interface PaginatedPayrolls {
    total: number;
    page: number;
    pageSize: number;
    items: PayrollListItem[];
}

export interface PayrollHeader {
    payrollID: number;
    schoolID: number;
    periodYear: number;
    periodMonth: number;
    employees: number;
    grossTotal: number;
    deductionsTotal: number;
    netTotal: number;
    status: string;
    createdAt: string;
    notes: string | null;
}

export interface PayrollLine {
    payrollLineID: number;
    payrollID: number;
    schoolID: number;
    periodYear: number;
    periodMonth: number;
    employeeUserID: number;
    employeeName: string;
    roleID: number;
    baseAmount: number;
    transportAllow: number;
    otherAllow: number;
    isr: number; // ISR deduction
    pension: number;
    otherDed: number;
    netPay: number;
}


export interface PayrollDetail {
  header: PayrollHeader;
  lines: PayrollLine[];
}

export interface BaseSalaryUpdatePayload {
    userID: number;
    baseSalary: number;
}

// Chat Module Types
export interface Message {
    messageID: number;
    chatID: number;
    senderID: number;
    content: string;
    timestamp: string;
    isRead: boolean;
    sender?: User; 
}

export interface ChatParticipant {
    chatParticipantID: number;
    chatID: number;
    userID: number;
    joinedAt: string;
    user?: User;
}

export interface Chat {
    chatID: number;
    name: string;
    schoolID: number;
    isGroupChat: boolean;
    createdAt: string;
    participants: ChatParticipant[];
}

export interface CreateGroupChatDto {
    SchoolID: number;
    ChatName: string;
    UserIDs: number[];
}

export interface SendMessageDto {
    ChatID: number;
    SenderID: number;
    Content: string;
}

// Analytics Module Types
export interface PnlMonthlyData {
    month: number;
    year: number;
    income: number;
    cogs: number;
    expenses: number;
    netProfit: number;
}
export type PnlReportResponse = PnlMonthlyData[];

export interface SalesByProductData {
    productName: string;
    quantitySold: number;
    totalSales: number;
    margin: number;
}
export type SalesByProductResponse = SalesByProductData[];

export interface InventorySnapshotData {
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    salePrice: number;
    totalCostValue: number;
    totalSaleValue: number;
}
export type InventorySnapshotResponse = InventorySnapshotData[];

export interface InventoryKardexData {
    date: string;
    movementType: string;
    quantity: number;
    relatedDocument: string;
    resultingBalance: number;
}
export type InventoryKardexResponse = InventoryKardexData[];

export interface ArAgingSummaryResponse {
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90p: number;
    total: number;
}

export interface ArAgingByCustomerData {
    customerName: string;
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90p: number;
    total: number;
}
export type ArAgingByCustomerResponse = ArAgingByCustomerData[];

// GL Module Types
export type ApiError = { message: string; error?: string; inner?: string };

export interface TrialBalanceRow {
  schoolID: number;
  accountCode: string;
  accountName: string;
  accountType: 'Asset'|'Liability'|'Equity'|'Revenue'|'Expense'|'COGS'|'TaxDebit'|'TaxCredit'|string;
  totalDebit: number;
  totalCredit: number;
  net: number;
}

export interface LedgerRow {
  schoolID: number;
  journalDate: string; // ISO
  journalID: number;
  lineNo: number;
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
  sourceCode?: string;
  sourceID?: number;
}

export interface IncomeStatement {
  period: { from: string; to: string };
  revenue: number;
  cogs: number;
  expenses: number;
  grossProfit: number;
  netIncome: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: number;
  liabilities: number;
  equity: number;
  balance: number; // debe ser 0
}

// Withholdings Module Types

export interface WithholdingType {
  withholdingTypeID: number;
  name: string;
  description: string;
}

export interface GenerateWithholdingPayload {
  purchaseID: number;
  withholdingTypeID: number;
  ratePercent: number;
  issueDate: string;
  createdByUserID: number;
}

export interface GenerateWithholdingResponse {
  withholdingID: number;
  amountWithheld: number;
}

export interface WithholdingListItem {
  withholdingID: number;
  schoolID: number;
  withholdingTypeID: number;
  sourceTable: string;
  sourceID: number;
  issueDate: string;
  periodYear: number;
  periodMonth: number;
  agentRifCedula: string;
  agentName: string;
  subjectRifCedula: string;
  subjectName: string;
  totalBase: number;
  totalWithheld: number;
  status: 'Active' | 'Annulled';
  typeName?: string; // Client-side addition
}

export interface WithholdingHeader {
  withholdingID: number;
  schoolID: number;
  withholdingTypeID: number;
  issueDate: string;
  agentName: string;
  subjectName: string;
  totalBase: number;
  totalWithheld: number;
  status: 'Active' | 'Annulled';
}

export interface WithholdingLine {
  withholdingLineID: number;
  withholdingID: number;
  conceptCode: string;
  description: string;
  baseAmount: number;
  ratePercent: number;
  amountWithheld: number;
}

export interface WithholdingDetail {
  header: WithholdingHeader;
  lines: WithholdingLine[];
}

export interface Indicator {
    text: string;
}

export interface IndicatorSection {
    title: string;
    indicators: Indicator[];
    hasRecommendations?: boolean;
}
