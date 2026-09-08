import os
import sys
import io
import base64
import time
import logging

# Ensure PyTorch backend for Keras 3
os.environ['KERAS_BACKEND'] = 'torch'

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import keras

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('AIService')

app = Flask(__name__)
CORS(app)

# Resolve model path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'lsd_model.keras')

logger.info(f"Loading deep learning model from: {MODEL_PATH}")
if not os.path.exists(MODEL_PATH):
    logger.error(f"FATAL: Model file not found at {MODEL_PATH}")
    sys.exit(1)

try:
    lsd_model = keras.models.load_model(MODEL_PATH)
    logger.info(f"Model loaded successfully! Input: {lsd_model.input_shape}, Output: {lsd_model.output_shape}")
except Exception as e:
    logger.exception(f"Failed to load lsd_model.keras: {e}")
    sys.exit(1)

# Clinical symptom dictionary for multimodal veterinary diagnosis
# Correlating the 27 symptoms from the UI with major livestock diseases
DISEASE_PROFILES = [
    {
        "id": "lsd",
        "name": "Lumpy Skin Disease (लम्पी त्वचा रोग)",
        "species": ["Cattle", "Buffalo"],
        "primary_symptoms": ["skin_nodules", "skin_pustules"],
        "secondary_symptoms": [
            "high_fever", "fever", "reduced_milk_yield", "swelling_neck",
            "lethargy", "low_appetite", "eye_discharge", "nasal_discharge",
            "weight_loss", "lameness"
        ],
        "base_action": "Isolate infected animal immediately. Apply herbal fly repellents (neem oil) to prevent biting insect spread. Disinfect ruptured nodules with antiseptic. Request ring vaccination within 5km radius.",
        "first_aid": [
            "Strictly isolate the infected cattle in a separate, fly-proof and mosquito-netted shelter.",
            "Apply neem oil or eucalyptus-based fly repellents twice daily to protect against vectors.",
            "Clean burst skin lesions with mild potassium permanganate (1:1000) or povidone-iodine.",
            "Feed soft green fodder, gruel, and clean drinking water mixed with oral rehydration salts.",
            "Contact local government veterinary dispensary for supportive antipyretic & antibiotic therapy."
        ],
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
    },
    {
        "id": "hs",
        "name": "Haemorrhagic Septicaemia (गलघोंटू)",
        "species": ["Cattle", "Buffalo"],
        "primary_symptoms": ["swelling_neck", "difficulty_breathing"],
        "secondary_symptoms": ["high_fever", "fever", "drooling", "sudden_death", "lethargy", "low_appetite"],
        "base_action": "EMERGENCY: HS is acutely fatal within 12-24 hours. Immediate intravenous broad-spectrum antibiotic therapy (oxytetracycline/sulfas) by a veterinarian is critical.",
        "first_aid": [
            "EMERGENCY: Call the nearest veterinarian immediately for intravenous antibiotic treatment.",
            "Keep the animal standing in a quiet, shaded, open-air area to reduce respiratory distress.",
            "Do not force-feed feed or roughage to avoid choking and aspiration pneumonia.",
            "Isolate the herd and prepare for emergency ring vaccination of in-contact animals."
        ],
        "risk_level": "Critical"
    },
    {
        "id": "anthrax",
        "name": "Anthrax (एंथ्रेक्स / गिल्टी रोग)",
        "species": ["Cattle", "Buffalo", "Goat", "Sheep"],
        "primary_symptoms": ["sudden_death", "blood_in_urine", "bloody_diarrhea"],
        "secondary_symptoms": ["high_fever", "difficulty_breathing", "lethargy"],
        "base_action": "DANGER - ZOONOTIC: DO NOT OPEN OR CUT CARCASS. Cordon off area. Immediate deep burial (>2m) with quicklime. Alert District Animal Husbandry Officer.",
        "first_aid": [
            "WARNING: Severe zoonotic danger to humans. Do NOT touch unclotted blood or open carcass.",
            "Cover dead carcass immediately with thorny branches and tarpaulin to prevent birds/scavengers.",
            "Report immediately to District Veterinary Control Room for supervised deep burial with quicklime.",
            "Personnel in contact must wash thoroughly with soap and seek prophylactic medical checkup."
        ],
        "risk_level": "Critical"
    },
    {
        "id": "ppr",
        "name": "Peste des Petits Ruminants (बकरी प्लेग)",
        "species": ["Goat", "Sheep"],
        "primary_symptoms": ["diarrhea", "oral_ulcers", "eye_discharge", "nasal_discharge"],
        "secondary_symptoms": ["cough", "high_fever", "difficulty_breathing", "mouth_lesions", "low_appetite", "lethargy"],
        "base_action": "Isolate small ruminants. Administer oral rehydration fluids and supportive care. Request emergency PPR vaccination for village flock.",
        "first_aid": [
            "Isolate affected sheep and goats in a warm, dry, draft-free enclosure.",
            "Administer oral rehydration salts (ORS) with clean water to counteract rapid diarrhea dehydration.",
            "Gently clean crusty eyes and nostrils with warm saline or diluted boric water.",
            "Consult veterinarian for broad-spectrum antibiotics to control secondary bacterial pneumonia."
        ],
        "risk_level": "High"
    },
    {
        "id": "babesiosis",
        "name": "Babesiosis / Tick-Borne Disease (चिचड़ी बुखार / रक्ताल्पता)",
        "species": ["Cattle", "Buffalo", "Goat", "Sheep"],
        "primary_symptoms": ["blood_in_urine", "anemia", "tick_infestation"],
        "secondary_symptoms": ["high_fever", "fever", "pale_mucous_membranes", "jaundice", "weight_loss", "lethargy"],
        "base_action": "Administer antiprotozoal prescription (Diminazene / Imidocarb) under vet supervision. Apply acaricide dip or spray for tick eradication.",
        "first_aid": [
            "Apply approved acaricide tick spray (e.g., deltamethrin / amitraz) to livestock and shed walls.",
            "Keep animal sheltered from direct sun; offer plenty of fresh water and iron-rich green fodder.",
            "Urgent veterinary injection of antiprotozoal drug required before red blood cell destruction peaks."
        ],
        "risk_level": "High"
    },
    {
        "id": "blackleg",
        "name": "Blackleg (काला बावा / लंगड़ा बुखार)",
        "species": ["Cattle", "Buffalo", "Sheep"],
        "primary_symptoms": ["joint_swelling", "lameness"],
        "secondary_symptoms": ["high_fever", "sudden_death", "lethargy", "low_appetite"],
        "base_action": "Isolate herd. Administer high-dose penicillin immediately in early stage. Vaccinate healthy in-contact animals.",
        "first_aid": [
            "Isolate cattle exhibiting hot, crepitating muscle swelling in upper limbs or thigh.",
            "Seek emergency veterinary administration of high-dose crystalline penicillin.",
            "Move unaffected herd away from potentially spore-contaminated pastures."
        ],
        "risk_level": "Critical"
    },
    {
        "id": "mastitis",
        "name": "Bovine Mastitis (थनैला रोग)",
        "species": ["Cattle", "Buffalo"],
        "primary_symptoms": ["reduced_milk_yield"],
        "secondary_symptoms": ["fever", "swelling_neck", "low_appetite", "lethargy"],
        "base_action": "Perform California Mastitis Test (CMT). Strip infected quarters. Apply cold/warm compresses and consult vet for intramammary infusion.",
        "first_aid": [
            "Strip out the affected quarters completely into a disinfectant bucket (discard milk safely).",
            "Apply clean cold water compresses to reduce acute swelling and pain.",
            "Wash hands and milk healthy animals first; milk the affected animal last.",
            "Call a veterinarian for proper culture and intramammary antibiotic infusion."
        ],
        "risk_level": "Moderate"
    }
]

