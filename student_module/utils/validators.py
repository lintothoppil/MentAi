import re


# Regex: A{YY}{DEPT_CODE}{001-200}  e.g. A24MCA001, A23CS015
ADMISSION_PATTERN = re.compile(r'^A(\d{2})([A-Z]+)(\d{3})$')


def validate_admission_format(adm_no: str) -> bool:
    if not adm_no:
        return False
    return bool(ADMISSION_PATTERN.match(adm_no.strip().upper()))


def parse_admission_number(adm_no: str) -> dict | None:
    """Returns { dept_code, batch_year, roll_number } or None."""
    if not adm_no:
        return None
    m = ADMISSION_PATTERN.match(adm_no.strip().upper())
    if not m:
        return None
    year_suffix = int(m.group(1))
    dept_code   = m.group(2)
    roll_number = m.group(3)
    batch_year  = 2000 + year_suffix
    return {
        'dept_code':   dept_code,
        'batch_year':  batch_year,
        'roll_number': roll_number,
    }
