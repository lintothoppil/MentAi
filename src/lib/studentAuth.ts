/**
 * getStudentUser() — returns the student user from localStorage
 * and throws/redirects to login if the stored user is not a student
 * (e.g. a faculty/mentor account with no admission_number).
 */
export function getStudentUser() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const u = JSON.parse(raw);
        // Faculty users have no admission_number – only students do
        if (!u.admission_number) return null;
        return u;
    } catch {
        return null;
    }
}
