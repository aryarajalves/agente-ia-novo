import sys
import pytest

sys.stdout = open("scratch/all_tests_output.txt", "w", encoding="utf-8")
sys.stderr = sys.stdout

pytest.main(["tests/", "--tb=short"])
