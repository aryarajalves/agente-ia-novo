import sys
import pytest

# Redirect stdout to a file
sys.stdout = open("scratch/test_output.txt", "w", encoding="utf-8")
sys.stderr = sys.stdout

pytest.main(["tests/test_reset_labels.py", "--tb=long", "-vv"])
