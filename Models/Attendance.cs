
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolProyectBackend.Models
{
    [Table("Attendance")]
    public class Attendance
    {
        [Key]
        public int AttendanceID { get; set; }

        [Required]
        public int UserID { get; set; } // Estudiante al que se le toma asistencia

        [Required]
        public int RelatedUserID { get; set; } // Profesor o tutor que marca la asistencia

        [Required]
        public int CourseID { get; set; } // Curso al que pertenece la asistencia
        public string? Notes { get; set; }
        public bool? IsJustified { get; set; }
        public int? MinutesLate { get; set; }

        public DateTime? ModifiedAt { get; set; }
        public int? ModifiedBy { get; set; }
        [Required]
        public DateTime Date { get; set; } = DateTime.UtcNow; // Fecha de la asistencia

        [Required]
        [StringLength(15)]
        public string Status { get; set; } // 'Presente' o 'Ausente'

        public Course? Course { get; set; }

        public int SchoolID { get; set; }
        public School? School { get; set; }

        [ForeignKey(nameof(UserID))]
        public User? User { get; set; } // Relación con el estudiante (UserID)

        [ForeignKey(nameof(RelatedUserID))]
        public User? RelatedUser { get; set; } // Relación con el profesor/tutor (RelatedUserID)
    }

    public class AttendanceUpsertDto
    {
        public int UserID { get; set; }
        public int RelatedUserID { get; set; } // profesor que marca
        public int CourseID { get; set; }
        public int SchoolID { get; set; }

        // "Presente" | "Ausente" | "Retardo" | "RetardoJustificado" | "AusenciaJustificada"
        public string Status { get; set; } = "Presente";

        public string? Notes { get; set; }
        public bool? IsJustified { get; set; }
        public int? MinutesLate { get; set; }
        
        // Nuevo campo para fecha manual
        public DateTime? Date { get; set; }
    }

    public class AttendanceEditDto
    {
        // Campos editables
        public string? Status { get; set; }
        public string? Notes { get; set; }
        public bool? IsJustified { get; set; }
        public int? MinutesLate { get; set; }
        public DateTime? Date { get; set; }
    }
    public class AttendanceNoteDto
    {
        public int UserID { get; set; }
        public int RelatedUserID { get; set; }   // quién escribe la nota (profesor)
        public int CourseID { get; set; }
        public int SchoolID { get; set; }
        public string Notes { get; set; } = "";
    }

}
