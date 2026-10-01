"""
==============================================================================
PashuCare AI Microservice - Multi-Species Deep Learning Service
==============================================================================
Supports dual-mode operation:
- LEGACY: Single-species EfficientNetB0 lsd_model.keras (Cow LSD)
- CANDIDATE: Multi-species deep learning & symptom models:
    * Cow: cow_lumpy_binary_model.keras + cow_symptom_model.joblib
    * Goat: goat_skin_disease_model.keras + goat_symptom_model.joblib
    * Sheep: sheep_skin_disease_model.keras + sheep_symptom_model.joblib

Controlled by:
- Environment variable: AI_MODEL_VERSION ('candidate' | 'legacy')
- Per-request header: X-AI-Model-Version
- Request JSON field: model_version
==============================================================================
"""

import os
import sys
import io
import base64
import time
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# Ensure TensorFlow backend for Keras 3
os.environ['KERAS_BACKEND'] = 'tensorflow'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
import keras
import joblib

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('AIService')

app = Flask(__name__)
CORS(app)

# Resolve Base Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
ML_MODELS_DIR = os.path.join(PROJECT_ROOT, 'ml', 'models')
CANDIDATE_DIR = os.path.join(ML_MODELS_DIR, 'candidate')

# ==============================================================================
# MODEL CONFIGURATION & STATE
# ==============================================================================
DEFAULT_MODEL_VERSION = os.environ.get('AI_MODEL_VERSION', 'candidate').strip().lower()

# Legacy Model
LEGACY_MODEL_PATH = os.path.join(BASE_DIR, 'lsd_model.keras')
legacy_model = None
legacy_load_error = None

# Candidate Models Store
candidate_models = {
    'cow': {'image': None, 'symptom': None, 'symptoms_list': [], 'classes': {}, 'error': None},
    'goat': {'image': None, 'symptom': None, 'symptoms_list': [], 'classes': [], 'error': None},
    'sheep': {'image': None, 'symptom': None, 'symptoms_list': [], 'classes': {}, 'error': None}
}

# --- 1. Load Legacy Model ---
logger.info(f"Checking Legacy model at: {LEGACY_MODEL_PATH}")
if os.path.exists(LEGACY_MODEL_PATH):
    try:
        legacy_model = keras.models.load_model(LEGACY_MODEL_PATH)
        logger.info(f"✅ Legacy model loaded successfully: input={legacy_model.input_shape}, output={legacy_model.output_shape}")
    except Exception as e:
        legacy_load_error = f"Failed to load legacy model: {e}"
        logger.error(legacy_load_error)
else:
    legacy_load_error = f"Legacy model file not found at {LEGACY_MODEL_PATH}"
    logger.warning(legacy_load_error)

# --- 2. Load Candidate Models ---
def load_candidate_models():
    # Cow
    cow_dir = os.path.join(CANDIDATE_DIR, 'cow')
    try:
        img_p = os.path.join(cow_dir, 'cow_lumpy_binary_model.keras')
        sym_p = os.path.join(cow_dir, 'cow_symptom_model.joblib')
        list_p = os.path.join(cow_dir, 'cow_symptom_list.json')
        cls_p = os.path.join(cow_dir, 'cow_class_names.json')

        if os.path.exists(img_p) and os.path.exists(sym_p):
            candidate_models['cow']['image'] = keras.models.load_model(img_p)
            candidate_models['cow']['symptom'] = joblib.load(sym_p)
            with open(list_p, 'r', encoding='utf-8') as f:
                candidate_models['cow']['symptoms_list'] = json.load(f)
            with open(cls_p, 'r', encoding='utf-8') as f:
                candidate_models['cow']['classes'] = json.load(f)
            logger.info("✅ Candidate Cow models (image + symptoms) loaded successfully.")
    except Exception as e:
        candidate_models['cow']['error'] = str(e)
        logger.error(f"Failed to load Candidate Cow models: {e}")

    # Goat
    goat_dir = os.path.join(CANDIDATE_DIR, 'goat')
    try:
        img_p = os.path.join(goat_dir, 'goat_skin_disease_model.keras')
        sym_p = os.path.join(goat_dir, 'goat_symptom_model.joblib')
        list_p = os.path.join(goat_dir, 'goat_symptom_list.json')
        cls_p = os.path.join(goat_dir, 'goat_class_names.json')

        if os.path.exists(img_p) and os.path.exists(sym_p):
            candidate_models['goat']['image'] = keras.models.load_model(img_p)
            candidate_models['goat']['symptom'] = joblib.load(sym_p)
            with open(list_p, 'r', encoding='utf-8') as f:
                candidate_models['goat']['symptoms_list'] = json.load(f)
            with open(cls_p, 'r', encoding='utf-8') as f:
                candidate_models['goat']['classes'] = json.load(f)
            logger.info("✅ Candidate Goat models (image + symptoms) loaded successfully.")
    except Exception as e:
        candidate_models['goat']['error'] = str(e)
        logger.error(f"Failed to load Candidate Goat models: {e}")

    # Sheep
    sheep_dir = os.path.join(CANDIDATE_DIR, 'sheep')
    try:
        img_p = os.path.join(sheep_dir, 'sheep_skin_disease_model.keras')
        sym_p = os.path.join(sheep_dir, 'sheep_symptom_model.joblib')
        list_p = os.path.join(sheep_dir, 'sheep_symptom_list.json')
        cls_p = os.path.join(sheep_dir, 'sheep_class_names.json')

        if os.path.exists(img_p) and os.path.exists(sym_p):
            candidate_models['sheep']['image'] = keras.models.load_model(img_p)
            candidate_models['sheep']['symptom'] = joblib.load(sym_p)
            with open(list_p, 'r', encoding='utf-8') as f:
                candidate_models['sheep']['symptoms_list'] = json.load(f)
            with open(cls_p, 'r', encoding='utf-8') as f:
                candidate_models['sheep']['classes'] = json.load(f)
            logger.info("✅ Candidate Sheep models (image + symptoms) loaded successfully.")
    except Exception as e:
        candidate_models['sheep']['error'] = str(e)
        logger.error(f"Failed to load Candidate Sheep models: {e}")

