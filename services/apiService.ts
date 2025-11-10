import { AuthenticatedUser, DashboardStats, User, Course, Teacher, Classroom, Student, ClassroomAttendanceStats, Lapso, StudentGradesVM, StudentAttendanceStats, LapsoGradeApiItem, StudentGradeItem, StudentGradesGroup, AuthResponse, Evaluation, Grade, Child, LoginHistoryRecord, Payment, Notification, ReportEmgClassroomResponse, ExtracurricularActivity, Certificate, CertificateGeneratePayload, Product, ProductWithAudiences, ProductAudience, AudiencePayload, Enrollment, ReportRrdeaClassroomResponse, Parent, UserDetails, AttendanceRecord, AttendanceEditPayload, ExtracurricularEnrollmentPayload, EnrolledStudent, ClassroomAverage, ClassroomStudentAveragesResponse, MedicalInfo, ApprovePaymentResponse, InvoicePrintVM, PendingInvoice, PaginatedInvoices, GenerateInvoicesRunDto, MonthlyGenerationResult, MonthlyARSummary, PaginatedPurchases, PurchaseCreatePayload, PurchaseDetail, PurchaseCreationResponse, PayrollRunPayload, PayrollPreviewResponse, PayrollRunResponse, PaginatedPayrolls, PayrollDetail, BaseSalaryUpdatePayload, Chat, Message, CreateGroupChatDto, SendMessageDto, PnlReportResponse, SalesByProductResponse, InventorySnapshotResponse, InventoryKardexResponse, ArAgingSummaryResponse, ArAgingByCustomerResponse, TrialBalanceRow, LedgerRow, IncomeStatement, BalanceSheet } from '../types';

const BASE_URL = "https://apicamorucoSA.somee.com/";


