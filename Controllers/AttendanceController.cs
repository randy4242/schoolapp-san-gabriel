
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolProyectBackend.Data;
using SchoolProyectBackend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SchoolProyectBackend.Controllers
{
    [ApiController]
    [Route("api/attendance")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AttendanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        // Roles según tabla:
        // 1 Student
        // 2 Teacher
        // 3 Parent
        // 6 Super Admin
        // 7 Vista Área
        // 8 Vista Grados
        // 9 Profesor Integral
        // 10 Prof. Especialista
        // 11 Representante
        private const int ROLE_STUDENT = 1;
        private const int ROLE_TEACHER = 2;
        private const int ROLE_PARENT = 3;
        private const int ROLE_SUPERADMIN = 6;
        private const int ROLE_VISTA_AREA = 7;
        private const int ROLE_VISTA_GRADOS = 8;
        private const int ROLE_PROF_INTEGRAL = 9;
        private const int ROLE_PROF_ESPECIALISTA = 10;
        private const int ROLE_REPRESENTANTE = 11;

        #region Helpers de claims

        private bool TryGetTokenClaimInt(string claimType, out int value)
        {
            value = 0;
            var raw = User.FindFirst(claimType)?.Value;
            return int.TryParse(raw, out value);
        }

        private bool TryGetTokenUserId(out int userId) =>
            TryGetTokenClaimInt("UserID", out userId);

        private bool TryGetTokenSchoolId(out int schoolId) =>
            TryGetTokenClaimInt("SchoolID", out schoolId);

        private bool TryGetTokenRoleId(out int roleId) =>
            TryGetTokenClaimInt(ClaimTypes.Role, out roleId);

        // Docentes o usuarios con vistas académicas y super admin
        private bool EsRolDocenteOVista(int roleId)
        {
            return roleId == ROLE_TEACHER
                   || roleId == ROLE_SUPERADMIN
                   || roleId == ROLE_VISTA_AREA
                   || roleId == ROLE_VISTA_GRADOS
                   || roleId == ROLE_PROF_INTEGRAL
                   || roleId == ROLE_PROF_ESPECIALISTA;
        }

        // Padres y representantes
        private bool EsRolPadreORepresentante(int roleId)
        {
            return roleId == ROLE_PARENT || roleId == ROLE_REPRESENTANTE;
        }

        private DateTime GetVenezuelanTime()
        {
            try
            {
                var venezuelaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Venezuela Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, venezuelaTimeZone);
            }
            catch
            {
                return DateTime.UtcNow;
            }
        }

        #endregion

        // Estados base almacenados
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Presente", "Ausente", "Retardo", "Observación"
        };

        // ===========================
        // CRUD y registro de asistencia
        // ===========================

        [HttpPost("mark")]
        public async Task<IActionResult> MarkAttendance([FromBody] List<AttendanceUpsertDto> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest("No hay datos de asistencia.");

            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId) || !TryGetTokenUserId(out var tokenUserId))
                return Forbid();

            // Solo docentes y super admin pueden marcar asistencia
            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para marcar asistencia.");

            var nowVz = GetVenezuelanTime();

            try
            {
                var entities = new List<Attendance>(items.Count);

                foreach (var dto in items)
                {
                    // Validar Fecha: No permitir fechas futuras (con un margen de 10 minutos por reloj desajustado)
                    DateTime finalDate = nowVz;
                    if (dto.Date.HasValue)
                    {
                        if (dto.Date.Value > nowVz.AddMinutes(10))
                        {
                            return BadRequest($"La fecha enviada ({dto.Date.Value}) es futura y no está permitida.");
                        }
                        finalDate = dto.Date.Value;
                    }

                    // Forzar SchoolID para usuarios que no son SuperAdmin
                    var effectiveSchoolId = dto.SchoolID;
                    if (tokenRoleId != ROLE_SUPERADMIN)
                    {
                        effectiveSchoolId = tokenSchoolId;
                    }
                    else
                    {
                        if (effectiveSchoolId <= 0)
                            effectiveSchoolId = tokenSchoolId;
                    }

                    // Validación de existencia y pertenencia
                    var user = await _context.Users.FindAsync(dto.UserID);
                    var course = await _context.Courses.FindAsync(dto.CourseID);
                    if (user == null || course == null)
                        return BadRequest($"Usuario o curso (ID: {dto.UserID}/{dto.CourseID}) no existen.");

                    if (user.SchoolID != effectiveSchoolId || course.SchoolID != effectiveSchoolId)
                        return BadRequest($"Usuario o curso (ID: {dto.UserID}/{dto.CourseID}) no pertenecen al colegio indicado.");

                    // Normalización del status
                    string s = (dto.Status ?? "").Trim().ToLowerInvariant()
                        .Replace(" ", "").Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u");

                    string statusToStore;
                    bool? isJustified = dto.IsJustified;
                    int? minutesLate = dto.MinutesLate;

                    switch (s)
                    {
                        case "presente":
                            statusToStore = "Presente";
                            isJustified = null;
                            minutesLate = null;
                            break;

                        case "ausente":
                            statusToStore = "Ausente";
                            isJustified = isJustified ?? false;
                            minutesLate = null;
                            break;

                        case "retardo":
                            statusToStore = "Retardo";
                            isJustified = isJustified ?? false;
                            if (minutesLate == null || minutesLate <= 0)
                                return BadRequest("Para 'Retardo' se requiere MinutesLate > 0.");
                            break;

                        case "retardojustificado":
                            statusToStore = "Retardo";
                            isJustified = true;
                            if (minutesLate == null || minutesLate <= 0)
                                return BadRequest("Para 'RetardoJustificado' se requiere MinutesLate > 0.");
                            break;

                        case "ausenciajustificada":
                        case "inasistenciajustificada":
                        case "ausentejustificado":
                        case "aj":
                            statusToStore = "Ausente";
                            isJustified = true;
                            minutesLate = null;
                            break;

                        case "observacion":
                        case "observacion(1)":
                        case "observacion1":
                        case "obs":
                            statusToStore = "Observación";
                            isJustified = null;
                            minutesLate = null;
                            if (string.IsNullOrWhiteSpace(dto.Notes))
                                return BadRequest("Para 'Observación' se requiere Notes.");
                            break;

                        default:
                            return BadRequest($"Estado no soportado: '{dto.Status}'. Estados base permitidos: {string.Join(", ", AllowedStatuses)}");
                    }

                    entities.Add(new Attendance
                    {
                        UserID = dto.UserID,
                        RelatedUserID = tokenUserId, // Usamos el ID del usuario autenticado
                        CourseID = dto.CourseID,
                        SchoolID = effectiveSchoolId,
                        Status = statusToStore,
                        Notes = dto.Notes,
                        IsJustified = isJustified,
                        MinutesLate = minutesLate,
                        Date = finalDate
                    });
                }

                _context.Attendance.AddRange(entities);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Asistencia registrada correctamente." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MarkAttendance error: {ex.Message} | {ex.InnerException?.Message}");
                return StatusCode(500, "Error interno al registrar la asistencia.");
            }
        }

        [HttpPost("note")]
        public async Task<IActionResult> AddObservation([FromBody] AttendanceNoteDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Notes))
                return BadRequest("La observación no puede estar vacía.");

            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para registrar observaciones.");

            var effectiveSchoolId = dto.SchoolID;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
            }
            else
            {
                if (effectiveSchoolId <= 0)
                    effectiveSchoolId = tokenSchoolId;
            }

            var user = await _context.Users.FindAsync(dto.UserID);
            var course = await _context.Courses.FindAsync(dto.CourseID);
            if (user == null || course == null || user.SchoolID != effectiveSchoolId || course.SchoolID != effectiveSchoolId)
                return BadRequest("Usuario o curso no pertenecen al colegio indicado.");

            var att = new Attendance
            {
                UserID = dto.UserID,
                RelatedUserID = dto.RelatedUserID,
                CourseID = dto.CourseID,
                SchoolID = effectiveSchoolId,
                Status = "Observación",
                Notes = dto.Notes?.Trim(),
                IsJustified = null,
                MinutesLate = null,
                Date = GetVenezuelanTime()
            };

            _context.Attendance.Add(att);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Observación registrada correctamente.", attendanceId = att.AttendanceID });
        }

        // PUT: api/attendance/{attendanceId}
        [HttpPut("{attendanceId:int}")]
        public async Task<IActionResult> EditAttendance(int attendanceId, [FromBody] AttendanceEditDto dto, [FromQuery] int modifiedBy = 0)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) ||
                !TryGetTokenRoleId(out var tokenRoleId) ||
                !TryGetTokenUserId(out var tokenUserId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para editar asistencia.");

            var att = await _context.Attendance.FindAsync(attendanceId);
            if (att == null) return NotFound("Registro de asistencia no encontrado.");

            if (tokenRoleId != ROLE_SUPERADMIN && att.SchoolID != tokenSchoolId)
                return Forbid("No puede editar asistencia de otra escuela.");

            if (dto.Status != null)
            {
                string statusNormalized = (dto.Status ?? "").Trim();

                if (statusNormalized.Equals("RetardoJustificado", StringComparison.OrdinalIgnoreCase))
                {
                    att.Status = "Retardo";
                    att.IsJustified = true;
                }
                else if (statusNormalized.Equals("AusenciaJustificada", StringComparison.OrdinalIgnoreCase))
                {
                    att.Status = "Ausente";
                    att.IsJustified = true;
                }
                else if (AllowedStatuses.Contains(statusNormalized, StringComparer.OrdinalIgnoreCase))
                {
                    att.Status = statusNormalized;
                }
                else
                {
                    return BadRequest($"Estado inválido: {dto.Status}. Estados base permitidos: {string.Join(", ", AllowedStatuses)}");
                }
            }

            if (dto.Notes != null) att.Notes = dto.Notes;
            if (dto.IsJustified.HasValue) att.IsJustified = dto.IsJustified;
            if (dto.MinutesLate.HasValue) att.MinutesLate = dto.MinutesLate;

            if (dto.Date.HasValue)
            {
                att.Date = dto.Date.Value;
            }

            if (att.Status == "Presente" || att.Status == "Observación")
            {
                att.IsJustified = null;
                att.MinutesLate = null;
            }
            else if (att.Status == "Ausente")
            {
                att.MinutesLate = null;
                if (att.IsJustified == null) att.IsJustified = false;
            }
            else if (att.Status == "Retardo")
            {
                if (att.IsJustified == null) att.IsJustified = false;
                if (att.MinutesLate == null || att.MinutesLate <= 0)
                {
                    return BadRequest("Para el estado 'Retardo' se requiere MinutesLate > 0.");
                }
            }

            att.ModifiedAt = GetVenezuelanTime();
            att.ModifiedBy = tokenUserId; // Ignora modifiedBy del query y usa el usuario del token

            await _context.SaveChangesAsync();
            return Ok(new { message = "Asistencia actualizada." });
        }

        // DELETE: api/attendance/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAttendance(int id, [FromQuery] int schoolId)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para eliminar asistencia.");

            var attendance = await _context.Attendance.FindAsync(id);
            if (attendance == null)
                return NotFound(new { message = "Asistencia no encontrada." });

            if (tokenRoleId != ROLE_SUPERADMIN && attendance.SchoolID != tokenSchoolId)
                return Forbid("No puede eliminar asistencia de otra escuela.");

            _context.Attendance.Remove(attendance);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Asistencia eliminada correctamente." });
        }

        // GET: api/attendance/course/{courseId}?schoolId=#
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetAttendanceByCourse(int courseId, [FromQuery] int schoolId)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para ver asistencia por curso.");

            var effectiveSchoolId = schoolId;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
            }
            else
            {
                if (effectiveSchoolId <= 0)
                    effectiveSchoolId = tokenSchoolId;
            }

            var attendanceRecords = await _context.Attendance
                .Where(a => a.CourseID == courseId && a.SchoolID == effectiveSchoolId)
                .Include(a => a.User)
                .Include(a => a.RelatedUser)
                .Include(a => a.Course)
                .Where(a => !_context.Users.Any(u => u.UserID == a.UserID && u.BlockedReason == "ATT_ANCHOR"))
                .Select(a => new
                {
                    a.AttendanceID,
                    a.UserID,
                    StudentName = a.User.UserName,
                    a.RelatedUserID,
                    TeacherName = a.RelatedUser.UserName,
                    a.CourseID,
                    CourseName = a.Course.Name,
                    a.Date,
                    a.Status,
                    a.IsJustified,
                    a.MinutesLate,
                    a.Notes
                })
                .ToListAsync();

            return Ok(attendanceRecords);
        }

        // GET: api/attendance/parent/{userId}?schoolId=#
        [HttpGet("parent/{userId}")]
        public async Task<IActionResult> GetAttendanceByParent(int userId, [FromQuery] int? schoolId = null)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) ||
                !TryGetTokenRoleId(out var tokenRoleId) ||
                !TryGetTokenUserId(out var tokenUserId))
                return Forbid();

            var effectiveSchoolId = schoolId ?? tokenSchoolId;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
            }

            // Si quien consulta es padre/representante, solo puede ver su propio userId
            if (EsRolPadreORepresentante(tokenRoleId) && userId != tokenUserId)
                return Forbid("No puede consultar asistencia de otros representantes.");

            var studentIds = await _context.UserRelationships
                .Where(ur => ur.User2ID == userId && ur.RelationshipType == "Padre-Hijo")
                .Select(ur => ur.User1ID)
                .ToListAsync();

            if (!studentIds.Any())
                return Ok(new List<object>());

            var q = _context.Attendance.AsQueryable()
                .Where(a => studentIds.Contains(a.UserID));

            if (effectiveSchoolId > 0)
                q = q.Where(a => a.SchoolID == effectiveSchoolId);

            var attendanceRecords = await q
                .Include(a => a.User)
                .Include(a => a.RelatedUser)
                .Include(a => a.Course)
                .Select(a => new
                {
                    a.AttendanceID,
                    a.UserID,
                    StudentName = a.User.UserName,
                    a.RelatedUserID,
                    TeacherName = a.RelatedUser.UserName,
                    a.CourseID,
                    CourseName = a.Course.Name,
                    a.Date,
                    a.Status,
                    a.IsJustified,
                    a.MinutesLate,
                    a.Notes,
                    a.SchoolID
                })
                .OrderByDescending(x => x.Date)
                .ToListAsync();

            return Ok(attendanceRecords);
        }

        // ===========================
        // Estadísticas
        // ===========================

        private IQueryable<Attendance> ApplyRangeFilters(
            IQueryable<Attendance> q,
            DateTime? from, DateTime? to, int? schoolId)
        {
            if (from.HasValue) q = q.Where(a => a.Date >= from.Value.Date);
            if (to.HasValue) q = q.Where(a => a.Date < to.Value.Date.AddDays(1));
            if (schoolId.HasValue && schoolId.Value > 0)
                q = q.Where(a => a.SchoolID == schoolId.Value);
            return q;
        }

        // GET: api/attendance/stats/student/{studentId}
        [HttpGet("stats/student/{studentId}")]
        public async Task<IActionResult> GetStudentStats(
            int studentId,
            [FromQuery] int? schoolId = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) ||
                !TryGetTokenRoleId(out var tokenRoleId) ||
                !TryGetTokenUserId(out var tokenUserId))
                return Forbid();

            var student = await _context.Users.AsNoTracking()
                .Where(u => u.UserID == studentId)
                .Select(u => new { u.UserID, u.UserName, u.SchoolID })
                .FirstOrDefaultAsync();
            if (student == null) return NotFound("Alumno no encontrado.");

            var effectiveSchoolId = schoolId ?? student.SchoolID;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
                if (student.SchoolID != tokenSchoolId)
                    return Forbid("No puede consultar estudiantes de otra escuela.");
            }

            // Autorización específica
            if (tokenRoleId == ROLE_STUDENT && tokenUserId != studentId)
                return Forbid("El estudiante solo puede ver sus propias estadísticas.");

            if (EsRolPadreORepresentante(tokenRoleId))
            {
                var relacion = await _context.UserRelationships
                    .AnyAsync(ur => ur.User2ID == tokenUserId
                                    && ur.User1ID == studentId
                                    && ur.RelationshipType == "Padre-Hijo");
                if (!relacion)
                    return Forbid("El representante solo puede ver estadísticas de sus representados.");
            }

            if (!EsRolDocenteOVista(tokenRoleId) &&
                !EsRolPadreORepresentante(tokenRoleId) &&
                tokenRoleId != ROLE_STUDENT)
                return Forbid("No tiene permisos para ver estadísticas de asistencia.");

            var baseQ = _context.Attendance.AsNoTracking()
                .Where(a => a.UserID == studentId);

            baseQ = ApplyRangeFilters(baseQ, from, to, effectiveSchoolId);

            var overallAgg = await baseQ.GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .FirstOrDefaultAsync() ?? new { Total = 0, Present = 0, Absent = 0, Late = 0, JustifiedAbsent = 0, Observation = 0 };

            var byCourse = await baseQ
                .Include(a => a.Course)
                .GroupBy(a => new { a.CourseID, a.Course.Name })
                .Select(g => new
                {
                    g.Key.CourseID,
                    CourseName = g.Key.Name,
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .ToListAsync();

            var resp = new StudentStatsResponse
            {
                StudentID = student.UserID,
                StudentName = student.UserName,
                Overall = new AttendanceSummaryDto
                {
                    Total = overallAgg.Total,
                    Present = overallAgg.Present,
                    Absent = overallAgg.Absent,
                    Late = overallAgg.Late,
                    JustifiedAbsent = overallAgg.JustifiedAbsent,
                    Observation = overallAgg.Observation
                },
                ByCourse = byCourse.Select(x => new StudentCourseStatDto
                {
                    CourseID = x.CourseID,
                    CourseName = x.CourseName ?? "",
                    Summary = new AttendanceSummaryDto
                    {
                        Total = x.Total,
                        Present = x.Present,
                        Absent = x.Absent,
                        Late = x.Late,
                        JustifiedAbsent = x.JustifiedAbsent,
                        Observation = x.Observation
                    }
                })
                .OrderBy(c => c.CourseName)
                .ToList()
            };

            return Ok(resp);
        }

        // GET: api/attendance/stats/student/{studentId}/course/{courseId}
        [HttpGet("stats/student/{studentId}/course/{courseId}")]
        public async Task<IActionResult> GetStudentCourseStats(
            int studentId, int courseId,
            [FromQuery] int? schoolId = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) ||
                !TryGetTokenRoleId(out var tokenRoleId) ||
                !TryGetTokenUserId(out var tokenUserId))
                return Forbid();

            var stu = await _context.Users.AsNoTracking()
                .Where(u => u.UserID == studentId)
                .Select(u => new { u.UserID, u.UserName, u.SchoolID })
                .FirstOrDefaultAsync();
            if (stu == null) return NotFound("Alumno no encontrado.");

            var course = await _context.Courses.AsNoTracking()
                .Where(c => c.CourseID == courseId)
                .Select(c => new { c.CourseID, c.Name, c.SchoolID })
                .FirstOrDefaultAsync();
            if (course == null) return NotFound("Curso no encontrado.");

            var effectiveSchoolId = schoolId ?? stu.SchoolID;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
                if (stu.SchoolID != tokenSchoolId || course.SchoolID != tokenSchoolId)
                    return Forbid("No puede consultar datos de otra escuela.");
            }

            if (tokenRoleId == ROLE_STUDENT && tokenUserId != studentId)
                return Forbid("El estudiante solo puede ver sus propias estadísticas.");

            if (EsRolPadreORepresentante(tokenRoleId))
            {
                var relacion = await _context.UserRelationships
                    .AnyAsync(ur => ur.User2ID == tokenUserId
                                    && ur.User1ID == studentId
                                    && ur.RelationshipType == "Padre-Hijo");
                if (!relacion)
                    return Forbid("El representante solo puede ver estadísticas de sus representados.");
            }

            if (!EsRolDocenteOVista(tokenRoleId) &&
                !EsRolPadreORepresentante(tokenRoleId) &&
                tokenRoleId != ROLE_STUDENT)
                return Forbid("No tiene permisos para ver estadísticas de asistencia.");

            var q = _context.Attendance.AsNoTracking()
                .Where(a => a.UserID == studentId && a.CourseID == courseId);

            q = ApplyRangeFilters(q, from, to, effectiveSchoolId);

            var agg = await q.GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .FirstOrDefaultAsync() ?? new { Total = 0, Present = 0, Absent = 0, Late = 0, JustifiedAbsent = 0, Observation = 0 };

            var resp = new StudentCourseSingleResponse
            {
                StudentID = stu.UserID,
                StudentName = stu.UserName,
                CourseID = course.CourseID,
                CourseName = course.Name,
                Summary = new AttendanceSummaryDto
                {
                    Total = agg.Total,
                    Present = agg.Present,
                    Absent = agg.Absent,
                    Late = agg.Late,
                    JustifiedAbsent = agg.JustifiedAbsent,
                    Observation = agg.Observation
                }
            };
            return Ok(resp);
        }

        // GET: api/attendance/stats/classroom/{classroomId}
        [HttpGet("stats/classroom/{classroomId}")]
        public async Task<IActionResult> GetClassroomStats(
            int classroomId,
            [FromQuery] int? schoolId = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para ver estadísticas de salón.");

            var classroom = await _context.Classrooms.AsNoTracking()
                .Where(c => c.ClassroomID == classroomId)
                .Select(c => new { c.ClassroomID, c.Name, c.SchoolID })
                .FirstOrDefaultAsync();

            if (classroom == null)
                return NotFound("Salón no encontrado.");

            var effectiveSchoolId = schoolId ?? classroom.SchoolID;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
                if (classroom.SchoolID != tokenSchoolId)
                    return Forbid("No puede consultar salones de otra escuela.");
            }

            var baseQ = _context.Attendance.AsNoTracking()
                .Include(a => a.Course)
                .Include(a => a.User)
                .Where(a => a.Course.ClassroomID == classroomId);

            baseQ = ApplyRangeFilters(baseQ, from, to, effectiveSchoolId);

            var overall = await baseQ.GroupBy(_ => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .FirstOrDefaultAsync() ?? new { Total = 0, Present = 0, Absent = 0, Late = 0, JustifiedAbsent = 0, Observation = 0 };

            var byCourse = await baseQ
                .GroupBy(a => new { a.CourseID, a.Course.Name })
                .Select(g => new
                {
                    g.Key.CourseID,
                    CourseName = g.Key.Name,
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .OrderBy(x => x.CourseName)
                .ToListAsync();

            var byStudent = await baseQ
                .GroupBy(a => new { a.UserID, a.User.UserName })
                .Select(g => new
                {
                    StudentID = g.Key.UserID,
                    StudentName = g.Key.UserName,
                    Total = g.Count(),
                    Present = g.Count(x => x.Status == "Presente"),
                    Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                    Late = g.Count(x => x.Status == "Retardo"),
                    JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                    Observation = g.Count(x => x.Status == "Observación")
                })
                .OrderBy(x => x.StudentName)
                .ToListAsync();

            var resp = new ClassroomStatsResponse
            {
                ClassroomID = classroom.ClassroomID,
                ClassroomName = classroom.Name,
                Overall = new AttendanceSummaryDto
                {
                    Total = overall.Total,
                    Present = overall.Present,
                    Absent = overall.Absent,
                    Late = overall.Late,
                    JustifiedAbsent = overall.JustifiedAbsent,
                    Observation = overall.Observation
                },
                ByCourse = byCourse.Select(x => new CourseSummaryDto
                {
                    CourseID = x.CourseID,
                    CourseName = x.CourseName ?? "",
                    Summary = new AttendanceSummaryDto
                    {
                        Total = x.Total,
                        Present = x.Present,
                        Absent = x.Absent,
                        Late = x.Late,
                        JustifiedAbsent = x.JustifiedAbsent,
                        Observation = x.Observation
                    }
                }).ToList(),
                ByStudent = byStudent.Select(x => new ClassroomStudentStatDto
                {
                    StudentID = x.StudentID,
                    StudentName = x.StudentName ?? "",
                    Summary = new AttendanceSummaryDto
                    {
                        Total = x.Total,
                        Present = x.Present,
                        Absent = x.Absent,
                        Late = x.Late,
                        JustifiedAbsent = x.JustifiedAbsent,
                        Observation = x.Observation
                    }
                }).ToList()
            };

            return Ok(resp);
        }

        private async Task<(DateTime from, DateTime to)> GetLapsoRangeAsync(int lapsoId)
        {
            var lapso = await _context.Lapsos
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.LapsoID == lapsoId);

            if (lapso == null)
                throw new KeyNotFoundException("Lapso no encontrado.");

            var from = lapso.FechaInicio.Date;
            var to = lapso.FechaFin.Date.AddDays(1);
            return (from, to);
        }

        [HttpGet("stats/student/{studentId}/lapso/{lapsoId}")]
        public async Task<IActionResult> GetStudentStatsByLapso(
            int studentId,
            int lapsoId,
            [FromQuery] int? schoolId = null)
        {
            try
            {
                var (from, to) = await GetLapsoRangeAsync(lapsoId);
                return await GetStudentStats(studentId, schoolId, from, to);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("stats/student/{studentId}/course/{courseId}/lapso/{lapsoId}")]
        public async Task<IActionResult> GetStudentCourseStatsByLapso(
            int studentId,
            int courseId,
            int lapsoId,
            [FromQuery] int? schoolId = null)
        {
            try
            {
                var (from, to) = await GetLapsoRangeAsync(lapsoId);
                return await GetStudentCourseStats(studentId, courseId, schoolId, from, to);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("stats/classroom/{classroomId}/lapso/{lapsoId}")]
        public async Task<IActionResult> GetClassroomStatsByLapso(
            int classroomId,
            int lapsoId,
            [FromQuery] int? schoolId = null)
        {
            try
            {
                var (from, to) = await GetLapsoRangeAsync(lapsoId);
                return await GetClassroomStats(classroomId, schoolId, from, to);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // GET: api/attendance/stats/school/{schoolId}/lapso/{lapsoId}
        [HttpGet("stats/school/{schoolId}/lapso/{lapsoId}")]
        public async Task<IActionResult> GetSchoolStatsByLapso(
            int schoolId,
            int lapsoId)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para ver estadísticas de la escuela.");

            var effectiveSchoolId = schoolId;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
            }

            try
            {
                var (from, to) = await GetLapsoRangeAsync(lapsoId);

                var q = _context.Attendance.AsNoTracking()
                    .Where(a => a.SchoolID == effectiveSchoolId && a.Date >= from && a.Date < to);

                var overall = await q.GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Total = g.Count(),
                        Present = g.Count(x => x.Status == "Presente"),
                        Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                        Late = g.Count(x => x.Status == "Retardo"),
                        JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                        Observation = g.Count(x => x.Status == "Observación")
                    })
                    .FirstOrDefaultAsync() ?? new { Total = 0, Present = 0, Absent = 0, Late = 0, JustifiedAbsent = 0, Observation = 0 };

                var porCurso = await q
                    .Include(a => a.Course)
                    .GroupBy(a => new { a.CourseID, a.Course.Name })
                    .Select(g => new
                    {
                        g.Key.CourseID,
                        CourseName = g.Key.Name,
                        Total = g.Count(),
                        Presentes = g.Count(x => x.Status == "Presente"),
                        AusentesNoJustificadas = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                        Retardos = g.Count(x => x.Status == "Retardo"),
                        AusenciasJustificadas = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                        Observaciones = g.Count(x => x.Status == "Observación")
                    })
                    .OrderBy(x => x.CourseID)
                    .ToListAsync();

                return Ok(new
                {
                    From = from,
                    To = to.AddDays(-1),
                    SchoolID = effectiveSchoolId,
                    Overall = new AttendanceSummaryDto
                    {
                        Total = overall.Total,
                        Present = overall.Present,
                        Absent = overall.Absent,
                        Late = overall.Late,
                        JustifiedAbsent = overall.JustifiedAbsent,
                        Observation = overall.Observation
                    },
                    PorCurso = porCurso
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // GET: api/attendance/stats/school/{schoolId}/by-lapsos[?year=2025]
        [HttpGet("stats/school/{schoolId}/by-lapsos")]
        public async Task<IActionResult> GetSchoolStatsByLapsos(int schoolId, [FromQuery] int? year = null)
        {
            if (!TryGetTokenSchoolId(out var tokenSchoolId) || !TryGetTokenRoleId(out var tokenRoleId))
                return Forbid();

            if (!EsRolDocenteOVista(tokenRoleId))
                return Forbid("No tiene permisos para ver estadísticas de la escuela.");

            var effectiveSchoolId = schoolId;
            if (tokenRoleId != ROLE_SUPERADMIN)
            {
                effectiveSchoolId = tokenSchoolId;
            }

            var lapsosQ = _context.Lapsos
                .AsNoTracking()
                .Where(l => l.SchoolID == effectiveSchoolId);

            if (year.HasValue && year.Value > 0)
            {
                var from = new DateTime(year.Value, 1, 1);
                var to = from.AddYears(1);
                lapsosQ = lapsosQ.Where(l => l.FechaFin >= from && l.FechaInicio < to);
            }

            var lapsos = await lapsosQ.OrderBy(l => l.FechaInicio).ToListAsync();
            if (!lapsos.Any())
                return Ok(new { SchoolID = effectiveSchoolId, Lapsos = new List<object>() });

            var resultados = new List<object>();

            foreach (var lapso in lapsos)
            {
                var ini = lapso.FechaInicio.Date;
                var fin = lapso.FechaFin.Date.AddDays(1);

                var q = _context.Attendance.AsNoTracking()
                    .Where(a => a.SchoolID == effectiveSchoolId && a.Date >= ini && a.Date < fin);

                var overall = await q.GroupBy(_ => 1)
                    .Select(g => new
                    {
                        Total = g.Count(),
                        Present = g.Count(x => x.Status == "Presente"),
                        Absent = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                        Late = g.Count(x => x.Status == "Retardo"),
                        JustifiedAbsent = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                        Observation = g.Count(x => x.Status == "Observación")
                    })
                    .FirstOrDefaultAsync() ?? new { Total = 0, Present = 0, Absent = 0, Late = 0, JustifiedAbsent = 0, Observation = 0 };

                var porCurso = await q
                    .Include(a => a.Course)
                    .GroupBy(a => new { a.CourseID, a.Course.Name })
                    .Select(g => new
                    {
                        CourseID = g.Key.CourseID,
                        CourseName = g.Key.Name,
                        Total = g.Count(),
                        Presentes = g.Count(x => x.Status == "Presente"),
                        AusentesNoJustificadas = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                        Retardos = g.Count(x => x.Status == "Retardo"),
                        AusenciasJustificadas = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                        Observaciones = g.Count(x => x.Status == "Observación")
                    })
                    .OrderBy(x => x.CourseID)
                    .ToListAsync();

                var porSalon = await q
                    .Include(a => a.Course)
                    .Where(a => a.Course.ClassroomID != null)
                    .GroupBy(a => new { a.Course.ClassroomID, a.Course.Classroom.Name })
                    .Select(g => new
                    {
                        ClassroomID = g.Key.ClassroomID,
                        ClassroomName = g.Key.Name,
                        Total = g.Count(),
                        Presentes = g.Count(x => x.Status == "Presente"),
                        AusentesNoJustificadas = g.Count(x => x.Status == "Ausente" && (x.IsJustified == null || x.IsJustified == false)),
                        Retardos = g.Count(x => x.Status == "Retardo"),
                        AusenciasJustificadas = g.Count(x => x.Status == "Ausente" && x.IsJustified == true),
                        Observaciones = g.Count(x => x.Status == "Observación")
                    })
                    .OrderBy(x => x.ClassroomID)
                    .ToListAsync();

                resultados.Add(new
                {
                    LapsoID = lapso.LapsoID,
                    Nombre = (lapso.Nombre ?? $"Lapso {lapso.LapsoID}"),
                    FechaInicio = lapso.FechaInicio,
                    FechaFin = lapso.FechaFin,
                    Overall = new AttendanceSummaryDto
                    {
                        Total = overall.Total,
                        Present = overall.Present,
                        Absent = overall.Absent,
                        Late = overall.Late,
                        JustifiedAbsent = overall.JustifiedAbsent,
                        Observation = overall.Observation
                    },
                    PorCurso = porCurso,
                    PorSalon = porSalon
                });
            }

            return Ok(new
            {
                SchoolID = effectiveSchoolId,
                YearFilter = year,
                Lapsos = resultados
            });
        }

        // DTOs

        public class AttendanceSummaryDto
        {
            public int Total { get; set; }
            public int Present { get; set; }
            public int Absent { get; set; }
            public int Late { get; set; }
            public int JustifiedAbsent { get; set; }
            public int Observation { get; set; }

            public double AttendanceRate => Total == 0 ? 0 : Math.Round((double)(Present + JustifiedAbsent) * 100.0 / Total, 2);
            public double AbsenceRate => Total == 0 ? 0 : Math.Round((double)Absent * 100.0 / Total, 2);
        }

        public class StudentCourseStatDto
        {
            public int CourseID { get; set; }
            public string CourseName { get; set; } = "";
            public AttendanceSummaryDto Summary { get; set; } = new();
        }

        public class StudentStatsResponse
        {
            public int StudentID { get; set; }
            public string StudentName { get; set; } = "";
            public AttendanceSummaryDto Overall { get; set; } = new();
            public List<StudentCourseStatDto> ByCourse { get; set; } = new();
        }

        public class StudentCourseSingleResponse
        {
            public int StudentID { get; set; }
            public string StudentName { get; set; } = "";
            public int CourseID { get; set; }
            public string CourseName { get; set; } = "";
            public AttendanceSummaryDto Summary { get; set; } = new();
        }

        public class CourseSummaryDto
        {
            public int CourseID { get; set; }
            public string CourseName { get; set; } = "";
            public AttendanceSummaryDto Summary { get; set; } = new();
        }

        public class ClassroomStudentStatDto
        {
            public int StudentID { get; set; }
            public string StudentName { get; set; } = "";
            public AttendanceSummaryDto Summary { get; set; } = new();
        }

        public class ClassroomStatsResponse
        {
            public int ClassroomID { get; set; }
            public string ClassroomName { get; set; } = "";
            public AttendanceSummaryDto Overall { get; set; } = new();
            public List<CourseSummaryDto> ByCourse { get; set; } = new();
            public List<ClassroomStudentStatDto> ByStudent { get; set; } = new();
        }
    }
}
