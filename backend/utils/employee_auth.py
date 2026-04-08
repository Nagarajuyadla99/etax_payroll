from datetime import date

def generate_password(name: str, dob: date) -> str:
    if not name or not dob:
        raise ValueError("Name and DOB required")

    first_name = name.strip().split(" ")[0].lower()
    return f"{first_name}@{dob.year}"