export interface GlobalSearchResult {
    users: User[];
    courses: Course[];
    evaluations: Evaluation[];
    classrooms: Classroom[];
    extracurriculars: ExtracurricularActivity[];
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders() {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T,>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: this.getHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        let errorMessage = `API Error: ${response.statusText}`;
        try {
            const parsedError = JSON.parse(errorData);
            errorMessage = parsedError.message || parsedError.title || errorMessage;
        } catch (e) {
            // If parsing fails, use the raw text if it's not too long
            errorMessage = errorData.length < 200 ? errorData : errorMessage;
        }
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) { // No content
        return null as T;
    }

    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        return text as T;
    }
  }

  // Auth
  async login(emailOrUserName: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrUserName, password }),
    });
  }

  async getLoginHistory(schoolId: number): Promise<LoginHistoryRecord[]> {
    return this.request<LoginHistoryRecord[]>(`api/auth/history?schoolId=${schoolId}`);
  }

  // Special method for login flow that doesn't pass schoolId as it's derived from token
  async getUserDetailsById(id: number, token: string): Promise<User> {
    const response = await fetch(`${BASE_URL}api/users/${id}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get user details: ${errorText}`);
    }
    return response.json();
  }


  // Dashboard
  async getDashboardStats(schoolId: number): Promise<DashboardStats> {
    const [totalUsers, students, teachersResponse, parents, courses, school] = await Promise.all([
      this.request<number>(`api/users/active-count?schoolId=${schoolId}`).catch(() => 0),
      this.request<number>(`api/users/active-count-students?schoolId=${schoolId}`).catch(() => 0),
      this.request<any>(`api/users/active-count-teachers/by-role?schoolId=${schoolId}`).catch(() => 0),
      this.request<number>(`api/users/active-count-parents?schoolId=${schoolId}`).catch(() => 0),
      this.request<Course[]>(`api/courses?schoolId=${schoolId}`).catch(() => []),
      this.request<{name: string}>(`api/schools/${schoolId}`).catch(() => ({name: "Colegio Desconocido"}))
    ]);

    const teachers = (typeof teachersResponse === 'object' && teachersResponse !== null && typeof teachersResponse.total === 'number')
      ? teachersResponse.total
      : Number(teachersResponse) || 0;

    return {
        totalUsers,
        students,
        teachers,
        parents,
        courses: courses.length,
        schoolName: school.name
    };
  }
  
  // Search
  async globalSearch(schoolId: number, userId: number, term: string): Promise<GlobalSearchResult> {
    if (!term.trim()) {
        return { users: [], courses: [], evaluations: [], classrooms: [], extracurriculars: [] };
    }

    const [allUsers, allCourses, allClassrooms, allExtracurriculars, allEvaluations] = await Promise.all([
        this.getUsers(schoolId).catch(() => []),
        this.getCourses(schoolId).catch(() => []),
        this.getClassrooms(schoolId).catch(() => []),
        this.getExtracurriculars(schoolId).catch(() => []),
        this.getEvaluations(schoolId, userId).catch(() => []),
    ]);

    const lowerCaseTerm = term.toLowerCase();

    const filteredUsers = allUsers.filter(u => 
        u.userName.toLowerCase().includes(lowerCaseTerm) ||
        u.email.toLowerCase().includes(lowerCaseTerm) ||
        (u.cedula && u.cedula.toLowerCase().includes(lowerCaseTerm))
    );

    const filteredCourses = allCourses.filter(c =>
        c.name.toLowerCase().includes(lowerCaseTerm) ||
        c.description.toLowerCase().includes(lowerCaseTerm)
    );
      
    const filteredClassrooms = allClassrooms.filter(c =>
        c.name.toLowerCase().includes(lowerCaseTerm) ||
        c.description.toLowerCase().includes(lowerCaseTerm)
    );

    const filteredExtracurriculars = allExtracurriculars.filter(e =>
        e.name.toLowerCase().includes(lowerCaseTerm) ||
        e.description.toLowerCase().includes(lowerCaseTerm)
    );

    const filteredEvaluations = allEvaluations.filter(e =>
        e.title.toLowerCase().includes(lowerCaseTerm) ||
        e.description.toLowerCase().includes(lowerCaseTerm)
    );

    return { 
        users: filteredUsers, 
        courses: filteredCourses,
        evaluations: filteredEvaluations,
        classrooms: filteredClassrooms,
        extracurriculars: filteredExtracurriculars
    };
  }

  // Users
  async getUsers(schoolId: number): Promise<User[]> {
    return this.request<User[]>(`api/users?schoolId=${schoolId}`);
  }

  async getUserById(id: number, schoolId: number): Promise<User> {
    return this.request<User>(`api/users/${id}?schoolId=${schoolId}`);
  }
  
  async getUserDetails(userId: number, schoolId: number): Promise<UserDetails> {
    return this.request<UserDetails>(`api/users/${userId}/details?schoolId=${schoolId}`);
  }
  
  async getMedicalInfo(userId: number, schoolId: number): Promise<MedicalInfo> {
    return this.request<MedicalInfo>(`api/medical-info/${userId}?schoolid=${schoolId}`);
  }

  async createUser(user: Omit<User, 'userID' | 'isBlocked'> & { passwordHash: string }): Promise<User> {
    return this.request<User>('api/auth/register', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: number, user: Partial<User> & { passwordHash?: string }): Promise<void> {
    return this.request<void>(`api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: number, schoolId: number): Promise<void> {
    return this.request<void>(`api/users/${id}?schoolId=${schoolId}`, {
      method: 'DELETE',
    });
  }

  async blockUser(userId: number, reason: string | null, blockedByUserId: number): Promise<void> {
    const payload = { BlockedByUserID: blockedByUserId, Reason: reason };
    return this.request<void>(`api/users/${userId}/block`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
  }

  async unblockUser(userId: number): Promise<void> {
      return this.request<void>(`api/users/${userId}/unblock`, {
          method: 'PUT',
      });
  }

  // Courses
  async getCourses(schoolId: number, search: string = ''): Promise<Course[]> {
      return this.request<Course[]>(`api/courses?schoolId=${schoolId}&search=${search}`);
  }

  async getCourseById(id: number, schoolId: number): Promise<Course> {
      return this.request<Course>(`api/courses/${id}?schoolId=${schoolId}`);
  }
  
  async getTeachers(schoolId: number): Promise<Teacher[]> {
    const users = await this.getUsers(schoolId);
    const teacherRoleIds = new Set([2, 6, 7, 8, 9, 10]);
    return users.filter(u => teacherRoleIds.has(u.roleID));
  }
  
  async getTaughtCourses(userId: number, schoolId: number): Promise<Course[]> {
    return this.request<Course[]>(`api/courses/user/${userId}/taught-courses?schoolId=${schoolId}`);
  }

  async createCourse(course: Omit<Course, 'courseID' | 'teacherName'>): Promise<Course> {
      return this.request<Course>('api/courses/create', {
          method: 'POST',
          body: JSON.stringify(course),
      });
  }

  async updateCourse(id: number, schoolId: number, course: Partial<Course>): Promise<void> {
      return this.request<void>(`api/courses/${id}?schoolId=${schoolId}`, {
          method: 'PUT',
          body: JSON.stringify(course),
      });
  }

  async deleteCourse(id: number, schoolId: number): Promise<void> {
      return this.request<void>(`api/courses/${id}?schoolId=${schoolId}`, {
          method: 'DELETE',
      });
  }

  async assignClassroomToCourse(courseId: number, classroomId: number): Promise<void> {
    return this.request<void>(`api/courses/${courseId}/assign-classroom/${classroomId}`, {
        method: 'PUT',
    });
  }

  async getStudentsByCourse(courseId: number, schoolId: number): Promise<Student[]> {
      return this.request<Student[]>(`api/enrollments/course/${courseId}/students?schoolId=${schoolId}`);
  }

  async getStudentsByClassroom(classroomId: number, schoolId: number): Promise<User[]> {
    return this.request<User[]>(`api/classrooms/${classroomId}/students?schoolId=${schoolId}`);
  }
  
  async getClassroomAttendanceStats(classroomId: number, schoolId: number, lapsoId?: number): Promise<ClassroomAttendanceStats> {
      const endpoint = lapsoId && lapsoId > 0
        ? `api/attendance/stats/classroom/${classroomId}/lapso/${lapsoId}?schoolId=${schoolId}`
        : `api/attendance/stats/classroom/${classroomId}?schoolId=${schoolId}`;
      return this.request<ClassroomAttendanceStats>(endpoint);
  }

  // Student specific data
  async getStudentGradesByLapso(studentId: number, studentName: string, lapsoId: number, schoolId: number): Promise<StudentGradesVM> {
    const lapsos = await this.getLapsos(schoolId);
    const gradeItems = await this.request<LapsoGradeApiItem[]>(`api/grades/student/${studentId}/lapso/${lapsoId}?schoolId=${schoolId}`);

    const groupsMap = new Map<string, StudentGradeItem[]>();
    
    gradeItems.forEach(item => {
      const courseName = item.course?.name || "Sin curso";
      if (!groupsMap.has(courseName)) {
        groupsMap.set(courseName, []);
      }
      
      const displayGrade = item.gradeValue !== null && item.gradeValue !== undefined
        ? item.gradeValue.toFixed(2)
        : (item.gradeText || "—");

      groupsMap.get(courseName)!.push({
        evaluacion: item.evaluation?.title || 'Evaluación sin nombre',
        displayGrade: displayGrade,
        date: item.evaluation?.date || null,
        comments: item.comments || '—'
      });
    });

    // FIX: Corrected typo from StudentGrdesGroup to StudentGradesGroup.
    const groups: StudentGradesGroup[] = Array.from(groupsMap.entries()).map(([courseName, items]) => ({
      courseName,
      items: items.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
    })).sort((a,b) => a.courseName.localeCompare(b.courseName));

    return {
        studentId,
        studentName,
        selectedLapsoId: lapsoId,
        lapsos,
        groups
    };
  }

  async getStudentOverallAverage(studentId: number, schoolId: number): Promise<{ overallAverage: number }> {
    return this.request<{ overallAverage: number }>(`api/grades/student/${studentId}/overall-average?schoolId=${schoolId}`);
  }

  async getStudentLapsoAverage(studentId: number, lapsoId: number, schoolId: number): Promise<{ averageGrade: number }> {
     return this.request<{ averageGrade: number }>(`api/grades/student/${studentId}/average-by-lapso?schoolId=${schoolId}&lapsoId=${lapsoId}`);
  }

  async getStudentAttendanceStats(studentId: number, studentName: string, schoolId: number, lapsoId?: number): Promise<StudentAttendanceStats> {
      const endpoint = lapsoId
        ? `api/attendance/stats/student/${studentId}/lapso/${lapsoId}?schoolId=${schoolId}`
        : `api/attendance/stats/student/${studentId}?schoolId=${schoolId}`;
      return this.request<StudentAttendanceStats>(endpoint);
  }


  // Classrooms
  async getClassrooms(schoolId: number): Promise<Classroom[]> {
    return this.request<Classroom[]>(`api/classrooms?schoolId=${schoolId}`);
  }

  async createClassroom(classroom: Omit<Classroom, 'classroomID'>): Promise<Classroom> {
    return this.request<Classroom>('api/classrooms', {
        method: 'POST',
        body: JSON.stringify(classroom)
    });
  }

  async getClassroomById(id: number, schoolId: number): Promise<Classroom> {
    return this.request<Classroom>(`api/classrooms/${id}?schoolId=${schoolId}`);
  }

  async updateClassroom(id: number, classroom: Partial<Classroom>): Promise<void> {
    return this.request<void>(`api/classrooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(classroom)
    });
  }

  async deleteClassroom(id: number): Promise<void> {
    return this.request<void>(`api/classrooms/${id}`, {
        method: 'DELETE'
    });
  }
  
  async assignStudentToClassroom(userId: number, classroomId: number): Promise<void> {
    return this.request<void>(`api/classrooms/assign/${userId}?classroomId=${classroomId}`, {
        method: 'PUT',
    });
  }

  // Lapsos
  async getLapsos(schoolId: number): Promise<Lapso[]> {
    return this.request<Lapso[]>(`api/lapsos?schoolId=${schoolId}`);
  }

  async getLapsoById(id: number, schoolId: number): Promise<Lapso> {
    return this.request<Lapso>(`api/lapsos/${id}?schoolId=${schoolId}`);
  }

  async createLapso(lapso: Omit<Lapso, 'lapsoID'> & { schoolID: number }): Promise<Lapso> {
    return this.request<Lapso>('api/lapsos', {
      method: 'POST',
      body: JSON.stringify(lapso),
    });
  }

  async updateLapso(id: number, schoolId: number, lapso: Partial<Lapso>): Promise<void> {
    return this.request<void>(`api/lapsos/${id}?schoolId=${schoolId}`, {
      method: 'PUT',
      body: JSON.stringify(lapso),
    });
  }

  async deleteLapso(id: number, schoolId: number): Promise<void> {
    return this.request<void>(`api/lapsos/${id}?schoolId=${schoolId}`, {
      method: 'DELETE',
    });
  }

  // Evaluations
    async getEvaluations(schoolId: number, userId: number, lapsoId?: number, courseId?: number): Promise<Evaluation[]> {
        const params = new URLSearchParams({
            schoolId: schoolId.toString(),
            userID: userId.toString(),
        });
        if (lapsoId) params.append('lapsoId', lapsoId.toString());
        if (courseId) params.append('courseId', courseId.toString());
        return this.request<Evaluation[]>(`api/evaluations?${params.toString()}`);
    }

    async getEvaluationById(id: number, schoolId: number): Promise<Evaluation> {
        return this.request<Evaluation>(`api/evaluations/${id}?schoolId=${schoolId}`);
    }

    async createEvaluation(evaluation: Omit<Evaluation, 'evaluationID' | 'course' | 'lapso'>): Promise<Evaluation> {
        return this.request<Evaluation>('api/evaluations', {
            method: 'POST',
            body: JSON.stringify(evaluation),
        });
    }

    async updateEvaluation(id: number, evaluation: Partial<Evaluation>): Promise<void> {
        return this.request<void>(`api/evaluations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(evaluation),
        });
    }

    async deleteEvaluation(id: number, schoolId: number): Promise<void> {
        return this.request<void>(`api/evaluations/${id}?schoolId=${schoolId}`, {
            method: 'DELETE',
        });
    }

    // Grades
    async getStudentsForEvaluation(evaluationId: number): Promise<User[]> {
        return this.request<User[]>(`api/grades/evaluation/${evaluationId}/students`);
    }

    async getGradesForEvaluation(evaluationId: number, schoolId: number): Promise<Grade[]> {
        return this.request<Grade[]>(`api/grades/evaluation/${evaluationId}/grades?schoolId=${schoolId}`);
    }

    async assignGrade(grade: Omit<Grade, 'gradeID'>): Promise<void> {
        return this.request<void>('api/grades/assign', {
            method: 'POST',
            body: JSON.stringify(grade),
        });
    }

    async getSchoolClassroomAverages(schoolId: number): Promise<ClassroomAverage[]> {
        return this.request<ClassroomAverage[]>(`api/grades/school/${schoolId}/classroom-averages`);
    }
    
    async getClassroomStudentAverages(classroomId: number, schoolId: number): Promise<ClassroomStudentAveragesResponse> {
        return this.request<ClassroomStudentAveragesResponse>(`api/grades/classroom/${classroomId}/student-averages?schoolId=${schoolId}`);
    }

  // Notifications
  async sendNotification(payload: any): Promise<void> {
    return this.request<void>('api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
      return this.request<Notification[]>(`api/notifications?userID=${userId}`);
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    return this.request<void>(`api/notifications/read-all?userID=${userId}`, {
        method: 'PUT'
    });
  }
  
  async markNotificationAsRead(notificationId: number): Promise<void> {
      return this.request<void>(`api/notifications/${notificationId}/read`, {
          method: 'PUT'
      });
  }

  async sendToAll(schoolId: number, notification: { title: string, content: string }): Promise<void> {
    return this.request<void>(`api/notifications/send-to-all?schoolId=${schoolId}`, {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async sendToRole(schoolId: number, roleId: number, notification: { title: string, content: string }): Promise<void> {
    return this.request<void>(`api/notifications/send-to-role?roleId=${roleId}&schoolId=${schoolId}`, {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async sendToClassroom(schoolId: number, classroomId: number, notification: { title: string, content: string }): Promise<void> {
    return this.request<void>(`api/notifications/send-to-class?schoolId=${schoolId}&classroomId=${classroomId}`, {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  // Payments
  async getParentPayments(parentId: number, schoolId: number): Promise<Payment[]> {
      return this.request<Payment[]>(`api/payments/parent/${parentId}?schoolId=${schoolId}`);
  }

  async approvePayment(paymentId: number, reviewedByUserId: number, comment: string | null): Promise<ApprovePaymentResponse> {
      const payload = { reviewedByUserId, comment };
      return this.request<ApprovePaymentResponse>(`api/payments/${paymentId}/approve`, {
          method: 'PUT',
          body: JSON.stringify(payload)
      });
  }

  async rejectPayment(paymentId: number, reviewedByUserId: number, comment: string | null): Promise<void> {
      const payload = { reviewedByUserId, comment };
      return this.request<void>(`api/payments/${paymentId}/reject`, {
          method: 'PUT',
          body: JSON.stringify(payload)
      });
  }

  // Reports
  async getStudents(schoolId: number): Promise<User[]> {
    const users = await this.getUsers(schoolId);
    // Role for student is 1
    return users.filter(u => u.roleID === 1);
  }

  async getEmgClassroomReport(classroomId: number, schoolId: number, lapsoIds: number[]): Promise<ReportEmgClassroomResponse> {
    const lapsosQuery = lapsoIds.join(',');
    return this.request<ReportEmgClassroomResponse>(`api/reports/emg/classroom/${classroomId}?schoolId=${schoolId}&lapsos=${lapsosQuery}`);
  }

  async getEmgStudentReport(studentId: number, schoolId: number, lapsoIds: number[]): Promise<ReportEmgClassroomResponse> {
      const lapsosQuery = lapsoIds.join(',');
      return this.request<ReportEmgClassroomResponse>(`api/reports/emg/student/${studentId}?schoolId=${schoolId}&lapsos=${lapsosQuery}`);
  }

  async getRrdeaClassroomReport(classroomId: number, schoolId: number): Promise<ReportRrdeaClassroomResponse> {
      return this.request<ReportRrdeaClassroomResponse>(`api/reports/rrdea/classroom/${classroomId}?schoolId=${schoolId}`);
  }

  // Relationships
  async getParents(schoolId: number): Promise<User[]> {
    const users = await this.getUsers(schoolId);
    const parentRoles = new Set([3, 11]);
    return users.filter(u => parentRoles.has(u.roleID));
  }

  async getChildrenOfParent(parentId: number, schoolId: number): Promise<Child[]> {
    // The raw response object from the API.
    interface RawChild {
        relationID: number;
        userID: number;
        studentName: string;
        email: string;
    }
    const rawChildren = await this.request<RawChild[]>(`api/relationships/user/${parentId}/children?schoolId=${schoolId}`);
    return rawChildren.map(c => ({
        relationID: c.relationID,
        userID: c.userID,
        userName: c.studentName, // map studentName to userName for frontend consistency
        email: c.email
    }));
  }

  async getParentsOfChild(childId: number, schoolId: number): Promise<Parent[]> {
    interface RawParent {
        relationID: number;
        userID: number;
        userName: string;
        email: string;
    }
    const rawParents = await this.request<RawParent[]>(`api/relationships/user/${childId}/parents?schoolId=${schoolId}`);
    return rawParents.map(p => ({
        relationID: p.relationID,
        userID: p.userID,
        userName: p.userName,
        email: p.email
    }));
  }

  async createRelationship(parentId: number, childId: number): Promise<void> {
    return this.request<void>('api/relationships/create', {
      method: 'POST',
      body: JSON.stringify({ user1ID: childId, user2ID: parentId, relationshipType: 'Padre-Hijo' }),
    });
  }

  async deleteRelationship(relationId: number): Promise<void> {
    return this.request<void>(`api/relationships/${relationId}`, {
      method: 'DELETE',
    });
  }

  // Extracurricular Activities
  async getExtracurriculars(schoolId: number): Promise<ExtracurricularActivity[]> {
    return this.request<ExtracurricularActivity[]>(`api/extracurriculars?schoolId=${schoolId}`);
  }

  async getExtracurricularById(id: number, schoolId: number): Promise<ExtracurricularActivity> {
    return this.request<ExtracurricularActivity>(`api/extracurriculars/${id}?schoolId=${schoolId}`);
  }

  async createExtracurricular(activity: Omit<ExtracurricularActivity, 'activityID'>): Promise<ExtracurricularActivity> {
    return this.request<ExtracurricularActivity>('api/extracurriculars/create', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  async updateExtracurricular(id: number, schoolId: number, activity: Partial<ExtracurricularActivity>): Promise<void> {
    return this.request<void>(`api/extracurriculars/${id}?schoolId=${schoolId}`, {
      method: 'PUT',
      body: JSON.stringify(activity),
    });
  }

  async deleteExtracurricular(id: number, schoolId: number): Promise<void> {
    return this.request<void>(`api/extracurriculars/${id}?schoolId=${schoolId}`, {
      method: 'DELETE',
    });
  }

  async enrollStudentInActivity(payload: ExtracurricularEnrollmentPayload): Promise<any> {
    return this.request<any>('api/extracurriculars/enrollments/enroll', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

  async getStudentsByActivity(activityId: number, schoolId: number): Promise<EnrolledStudent[]> {
    return this.request<EnrolledStudent[]>(`api/extracurriculars/enrollments/activity/${activityId}/students?schoolId=${schoolId}`);
  }


  // Certificates
  async getCertificates(schoolId: number): Promise<Certificate[]> {
    return this.request<Certificate[]>(`api/Certificates?schoolId=${schoolId}`);
  }

  async getCertificateById(id: number, schoolId: number): Promise<Certificate> {
      return this.request<Certificate>(`api/Certificates/${id}?schoolId=${schoolId}`);
  }

  async createCertificate(payload: CertificateGeneratePayload): Promise<Certificate> {
      return this.request<Certificate>('api/Certificates', {
          method: 'POST',
          body: JSON.stringify(payload),
      });
  }

  async deleteCertificate(id: number, schoolId: number): Promise<void> {
      return this.request<void>(`api/Certificates/${id}?schoolId=${schoolId}`, {
          method: 'DELETE',
      });
  }

  // Products
  async getProductsWithAudiences(schoolId: number): Promise<ProductWithAudiences[]> {
    // The new API for products (on santarosa) does not seem to have audiences.
    // We will return an empty array for audiences to maintain compatibility with existing components.
    const products = await this.request<Product[]>(`api/products?schoolid=${schoolId}`);
    return products.map(p => ({
        product: p,
        audiences: []
    }));
  }

  async createProduct(payload: Omit<Product, 'productID' | 'createdAt'> & { audiences: AudiencePayload[] }): Promise<Product> {
      // The new product API is on the purchases URL and does not seem to use audiences.
      const { audiences, ...productPayload } = payload;
      return this.request<Product>('api/products', {
          method: 'POST',
          body: JSON.stringify(productPayload)
      });
  }

  async getProductWithAudiences(productId: number, schoolId: number): Promise<{ product: Product; audiences: AudiencePayload[] }> {
      // The new API is on the purchases URL and does not seem to use audiences.
      const product = await this.request<Product>(`api/products/${productId}?schoolid=${schoolId}`);
      return { product, audiences: [] };
  }

  async updateProduct(productId: number, payload: Partial<Product> & { audiences: AudiencePayload[] }): Promise<void> {
      // The new product API is on the purchases URL and does not seem to use audiences.
      const { audiences, ...productPayload } = payload;
      // It's assumed payload contains schoolID, and the new API expects it in the query.
      return this.request<void>(`api/products/${productId}?schoolid=${payload.schoolID}`, {
          method: 'PUT',
          body: JSON.stringify(productPayload)
      });
  }

  // Enrollments
  async getEnrollmentsForUser(userId: number, schoolId: number): Promise<Enrollment[]> {
    return this.request<Enrollment[]>(`api/enrollments/user/${userId}?schoolId=${schoolId}`);
  }

  async createEnrollment(payload: { UserID: number; CourseID: number; SchoolID: number }): Promise<Enrollment> {
      return this.request<Enrollment>('api/enrollments', {
          method: 'POST',
          body: JSON.stringify(payload)
      });
  }

  async deleteEnrollment(enrollmentId: number, schoolId: number): Promise<void> {
      return this.request<void>(`api/enrollments/${enrollmentId}?schoolId=${schoolId}`, {
          method: 'DELETE'
      });
  }
  
  // Attendance
  async getAttendanceByCourse(courseId: number, schoolId: number): Promise<AttendanceRecord[]> {
    return this.request<AttendanceRecord[]>(`api/attendance/course/${courseId}?schoolId=${schoolId}`);
  }

  async updateAttendance(attendanceId: number, payload: AttendanceEditPayload, modifiedById: number): Promise<void> {
    return this.request<void>(`api/attendance/${attendanceId}?modifiedBy=${modifiedById}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
  }

  async deleteAttendance(attendanceId: number, schoolId: number): Promise<void> {
    return this.request<void>(`api/attendance/${attendanceId}?schoolId=${schoolId}`, {
        method: 'DELETE',
    });
  }

  // Invoices
  async getInvoiceForPrint(invoiceId: number): Promise<InvoicePrintVM> {
    return this.request<InvoicePrintVM>(`api/invoices/${invoiceId}`);
  }

  async getPendingInvoices(schoolId: number): Promise<PendingInvoice[]> {
    return this.request<PendingInvoice[]>(`api/invoices/pending?schoolId=${schoolId}`);
  }

  async getInvoices(schoolId: number, params: { status?: string; from?: string; to?: string; q?: string; page?: number; pageSize?: number }): Promise<PaginatedInvoices> {
    const query = new URLSearchParams({
      schoolId: schoolId.toString(),
      page: (params.page || 1).toString(),
      pageSize: (params.pageSize || 20).toString(),
    });
    if (params.status) query.append('status', params.status);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.q) query.append('q', params.q);
    
    return this.request<PaginatedInvoices>(`api/invoices?${query.toString()}`);
  }

  async generateMonthly(dto: GenerateInvoicesRunDto): Promise<MonthlyGenerationResult> {
    const endpoint = dto.DryRun ? 'api/invoices/generate-monthly/preview' : 'api/invoices/generate-monthly/run';
    return this.request<MonthlyGenerationResult>(endpoint, {
        method: 'POST',
        body: JSON.stringify(dto)
    });
  }
  
  async getMonthlyArSummary(schoolId: number, year?: number, currency?: string): Promise<MonthlyARSummary[]> {
    const params = new URLSearchParams({ schoolId: schoolId.toString() });
    if (year) params.append('year', year.toString());
    if (currency) params.append('currency', currency);
    return this.request<MonthlyARSummary[]>(`api/invoices/monthly-ar?${params.toString()}`);
  }

  // Purchases
  async getPurchases(schoolId: number, params: { page?: number; pageSize?: number }): Promise<PaginatedPurchases> {
    const query = new URLSearchParams({
      schoolid: schoolId.toString(),
      page: (params.page || 1).toString(),
      pageSize: (params.pageSize || 20).toString(),
    });
    return this.request<PaginatedPurchases>(`api/purchases?${query.toString()}`);
  }

  async getPurchaseById(purchaseId: number, schoolId: number): Promise<PurchaseDetail> {
    return this.request<PurchaseDetail>(`api/purchases/${purchaseId}?schoolid=${schoolId}`);
  }

  async createPurchase(payload: PurchaseCreatePayload): Promise<PurchaseCreationResponse> {
    return this.request<PurchaseCreationResponse>('api/purchases', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
  }

  async annulPurchase(purchaseId: number, schoolId: number): Promise<void> {
      return this.request<void>(`api/purchases/${purchaseId}/annul?schoolid=${schoolId}`, {
          method: 'PUT'
      });
  }

  // Payroll
  async previewPayroll(payload: PayrollRunPayload): Promise<PayrollPreviewResponse> {
    const endpoint = `api/payroll/preview?schoolid=${payload.schoolID}`;
    return this.request<PayrollPreviewResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ ...payload, dryRun: true })
    });
  }

  async runPayroll(payload: PayrollRunPayload): Promise<PayrollRunResponse> {
      const endpoint = `api/payroll/run?schoolid=${payload.schoolID}`;
      return this.request<PayrollRunResponse>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ ...payload, dryRun: false })
      });
  }

  async getPayrolls(params: { schoolId: number; year?: number; month?: number; page: number; pageSize: number }): Promise<PaginatedPayrolls> {
      const query = new URLSearchParams({
          schoolId: params.schoolId.toString(),
          page: params.page.toString(),
          pageSize: params.pageSize.toString(),
      });
      if (params.year) query.append('year', params.year.toString());
      if (params.month) query.append('month', params.month.toString());
      return this.request<PaginatedPayrolls>(`api/payroll?${query.toString()}`);
  }

  async getPayrollById(payrollId: number): Promise<PayrollDetail> {
      return this.request<PayrollDetail>(`api/payroll/${payrollId}`);
  }

  async updateBaseSalary(payload: BaseSalaryUpdatePayload): Promise<void> {
      return this.request<void>('api/payroll/base-salary', {
          method: 'PUT',
          body: JSON.stringify(payload)
      });
  }
  
  async closePayrollPeriod(params: { schoolId: number, year: number, month: number }): Promise<void> {
      const query = new URLSearchParams({
          schoolId: params.schoolId.toString(),
          year: params.year.toString(),
          month: params.month.toString(),
      });
      return this.request<void>(`api/payroll/close?${query.toString()}`, { method: 'PUT' });
  }

  async annulPayroll(payrollId: number, reason: string | null): Promise<void> {
      return this.request<void>(`api/payroll/${payrollId}/annul`, {
          method: 'PUT',
          body: JSON.stringify({ reason })
      });
  }

  // Chat
  async getUserChats(userId: number): Promise<Chat[]> {
    return this.request<Chat[]>(`api/chats?userID=${userId}`);
  }

  async getChatMessages(chatId: number): Promise<Message[]> {
    return this.request<Message[]>(`api/chats/${chatId}/messages`);
  }

  async sendMessage(payload: SendMessageDto): Promise<Message> {
    return this.request<Message>('api/chats/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
  }

  async createGroupChat(payload: CreateGroupChatDto): Promise<Chat> {
    return this.request<Chat>('api/chats', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
  }

  async deleteChat(chatId: number): Promise<void> {
    return this.request<void>(`api/chats/${chatId}`, {
      method: 'DELETE',
    });
  }
  
  // Analytics
    async getPnlReport(schoolId: number, year: number): Promise<PnlReportResponse> {
        return this.request<PnlReportResponse>(`api/analytics/finance/pnl?schoolId=${schoolId}&year=${year}`);
    }
    async getSalesByProductReport(schoolId: number, from: string, to: string, top: number): Promise<SalesByProductResponse> {
        return this.request<SalesByProductResponse>(`api/analytics/sales/by-product?schoolId=${schoolId}&from=${from}&to=${to}&top=${top}`);
    }
    async getInventorySnapshot(schoolId: number): Promise<InventorySnapshotResponse> {
        return this.request<InventorySnapshotResponse>(`api/analytics/inventory/snapshot?schoolId=${schoolId}`);
    }
    async getInventoryKardex(schoolId: number, productId: number, from: string, to: string): Promise<InventoryKardexResponse> {
        return this.request<InventoryKardexResponse>(`api/analytics/inventory/kardex?schoolId=${schoolId}&productId=${productId}&from=${from}&to=${to}`);
    }
    async getArAgingSummary(schoolId: number, asOf: string): Promise<ArAgingSummaryResponse> {
        return this.request<ArAgingSummaryResponse>(`api/analytics/ar/aging?schoolId=${schoolId}&asOf=${asOf}`);
    }
    async getArAgingByCustomer(schoolId: number, asOf: string): Promise<ArAgingByCustomerResponse> {
        return this.request<ArAgingByCustomerResponse>(`api/analytics/ar/aging-by-customer?schoolId=${schoolId}&asOf=${asOf}`);
    }

    // General Ledger (GL)
    private glRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(`api/gl/${endpoint}`, options);
    }
    
    // GL Postings
    async postGlInvoice(invoiceId: number): Promise<void> {
        return this.glRequest<void>(`post/invoice/${invoiceId}`, { method: 'POST' });
    }
    async postGlPayment(paymentId: number): Promise<void> {
        return this.glRequest<void>(`post/payment/${paymentId}`, { method: 'POST' });
    }
    async postGlPurchase(purchaseId: number): Promise<void> {
        return this.glRequest<void>(`post/purchase/${purchaseId}`, { method: 'POST' });
    }
    async postGlPayroll(payrollId: number): Promise<void> {
        return this.glRequest<void>(`post/payroll/${payrollId}`, { method: 'POST' });
    }
    async postGlInventoryMovement(movementId: number): Promise<void> {
        return this.glRequest<void>(`post/inventory-movement/${movementId}`, { method: 'POST' });
    }

    // GL Reports
    async getTrialBalance(schoolId: number): Promise<TrialBalanceRow[]> {
        return this.glRequest<TrialBalanceRow[]>(`trial-balance?schoolId=${schoolId}`);
    }

    async getLedger(schoolId: number, accountCode: string, from: string, to: string): Promise<LedgerRow[]> {
        const params = new URLSearchParams({ schoolId: schoolId.toString(), accountCode, from, to });
        return this.glRequest<LedgerRow[]>(`ledger?${params.toString()}`);
    }

    async getIncomeStatement(schoolId: number, from: string, to: string): Promise<IncomeStatement> {
        const params = new URLSearchParams({ schoolId: schoolId.toString(), from, to });
        return this.glRequest<IncomeStatement>(`income-statement?${params.toString()}`);
    }

    async getBalanceSheet(schoolId: number, asOf: string): Promise<BalanceSheet> {
        const params = new URLSearchParams({ schoolId: schoolId.toString(), asOf });
        return this.glRequest<BalanceSheet>(`balance-sheet?${params.toString()}`);
    }
}

export const apiService = new ApiService();
