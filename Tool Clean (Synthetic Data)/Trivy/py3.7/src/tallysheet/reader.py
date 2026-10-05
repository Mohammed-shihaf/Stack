"""CSV parsing with the standard-library reader."""


from typing import Dict, List
import csv
from io import StringIO


def parse_rows(text: str) -> List[Dict[str, str]]:
    """Parse CSV text with a header row into a list of dictionaries."""
    reader = csv.DictReader(StringIO(text))
    return [dict(row) for row in reader]