load_candidate_models()

# ==============================================================================
# CLINICAL ADVICE & METADATA DICTIONARY
# ==============================================================================
CLINICAL_ACTIONS = {
    'Lumpy_Skin_Disease': {
        'name': 'Lumpy Skin Disease (लम्पी त्वचा रोग)',
        'urgency': 'High',
        'base_action': 'Isolate infected animal immediately. Apply neem oil or herbal fly repellents to prevent biting insect spread. Disinfect ruptured nodules with antiseptic. Request ring vaccination within 5km radius.',
        'first_aid': [
            'Strictly isolate the infected cattle in a separate, fly-proof shelter.',
            'Apply neem oil or eucalyptus-based fly repellents twice daily to protect against vectors.',
            'Clean burst skin lesions with mild potassium permanganate (1:1000) or povidone-iodine.',
            'Feed soft green fodder, gruel, and clean drinking water mixed with oral rehydration salts.',
            'Contact local government veterinary dispensary for supportive antipyretic & antibiotic therapy.'
        ]
    },
    'Caseous_Lymphadenitis': {
        'name': 'Caseous Lymphadenitis (Cheesy Gland / गिल्टी रोग)',
        'urgency': 'Moderate',
        'base_action': 'Isolate affected goat immediately. Do not puncture abscesses in herd pens to prevent contamination. Seek veterinary surgical drainage.',
        'first_aid': [
            'Quarantine affected goat in an easily sanitizable pen.',
            'Do not squeeze or cut open swollen lymph nodes manually.',
            'Have a veterinarian aspirate or surgically drain abscess away from pasture.',
            'Flush drained cavity with 7% tincture of iodine or chlorhexidine.',
            'Collect and burn all contaminated swabs and pus materials immediately.'
        ]
    },
    'Contagious_Ecthyma_Orf': {
        'name': 'Contagious Ecthyma / Orf (मुंहपका / संक्रामक एक्थीमा)',
        'urgency': 'Moderate',
        'base_action': 'ZOONOTIC WARNING: Wear protective gloves. Isolate affected animals. Apply soothing topical antiseptics to crusty scabs. Provide soft palatable feed.',
        'first_aid': [
            'Always wear rubber gloves when handling affected animals (can transmit painful sores to humans).',
            'Soften and treat mouth crusts with 1% potassium permanganate or boric acid in glycerin.',
            'Provide soft cooked mash or finely chopped green fodder as eating may be painful.',
            'Keep infected lambs/kids separated from uninfected nursing ewes/does.',
            'Spontaneous recovery typically occurs in 3 to 4 weeks with supportive care.'
        ]
    },
    'Lice_Infestation': {
        'name': 'Lice Infestation (जूँ का प्रकोप)',
        'urgency': 'Low',
        'base_action': 'Apply approved topical pour-on or dust insecticide (e.g. deltamethrin / permethrin). Repeat treatment in 14 days. Treat all in-contact animals.',
        'first_aid': [
            'Isolate heavily infested goats showing intense scratching or wool/hair loss.',
            'Apply topical ectoparasiticide powder or pour-on according to label directions.',
            'Repeat treatment after 10-14 days to kill newly emerged lice nymphs.',
            'Thoroughly clean and whitewash shed walls and sleeping areas with lime.',
            'Provide nutritional supplement and clean green fodder to counter mild anemia.'
        ]
    },
    'Mange': {
        'name': 'Mange / Sarcoptic Mange (खाज / खुजली रोग)',
        'urgency': 'Moderate',
        'base_action': 'Isolate affected goats immediately. Consult veterinarian for subcutaneous Ivermectin injection or acaricidal dips. Disinfect housing.',
        'first_aid': [
            'Isolate infested animals to prevent rapid physical contact transmission.',
            'Gently clip hair around crusted lesions and wash with warm antiseptic soap.',
            'Apply acaricide wash or consult veterinarian for injectable Ivermectin / Doramectin.',
            'Disinfect housing, fences, and rubbing posts with 2% chlorhexidine or lime spray.',
            'Avoid direct prolonged skin contact as some mange mites cause transient human lesions.'
        ]
    },
    'Ringworm': {
        'name': 'Ringworm (दाद / त्वचा फफूंद)',
        'urgency': 'Low',
        'base_action': 'ZOONOTIC: Wear gloves. Isolate animal. Remove crusts gently and apply topical antifungal ointment (clotrimazole / povidone-iodine). Expose to sunlight.',
        'first_aid': [
            'Wear gloves during handling to avoid contracting fungal ringworm.',
            'Carefully remove loose scales and crusts using warm soapy water and dispose safely.',
            'Apply 10% povidone-iodine or topical antifungal cream twice daily to circular patches.',
            'Allow plenty of direct sunlight exposure to animal pens (UV radiation kills spores).',
            'Clean brushes, halters, and stalls with 1:10 household bleach solution.'
        ]
    },
    'Normal_Healthy_Skin': {
        'name': 'Normal / Healthy Skin (सामान्य स्वस्थ त्वचा)',
        'urgency': 'Low',
        'base_action': 'No clinical skin disease detected. Animal exhibits healthy skin condition. Maintain routine preventive healthcare, biosecurity, and vaccination schedule.',
        'first_aid': [
            'Continue regular grooming, clean bedding, and balanced mineral nutrition.',
            'Maintain vector control (fly nets, neem spray) during humid vector seasons.',
            'Adhere to timely deworming and preventive vaccination schedules.'
        ]
    }
}

