from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import fitz
import os
import re

from job_roles import JOB_ROLES


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="AI Resume Screening API",
    description="Machine Learning based Resume Screening System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# LOAD ML MODEL
# ============================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "resume_screening_model.joblib"
)

try:
    model = joblib.load(MODEL_PATH)
    print("ML model loaded successfully.")
except Exception as error:
    model = None
    print("Model loading failed:", error)


# ============================================================
# BASIC ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "status": "success",
        "message": "AI Resume Screening API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


# ============================================================
# JOB ROLE ENDPOINT
# ============================================================

@app.get("/job-roles")
def get_job_roles():
    """
    Returns all available job roles and their
    predefined screening requirements.
    """

    return {
        "success": True,
        "job_roles": JOB_ROLES
    }


# ============================================================
# PDF TEXT EXTRACTION
# ============================================================

def extract_pdf_text(file_bytes):
    try:
        document = fitz.open(
            stream=file_bytes,
            filetype="pdf"
        )

        text = ""

        for page in document:
            text += page.get_text() + "\n"

        document.close()

        return text.strip()

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {str(error)}"
        )


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text):
    """
    Converts text into a normalized format so that
    variations such as React.js / React JS / React
    can be compared more reliably.
    """

    text = text.lower()

    replacements = {
        "react.js": "react",
        "reactjs": "react",
        "react js": "react",

        "node.js": "node",
        "nodejs": "node",
        "node js": "node",

        "next.js": "next",
        "nextjs": "next",

        "vue.js": "vue",
        "vuejs": "vue",

        "express.js": "express",
        "expressjs": "express",

        "javascript": "javascript",
        "java script": "javascript",

        "typescript": "typescript",
        "type script": "typescript",

        "tailwindcss": "tailwind css",
        "tailwind": "tailwind css",

        "machine-learning": "machine learning",
        "machinelearning": "machine learning",

        "deep-learning": "deep learning",
        "deeplearning": "deep learning",

        "scikit-learn": "scikit learn",
        "sklearn": "scikit learn",

        "power-bi": "power bi",
        "powerbi": "power bi",

        "github": "git github"
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Normalize punctuation
    text = re.sub(r"[^a-zA-Z0-9+#.\s]", " ", text)

    # Remove excessive spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ============================================================
# SKILL MATCHING
# ============================================================

def calculate_skill_match(resume_text, required_skills):
    """
    Compares required job skills with skills found
    inside the extracted resume text.
    """

    resume_normalized = normalize_text(resume_text)

    skills = [
        skill.strip()
        for skill in required_skills.split(",")
        if skill.strip()
    ]

    if not skills:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "total_required": 0
        }

    matched_skills = []
    missing_skills = []

    for skill in skills:

        normalized_skill = normalize_text(skill)

        # Escape special regex characters
        escaped_skill = re.escape(normalized_skill)

        # Word-boundary search
        pattern = rf"(?<![a-zA-Z0-9]){escaped_skill}(?![a-zA-Z0-9])"

        if re.search(pattern, resume_normalized):
            matched_skills.append(skill.strip())
        else:
            missing_skills.append(skill.strip())

    score = (
        len(matched_skills) / len(skills)
    ) * 100

    return {
        "score": round(score, 2),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "total_required": len(skills)
    }


# ============================================================
# EXPERIENCE MATCHING
# ============================================================

def calculate_experience_match(
    candidate_experience,
    required_experience
):
    """
    Gives 100 when the candidate meets or exceeds
    the required experience.

    If experience is lower, the score is proportional.
    """

    if required_experience <= 0:
        return 100.0

    if candidate_experience >= required_experience:
        return 100.0

    score = (
        candidate_experience /
        required_experience
    ) * 100

    return round(max(0, score), 2)


# ============================================================
# ML SCORE
# ============================================================

def calculate_ml_score(input_data):
    """
    Converts the ML model probability into a percentage.
    """

    try:

        if hasattr(model, "predict_proba"):

            probability = model.predict_proba(
                input_data
            )[0][1]

            return round(
                float(probability) * 100,
                2
            )

        elif hasattr(model, "decision_function"):

            decision_score = model.decision_function(
                input_data
            )[0]

            score = 50 + (decision_score * 25)

            score = max(
                0,
                min(100, score)
            )

            return round(score, 2)

        return 50.0

    except Exception as error:

        print(
            "ML score calculation failed:",
            error
        )

        return 50.0


