"""
==============================================================================
PHASE 1B: SYMPTOM MODEL STRUCTURAL & PIPELINE CONSISTENCY VALIDATION
==============================================================================
"""

import os
import json
import joblib
import numpy as np

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANDIDATE_BASE = os.path.join(ROOT_DIR, 'ml', 'models', 'candidate')

def test_symptom_models():
    print("=" * 70)
    print("🧪 VALIDATING CANDIDATE SYMPTOM MODELS & FEATURE MAPPINGS")
    print("=" * 70)

    species_configs = [
        {
            'species': 'cow',
            'model_file': 'cow_symptom_model.joblib',
            'list_file': 'cow_symptom_list.json',
            'expected_features': 19,
            'expected_classes': ['Lumpy_Skin_Disease', 'Normal_Healthy_Skin'],
            # Clinical core symptom vector: firm round skin nodules, enlarged lymph nodes, high fever
            'active_symptoms': ['firm round skin nodules (10-50mm)', 'enlarged lymph nodes', 'high fever']
        },
        {
            'species': 'goat',
            'model_file': 'goat_symptom_model.joblib',
            'list_file': 'goat_symptom_list.json',
            'expected_features': 45,
            'expected_classes': ['Caseous_Lymphadenitis', 'Contagious_Ecthyma_Orf', 'Lice_Infestation', 'Mange', 'Normal_Healthy_Skin', 'Ringworm'],
            # Clinical core symptom vector for Mange: intense itching / scratching, thick crusty scabs, skin thickening and wrinkling
            'active_symptoms': ['intense itching / scratching', 'thick crusty scabs', 'skin thickening and wrinkling']
        },
        {
            'species': 'sheep',
            'model_file': 'sheep_symptom_model.joblib',
            'list_file': 'sheep_symptom_list.json',
            'expected_features': 17,
            'expected_classes': ['Contagious_Ecthyma_Orf', 'Normal_Healthy_Skin'],
            # Clinical core symptom vector for Orf: lesions on lips can make eating painful, scabby pustular lesions around mouth and lips, thick crusty scabs
            'active_symptoms': ['lesions on lips can make eating painful', 'scabby pustular lesions around mouth and lips', 'thick crusty scabs']
        }
    ]

    for cfg in species_configs:
        sp = cfg['species']
        m_path = os.path.join(CANDIDATE_BASE, sp, cfg['model_file'])
        l_path = os.path.join(CANDIDATE_BASE, sp, cfg['list_file'])

        print(f"\n--- Testing [{sp.upper()}] Symptom Model ---")
        model = joblib.load(m_path)
        with open(l_path, 'r') as f:
            features = json.load(f)

        print(f"Model type: {type(model).__name__}")
        print(f"Features: expected={cfg['expected_features']}, model={model.n_features_in_}, list_len={len(features)}")
        assert model.n_features_in_ == cfg['expected_features'], f"Feature count mismatch for {sp}"
        assert len(features) == cfg['expected_features'], f"List length mismatch for {sp}"
        print(f"Classes: {model.classes_}")

        # Construct vector for active symptoms
        vec = np.zeros((1, len(features)), dtype=int)
        matched_symptoms = []
        for s in cfg['active_symptoms']:
            # find closest or exact match in features
            matched = [i for i, f in enumerate(features) if s.lower() in f.lower() or f.lower() in s.lower()]
            if matched:
                vec[0, matched[0]] = 1
                matched_symptoms.append(features[matched[0]])

        print(f"Constructed test vector with active symptoms: {matched_symptoms}")
        pred = model.predict(vec)[0]
        proba = model.predict_proba(vec)[0]
        print(f"Prediction: {pred}")
        print(f"Probabilities: {dict(zip(model.classes_, [round(float(p), 4) for p in proba]))}")

        # Construct healthy vector (all zeros except 'alert and active' if present)
        healthy_vec = np.zeros((1, len(features)), dtype=int)
        for i, f in enumerate(features):
            if 'alert and active' in f.lower():
                healthy_vec[0, i] = 1
        pred_h = model.predict(healthy_vec)[0]
        proba_h = model.predict_proba(healthy_vec)[0]
        print(f"Healthy/Asymptomatic vector prediction: {pred_h}")
        print(f"Healthy/Asymptomatic probabilities: {dict(zip(model.classes_, [round(float(p), 4) for p in proba_h]))}")

    print("\n" + "=" * 70)
    print("✅ ALL 3 SYMPTOM MODELS EXECUTED AND STRUCTURALLY VALIDATED")
    print("=" * 70)

if __name__ == '__main__':
    test_symptom_models()
