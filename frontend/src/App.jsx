import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [resume, setResume] = useState(null);

  const [jobRoles, setJobRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [formData, setFormData] = useState({
    experience_years: "2",
    education_level: "Bachelor's",
    job_role: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD AVAILABLE JOB ROLES
  // ============================================================

  useEffect(() => {
    const fetchJobRoles = async () => {
      try {
        setLoadingRoles(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/job-roles`
        );

        /*
          Backend returns:

          {
            success: true,
            job_roles: {
              "Frontend Developer": {
                required_skills: [...],
                job_experience_required: 2,
                job_description: "..."
              },
              ...
            }
          }

          Convert the object into an array so React
          can use .map() and .find().
        */

        const rolesObject = response.data.job_roles || {};

        const roles = Object.entries(rolesObject).map(
          ([jobRole, details]) => ({
            job_role: jobRole,
            required_skills: details.required_skills || [],
            job_experience_required:
              details.job_experience_required || 0,
            job_description:
              details.job_description || "",
          })
        );

        setJobRoles(roles);

        // Select first role automatically
        if (roles.length > 0) {
          setFormData((previous) => ({
            ...previous,
            job_role: roles[0].job_role,
          }));
        }
      } catch (err) {
        console.error(
          "Failed to load job roles:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Unable to load available job roles."
        );
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchJobRoles();
  }, []);

  // ============================================================
  // FORM INPUT CHANGE
  // ============================================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setResult(null);
    setError("");
  };

  // ============================================================
  // FILE CHANGE
  // ============================================================

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setError("Please select a PDF resume.");
      setResume(null);
      return;
    }

    setResume(selectedFile);
    setError("");
    setResult(null);
  };

  // ============================================================
  // SUBMIT RESUME
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!resume) {
      setError("Please upload a PDF resume.");
      return;
    }

    if (!formData.job_role) {
      setError("Please select a job role.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = new FormData();

      data.append("resume", resume);
      data.append(
        "experience_years",
        formData.experience_years
      );
      data.append(
        "education_level",
        formData.education_level
      );
      data.append(
        "job_role",
        formData.job_role
      );

      const response = await axios.post(
        `${API_URL}/predict`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(
        "Resume analysis failed:",
        err
      );

      const message =
        err.response?.data?.detail ||
        "Something went wrong while analyzing the resume.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SCORE CLASS
  // ============================================================

  const getScoreClass = (score) => {
    if (score >= 70) {
      return "good";
    }

    if (score >= 50) {
      return "average";
    }

    return "low";
  };

  // ============================================================
  // SELECTED JOB ROLE
  // ============================================================

  const selectedJobRole = jobRoles.find(
    (role) =>
      role.job_role === formData.job_role
  );

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-icon">
            R
          </div>

          <div>
            <h2>
              ResumeScreen AI
            </h2>

            <span>
              AI Resume Screening System
            </span>
          </div>

        </div>

        <div className="model-status">

          <span className="status-dot"></span>

          AI Model Online

        </div>

      </nav>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="main-container">

        {/* ====================================================
            LEFT PANEL
        ==================================================== */}

        <section className="card analysis-card">

          <div className="section-heading">

            <h1>
              Resume Analysis
            </h1>

            <p>
              Upload your resume and select the job role
            </p>

          </div>


          <form onSubmit={handleSubmit}>

            {/* =================================================
                FILE UPLOAD
            ================================================= */}

            <label className="upload-box">

              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />

              <div className="upload-icon">
                ↑
              </div>

              {resume ? (
                <>
                  <strong>
                    {resume.name}
                  </strong>

                  <span>
                    Resume selected
                  </span>
                </>
              ) : (
                <>
                  <strong>
                    Upload Resume
                  </strong>

                  <span>
                    PDF files only
                  </span>
                </>
              )}

            </label>


            {/* =================================================
                BASIC DETAILS
            ================================================= */}

            <div className="form-grid">

              {/* EXPERIENCE */}

              <div className="form-group">

                <label>
                  Experience (Years)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  name="experience_years"
                  value={
                    formData.experience_years
                  }
                  onChange={
                    handleInputChange
                  }
                />

              </div>


              {/* EDUCATION */}

              <div className="form-group">

                <label>
                  Education Level
                </label>

                <select
                  name="education_level"
                  value={
                    formData.education_level
                  }
                  onChange={
                    handleInputChange
                  }
                >

                  <option value="Bachelor's">
                    Bachelor's
                  </option>

                  <option value="Master's">
                    Master's
                  </option>

                  <option value="PhD">
                    PhD
                  </option>

                  <option value="Diploma">
                    Diploma
                  </option>

                  <option value="High School">
                    High School
                  </option>

                </select>

              </div>

            </div>


            {/* =================================================
                JOB ROLE
            ================================================= */}

            <div className="form-group full-width">

              <label>
                Select Job Role
              </label>

              <select
                name="job_role"
                value={formData.job_role}
                onChange={handleInputChange}
                disabled={loadingRoles}
              >

                {loadingRoles ? (
                  <option value="">
                    Loading job roles...
                  </option>
                ) : jobRoles.length > 0 ? (
                  jobRoles.map((role) => (
                    <option
                      key={role.job_role}
                      value={role.job_role}
                    >
                      {role.job_role}
                    </option>
                  ))
                ) : (
                  <option value="">
                    No job roles available
                  </option>
                )}

              </select>

            </div>


            {/* =================================================
                SELECTED ROLE INFORMATION
            ================================================= */}

            {selectedJobRole && (

              <div className="job-role-preview">

                <div className="role-preview-header">

                  <h3>
                    Selected Job Requirements
                  </h3>

                  <span>
                    Automatically loaded
                  </span>

                </div>


                {/* REQUIRED SKILLS */}

                <div className="role-detail">

                  <label>
                    Required Skills
                  </label>

                  <div className="role-skills">

                    {selectedJobRole.required_skills.map(
                      (skill, index) => (

                        <span
                          className="role-skill-tag"
                          key={`${skill}-${index}`}
                        >
                          {skill}
                        </span>

                      )
                    )}

                  </div>

                </div>


                {/* REQUIRED EXPERIENCE */}

                <div className="role-detail">

                  <label>
                    Required Experience
                  </label>

                  <p>
                    {
                      selectedJobRole.job_experience_required
                    }{" "}
                    years
                  </p>

                </div>


                {/* JOB DESCRIPTION */}

                <div className="role-detail">

                  <label>
                    Job Description
                  </label>

                  <p>
                    {
                      selectedJobRole.job_description
                    }
                  </p>

                </div>

              </div>

            )}


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

              <div className="error-message">
                {error}
              </div>

            )}


            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

            <button
              type="submit"
              className="analyze-button"
              disabled={
                loading ||
                loadingRoles ||
                !selectedJobRole
              }
            >

              {loading
                ? "Analyzing Resume..."
                : "Analyze Resume"}

            </button>

          </form>

        </section>


        {/* ====================================================
            RIGHT PANEL
        ==================================================== */}

        <section className="card results-card">

          {!result ? (

            <div className="empty-results">

              <div className="empty-icon">
                ✦
              </div>

              <h2>
                Analysis Results
              </h2>

              <p>
                Upload a resume and select a job role
                to see the AI screening results.
              </p>

            </div>

          ) : (

            <div className="results-content">

              <div className="section-heading">

                <h2>
                  Analysis Results
                </h2>

                <p>
                  {result.filename}
                </p>

              </div>


              {/* =================================================
                  FINAL ATS SCORE
              ================================================= */}

              <div className="final-score">

                <div
                  className={`score-value ${getScoreClass(
                    result.final_score
                  )}`}
                >
                  {result.final_score}%
                </div>

                <span className="score-label">
                  Final ATS Score
                </span>

              </div>


              {/* =================================================
                  DECISION
              ================================================= */}

              <div
                className={`decision ${
                  result.result === "Shortlisted"
                    ? "shortlisted"
                    : "not-shortlisted"
                }`}
              >

                {result.result === "Shortlisted"
                  ? "✓ Shortlisted"
                  : "Not Shortlisted"}

              </div>


              {/* =================================================
                  SCORE BREAKDOWN
              ================================================= */}

              <div className="score-breakdown">

                <div className="breakdown-header">

                  <h3>
                    Score Breakdown
                  </h3>

                  <span>
                    How the final score was calculated
                  </span>

                </div>


                {/* SKILL MATCH */}

                <div className="score-item">

                  <div className="score-item-info">

                    <span>
                      Skill Match
                    </span>

                    <strong>
                      {
                        result.skill_match_score
                      }%
                    </strong>

                  </div>

                  <div className="progress-bar">

                    <div
                      className="progress-fill skill-progress"
                      style={{
                        width: `${result.skill_match_score}%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* EXPERIENCE MATCH */}

                <div className="score-item">

                  <div className="score-item-info">

                    <span>
                      Experience Match
                    </span>

                    <strong>
                      {
                        result.experience_match_score
                      }%
                    </strong>

                  </div>

                  <div className="progress-bar">

                    <div
                      className="progress-fill experience-progress"
                      style={{
                        width: `${result.experience_match_score}%`,
                      }}
                    ></div>

                  </div>

                </div>


                {/* ML MODEL SCORE */}

                <div className="score-item">

                  <div className="score-item-info">

                    <span>
                      ML Model Score
                    </span>

                    <strong>
                      {result.ml_score}%
                    </strong>

                  </div>

                  <div className="progress-bar">

                    <div
                      className="progress-fill ml-progress"
                      style={{
                        width: `${result.ml_score}%`,
                      }}
                    ></div>

                  </div>

                </div>

              </div>


              {/* =================================================
                  SKILL DETAILS
              ================================================= */}

              <div className="skills-section">

                <h3>
                  Skill Analysis
                </h3>


                {/* MATCHED SKILLS */}

                {result.matched_skills?.length > 0 && (

                  <div className="skill-group">

                    <span className="skill-title matched-title">
                      Matched Skills
                    </span>

                    <div className="skill-tags">

                      {result.matched_skills.map(
                        (skill, index) => (

                          <span
                            className="skill-tag matched"
                            key={`${skill}-${index}`}
                          >
                            ✓ {skill}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                )}


                {/* MISSING SKILLS */}

                {result.missing_skills?.length > 0 && (

                  <div className="skill-group">

                    <span className="skill-title missing-title">
                      Missing Skills
                    </span>

                    <div className="skill-tags">

                      {result.missing_skills.map(
                        (skill, index) => (

                          <span
                            className="skill-tag missing"
                            key={`${skill}-${index}`}
                          >
                            {skill}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                )}

              </div>


              {/* =================================================
                  DETAILS
              ================================================= */}

              <div className="details">

                <div className="detail-row">

                  <span>
                    Job Role
                  </span>

                  <strong>
                    {result.job_role}
                  </strong>

                </div>


                <div className="detail-row">

                  <span>
                    Education
                  </span>

                  <strong>
                    {result.education_level}
                  </strong>

                </div>


                <div className="detail-row">

                  <span>
                    Experience
                  </span>

                  <strong>
                    {result.experience_years} years
                  </strong>

                </div>


                <div className="detail-row">

                  <span>
                    Required Experience
                  </span>

                  <strong>
                    {
                      result.job_experience_required
                    }{" "}
                    years
                  </strong>

                </div>


                <div className="detail-row">

                  <span>
                    Resume Text
                  </span>

                  <strong>
                    {
                      result.resume_text_length
                    }{" "}
                    characters
                  </strong>

                </div>

              </div>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;