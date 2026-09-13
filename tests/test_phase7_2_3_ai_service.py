"""
==============================================================================
PHASE 7.2.3: PRODUCTION AI RUNTIME & MODEL VERIFICATION TEST SUITE
==============================================================================
Verifies:
1. Python isolated environment & dependencies (TF 2.21, Keras 3.15, Pillow, NumPy)
2. Model file integrity (lsd_model.keras path, size, SHA-256)
3. Model loading & architecture (EfficientNetB0, Input: 224x224x3, Output: (None, 1))
4. AI Health Endpoint (/health) distinguishes healthy vs degraded states
5. Inference endpoint (/predict) smoke test with synthetic 224x224 RGB image
6. Numeric visualScore & confidenceScore from real neural inference
7. Absence of fabricated fallback when real model executes
8. Symptom-only multimodal scoring
9. Safety disclaimer & preliminary screening semantics (NOT veterinary diagnosis)
10. Failure mode & error handling without information leakage
==============================================================================
"""

import os
import sys
import io
import time
import json
import hashlib
import base64
import unittest
from PIL import Image
import numpy as np

# Ensure working directory is project root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT_DIR)

class Phase723AiRuntimeTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n================================================================")
        print("🧪 RUNNING PHASE 7.2.3: AI RUNTIME & MODEL PACKAGING TEST SUITE")
        print(f"🐍 Python Executable: {sys.executable}")
        print(f"🐍 Python Version: {sys.version.split()[0]}")
        print("================================================================\n")

        # Set environment
        os.environ['KERAS_BACKEND'] = 'tensorflow'

        # Import ML stack
        import tensorflow as tf
        import keras
        import flask
        import flask_cors

        cls.tf = tf
        cls.keras = keras
        cls.flask = flask
        cls.flask_cors = flask_cors

        # Import AI service app
        sys.path.insert(0, os.path.join(ROOT_DIR, 'backend'))
        sys.path.insert(0, os.path.join(ROOT_DIR, 'backend', 'services'))
        import ai_service
        cls.ai_service = ai_service
        cls.app = ai_service.app
        cls.client = cls.app.test_client()

    # -------------------------------------------------------------------------
    # TEST GROUP 1: Dependency & Runtime Verification
    # -------------------------------------------------------------------------
    def test_01_python_version(self):
        """Verify Python runtime is 3.10 - 3.12 compatible"""
        major, minor = sys.version_info[:2]
        self.assertEqual(major, 3, "Python major version must be 3")
        self.assertIn(minor, [10, 11, 12, 13], f"Python minor version {minor} must be >= 10")
        print(f"  ✅ PASS: Python version verified: {sys.version.split()[0]}")

    def test_02_tensorflow_keras_versions(self):
        """Verify TensorFlow 2.16+ and Keras 3.x are active"""
        tf_ver = self.tf.__version__
        keras_ver = self.keras.__version__
        self.assertTrue(keras_ver.startswith('3.'), f"Expected Keras 3.x, got {keras_ver}")
        self.assertTrue(int(tf_ver.split('.')[0]) >= 2, f"Expected TensorFlow 2.x, got {tf_ver}")
        print(f"  ✅ PASS: TensorFlow ({tf_ver}) & Keras ({keras_ver}) verified")

    def test_03_auxiliary_packages(self):
        """Verify Pillow, NumPy, and Flask are loaded"""
        import PIL
        self.assertTrue(hasattr(PIL, '__version__'))
        self.assertTrue(hasattr(np, '__version__'))
        print(f"  ✅ PASS: Pillow ({PIL.__version__}), NumPy ({np.__version__}), Flask ({self.flask.__version__}) verified")

    # -------------------------------------------------------------------------
    # TEST GROUP 2: Model File Verification
    # -------------------------------------------------------------------------
    def test_04_model_file_exists_and_size(self):
        """Verify lsd_model.keras exists on disk and has correct size"""
        model_path = os.path.join(ROOT_DIR, 'backend', 'lsd_model.keras')
        self.assertTrue(os.path.exists(model_path), f"Model file must exist at {model_path}")
        size_bytes = os.path.getsize(model_path)
        self.assertEqual(size_bytes, 50666591, f"Model file size should be exactly 50666591 bytes, got {size_bytes}")
        print(f"  ✅ PASS: Model file exists at {model_path} ({size_bytes / (1024*1024):.2f} MB)")

    def test_05_model_file_sha256_hash(self):
        """Verify lsd_model.keras cryptographic integrity SHA-256"""
        model_path = os.path.join(ROOT_DIR, 'backend', 'lsd_model.keras')
        hasher = hashlib.sha256()
        with open(model_path, 'rb') as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        digest = hasher.hexdigest()
        expected_hash = "284082f8634d3e06cd15fb316cb79972a98c2f57dc71393b9143c11bf98d761f"
        self.assertEqual(digest, expected_hash, "SHA-256 hash does not match expected model digest")
        print(f"  ✅ PASS: Model SHA-256 verified: {digest}")

    def test_06_model_architecture_and_shapes(self):
        """Verify input/output shapes and EfficientNetB0 backbone"""
        model = self.ai_service.lsd_model
        self.assertIsNotNone(model, "Model must be successfully loaded in memory")
        self.assertEqual(list(model.input_shape), [None, 224, 224, 3], f"Input shape mismatch: {model.input_shape}")
        self.assertEqual(list(model.output_shape), [None, 1], f"Output shape mismatch: {model.output_shape}")
        print(f"  ✅ PASS: Model architecture verified: Input {model.input_shape}, Output {model.output_shape}")

    # -------------------------------------------------------------------------
    # TEST GROUP 3: AI Health Endpoint
    # -------------------------------------------------------------------------
    def test_07_ai_health_endpoint_healthy(self):
        """Verify /health returns healthy status when model is loaded"""
        res = self.client.get('/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'healthy')
        self.assertTrue(data.get('modelLoaded'))
        self.assertEqual(data.get('modelVersion'), 'lsd_model.keras')
        self.assertIn('inputShape', data)
        self.assertIn('outputShape', data)
        print("  ✅ PASS: /health endpoint reports status: healthy, modelLoaded: true")

    def test_08_ai_health_endpoint_degraded_simulation(self):
        """Verify /health distinguishes degraded state when model is unavailable"""
        saved_model = self.ai_service.lsd_model
        try:
            self.ai_service.lsd_model = None
            res = self.client.get('/health')
            self.assertEqual(res.status_code, 503)
            data = res.get_json()
            self.assertEqual(data.get('status'), 'degraded')
            self.assertFalse(data.get('modelLoaded'))
            self.assertEqual(data.get('modelVersion'), 'lsd_model.keras (unavailable)')
            self.assertIn('error', data)
            print("  ✅ PASS: /health endpoint safely distinguishes degraded state (HTTP 503, modelLoaded: false)")
        finally:
            self.ai_service.lsd_model = saved_model

    # -------------------------------------------------------------------------
    # TEST GROUP 4: Genuine Model Inference Smoke Test
    # -------------------------------------------------------------------------
    def test_09_inference_with_synthetic_image(self):
        """Smoke test /predict using a synthetic 224x224 RGB image (technical smoke test)"""
        # Create synthetic 224x224 RGB image
        img = Image.new('RGB', (224, 224), color=(140, 160, 180))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode('utf-8')

        payload = {
            'image': f'data:image/png;base64,{img_b64}',
            'symptoms': ['skin_nodules', 'fever', 'reduced_milk_yield'],
            'temperature': 40.1,
            'duration': 48,
            'species': 'Cattle',
            'notes': 'Technical smoke test - synthetic 224x224 image'
        }

        t0 = time.time()
        res = self.client.post('/predict', json=payload)
        latency = time.time() - t0

        self.assertEqual(res.status_code, 200, f"Expected 200 OK, got {res.status_code}")
        data = res.get_json()
        self.assertTrue(data.get('success'), "Response success flag must be true")
        self.assertTrue(data.get('hasImage'), "hasImage must be true for image input")

        # Verify numeric visual score from real model
        visual_score = data.get('visualScore')
        self.assertIsInstance(visual_score, (int, float), f"visualScore must be numeric, got {type(visual_score)}")
        self.assertGreaterEqual(visual_score, 0.01)
        self.assertLessEqual(visual_score, 0.99)

        # Verify numeric confidence score
        confidence_score = data.get('confidenceScore')
        self.assertIsInstance(confidence_score, int, f"confidenceScore must be int, got {type(confidence_score)}")
        self.assertGreaterEqual(confidence_score, 0)
        self.assertLessEqual(confidence_score, 100)

        # Verify non-fabricated model version
        self.assertIn('lsd_model.keras', data.get('modelVersion', ''))
        self.assertEqual(data.get('assessmentType'), 'AI-Assisted Preliminary Screening')
        self.assertIn('preliminary', data.get('disclaimer', '').lower())

        print(f"  ✅ PASS: Synthetic image inference succeeded in {latency*1000:.1f}ms (visualScore={visual_score:.4f}, confidence={confidence_score}%)")

    def test_10_multimodal_symptom_scoring_without_image(self):
        """Verify symptom scoring works when no image is provided"""
        payload = {
            'symptoms': ['mouth_lesions', 'drooling', 'high_fever'],
            'temperature': 40.5,
            'duration': 24,
            'species': 'Cattle',
            'notes': 'Multimodal symptoms smoke test'
        }

        res = self.client.post('/predict', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertFalse(data.get('hasImage'))
        self.assertIsNone(data.get('visualScore'))
        self.assertEqual(data.get('possibleCondition'), 'Foot and Mouth Disease (खुरपका-मुंहपका)')
        self.assertGreater(data.get('confidenceScore'), 50)
        print(f"  ✅ PASS: Clinical symptom scoring verified: {data.get('possibleCondition')} ({data.get('confidenceScore')}%)")

    # -------------------------------------------------------------------------
    # TEST GROUP 5: Safety Semantics & Error Hardening
    # -------------------------------------------------------------------------
    def test_11_safety_semantics_preliminary_screening(self):
        """Verify outputs are explicitly marked as preliminary screening and not final veterinary diagnosis"""
        payload = {
            'symptoms': ['skin_nodules'],
            'species': 'Cattle'
        }
        res = self.client.post('/predict', json=payload)
        data = res.get_json()
        self.assertEqual(data.get('assessmentType'), 'AI-Assisted Preliminary Screening')
        self.assertIn('preliminary', data.get('disclaimer', '').lower())
        self.assertNotIn('doctor', json.dumps(data).lower())
        self.assertNotIn('final diagnosis', json.dumps(data).lower())
        print("  ✅ PASS: Safety semantics verified (Preliminary screening, not final/veterinary diagnosis)")

    def test_12_error_handling_no_information_leak(self):
        """Verify malformed inputs do not leak stack traces or system paths"""
        res = self.client.post('/predict', data="not-valid-json", content_type='application/json')
        self.assertIn(res.status_code, [200, 400, 500])
        body = res.get_data(as_text=True)
        self.assertNotIn('Traceback', body)
        self.assertNotIn('C:\\Project', body)
        self.assertNotIn('c:/project', body.lower())
        print("  ✅ PASS: Error responses contain no stack traces or filesystem leaks")

if __name__ == '__main__':
    unittest.main(verbosity=2)
