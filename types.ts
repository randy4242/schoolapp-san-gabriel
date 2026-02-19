// types.ts

export interface AuthenticatedUser {
    token: string;
    schoolId: number;
    userId: number;
    userName: string;
    email: string;
    roleId: number;
    cedula?: string;
}

export interface AuthResponse {
    token: string;
    user?: User;
}

export const ROLES = [
    { id: 1, name: 'Estudiante' },
    { id: 2, name: 'Profesor' },
    { id: 3, name: 'Representante' },
    { id: 6, name: 'Administrador' },
    { id: 7, name: 'Super Admin' },
    { id: 8, name: 'Coordinador' },
    { id: 9, name: 'Jefe de Departamento' },
    { id: 10, name: 'Auxiliar' },

];

export interface ExchangeRate {
    exchangeRateID: number;
    schoolID: number;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: string;
    isActive: boolean;
    notes?: string;
}

export interface User {
    userID: number;
    userName: string;
    email: string;
    roleID: number;
    schoolID: number;
    cedula: string | null;
    phoneNumber: string | null;
    isBlocked: boolean;
    blockedReason?: string;
    blockedAt?: string;
    sexo?: 'M' | 'F' | null;
    classroomID?: number;
    lugarNacimiento?: string;
    baseSalary?: number;
    nombre?: string;
    apellido?: string;
}

export interface School {
    schoolID: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    email: string;
    schoolYear: string;
    organizationID?: number;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    isActive: boolean;
    createdAt: string;
}

// FIX: Added Teacher type
export type Teacher = User;

export interface AttendanceSummaryDto {
    total: number;
    present: number;
    absent: number;
    late: number;
    justifiedAbsent: number;
    observation: number;
    attendanceRate: number;
    absenceRate: number;
}

export interface ClassroomAttendanceStats {
    classroomID: number;
    classroomName: string;
    overall: AttendanceSummaryDto;
    byCourse: {
        courseID: number;
        courseName: string;
        summary: AttendanceSummaryDto;
    }[];
    byStudent: {
        studentID: number;
        studentName: string;
        summary: AttendanceSummaryDto;
    }[];
}

export interface StudentAttendanceStats {
    studentID: number;
    studentName: string;
    overall: AttendanceSummaryDto;
    byCourse: {
        courseID: number;
        courseName: string;
        summary: AttendanceSummaryDto;
    }[];
}

export interface GenderStatItem {
    sexo: 'M' | 'F';
    total: number;
    present: number;
    absent: number;
    late: number;
    justifiedAbsent: number;
    observation: number;
}

export interface GenderStatsResponse {
    classroomID: number;
    classroomName: string;
    dateFrom?: string;
    dateTo?: string;
    genderStats: GenderStatItem[];
}

export interface Lapso {
    lapsoID: number;
    nombre: string;
    nombreLapso?: string; // Add alias if needed for compatibility
    fechaInicio: string;
    fechaFin: string;
    schoolID: number;
    isCurrent?: boolean; // Added for active lapso check
    activo?: boolean;
}

export interface Classroom {
    classroomID: number;
    name: string;
    description: string;
    schoolID: number;
}

export interface Course {
    courseID: number;
    name: string;
    description: string;
    schoolID: number;
    userID: number;
    // FIX: Added missing properties to Course interface
    dayOfWeek?: string | null;
    classroomID?: number | null;
    additionalTeacherIDs?: string | number[] | null;
}

export interface DailyAttendanceDto {
    date: string;
    summary: AttendanceSummaryDto;
}

export interface DailyAttendanceStatsResponse {
    dateFrom?: string;
    dateTo?: string;
    dailyStats: DailyAttendanceDto[];
}

export interface GlobalSearchResult {
    users: User[];
    courses: Course[];
    // FIX: Explicitly type evaluations and extracurriculars
    evaluations: Evaluation[];
    classrooms: Classroom[];
    extracurriculars: ExtracurricularActivity[];
}

export interface Student extends User {
    studentID: number;
    studentName: string;
}

// FIX: Added missing exported types used across the application

export interface DashboardStats {
    totalUsers: number;
    students: number;
    teachers: number;
    parents: number;
    courses: number;
    schoolName: string;
}

export interface Evaluation {
    evaluationID: number;
    title: string;
    description: string;
    date: string;
    courseID: number;
    userID: number;
    schoolID: number;
    isVirtual: boolean;
    virtualType?: number | null;
    lapso?: Lapso;
    course?: Course;
    createdAt: string;
    classroomID?: number;
}