# Legacy disease profiles for fallback/legacy mode
LEGACY_DISEASE_PROFILES = [
    {
        "id": "lsd",
        "name": "Lumpy Skin Disease (लम्पी त्वचा रोग)",
        "species": ["Cattle", "Buffalo"],
        "primary_symptoms": ["skin_nodules", "skin_pustules"],
        "secondary_symptoms": ["high_fever", "fever", "reduced_milk_yield", "swelling_neck", "lethargy", "low_appetite", "eye_discharge", "nasal_discharge", "weight_loss", "lameness"],
        "base_action": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['base_action'],
        "first_aid": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['first_aid'],
        "risk_level": "High"
    },
    {
        "id": "fmd",
        "name": "Foot and Mouth Disease (खुरपका-मुंहपका)",
        "species": ["Cattle", "Buffalo", "Goat", "Sheep", "Pig"],
        "primary_symptoms": ["mouth_lesions", "oral_ulcers", "foot_lesions", "drooling"],
        "secondary_symptoms": ["high_fever", "fever", "lameness", "reduced_milk_yield", "low_appetite", "lethargy"],
        "base_action": "Quarantine animal immediately. Restrict all livestock movement. Wash mouth/foot ulcers with 1% potassium permanganate. Notify Block Veterinary Officer.",
        "first_aid": [
            "Quarantine animal immediately to stop rapid airborne and contact spread to other animals.",
            "Wash oral lesions with 1% potassium permanganate (KMnO4) or 2% sodium bicarbonate solution.",
            "Apply boric acid glycerin ointment to oral ulcers and fly-repellent antiseptic to foot lesions.",
            "Provide soft cooked mash or gruel as mouth pain prevents chewing coarse dry fodder."
        ],
        "risk_level": "Critical"
    }
]

