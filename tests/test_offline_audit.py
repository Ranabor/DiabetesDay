import json
import os
import re
import sys

# Ensure workspace root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.patient_catalog import patient_catalog
from backend.schemas import SimulateRequest
from backend.sim_service import sim_service

client = TestClient(app)

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(WORKSPACE_ROOT, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
FOODS_DIR = os.path.join(FRONTEND_DIR, "public", "foods")


class TestOfflineCompliance:
    """Verify 100% offline booth operation: no external CDNs, fonts, or scripts."""

    def test_dist_html_contains_no_external_urls(self):
        index_html_path = os.path.join(DIST_DIR, "index.html")
        assert os.path.exists(index_html_path), "frontend/dist/index.html must exist (run npm run build)"

        with open(index_html_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Check for external script / stylesheet links
        external_links = re.findall(r'href=[\'"]https?://[^\'"]+[\'"]', html)
        external_scripts = re.findall(r'src=[\'"]https?://[^\'"]+[\'"]', html)
        assert len(external_links) == 0, f"Found external links in index.html: {external_links}"
        assert len(external_scripts) == 0, f"Found external scripts in index.html: {external_scripts}"

    def test_dist_assets_contain_no_external_font_imports(self):
        assets_dir = os.path.join(DIST_DIR, "assets")
        assert os.path.exists(assets_dir)

        for filename in os.listdir(assets_dir):
            if filename.endswith(".css"):
                file_path = os.path.join(assets_dir, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                # Ensure no @import url(http...)
                assert "@import url(http" not in content.lower(), f"External @import found in {filename}"
                assert "fonts.googleapis.com" not in content, f"Google Fonts found in {filename}"


class TestConfigAndAssetIntegrity:
    """Verify that all JSON config files match physical local assets."""

    def test_all_foods_json_images_exist_locally(self):
        foods_json_path = os.path.join(FRONTEND_DIR, "src", "config", "foods.json")
        with open(foods_json_path, "r", encoding="utf-8") as f:
            foods = json.load(f)

        assert len(foods) >= 10, f"Expected at least 10 starter foods, found {len(foods)}"

        for food in foods:
            assert "name" in food and "carbs_g" in food and "image" in food
            img_rel = food["image"].lstrip("/")
            local_img_path = os.path.join(FRONTEND_DIR, "public", img_rel)
            assert os.path.exists(local_img_path), f"Food image missing: {local_img_path}"

            # Also check that it is served via FastAPI static server
            res = client.get(food["image"])
            assert res.status_code == 200, f"FastAPI failed to serve {food['image']}: {res.status_code}"

    def test_presets_reference_valid_patients_and_meals(self):
        presets_json_path = os.path.join(FRONTEND_DIR, "src", "config", "presets.json")
        with open(presets_json_path, "r", encoding="utf-8") as f:
            presets = json.load(f)

        all_patients = patient_catalog.get_all_patients()
        for preset in presets:
            assert "name" in preset and "cohort" in preset and "subject_index" in preset
            match = [p for p in all_patients if p["cohort"] == preset["cohort"] and p["subject_index"] == preset["subject_index"]]
            assert len(match) == 1, f"Preset {preset['name']} references non-existent patient"
            assert len(preset["meals"]) >= 1, f"Preset {preset['name']} has no meals"
            for m in preset["meals"]:
                assert 0 <= m["time_minutes"] <= 1440
                assert m["carbs_g"] >= 0

    def test_booth_copy_has_required_keys(self):
        copy_json_path = os.path.join(FRONTEND_DIR, "src", "config", "boothCopy.json")
        with open(copy_json_path, "r", encoding="utf-8") as f:
            copy = json.load(f)

        assert "header" in copy
        assert "views" in copy
        assert "metrics" in copy
        for m in ["tir", "tar", "tbr", "riskIndex", "lbgi", "hbgi"]:
            assert m in copy["metrics"]


class TestMultiCohortSimulations:
    """Verify that simulations execute cleanly across all 3 patient cohorts."""

    def test_adult_simulation(self):
        req = SimulateRequest(patient_name="adult#001", duration_hours=12)
        res = sim_service.run_simulation(req)
        assert len(res.bg) > 50
        assert res.metrics.mean_bg > 0

    def test_adolescent_simulation(self):
        req = SimulateRequest(patient_name="adolescent#001", duration_hours=12)
        res = sim_service.run_simulation(req)
        assert len(res.bg) > 50
        assert res.metrics.mean_bg > 0

    def test_child_simulation(self):
        req = SimulateRequest(patient_name="child#001", duration_hours=12)
        res = sim_service.run_simulation(req)
        assert len(res.bg) > 50
        assert res.metrics.mean_bg > 0


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main(["-v", __file__]))