export interface Grade {
    gradeID: number;
    userID: number;
    evaluationID: number;
    courseID: number;
    schoolID: number;
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
    hasImage: boolean;
}

export interface StudentGradeItem {
    evaluacion: string;
    displayGrade: string;
    gradeValue: number | null;
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
    course: { name: string };
    evaluation: { title: string, date: string };
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
}

export interface Child {
    userID: number;
    userName: string;
    email: string;
    relationID: number;
}

export interface Parent {
    userID: number;
    userName: string;
    email: string;
    relationID: number;
}

export interface LoginHistoryRecord {
    historyID: number;
    userID: number;
    userName: string;
    loginTime: string;
    loginSuccess: boolean;
    loginMessage: string;
}

export enum PaymentStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected'
}

export enum PaymentMethod {
    PagoMovil = 'PagoMovil',
    Transfer = 'Transfer',
    Cash = 'Cash',
    Other = 'Other'
}

export interface Payment {
    paymentID: number;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    referenceNumber?: string;
    notes?: string;
    createdAt: string;
    invoiceID?: number;
    pm_CedulaRif?: string;
    pm_Phone?: string;
    pm_BankOrigin?: string;
    pm_BankDest?: string;
    tr_CedulaRif?: string;
    tr_FullName?: string;
    tr_BankDest?: string;
    tr_AccountNumber?: string;
}

export interface Notification {
    notifyID: number;
    title: string;
    content: string;
    date: string;
    isRead: boolean;
    userID: number;
}

export interface ExtracurricularActivity {
    activityID: number;
    name: string;
    description: string;
    dayOfWeek: number;
    schoolID: number;
    userID: number | null;
}

export interface EnrolledStudent {
    userID: number;
    studentName: string;
}

export interface Certificate {
    certificateId: number;
    userId: number;
    studentName?: string;
    certificateType: string;
    signatoryName: string;
    signatoryTitle: string;
    content: string;
    schoolId: number;
    issueDate: string;
    schoolName?: string;
    schoolCode?: string;
    address?: string;
    phones?: string;
}

export interface Product {
    productID: number;
    sku: string;
    name: string;
    description: string | null;
    costPrice: number;
    salePrice: number;
    isActive: boolean;
    trackInventory?: boolean;
    schoolID: number;
    currency?: string; // Added for multi-currency support
}

export interface ProductAudience {
    productAudienceID: number;
    productID: number;
    targetType: string;
    targetID: number | null;
    targetTypeRaw?: string;
}

export interface ProductWithAudiences {
    product: Product;
    audiences: ProductAudience[];
}

export interface AudiencePayload {
    targetType: 'All' | 'Role' | 'User' | 'Classroom';
    targetID: number | null;
}

export interface Enrollment {
    enrollmentID: number;
    userID: number;
    courseID: number;
    schoolID: number;
    enrollmentDate: string;
    courseName?: string;
}

export interface UserDetails {
    userID: number;
    userName: string;
    email: string;
    cedula: string | null;
    phoneNumber: string | null;
    roleID: number;
    isBlocked: boolean;
    school: { name: string, schoolYear: string };
    classroom?: { classroomID: number, name: string };
    enrollments: Enrollment[];
}

export interface AttendanceRecord {
    attendanceID: number;
    studentName: string;
    date: string;
    status: string;
    isJustified: boolean | null;
    minutesLate: number | null;
    notes: string | null;
}

export interface AttendanceEditPayload {
    status: string;
    date: string;
    isJustified?: boolean;
    minutesLate?: number;
    notes?: string;
}

export interface AttendanceUpsertDto {
    UserID: number;
    RelatedUserID: number;
    CourseID: number;
    SchoolID: number;
    Status: string;
    Notes: string | null;
    IsJustified: boolean;
    MinutesLate: number | null;
    Date: string;
}

export interface ClassroomAverage {
    classroomID: number;
    classroomName: string;
    averageGrade: number;
}

export interface ClassroomStudentAveragesResponse {
    classroomID: number;
    classroomName: string;
    studentAverages: { studentId: number, studentName: string, averageGrade: number, totalGrades: number }[];
}

export interface MedicalInfo {
    medicalInfoID: number;
    userID: number;
    bloodType: string;
    allergies: string;
    chronicConditions: string;
    medications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes: string;
}

export interface ApprovePaymentResponse {
    success: boolean;
    invoiceId?: number;
}