# ============================================================
# FINAL ATS SCORE
# ============================================================

def calculate_final_score(
    skill_score,
    experience_score,
    ml_score
):
    """
    Final score composition:

    Skill Match       = 60%
    Experience Match  = 20%
    ML Model Score    = 20%
    """

    final_score = (
        skill_score * 0.60
        + experience_score * 0.20
        + ml_score * 0.20
    )

    return round(
        min(100, max(0, final_score)),
        2
    )


# ============================================================
# RESUME PREDICTION
# ============================================================

@app.post("/predict")
async def predict_resume(
    resume: UploadFile = File(...),

    experience_years: int = Form(...),

    education_level: str = Form(...),

    job_role: str = Form(...)
):

    # --------------------------------------------------------
    # MODEL CHECK
    # --------------------------------------------------------

    if model is None:
        raise HTTPException(
            status_code=500,
            detail="ML model is not loaded."
        )

    # --------------------------------------------------------
    # JOB ROLE VALIDATION
    # --------------------------------------------------------

    if job_role not in JOB_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job role: {job_role}"
        )

    # --------------------------------------------------------
    # GET JOB REQUIREMENTS
    # --------------------------------------------------------

    selected_role = JOB_ROLES[job_role]

    required_skills_list = selected_role["required_skills"]

    required_skills = ", ".join(
        required_skills_list
    )

    job_experience_required = selected_role[
        "job_experience_required"
    ]

    job_description = selected_role[
        "job_description"
    ]

    # --------------------------------------------------------
    # FILE CHECK
    # --------------------------------------------------------

    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume."
        )

    # --------------------------------------------------------
    # READ PDF
    # --------------------------------------------------------

    file_bytes = await resume.read()

    resume_text = extract_pdf_text(
        file_bytes
    )

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No readable text was found in the resume."
        )

    # --------------------------------------------------------
    # CANDIDATE DATA
    # --------------------------------------------------------

    candidate_text = resume_text

    resume_skills = ""
    projects = ""
    certifications = ""

    candidate_text = (
        resume_text
        + " "
        + resume_skills
        + " "
        + projects
        + " "
        + certifications
    )

    # --------------------------------------------------------
    # JOB DATA
    # --------------------------------------------------------

    job_text = (
        job_role
        + " "
        + required_skills
        + " "
        + job_description
    )

    combined_text = (
        candidate_text
        + " [JOB] "
        + job_text
    )

    # --------------------------------------------------------
    # MODEL INPUT
    # --------------------------------------------------------

    input_data = pd.DataFrame([
        {
            "combined_text": combined_text,

            "experience_years":
                experience_years,

            "job_experience_required":
                job_experience_required,

            "education_level":
                education_level,

            "job_role":
                job_role
        }
    ])

    # --------------------------------------------------------
    # ML PREDICTION
    # --------------------------------------------------------

    prediction = int(
        model.predict(input_data)[0]
    )

    ml_score = calculate_ml_score(
        input_data
    )

    # --------------------------------------------------------
    # SKILL MATCH
    # --------------------------------------------------------

    skill_result = calculate_skill_match(
        resume_text,
        required_skills
    )

    skill_score = skill_result["score"]

    # --------------------------------------------------------
    # EXPERIENCE MATCH
    # --------------------------------------------------------

    experience_score = calculate_experience_match(
        experience_years,
        job_experience_required
    )

    # --------------------------------------------------------
    # FINAL ATS SCORE
    # --------------------------------------------------------

    final_score = calculate_final_score(
        skill_score,
        experience_score,
        ml_score
    )

    # --------------------------------------------------------
    # FINAL DECISION
    # --------------------------------------------------------

    if final_score >= 70:
        result = "Shortlisted"
    else:
        result = "Not Shortlisted"

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "success": True,

        "filename": resume.filename,

        "prediction": prediction,

        "result": result,

        "score": final_score,

        "final_score": final_score,

        "ml_score": ml_score,

        "skill_match_score": skill_score,

        "experience_match_score":
            experience_score,

        "matched_skills":
            skill_result["matched_skills"],

        "missing_skills":
            skill_result["missing_skills"],

        "total_required_skills":
            skill_result["total_required"],

        "resume_text_length":
            len(resume_text),

        "job_role":
            job_role,

        "job_description":
            job_description,

        "required_skills":
            required_skills_list,

        "education_level":
            education_level,

        "experience_years":
            experience_years,

        "job_experience_required":
            job_experience_required
    }