def preprocess_image(image_input):
    """
    Preprocess image to (1, 224, 224, 3) float32 numpy array.
    Accepts:
      - base64 data string (with or without data:image/...;base64, prefix)
      - raw bytes
    """
    try:
        if isinstance(image_input, str):
            if ',' in image_input:
                image_input = image_input.split(',', 1)[1]
            image_bytes = base64.b64decode(image_input)
        elif hasattr(image_input, 'read'):
            image_bytes = image_input.read()
        else:
            image_bytes = bytes(image_input)

        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB')
        img = img.resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        logger.error(f"Image preprocessing error: {e}")
        return None

def score_symptoms_for_disease(disease, symptoms_set, temperature, duration, species):
    """
    Scores how strongly clinical signs correlate with a disease profile.
    Returns float score between 0.0 and 1.0.
    """
    if disease["species"] and species and species not in disease["species"]:
        return 0.05, []

    score = 0.0
    matched_symptoms = []

    # Primary symptoms (heavy weight)
    for ps in disease["primary_symptoms"]:
        if ps in symptoms_set:
            score += 0.40
            matched_symptoms.append(ps)

    # Secondary symptoms
    for ss in disease["secondary_symptoms"]:
        if ss in symptoms_set:
            score += 0.15
            matched_symptoms.append(ss)

    # Temperature correlation
    temp = float(temperature or 0)
    if temp >= 40.5:
        if "high_fever" in disease["secondary_symptoms"] or "high_fever" in disease["primary_symptoms"]:
            score += 0.15
    elif temp >= 39.5:
        if "fever" in disease["secondary_symptoms"] or "high_fever" in disease["secondary_symptoms"]:
            score += 0.10

    # Duration correlation
    dur = float(duration or 0)
    if dur > 0:
        if dur <= 24 and disease["id"] in ["hs", "anthrax", "blackleg"]:
            score += 0.10
        elif dur >= 48 and disease["id"] in ["lsd", "fmd", "babesiosis"]:
            score += 0.08

    score = min(0.98, max(0.05, score))
    return score, matched_symptoms

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "service": "Livestock Saathi Deep Learning AI Service",
        "model": "lsd_model.keras",
        "architecture": "EfficientNetB0 (Keras 3 + PyTorch)",
        "input_shape": list(lsd_model.input_shape),
        "output_shape": list(lsd_model.output_shape),
        "timestamp": time.time()
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(silent=True) or {}

        if not data and request.form:
            data = request.form.to_dict()

        image_data = data.get('image')
        if 'image' in request.files:
            image_data = request.files['image']

        symptoms_raw = data.get('symptoms') or []
        if isinstance(symptoms_raw, str):
            symptoms_raw = [s.strip() for s in symptoms_raw.split(',') if s.strip()]

        symptoms_set = set(s.lower().strip() for s in symptoms_raw)
        temperature = float(data.get('temperature') or 0)
        duration = float(data.get('duration') or 0)
        species = data.get('species') or 'Cattle'
        notes = data.get('notes') or ''

        # 1. Computer Vision: Run lsd_model.keras if image is provided
        visual_score = None
        has_image = False
        img_array = None

        if image_data:
            img_array = preprocess_image(image_data)
            if img_array is not None:
                has_image = True
                # Forward pass through EfficientNetB0 lsd_model.keras
                res = lsd_model.predict(img_array, verbose=0)
                raw_visual = float(res[0][0])
                visual_score = float(np.clip(raw_visual, 0.01, 0.99))
                logger.info(f"Image evaluated by lsd_model.keras: visual_score={visual_score:.4f}")

        # 2. Evaluate candidate diseases across clinical symptoms + visual prediction
        candidates = []

        for disease in DISEASE_PROFILES:
            clinical_score, matched = score_symptoms_for_disease(
                disease, symptoms_set, temperature, duration, species
            )

            # Multimodal fusion for Lumpy Skin Disease
            if disease["id"] == "lsd":
                if has_image and visual_score is not None:
                    # 60% visual CNN weight + 40% clinical symptoms weight
                    combined_score = (0.60 * visual_score) + (0.40 * clinical_score)
                    if "skin_nodules" in symptoms_set or "skin_pustules" in symptoms_set:
                        combined_score = min(0.98, combined_score + 0.12)
                else:
                    combined_score = clinical_score
            else:
                combined_score = clinical_score
                if has_image and visual_score is not None and visual_score > 0.65:
                    combined_score = max(0.05, combined_score * 0.70)

            rationale = []
            if disease["id"] == "lsd" and has_image:
                rationale.append(f"Visual CNN model detected skin nodule pattern ({int(visual_score * 100)}% visual probability)")
            if matched:
                rationale.append(f"Matching symptoms: {', '.join(matched)}")
            if temperature >= 39.5:
                rationale.append(f"Fever recorded ({temperature}°C)")

            candidates.append({
                "id": disease["id"],
                "name": disease["name"],
                "confidenceScore": float(round(combined_score, 2)),
                "urgency": disease["risk_level"],
                "baseAction": disease["base_action"],
                "firstAid": disease["first_aid"],
                "rationale": "; ".join(rationale) if rationale else "General clinical evaluation"
            })

        # Sort candidate diseases descending by confidence score
        candidates.sort(key=lambda x: x["confidenceScore"], reverse=True)
        top_match = candidates[0]

        # Determine overall triage risk level
        risk_level = top_match["urgency"]
        if top_match["confidenceScore"] < 0.40 and not has_image:
            risk_level = "Low"
        elif top_match["confidenceScore"] >= 0.75 or top_match["urgency"] == "Critical":
            risk_level = "High" if top_match["urgency"] != "Critical" else "Critical"

        # Construct explanation
        explanation_parts = []
        if has_image and visual_score is not None:
            explanation_parts.append(
                f"lsd_model.keras (EfficientNetB0) visual analysis: {int(visual_score * 100)}% match for Lumpy Skin lesions."
            )
        explanation_parts.append(
            f"Primary clinical assessment indicates {top_match['name']} with {int(top_match['confidenceScore'] * 100)}% overall confidence."
        )
        if temperature > 0:
            explanation_parts.append(f"Recorded body temperature: {temperature}°C.")
        if duration > 0:
            explanation_parts.append(f"Symptom duration: {duration} hours.")

        explanation = " ".join(explanation_parts)

        # Observations summary
        clinical_observations = []
        for s in symptoms_set:
            clinical_observations.append(s.replace('_', ' ').capitalize())
        if temperature > 0:
            clinical_observations.append(f"Temperature: {temperature}°C")
        if duration > 0:
            clinical_observations.append(f"Duration: {duration} hours")
        if has_image:
            clinical_observations.append(f"Skin photo analyzed via lsd_model.keras CNN")

        result = {
            "success": True,
            "modelVersion": "lsd_model.keras (EfficientNetB0)",
            "modelName": "lsd_model.keras",
            "hasImage": has_image,
            "visualScore": visual_score,
            "possibleCondition": top_match["name"],
            "diseaseId": top_match["id"],
            "confidenceScore": int(top_match["confidenceScore"] * 100),
            "riskLevel": risk_level,
            "explanation": explanation,
            "recommendedAction": top_match["baseAction"],
            "immediateFirstAid": top_match["firstAid"],
            "clinicalObservations": clinical_observations,
            "suspectedDiseases": [
                {
                    "name": c["name"],
                    "confidenceScore": c["confidenceScore"],
                    "urgency": c["urgency"],
                    "rationale": c["rationale"]
                }
                for c in candidates[:4]
            ],
            "outbreakFlag": (risk_level == "Critical" or top_match["confidenceScore"] >= 0.85),
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }

        return jsonify(result)

    except Exception as e:
        logger.exception(f"Error handling /predict: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVICE_PORT', 5050))
    logger.info(f"Starting Livestock Saathi AI Microservice on port {port}...")
    app.run(host='127.0.0.1', port=port, debug=False)
