export interface AuthenticatedUser {
  schoolId: number;
  userId: number;
  userName: string;
  email: string;
  roleId: number;
  token: string;
}

export interface AuthResponse {
    token: string;
}

export interface User {
  userID: number;
  userName: string;
  email: string;
  cedula: string;
  phoneNumber: string;
  roleID: number;
  schoolID: number;
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: string;
  blockedByUserID?: number;
}

export interface Child {
    relationID: number;
    userID: number;
    userName: string;
    email: string;
}

export interface UserRelationship {
    relationID: number;
    parentID: number;
    childID: number;
}

export interface Role {
  id: number;
  name: string;
}

export const ROLES: Role[] = [
  { id: 1, name: 'Estudiante' },
  { id: 2, name: 'Profesor' },
  { id: 3, name: 'Padre' },
  { id: 6, name: 'Super Admin' },
  { id: 7, name: 'Vista Área' },
  { id: 8, name: 'Vista Grados' },
  { id: 9, name: 'Integral' },
  { id: 10, name: 'Especialista' },
  { id: 11, name: 'Representante' },
];

export interface Course {
  courseID: number;
  name: string;
  description: string;
  dayOfWeek: string;
  userID: number; // Primary teacher
  schoolID: number;
  additionalTeacherIDs: number[];
  teacherName?: string;
}

export interface Teacher extends User {
  // Can be extended if teacher specific fields are needed
}

export interface Student {
    studentID: number;
    studentName: string;
    email?: string;
}

export interface Classroom {
    classroomID: number;
    name: string;
    description: string;
    schoolID: number;
}

export interface DashboardStats {
  totalUsers: number;
  students: number;
  teachers: number;
  parents: number;
  courses: number;
  schoolName: string;
}

// Types for detailed classroom attendance statistics
export interface Lapso {
    lapsoID: number;
    nombre: string;
    fechaInicio: string; // Using string to match C# DateTime serialization
    fechaFin: string;
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    attendanceRate?: number;
}

export interface CourseAttendanceStat {
    courseID: number;
    courseName: string;
    summary: AttendanceSummary;
}

export interface StudentAttendanceStat {
    studentID: number;
    studentName: string;
    summary: AttendanceSummary;
}

export interface ClassroomAttendanceStats {
    overall: AttendanceSummary;
    byCourse: CourseAttendanceStat[];
    byStudent: StudentAttendanceStat[];
}

// Types for individual student stats and grades
export interface StudentAttendanceStats {
    studentID: number;
    studentName: string;
    overall: AttendanceSummary;
    byCourse: CourseAttendanceStat[];
}