export interface InvoiceLineVM {
    invoiceLineID: number;
    cantidad: number;
    descripcion: string;
    precioUnitario: number;
    descuento: number;
    tasaIva: number;
    montoBase: number;
    montoIva: number;
    totalLinea: number;
}

export interface InvoicePrintVM {
    invoiceID: number;
    numeroFactura: string;
    numeroControl: string;
    serie: string;
    fechaEmision: string;
    condicionPago: string;
    moneda: string;
    status: string;
    schoolName: string;
    clienteNombre: string;
    clienteRifCedula: string;
    clienteDireccionFiscal?: string;
    clienteTelefono?: string;
    lines: InvoiceLineVM[];
    subtotal: number;
    descuentoTotal: number;
    baseImponible: number;
    montoIva: number;
    exento: number;
    totalGeneral: number;
}

export interface PendingInvoice {
    invoiceID: number;
    numeroFactura: string;
    clienteNombre: string;
    clienteRifCedula?: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    totalGeneral: number;
    moneda: string;
    descripcion?: string;
    studentName?: string;
    productList?: string;
    invoiceType?: string;
    serie?: string;
    condicionPago?: string;
}

export interface PaginatedInvoices {
    items: PendingInvoice[];
    total: number;
    page: number;
    pageSize: number;
}

export interface GenerateInvoicesRunDto {
    TargetYear: number;
    TargetMonth: number;
    ProductID: number;
    TasaIva: number;
    Cantidad: number;
    Serie: string;
    Moneda: string;
    CondicionPago: string;
    SchoolID: number;
    DryRun: boolean;
}

export interface MonthlyGenerationResult {
    message: string;
    error?: string;
    dryRun: boolean;
    candidatos: number;
    facturasGeneradas: number;
}

export interface MonthlyARSummary {
    periodYear: number;
    periodMonth: number;
    totalBilled: number;
    totalInvoices: number;
    totalCollected: number;
    pendingInvoices: number;
    accountsReceivable: number;
}

export interface PurchaseListItem {
    purchaseID: number;
    supplierName: string;
    fecha: string;
    status: string;
    totalGeneral: number;
    moneda: string;
}