# ==============================================================================
# IMAGE PREPROCESSING & TTA PIPELINES
# ==============================================================================
def load_pil_image(image_input):
    """Parses base64, bytes, or URL into a PIL Image."""
    try:
        if isinstance(image_input, str):
            if image_input.startswith(('http://', 'https://')):
                import urllib.request
                req = urllib.request.Request(image_input, headers={'User-Agent': 'PashuCare-AI/1.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    image_bytes = resp.read()
            else:
                if ',' in image_input:
                    image_input = image_input.split(',', 1)[1]
                image_bytes = base64.b64decode(image_input)
        elif hasattr(image_input, 'read'):
            image_bytes = image_input.read()
        else:
            image_bytes = bytes(image_input)
        return Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except Exception as e:
        logger.error(f"Error parsing image input: {e}")
        return None

# Canonical Cow TTA: 8 views
def get_cow_tta_batch(pil_img):
    img = pil_img.resize((300, 300))
    arr = tf.keras.utils.img_to_array(img)
    views = [arr, tf.image.flip_left_right(arr).numpy()]
    h, w = (300, 300)
    for zoom in (0.90, 0.95):
        ch, cw = int(h * zoom), int(w * zoom)
        top, left = (h - ch) // 2, (w - cw) // 2
        cropped = arr[top:top + ch, left:left + cw, :]
        resized = tf.image.resize(cropped, (300, 300)).numpy()
        views.append(resized)
        views.append(tf.image.flip_left_right(resized).numpy())
    for delta in (-0.15, 0.15):
        views.append(tf.image.adjust_brightness(arr, delta).numpy())
    return np.stack(views, axis=0)

# Canonical Goat TTA: 8 views
def get_goat_tta_batch(pil_img):
    img = pil_img.resize((260, 260))
    arr = tf.keras.utils.img_to_array(img)
    views = [arr, tf.image.flip_left_right(arr).numpy()]
    h, w = (260, 260)
    for zoom in (0.90, 0.95):
        ch, cw = int(h * zoom), int(w * zoom)
        top, left = (h - ch) // 2, (w - cw) // 2
        cropped = arr[top:top + ch, left:left + cw, :]
        resized = tf.image.resize(cropped, (260, 260)).numpy()
        views.append(resized)
        views.append(tf.image.flip_left_right(resized).numpy())
    for delta in (-0.15, 0.15):
        views.append(tf.image.adjust_brightness(arr, delta).numpy())
    return np.stack(views, axis=0)

# Canonical Sheep TTA: 10 views (Memory-safe sequential evaluation)
def predict_sheep_tta(model, pil_img):
    """
    Memory-safe sequential TTA inference for Sheep candidate vision model.
    Evaluates the exact same 10 canonical views sequentially (batch size = 1)
    to prevent memory spikes, accumulating predictions without holding
    large parallel tensor batches in memory.
    """
    img = pil_img.resize((300, 300))
    arr = tf.keras.utils.img_to_array(img)
    h, w = (300, 300)
    preds = []

    def eval_view(view_arr):
        inp = np.expand_dims(view_arr, axis=0)
        out = float(model(inp, training=False)[0, 0])
        preds.append(out)

    # 10 canonical views in exact order:
    # 1. Base
    eval_view(arr)
    # 2. Horizontal Flip
    eval_view(tf.image.flip_left_right(arr).numpy())
    # 3-8. Zoom crops (0.90, 0.75, 0.55) and their horizontal flips
    for zoom in (0.90, 0.75, 0.55):
        ch, cw = int(h * zoom), int(w * zoom)
        top, left = (h - ch) // 2, (w - cw) // 2
        cropped = arr[top:top + ch, left:left + cw, :]
        resized = tf.image.resize(cropped, (300, 300)).numpy()
        eval_view(resized)
        eval_view(tf.image.flip_left_right(resized).numpy())
    # 9-10. Brightness adjustments (-0.15, 0.15)
    for delta in (-0.15, 0.15):
        eval_view(tf.image.adjust_brightness(arr, delta).numpy())

    return float(np.mean(preds))

# ==============================================================================
# INFERENCE ROUTINES
# ==============================================================================
def normalize_species(raw_species):
    s = str(raw_species or 'Cattle').strip().lower()
    if s in ['cattle', 'cow', 'buffalo', 'bovine', 'calf']:
        return 'cow'
    elif s in ['goat', 'caprine']:
        return 'goat'
    elif s in ['sheep', 'ovine', 'lamb']:
        return 'sheep'
    return s

def build_symptom_vector(feature_list, input_symptoms):
    """Constructs a binary vector matching exact feature_list order."""
    vec = np.zeros((1, len(feature_list)), dtype=int)
    norm_inputs = [str(s).lower().strip() for s in input_symptoms if s]
    for idx, feat in enumerate(feature_list):
        feat_l = feat.lower()
        for inp in norm_inputs:
            if inp in feat_l or feat_l in inp:
                vec[0, idx] = 1
                break
    return vec

# ==============================================================================
# API ENDPOINTS
# ==============================================================================
@app.route('/health', methods=['GET'])
def health():
    active_version = request.headers.get('X-AI-Model-Version', DEFAULT_MODEL_VERSION).strip().lower()
    if active_version not in ['legacy', 'candidate']:
        return jsonify({
            "status": "error",
            "error": f"Invalid model_version '{active_version}'. Supported versions are 'candidate' and 'legacy'."
        }), 400

    if active_version == 'candidate':
        cow_ok = candidate_models['cow']['image'] is not None and candidate_models['cow']['symptom'] is not None
        goat_ok = candidate_models['goat']['image'] is not None and candidate_models['goat']['symptom'] is not None
        sheep_ok = candidate_models['sheep']['image'] is not None and candidate_models['sheep']['symptom'] is not None
        all_ok = cow_ok and goat_ok and sheep_ok
        
        status_code = 200 if all_ok else 503
        return jsonify({
            "status": "healthy" if all_ok else "degraded",
            "activeMode": "candidate",
            "modelLoaded": all_ok,
            "modelVersion": "candidate-v2.0 (Multi-Species Cow/Goat/Sheep)",
            "supportedSpecies": ["Cow", "Goat", "Sheep"],
            "speciesModels": {
                "cow": {"loaded": cow_ok, "error": candidate_models['cow']['error']},
                "goat": {"loaded": goat_ok, "error": candidate_models['goat']['error']},
                "sheep": {"loaded": sheep_ok, "error": candidate_models['sheep']['error']}
            },
            "service": "PashuCare Deep Learning AI Service",
            "timestamp": time.time()
        }), status_code

    else: # legacy
        legacy_ok = legacy_model is not None
        status_code = 200 if legacy_ok else 503
        return jsonify({
            "status": "healthy" if legacy_ok else "degraded",
            "activeMode": "legacy",
            "modelLoaded": legacy_ok,
            "modelVersion": "lsd_model.keras (EfficientNetB0 Legacy)",
            "service": "PashuCare Deep Learning AI Service",
            "error": legacy_load_error if not legacy_ok else None,
            "inputShape": list(legacy_model.input_shape) if legacy_ok else None,
            "outputShape": list(legacy_model.output_shape) if legacy_ok else None,
            "timestamp": time.time()
        }), status_code

@app.route('/predict', methods=['POST'])
def predict():
    try:
        t_start = time.perf_counter()
        data = request.get_json(silent=True) or {}
        if not data and request.form:
            data = request.form.to_dict()

        # Determine Model Version
        active_version = (
            request.headers.get('X-AI-Model-Version') or
            data.get('model_version') or
            DEFAULT_MODEL_VERSION
        ).strip().lower()

        if active_version not in ['legacy', 'candidate']:
            return jsonify({
                "success": False,
                "error": f"Invalid model_version '{active_version}'. Supported versions are 'candidate' and 'legacy'."
            }), 400

        # Extract standard input fields
        raw_species = data.get('species')
        if active_version == 'candidate' and not raw_species:
            return jsonify({
                "success": False,
                "error": "Missing required field 'species' for multi-species candidate inference."
            }), 400
        raw_species = raw_species or 'Cattle'
        species_key = normalize_species(raw_species)

        image_data = data.get('image')
        if 'image' in request.files:
            image_data = request.files['image']

        pil_img = load_pil_image(image_data) if image_data else None
        if image_data and pil_img is None:
            return jsonify({
                "success": False,
                "error": "Malformed or corrupted image. Unable to decode image data."
            }), 400
        has_image = pil_img is not None

        symptoms_raw = data.get('symptoms') or []
        if isinstance(symptoms_raw, str):
            try:
                parsed_sym = json.loads(symptoms_raw)
                if isinstance(parsed_sym, list):
                    symptoms_raw = parsed_sym
                else:
                    symptoms_raw = [s.strip() for s in symptoms_raw.split(',') if s.strip()]
            except Exception:
                symptoms_raw = [s.strip() for s in symptoms_raw.split(',') if s.strip()]

        symptom_vector = data.get('symptom_vector') or data.get('symptoms_vector')
        if isinstance(symptom_vector, str):
            try:
                symptom_vector = json.loads(symptom_vector)
            except Exception:
                pass

        if not has_image and not symptoms_raw and (symptom_vector is None):
            return jsonify({
                "success": False,
                "error": "Missing input: please provide an animal image or clinical symptoms for screening."
            }), 400

        temperature = float(data.get('temperature') or 0)
        duration = float(data.get('duration') or 0)

        # ----------------------------------------------------------------------
        # MODE 1: LEGACY INFERENCE (lsd_model.keras)
        # ----------------------------------------------------------------------
        if active_version == 'legacy':
            if legacy_model is None:
                return jsonify({
                    "success": False,
                    "error": f"Legacy model unavailable: {legacy_load_error}"
                }), 503

            visual_score = None
            if has_image:
                img_224 = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
                arr = np.expand_dims(np.array(img_224, dtype=np.float32), axis=0)
                raw_pred = float(legacy_model.predict(arr, verbose=0)[0][0])
                visual_score = float(np.clip(raw_pred, 0.01, 0.99))

            # Legacy multimodal evaluation
            symptoms_set = set(str(s).lower().strip() for s in symptoms_raw)
            clinical_score = 0.10
            if 'skin_nodules' in symptoms_set or 'skin_pustules' in symptoms_set:
                clinical_score += 0.50
            if 'high_fever' in symptoms_set or temperature >= 39.5:
                clinical_score += 0.20

            if has_image and visual_score is not None:
                combined_score = (0.60 * visual_score) + (0.40 * min(0.98, clinical_score))
            else:
                combined_score = clinical_score

            is_lsd = combined_score >= 0.50
            top_name = "Lumpy Skin Disease (लम्पी त्वचा रोग)" if is_lsd else "Normal / Non-LSD Condition"
            conf_pct = int(min(99, max(10, combined_score * 100)))

            return jsonify({
                "success": True,
                "assessmentType": "AI-Assisted Preliminary Screening",
                "disclaimer": "AI-assisted preliminary screening and risk assessment only. Not a veterinary diagnosis or medical certificate.",
                "modelVersion": "lsd_model.keras (EfficientNetB0 Legacy)",
                "modelName": "lsd_model.keras",
                "species": raw_species,
                "hasImage": has_image,
                "visualScore": visual_score,
                "possibleCondition": top_name,
                "diseaseId": "lsd" if is_lsd else "normal",
                "confidenceScore": conf_pct,
                "riskLevel": "High" if (is_lsd and conf_pct >= 70) else ("Moderate" if is_lsd else "Low"),
                "explanation": f"Legacy lsd_model.keras screening indicates {top_name} with {conf_pct}% confidence.",
                "recommendedAction": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['base_action'] if is_lsd else CLINICAL_ACTIONS['Normal_Healthy_Skin']['base_action'],
                "immediateFirstAid": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['first_aid'] if is_lsd else CLINICAL_ACTIONS['Normal_Healthy_Skin']['first_aid'],
                "clinicalObservations": [s.replace('_', ' ').capitalize() for s in symptoms_raw],
                "suspectedDiseases": [{
                    "name": top_name,
                    "confidenceScore": float(round(combined_score, 2)),
                    "urgency": "High" if is_lsd else "Low",
                    "rationale": "Legacy EfficientNetB0 evaluation"
                }],
                "outbreakFlag": (is_lsd and conf_pct >= 85),
                "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            })

        # ----------------------------------------------------------------------
        # MODE 2: CANDIDATE MULTI-SPECIES INFERENCE
        # ----------------------------------------------------------------------
        if species_key not in ['cow', 'goat', 'sheep']:
            return jsonify({
                "success": False,
                "error": f"Unsupported species '{raw_species}'. Candidate models support: Cow/Cattle/Buffalo, Goat, Sheep"
            }), 400

        sp_data = candidate_models[species_key]
        if sp_data['image'] is None and sp_data['symptom'] is None:
            return jsonify({
                "success": False,
                "error": f"Candidate models for {species_key} failed to load: {sp_data['error']}"
            }), 503

        if symptom_vector is not None:
            if not isinstance(symptom_vector, list):
                return jsonify({
                    "success": False,
                    "error": "Field 'symptom_vector' must be a list of numbers."
                }), 400
            expected_len = len(sp_data['symptoms_list'])
            if len(symptom_vector) != expected_len:
                return jsonify({
                    "success": False,
                    "error": f"Invalid symptom vector length {len(symptom_vector)}. Expected {expected_len} features for {species_key}."
                }), 400

        visual_score = None
        predicted_disease_key = None
        confidence = 0.50
        candidate_disease_list = []
        explanation_extra = []

        # === A. COW CANDIDATE PIPELINE ===
        if species_key == 'cow':
            p_lumpy = None
            if has_image and sp_data['image'] is not None:
                batch = get_cow_tta_batch(pil_img)
                raw_preds = sp_data['image'].predict(batch, verbose=0).flatten()
                mean_p_normal = float(np.mean(raw_preds))
                # Sigmoid output = P(Normal). P(Lumpy) = 1.0 - P(Normal)
                p_lumpy_vis = 1.0 - mean_p_normal
                visual_score = p_lumpy_vis
                explanation_extra.append(f"Visual TTA analysis (8 views): {int(p_lumpy_vis * 100)}% Lumpy Skin match.")
            else:
                p_lumpy_vis = None

            # Symptom Model
            p_lumpy_sym = None
            if (symptoms_raw or symptom_vector is not None) and sp_data['symptom'] is not None:
                vec = np.array(symptom_vector, dtype=float).reshape(1, -1) if symptom_vector is not None else build_symptom_vector(sp_data['symptoms_list'], symptoms_raw)
                sym_probs = sp_data['symptom'].predict_proba(vec)[0]
                # classes: ['Lumpy_Skin_Disease', 'Normal_Healthy_Skin']
                cls_list = list(sp_data['symptom'].classes_)
                lumpy_idx = cls_list.index('Lumpy_Skin_Disease') if 'Lumpy_Skin_Disease' in cls_list else 0
                p_lumpy_sym = float(sym_probs[lumpy_idx])
                explanation_extra.append(f"Symptom model analysis: {int(p_lumpy_sym * 100)}% symptom correlation.")

            # Fusion
            if p_lumpy_vis is not None and p_lumpy_sym is not None:
                p_lumpy = (0.60 * p_lumpy_vis) + (0.40 * p_lumpy_sym)
            elif p_lumpy_vis is not None:
                p_lumpy = p_lumpy_vis
            elif p_lumpy_sym is not None:
                p_lumpy = p_lumpy_sym
            else:
                p_lumpy = 0.50

            is_lumpy = p_lumpy >= 0.50
            predicted_disease_key = 'Lumpy_Skin_Disease' if is_lumpy else 'Normal_Healthy_Skin'
            confidence = p_lumpy if is_lumpy else (1.0 - p_lumpy)

            candidate_disease_list = [
                {
                    "name": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['name'],
                    "confidenceScore": float(round(p_lumpy, 3)),
                    "urgency": CLINICAL_ACTIONS['Lumpy_Skin_Disease']['urgency'],
                    "rationale": "Deep learning binary classifier (8-view TTA) + Random Forest symptom scoring"
                },
                {
                    "name": CLINICAL_ACTIONS['Normal_Healthy_Skin']['name'],
                    "confidenceScore": float(round(1.0 - p_lumpy, 3)),
                    "urgency": "Low",
                    "rationale": "Healthy skin evaluation"
                }
            ]

        # === B. GOAT CANDIDATE PIPELINE ===
        elif species_key == 'goat':
            goat_classes = sp_data['classes'] # exact 6-class list
            p_dist_vis = None
            if has_image and sp_data['image'] is not None:
                batch = get_goat_tta_batch(pil_img)
                raw_preds = sp_data['image'].predict(batch, verbose=0)
                p_dist_vis = raw_preds.mean(axis=0)
                explanation_extra.append("Goat visual 6-class classifier (8-view TTA).")

            p_dist_sym = None
            if (symptoms_raw or symptom_vector is not None) and sp_data['symptom'] is not None:
                vec = np.array(symptom_vector, dtype=float).reshape(1, -1) if symptom_vector is not None else build_symptom_vector(sp_data['symptoms_list'], symptoms_raw)
                sym_probs = sp_data['symptom'].predict_proba(vec)[0]
                cls_list = list(sp_data['symptom'].classes_)
                # map sym_probs to goat_classes order
                p_dist_sym = np.zeros(len(goat_classes))
                for i, c in enumerate(goat_classes):
                    if c in cls_list:
                        p_dist_sym[i] = sym_probs[cls_list.index(c)]
                explanation_extra.append("Goat 45-feature symptom random forest.")

            if p_dist_vis is not None and p_dist_sym is not None:
                p_combined = (0.60 * p_dist_vis) + (0.40 * p_dist_sym)
            elif p_dist_vis is not None:
                p_combined = p_dist_vis
            elif p_dist_sym is not None:
                p_combined = p_dist_sym
            else:
                p_combined = np.ones(len(goat_classes)) / len(goat_classes)

            top_idx = int(np.argmax(p_combined))
            predicted_disease_key = goat_classes[top_idx]
            confidence = float(p_combined[top_idx])
            visual_score = float(p_dist_vis[top_idx]) if p_dist_vis is not None else None

            # Sort candidate classes descending
            sorted_indices = np.argsort(p_combined)[::-1]
            for s_idx in sorted_indices:
                k = goat_classes[s_idx]
                info = CLINICAL_ACTIONS.get(k, {'name': k, 'urgency': 'Moderate'})
                candidate_disease_list.append({
                    "name": info['name'],
                    "confidenceScore": float(round(p_combined[s_idx], 3)),
                    "urgency": info['urgency'],
                    "rationale": f"Goat multi-class distribution ({int(p_combined[s_idx]*100)}%)"
                })

        # === C. SHEEP CANDIDATE PIPELINE ===
        elif species_key == 'sheep':
            SHEEP_THRESHOLD = 0.5814669728279114
            p_norm_vis = None
            if has_image and sp_data['image'] is not None:
                p_norm_vis = predict_sheep_tta(sp_data['image'], pil_img)
                explanation_extra.append(f"Sheep visual 10-view TTA: {int((1.0 - p_norm_vis)*100)}% Orf probability.")

            p_norm_sym = None
            if (symptoms_raw or symptom_vector is not None) and sp_data['symptom'] is not None:
                vec = np.array(symptom_vector, dtype=float).reshape(1, -1) if symptom_vector is not None else build_symptom_vector(sp_data['symptoms_list'], symptoms_raw)
                sym_probs = sp_data['symptom'].predict_proba(vec)[0]
                cls_list = list(sp_data['symptom'].classes_)
                norm_idx = cls_list.index('Normal_Healthy_Skin') if 'Normal_Healthy_Skin' in cls_list else 1
                p_norm_sym = float(sym_probs[norm_idx])
                explanation_extra.append("Sheep 17-feature symptom random forest.")

            if p_norm_vis is not None and p_norm_sym is not None:
                p_normal_final = (0.60 * p_norm_vis) + (0.40 * p_norm_sym)
            elif p_norm_vis is not None:
                p_normal_final = p_norm_vis
            elif p_norm_sym is not None:
                p_normal_final = p_norm_sym
            else:
                p_normal_final = 0.50

            # Calibrated Threshold: p_normal >= 0.5814669728279114 -> Normal
            is_normal = p_normal_final >= SHEEP_THRESHOLD
            predicted_disease_key = 'Normal_Healthy_Skin' if is_normal else 'Contagious_Ecthyma_Orf'
            p_orf = 1.0 - p_normal_final
            confidence = p_normal_final if is_normal else p_orf
            visual_score = float(round(1.0 - p_norm_vis, 3)) if p_norm_vis is not None else None

            candidate_disease_list = [
                {
                    "name": CLINICAL_ACTIONS['Contagious_Ecthyma_Orf']['name'],
                    "confidenceScore": float(round(p_orf, 3)),
                    "urgency": CLINICAL_ACTIONS['Contagious_Ecthyma_Orf']['urgency'],
                    "rationale": f"Calibrated threshold decision ({'Positive' if not is_normal else 'Below threshold'})"
                },
                {
                    "name": CLINICAL_ACTIONS['Normal_Healthy_Skin']['name'],
                    "confidenceScore": float(round(p_normal_final, 3)),
                    "urgency": "Low",
                    "rationale": f"Normal skin probability ({int(p_normal_final*100)}%)"
                }
            ]

        # Final Formatting
        disease_info = CLINICAL_ACTIONS.get(predicted_disease_key, {
            'name': predicted_disease_key.replace('_', ' '),
            'urgency': 'Moderate',
            'base_action': 'Veterinary clinical examination recommended.',
            'first_aid': ['Isolate animal and provide clean water.']
        })

        conf_pct = int(min(99, max(10, confidence * 100)))
        risk_level = disease_info['urgency']
        if predicted_disease_key == 'Normal_Healthy_Skin':
            risk_level = 'Low'

        dt_ms = (time.perf_counter() - t_start) * 1000.0

        explanation = (
            f"Candidate Multi-Species AI ({species_key.capitalize()}) identified {disease_info['name']} "
            f"with {conf_pct}% confidence. " + " ".join(explanation_extra)
        )

        return jsonify({
            "success": True,
            "assessmentType": "AI-Assisted Preliminary Screening",
            "disclaimer": "AI-assisted preliminary screening and risk assessment only. Not a veterinary diagnosis or medical certificate.",
            "modelVersion": f"candidate-v2.0 ({species_key.capitalize()} Classifier)",
            "modelName": f"{species_key}_skin_disease_model",
            "species": raw_species,
            "hasImage": has_image,
            "visualScore": visual_score,
            "possibleCondition": disease_info['name'],
            "diseaseId": predicted_disease_key.lower(),
            "confidenceScore": conf_pct,
            "riskLevel": risk_level,
            "explanation": explanation,
            "recommendedAction": disease_info['base_action'],
            "immediateFirstAid": disease_info['first_aid'],
            "clinicalObservations": [s.replace('_', ' ').capitalize() for s in symptoms_raw],
            "suspectedDiseases": candidate_disease_list[:4],
            "outbreakFlag": (risk_level == "Critical" or (risk_level == "High" and conf_pct >= 85)),
            "inferenceTimeMs": float(round(dt_ms, 1)),
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        })

    except Exception as e:
        logger.exception(f"Error handling /predict: {e}")
        return jsonify({
            "success": False,
            "error": "Internal AI inference error"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVICE_PORT', 5050))
    host = os.environ.get('AI_SERVICE_HOST', '0.0.0.0')
    logger.info(f"Starting PashuCare Multi-Species AI Microservice on {host}:{port} (Default Mode: {DEFAULT_MODEL_VERSION})...")
    app.run(host=host, port=port, debug=False)