export interface StudentGradeItem {
    evaluacion: string;
    displayGrade: string;
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

// Type for raw grade data from API
export interface LapsoGradeApiItem {
    evaluation: {
        title: string;
        date: string | null;
    } | null;
    course: {
        name: string;
    } | null;
    user: {
        userName: string;
    } | null;
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
}

// Types for Reports
export interface StudentGrade {
  year: number;
  area: string;
  gradeNumber: string;
  gradeLiteral: string;
  type: string;
  date: string;
  institution: string;
}

export interface ReportData {
  issuePlaceDate: string;
  school: {
    code: string;
    name: string;
    address: string;
    municipality: string;
    state: string;
    phone: string;
    cdcee: string;
  };
  student: {
    cedula: string;
    lastName: string;
    firstName: string;
    birthDate: string;
    birthPlace: string;
  };
  director: {
    name: string;
    cedula: string;
  };
  grades: StudentGrade[];
}

export interface Evaluation {
  evaluationID: number;
  title: string;
  description: string;
  date: string;
  courseID: number;
  userID: number;
  schoolID: number;
  course?: { name: string };
  lapso?: { nombre: string };
}

export interface Grade {
    gradeID?: number;
    userID: number;
    evaluationID: number;
    schoolID: number;
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
}

export interface StudentGradeData extends User {
    gradeValue: number | null;
    gradeText: string | null;
    comments: string | null;
    hasGrade: boolean;
}

// Types for Resumen Final EMG Report (MOCK DATA - DEPRECATED)
export interface ResumenFinalStudent {
  nro: number;
  cedula: string;
  fullName: string;
  birthPlace: string;
  sex: 'M' | 'F';
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  grades: (string | number)[]; // for 9 subjects
  group: string;
}

export interface ResumenFinalTeacher {
  nro: number;
  areaCode: string; // e.g., '1', '2'
  fullName: string;
  cedula: string;
}

export interface ResumenFinalReportData {
  schoolYear: string;
  evaluationType: string;
  monthYear: string;
  school: {
    code: string;
    name: string;
    address: string;
    phone: string;
    municipality: string;
    state: string;
    cdcee: string;
  };
  director: {
    name: string;
    cedula: string;
  };
  course: {
    plan: string;
    code: string;
    year: string;
    section: string;
    studentsInSection: number;
    studentsOnPage: number;
  };
  students: ResumenFinalStudent[];
  totals: {
    inscritos: number;
    inasistentes: number;
    aprobados: number;
    noAprobados: number;
    noCursantes: number;
  };
  teachers: ResumenFinalTeacher[];
  observations: string;
}


// Types for REAL EMG Classroom Report from API
export interface ReportEmgClassroomRow {
    nro: number;
    cedula: string;
    nombreCompleto: string;
    lugarNac: string | null;
    sexo: string | null;
    subjectCells: (string | null)[];
    grupo: string | null;
}

export interface ReportEmgClassroomResponse {
    schoolName: string | null;
    schoolCode: string | null;
    address: string | null;
    municipality: string | null;
    entity: string | null;
    phone: string | null;
    director: string | null;
    directorCI: string | null;
    anioEscolar: string | null;
    mesAnio: string | null;
    tipoEvaluacion: string | null;
    subjectColumns: string[];
    inscritos: number;
    inasistentes: number;
    aprobados: number;
    noAprobados: number;
    noCursantes: number;
    rows: ReportEmgClassroomRow[];
}


// Types for Resumen Final Primaria Report
export type ResumenFinalPrimariaResultado = 'A' | 'B' | 'C' | 'D' | 'E' | 'P';

export interface ResumenFinalPrimariaStudent {
  nro: number;
  cedula: string; // Cédula de Identidad o Cédula Escolar
  fullName: string;
  birthPlace: string;
  ef: string; // Entidad Federal, e.g., 'CA'
  sex: 'M' | 'F';
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  resultado: ResumenFinalPrimariaResultado;
}

export interface ResumenFinalPrimariaReportData {
  schoolYear: string;
  evaluationMonthYear: string;
  evaluationType: string; // e.g., 'Trimestre'
  school: {
    code: string;
    name: string;
    address: string;
    phone: string;
    municipality: string;
    state: string;
    dtoEsc: string; // Dto. esc.
    cdcee: string;
  };
  course: {
    grade: string; // e.g., '2° GRADO'
    section: string; // e.g., 'U'
    studentsInSection: number;
    studentsOnPage: number;
  };
  students: ResumenFinalPrimariaStudent[];
  totals: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    P: number;
  };
  teacher: {
    fullName: string;
    cedula: string;
  };
  director: {
    name: string;
    cedula: string;
  };
  observations: string;
}


export interface LoginHistoryRecord {
  historyID: number;
  userName: string;
  loginTime: string;
  loginSuccess: boolean;
  loginMessage: string;
}

// New Types for User List enhancements
export enum PaymentMethod { Transfer = 1, PagoMovil = 2 }
export enum PaymentStatus { Pending = 1, Approved = 2, Rejected = 3 }

export interface Payment {
    paymentID: number;
    userID: number;
    schoolID: number;
    amount: number;
    createdAt: string;
    currency?: string;
    method: PaymentMethod;
    status: PaymentStatus;
    referenceNumber?: string;
    notes?: string;
    pm_CedulaRif?: string;
    pm_Phone?: string;
    pm_BankOrigin?: string;
    pm_BankDest?: string;
    tr_FullName?: string;
    tr_CedulaRif?: string;
    tr_BankDest?: string;
    tr_AccountNumber?: string;
    invoiceID?: number;
}

export interface Notification {
    notifyID: number;
    title: string;
    content: string;
    date: string;
    isRead: boolean;
    readDate?: string;
    userID: number;
}

export interface ExtracurricularActivity {
  activityID: number;
  name: string;
  description: string;
  dayOfWeek: number;
  userID: number | null;
  schoolID: number;
}

export interface Certificate {
  certificateId: number;
  certificateType: string;
  issueDate: string;
  userId: number;
  studentName?: string;
  schoolId: number;
  content: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryId: string;
  schoolName: string;
  schoolCode: string;
  city: string;
  address: string;
  phones: string;
}

export interface CertificateGeneratePayload {
    certificateType: string;
    content: string;
    userId: number;
    signatoryName: string;
    signatoryTitle: string;
    schoolId: number;
}

export interface Product {
  productID: number;
  schoolID: number;
  sku: string;
  name: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductAudience {
  productAudienceID: number;
  schoolID: number;
  productID: number;
  targetTypeRaw: 'All' | 'Role' | 'User' | 'Classroom';
  targetID: number | null;
}

export type ProductWithAudiences = {
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