export interface PaginatedPurchases {
    items: PurchaseListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface PurchaseCreatePayload {
    supplierName: string;
    supplierRif: string;
    fecha: string;
    moneda: string;
    condicionPago: string;
    serie: string;
    schoolID: number;
    createdByUserID: number;
    lines: { productID: number, descripcion: string, cantidad: number, unitCost: number, taxRate: number }[];
}

export interface PurchaseHeader {
    purchaseID: number;
    supplierName: string;
    supplierRif: string;
    fecha: string;
    status: string;
    subtotal: number;
    montoIva: number;
    totalGeneral: number;
    moneda: string;
    serie: string;
}

export interface PurchaseLine {
    purchaseLineID: number;
    productID: number;
    descripcion: string;
    cantidad: number;
    unitCost: number;
    montoBase: number;
    montoIva: number;
    totalLinea: number;
}

export interface PurchaseDetail {
    header: PurchaseHeader;
    lines: PurchaseLine[];
}

export interface PurchaseCreationResponse {
    success: boolean;
    purchaseID: number;
}

export interface PayrollRunPayload {
    periodYear: number;
    periodMonth: number;
    startDate: string;
    endDate: string;
    periodName: string;
    isrPercent: number;
    pensionPercent: number;
    notes: string;
    schoolID: number;
    createdByUserID: number;
    dryRun: boolean;
    exchangeRate: number;
    isUsd: boolean;
    customAllowances: { name: string; amount: number; isUsd: boolean }[];
    employeeBonuses?: { userId: number; amount: number }[]; // Keeping for legacy if needed, but new logic uses employeesDetails
    employeesDetails?: {
        employeeUserID: number;
        baseSalary: number;
        individualAllowance: number;
        individualDeduction: number; // New field for manual deductions
        allowanceDetails?: string; // Serialized JSON of bonuses
        allowanceNote?: string; // Concatenated description of bonuses
        isSelected: boolean;
    }[];
}

export interface PayrollLinePreview {
    employeeUserID: number;
    employeeName: string;
    baseAmount: number;
    otherAllow: number;
    isr: number;
    pension: number;
    otherDed: number;
    netPay: number;
}

export interface PayrollPreviewResponse {
    summary: { employees: number, gross: number, ded: number, net: number };
    detail: PayrollLinePreview[];
}

export interface PayrollRunResponse {
    success: boolean;
    payrollId: number;
}

export interface PayrollSummary {
    payrollID: number;
    periodYear: number;
    periodMonth: number;
    employees: number;
    grossTotal: number;
    deductionsTotal: number;
    netTotal: number;
    status: string;
    createdAt: string;
}

export interface PaginatedPayrolls {
    items: PayrollSummary[];
    total: number;
    page: number;
    pageSize: number;
}

export interface PayrollLine {
    payrollLineID: number;
    employeeUserID: number;
    employeeName: string;
    roleID: number;
    baseAmount: number;
    transportAllow: number;
    otherAllow: number;
    allowanceDetails?: string; // JSON string of bonuses
    isr: number;
    pension: number;
    otherDed: number;
    netPay: number;
}

export interface PayrollDetail {
    header: PayrollSummary;
    lines: PayrollLine[];
}

export interface BaseSalaryUpdatePayload {
    userID: number;
    baseSalary: number;
}

export interface Chat {
    chatID: number;
    name: string;
    isGroupChat: boolean;
    participants: { userID: number, user?: User }[];
}

export interface Message {
    messageID: number;
    chatID: number;
    senderID: number;
    content: string;
    timestamp: string;
    sender?: User;
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

export interface PnlReportResponseItem {
    year: number;
    month: number;
    income: number;
    cogs: number;
    expenses: number;
    netProfit: number;
}

export type PnlReportResponse = PnlReportResponseItem[];

export interface SalesByProductResponseItem {
    productName: string;
    quantitySold: number;
    totalSales: number;
    margin: number;
}

export type SalesByProductResponse = SalesByProductResponseItem[];

export interface InventorySnapshotResponseItem {
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    salePrice: number;
    totalCostValue: number;
    totalSaleValue: number;
}

export type InventorySnapshotResponse = InventorySnapshotResponseItem[];

export interface InventoryKardexResponseItem {
    date: string;
    movementType: string;
    quantity: number;
    relatedDocument: string;
    resultingBalance: number;
}

export type InventoryKardexResponse = InventoryKardexResponseItem[];

export interface ArAgingSummaryResponse {
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90p: number;
    total: number;
}

export interface ArAgingByCustomerResponseItem {
    customerName: string;
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90p: number;
    total: number;
}

export type ArAgingByCustomerResponse = ArAgingByCustomerResponseItem[];

export interface TrialBalanceRow {
    accountCode: string;
    accountName: string;
    accountType: string;
    totalDebit: number;
    totalCredit: number;
    net: number;
}

export interface LedgerRow {
    journalDate: string;
    journalID: number;
    lineNo: number;
    memo: string;
    sourceCode: string;
    sourceID: number;
    debit: number;
    credit: number;
}

export interface IncomeStatement {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netIncome: number;
}

export interface BalanceSheet {
    assets: number;
    liabilities: number;
    equity: number;
}

export interface WithholdingType {
    withholdingTypeID: number;
    name: string;
}

export interface WithholdingListItem {
    withholdingID: number;
    issueDate: string;
    withholdingTypeID: number;
    subjectName: string;
    subjectRifCedula: string;
    totalBase: number;
    totalWithheld: number;
    status: string;
    typeName?: string;
}

export interface WithholdingHeader {
    withholdingID: number;
    agentName: string;
    subjectName: string;
    issueDate: string;
    status: string;
    totalBase: number;
    totalWithheld: number;
}

export interface WithholdingLine {
    withholdingLineID: number;
    description: string;
    baseAmount: number;
    ratePercent: number;
    amountWithheld: number;
}

export interface WithholdingDetail {
    header: WithholdingHeader;
    lines: WithholdingLine[];
}

export interface GenerateWithholdingPayload {
    purchaseID: number;
    withholdingTypeID: number;
    ratePercent: number;
    issueDate: string;
    createdByUserID: number;
}

export interface CertificateGeneratePayload {
    certificateType: string;
    studentID: number;
    schoolId: number;
    signatoryName: string;
    signatoryTitle: string;
    content: string;
    issueDate?: string;
}

export interface ExtracurricularEnrollmentPayload {
    activityID: number;
    userID: number;
    schoolID: number;
}

export interface GenerateWithholdingResponse {
    success: boolean;
    withholdingID: number;
    message?: string;
}

export interface Question {
    questionID: number;
    evaluationID: number;
    questionText: string;
    questionType: 1 | 2 | 3;
    points: number;
    orderIndex: number;
    options?: QuestionOption[];
}

export interface QuestionOption {
    optionID: number;
    questionID: number;
    optionText: string;
    isCorrect: boolean;
}

export interface TakeExamEvaluation {
    evaluationID: number;
    title: string;
    description: string;
    questions: Question[];
}

export interface EvaluationQnA {
    qnaID: number;
    evaluationID: number;
    askedByUserId: number;
    questionText: string;
    answerText: string | null;
    createdAt: string;
    answeredAt: string | null;
}

export interface StudentSubmission {
    submissionID: number;
    studentID: number;
    studentName: string;
    submittedAt: string;
    grade: number | null;
    answers: any[];
}

export interface QuestionAnswerDetail {
    questionID: number;
    questionText: string;
    questionType: number;
    points: number;
    answerText: string | null;
    selectedOptionText: string | null;
    isCorrect: boolean;
    options?: QuestionOption[];
}

export interface ExamSubmissionDetail {
    submissionID: number;
    studentID: number;
    studentName: string;
    questions: QuestionAnswerDetail[];
}

export enum ContentType {
    Text = 1,
    File = 2,
    Video = 3
}

export interface EvaluationContentFile {
    fileID: number;
    contentID: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSizeBytes: number;
}

export interface EvaluationContent {
    contentID: number;
    evaluationID: number;
    title: string;
    description: string | null;
    contentType: ContentType;
    textBody: string | null;
    orderIndex: number;
    isPublic: boolean;
    files?: EvaluationContentFile[];
}

export interface CreateContentDTO {
    title: string;
    description: string;
    contentType: ContentType;
    textBody?: string;
    orderIndex: number;
    isPublic: boolean;
}

export interface AnswerPayload {
    questionID: number;
    answerText: string | null;
    selectedOptionID: number | null;
}

export interface IndicatorSection {
    title: string;
    indicators: { text: string }[];
    hasRecommendations?: boolean;
}

export interface ReportEmgClassroomResponse {
    schoolName: string;
    entity: string;
    mesAnio: string;
    schoolCode: string;
    address: string;
    phone: string;
    municipality: string;
    director: string;
    directorCI: string;
    rows: any[];
    subjectColumns: string[];
    anioEscolar: string;
    tipoEvaluacion: string;
    inscritos: number;
    inasistentes: number;
    aprobados: number;
    noAprobados: number;
    noCursantes: number;
}

export interface ReportRrdeaClassroomResponse {
    planEstudio: string;
    planCodigo: string;
    anioEscolar: string;
    mesAnio: string;
    plantelCodigo: string;
    plantelNombre: string;
    distritoEscolar: string;
    direccion: string;
    telefono: string;
    municipality?: string;
    municipio: string;
    entidad: string;
    cdcee: string;
    grado: string;
    seccion: string;
    numeroEstudiantesSeccion: number;
    numeroEstudiantesEnPagina: number;
    rows: any[];
    totalA: number;
    totalB: number;
    totalC: number;
    totalD: number;
    totalE: number;
    totalP: number;
}

// FIX: Added missing constant exported as a type member
export const BOLETA_LEVELS = [
    "Sala 1", "Sala 2", "Sala 3",
    "Primer Grado", "Segundo Grado", "Tercer Grado",
    "Cuarto Grado", "Quinto Grado", "Sexto Grado"
];

// ... existing code ...

export interface ExchangeRate {
    rateID: number;
    rate: number;
    currencyFrom: string;
    currencyTo: string;
    date: string;
    isActive: boolean;
    schoolID: number;
}

export interface IndicatorSection {
    title: string;
    hasRecommendations?: boolean;
    indicators: { text: string }[];
}

export interface BoletaEvaluationPlan {
    planId: number;
    name: string;
    schoolId: number;
    level: string;
    lapsoId: number;
    isActive: boolean;
}

export interface IndicatorDto {
    indicatorId: number;
    planId: number;
    section: string;
    subSection?: string;
    content: string;
    orderIndex: number;
}

export interface BoletaEvaluationPlanCreateDto {
    name: string;
    schoolId: number;
    level: string;
    lapsoId: number;
}

export interface BoletaEvaluationPlanUpdateDto {
    name: string;
    level: string;
    isActive: boolean;
}

export interface IndicatorCreateDto {
    planId: number;
    section: string;
    subSection?: string;
    content: string;
    orderIndex: number;
}

export interface IndicatorUpdateDto {
    section: string;
    subSection?: string;
    content: string;
    orderIndex: number;
}
