import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [resume, setResume] = useState(null);

  const [formData, setFormData] = useState({
    experience_years: "2",
    education_level: "Bachelor's",
    job_role: "Frontend Developer",
    required_skills: "React, JavaScript, HTML, CSS, Tailwind",
    job_experience_required: "1",
    job_description:
      "Looking for a frontend developer with React, JavaScript, HTML, CSS, Tailwind",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF resume.");
      setResume(null);
      return;
    }

    setResume(selectedFile);
    setError("");
    setResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!resume) {
      setError("Please upload a PDF resume.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = new FormData();

      data.append("resume", resume);
      data.append("experience_years", formData.experience_years);
      data.append("education_level", formData.education_level);
      data.append("job_role", formData.job_role);
      data.append("required_skills", formData.required_skills);
      data.append(
        "job_experience_required",
        formData.job_experience_required
      );
      data.append("job_description", formData.job_description);

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
      console.error(err);

      const message =
        err.response?.data?.detail ||
        "Something went wrong while analyzing the resume.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 70) {
      return "good";
    }

    if (score >= 50) {
      return "average";
    }

    return "low";
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">R</div>

          <div>
            <h2>ResumeScreen AI</h2>
            <span>AI Resume Screening System</span>
          </div>
        </div>

        <div className="model-status">
          <span className="status-dot"></span>
          AI Model Online
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-container">

        {/* LEFT PANEL */}
        <section className="card analysis-card">

          <div className="section-heading">
            <h1>Resume Analysis</h1>
            <p>Provide candidate and job information</p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* FILE UPLOAD */}
            <label className="upload-box">

              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />

              <div className="upload-icon">↑</div>

              {resume ? (
                <>
                  <strong>{resume.name}</strong>
                  <span>Resume selected</span>
                </>
              ) : (
                <>
                  <strong>Upload Resume</strong>
                  <span>PDF files only</span>
                </>
              )}

            </label>

            {/* BASIC DETAILS */}
            <div className="form-grid">

              <div className="form-group">
                <label>Experience (Years)</label>

                <input
                  type="number"
                  min="0"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Education Level</label>

                <select
                  name="education_level"
                  value={formData.education_level}
                  onChange={handleInputChange}
                >
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                  <option value="Diploma">Diploma</option>
                  <option value="High School">High School</option>
                </select>
              </div>

            </div>

            {/* JOB DETAILS */}
            <div className="form-grid">

              <div className="form-group">
                <label>Job Role</label>

                <input
                  type="text"
                  name="job_role"
                  value={formData.job_role}
                  onChange={handleInputChange}
                  placeholder="e.g. Frontend Developer"
                />
              </div>

              <div className="form-group">
                <label>Required Experience</label>

                <input
                  type="number"
                  min="0"
                  name="job_experience_required"
                  value={formData.job_experience_required}
                  onChange={handleInputChange}
                />
              </div>

            </div>

            {/* SKILLS */}
            <div className="form-group full-width">
              <label>Required Skills</label>

              <input
                type="text"
                name="required_skills"
                value={formData.required_skills}
                onChange={handleInputChange}
                placeholder="React, JavaScript, HTML, CSS"
              />
            </div>

            {/* JOB DESCRIPTION */}
            <div className="form-group full-width">
              <label>Job Description</label>

              <textarea
                name="job_description"
                value={formData.job_description}
                onChange={handleInputChange}
                placeholder="Enter the job description..."
                rows="6"
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              className="analyze-button"
              disabled={loading}
            >
              {loading ? "Analyzing Resume..." : "Analyze Resume"}
            </button>

          </form>
        </section>

        {/* RIGHT PANEL */}
        <section className="card results-card">

          {!result ? (
            <div className="empty-results">

              <div className="empty-icon">✦</div>

              <h2>Analysis Results</h2>

              <p>
                Upload a resume and provide job requirements
                to see the AI screening results.
              </p>

            </div>
          ) : (
            <div className="results-content">

              <div className="section-heading">
                <h2>Analysis Results</h2>

                <p>{result.filename}</p>
              </div>

              {/* FINAL ATS SCORE */}
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

              {/* DECISION */}
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

              {/* SCORE BREAKDOWN */}
              <div className="score-breakdown">

                <div className="breakdown-header">
                  <h3>Score Breakdown</h3>
                  <span>How the final score was calculated</span>
                </div>

                <div className="score-item">

                  <div className="score-item-info">
                    <span>Skill Match</span>
                    <strong>
                      {result.skill_match_score}%
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

                <div className="score-item">

                  <div className="score-item-info">
                    <span>Experience Match</span>
                    <strong>
                      {result.experience_match_score}%
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

                <div className="score-item">

                  <div className="score-item-info">
                    <span>ML Model Score</span>
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

              {/* SKILL DETAILS */}
              <div className="skills-section">

                <h3>Skill Analysis</h3>

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
                            key={index}
                          >
                            ✓ {skill}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

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
                            key={index}
                          >
                            {skill}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

              </div>

              {/* DETAILS */}
              <div className="details">

                <div className="detail-row">
                  <span>Job Role</span>
                  <strong>{result.job_role}</strong>
                </div>

                <div className="detail-row">
                  <span>Education</span>
                  <strong>{result.education_level}</strong>
                </div>

                <div className="detail-row">
                  <span>Experience</span>
                  <strong>
                    {result.experience_years} years
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Resume Text</span>
                  <strong>
                    {result.resume_text_length} characters
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