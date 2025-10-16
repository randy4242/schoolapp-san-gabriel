// FIX: Corrected typo from StudentGrdesGroup to StudentGradesGroup.
import { AuthenticatedUser, DashboardStats, User, Course, Teacher, Classroom, Student, ClassroomAttendanceStats, Lapso, StudentGradesVM, StudentAttendanceStats, LapsoGradeApiItem, StudentGradeItem, StudentGradesGroup, AuthResponse, Evaluation, Grade, Child, LoginHistoryRecord, Payment, Notification, ReportEmgClassroomResponse, ExtracurricularActivity, Certificate, CertificateGeneratePayload, Product, ProductWithAudiences, ProductAudience, AudiencePayload, Enrollment } from '../types';

const BASE_URL = "https://apicamorucoSA.somee.com/";

export interface GlobalSearchResult {
    users: User[];
    courses: Course[];
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
  async globalSearch(schoolId: number, term: string): Promise<GlobalSearchResult> {
    if (!term.trim()) {
        return { users: [], courses: [] };
    }

    const [allUsers, allCourses] = await Promise.all([
        this.getUsers(schoolId),
        this.getCourses(schoolId) // Fetch all courses to filter client-side
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

    return { users: filteredUsers, courses: filteredCourses };
  }

  // Users
  async getUsers(schoolId: number): Promise<User[]> {
    return this.request<User[]>(`api/users?schoolId=${schoolId}`);
  }

  async getUserById(id: number, schoolId: number): Promise<User> {
    return this.request<User>(`api/users/${id}?schoolId=${schoolId}`);
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

  async getStudentsByCourse(courseId: number, schoolId: number): Promise<Student[]> {
      // Placeholder implementation. Replace with actual API call.
      console.log(`Fetching students for course ${courseId} in school ${schoolId}`);
      return Promise.resolve([
          { studentID: 101, studentName: 'Ana García' },
          { studentID: 102, studentName: 'Carlos Martinez' },
          { studentID: 103, studentName: 'Lucía Rodriguez' },
          { studentID: 104, studentName: 'Javier Fernández' },
      ]);
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

  // Notifications
  async sendNotification(payload: any): Promise<void> {
    return this.request<void>('api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getParentNotifications(parentId: number, schoolId: number): Promise<Notification[]> {
      // The provided backend endpoint only uses userID. School is likely derived from the token.
      return this.request<Notification[]>(`api/notifications?userID=${parentId}`);
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

  async approvePayment(paymentId: number, reviewedByUserId: number, comment: string | null): Promise<any> {
      const payload = { reviewedByUserId, comment };
      return this.request<any>(`api/payments/${paymentId}/approve`, {
          method: 'PUT',
          body: JSON.stringify(payload)
      });
  }

  async rejectPayment(paymentId: number, reviewedByUserId: number, comment: string | null): Promise<any> {
      const payload = { reviewedByUserId, comment };
      return this.request<any>(`api/payments/${paymentId}/reject`, {
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
    const products = await this.request<Product[]>(`api/products?schoolId=${schoolId}`);
    const result: ProductWithAudiences[] = [];
    for (const p of products) {
        const audiences = await this.request<ProductAudience[]>(`api/products/${p.productID}/audiences?schoolId=${schoolId}`);
        result.push({ product: p, audiences });
    }
    return result;
  }

  async createProduct(payload: Omit<Product, 'productID' | 'createdAt'> & { audiences: AudiencePayload[] }): Promise<Product> {
      const apiPayload = { ...payload, Audiences: payload.audiences };
      return this.request<Product>('api/products', {
          method: 'POST',
          body: JSON.stringify(apiPayload)
      });
  }

  async getProductWithAudiences(productId: number, schoolId: number): Promise<{ product: Product; audiences: AudiencePayload[] }> {
      const product = await this.request<Product>(`api/products/${productId}`);
      const audiencesRaw = await this.request<ProductAudience[]>(`api/products/${productId}/audiences?schoolId=${schoolId}`);
      const audiences = audiencesRaw.map(a => ({ targetType: a.targetTypeRaw, targetID: a.targetID }));
      return { product, audiences };
  }

  async updateProduct(productId: number, payload: Partial<Omit<Product, 'productID' | 'createdAt' | 'schoolID'>> & { audiences: AudiencePayload[] }): Promise<void> {
      const apiPayload = { ...payload, Audiences: payload.audiences };
      return this.request<void>(`api/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(apiPayload)
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
}

export const apiService = new ApiService();