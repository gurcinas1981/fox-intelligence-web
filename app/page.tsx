"use client";

import { FormEvent, useMemo, useState } from "react";

type AnyObject = Record<string, any>;

function scoreBand(score: number) {
  if (score >= 85) return "Strong planning fit";
  if (score >= 70) return "Good development potential";
  if (score >= 55) return "Plausible / conditional";
  if (score >= 40) return "Challenging";
  return "Major conflicts identified";
}

function constraintLabel(status: string) {
  const map: Record<string, string> = {
    green: "GREEN",
    amber: "AMBER",
    red: "RED",
    grey: "UNKNOWN"
  };
  return map[status] || status?.toUpperCase();
}

export default function Home() {
  const [form, setForm] = useState({
    address: "",
    postcode: "",
    siteArea: "",
    currentUse: "",
    planningRef: "",
    notes: ""
  });
  const [result, setResult] = useState<AnyObject | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const appraisal = result?.appraisal;
  const summary = appraisal?.executive_summary;

  const optionSorted = useMemo(() => {
    if (!appraisal?.options) return [];
    return [...appraisal.options].sort(
      (a: AnyObject, b: AnyObject) => b.suitability - a.suitability
    );
  }, [appraisal]);

  function update(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Appraisal failed.");
      setResult(data);
      window.setTimeout(() => {
        document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Appraisal failed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fox-land-iq-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow">FOX INTELLIGENCE</div>
            <h1>
              Land intelligence,
              <span> before the planning risk.</span>
            </h1>
            <p className="lead">
              Enter an England site address or postcode. FOX Land IQ screens open
              planning data, researches current national and local policy, checks
              planning history and constraints, tests development uses and consent
              routes, then produces a scored preliminary appraisal.
            </p>
            <div className="hero-tags">
              <span>Live policy research</span>
              <span>Planning constraints</span>
              <span>Use-class testing</span>
              <span>Consent-route scoring</span>
            </div>
          </div>
          <aside className="hero-mark">
            <div className="seal">FOX</div>
            <div>
              <strong>LAND IQ</strong>
              <small>Planning & Development Appraisal</small>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell form-wrap">
        <form className="appraisal-form" onSubmit={submit}>
          <div className="section-heading">
            <div>
              <span className="kicker">01 / SITE INPUT</span>
              <h2>Start an appraisal</h2>
            </div>
            <p>Address is enough to start. Add anything else you already know.</p>
          </div>

          <div className="fields">
            <label className="wide">
              Site address / site name *
              <input
                required
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="e.g. Land rear of 25 Main Street, Nottingham, NG..."
              />
            </label>

            <label>
              Postcode
              <input
                value={form.postcode}
                onChange={(e) => update("postcode", e.target.value)}
                placeholder="NG17 1AA"
              />
            </label>

            <label>
              Site area
              <input
                value={form.siteArea}
                onChange={(e) => update("siteArea", e.target.value)}
                placeholder="e.g. 0.52 ha / 1.3 acres"
              />
            </label>

            <label>
              Current use
              <input
                value={form.currentUse}
                onChange={(e) => update("currentUse", e.target.value)}
                placeholder="Agricultural / commercial / vacant..."
              />
            </label>

            <label>
              Planning reference
              <input
                value={form.planningRef}
                onChange={(e) => update("planningRef", e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="wide">
              Known facts / objectives
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="For example: owner wants housing; existing access from Main Street; previous refusal; asking price; known flooding; target number of units..."
                rows={5}
              />
            </label>
          </div>

          <div className="form-footer">
            <div className="method-note">
              <b>Method:</b> official/open data → live policy research → option testing →
              FOX scoring. Scores are planning-suitability indicators, not approval
              probabilities.
            </div>
            <button disabled={loading} type="submit">
              {loading ? "Running deep appraisal…" : "Run FOX Land IQ appraisal"}
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}
        </form>
      </section>

      {loading && (
        <section className="shell">
          <div className="research-state">
            <div className="pulse" />
            <div>
              <strong>FOX Land IQ is researching the site</strong>
              <p>
                Resolving location, screening open data, checking current policy,
                planning history, precedents, development options and consent routes.
              </p>
            </div>
          </div>
        </section>
      )}

      {appraisal && (
        <section id="report" className="report shell">
          <div className="report-topbar">
            <div>
              <span className="kicker">FOX LAND IQ / PRELIMINARY APPRAISAL</span>
              <h2>{summary.site}</h2>
              <p>
                {summary.local_planning_authority} · {summary.postcode}
              </p>
            </div>
            <div className="report-actions">
              <button className="secondary" onClick={downloadJson}>
                Download data
              </button>
              <button className="secondary" onClick={() => window.print()}>
                Print / PDF
              </button>
            </div>
          </div>

          <div className="dashboard">
            <article className="score-card">
              <span>Development suitability</span>
              <strong>{summary.development_suitability}</strong>
              <small>/100</small>
              <p>{scoreBand(summary.development_suitability)}</p>
            </article>
            <article className="score-card">
              <span>Data confidence</span>
              <strong>{summary.data_confidence}</strong>
              <small>/100</small>
              <p>{summary.site_identification_confidence} site ID confidence</p>
            </article>
            <article className="dashboard-card">
              <span>Best concept to investigate</span>
              <strong>{summary.best_development_concept}</strong>
              <p>{summary.indicative_capacity}</p>
            </article>
            <article className="dashboard-card">
              <span>Planning route</span>
              <strong>{summary.strongest_consent_route}</strong>
              <p>{summary.likely_use_class}</p>
            </article>
          </div>

          <div className="headline-grid">
            <article>
              <span>MAIN OPPORTUNITY</span>
              <p>{summary.main_opportunity}</p>
            </article>
            <article>
              <span>MAIN CONSTRAINT</span>
              <p>{summary.main_constraint}</p>
            </article>
            <article>
              <span>NEXT TEST</span>
              <p>{summary.immediate_next_step}</p>
            </article>
          </div>

          <ReportSection number="02" title="Policy position">
            <div className="policy-grid">
              <div>
                <span>National policy</span>
                <strong>{appraisal.policy_check.national_policy_version}</strong>
              </div>
              <div>
                <span>Adopted local plan</span>
                <strong>{appraisal.policy_check.local_plan}</strong>
              </div>
              <div>
                <span>Emerging plan</span>
                <strong>{appraisal.policy_check.emerging_plan}</strong>
              </div>
            </div>
            <p className="body-copy">{appraisal.policy_check.summary}</p>
            {!!appraisal.policy_check.relevant_policies?.length && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Status</th>
                      <th>Site implication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appraisal.policy_check.relevant_policies.map(
                      (p: AnyObject, i: number) => (
                        <tr key={i}>
                          <td>
                            <a href={p.source_url} target="_blank" rel="noreferrer">
                              {p.reference} — {p.title}
                            </a>
                          </td>
                          <td>{p.status}</td>
                          <td>{p.implication}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          <ReportSection number="03" title="Constraint screen">
            <div className="constraint-grid">
              {appraisal.constraints.map((c: AnyObject, i: number) => (
                <article key={i} className={`constraint ${c.status}`}>
                  <div className="constraint-head">
                    <strong>{c.name}</strong>
                    <span>{constraintLabel(c.status)}</span>
                  </div>
                  <p>{c.finding}</p>
                  <small>{c.development_effect}</small>
                  <div className="action">
                    <b>Action:</b> {c.action}
                  </div>
                  {c.source_url && (
                    <a href={c.source_url} target="_blank" rel="noreferrer">
                      Evidence source ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </ReportSection>

          <ReportSection number="04" title="Development options">
            <div className="option-list">
              {optionSorted.map((o: AnyObject, i: number) => (
                <article className="option-card" key={i}>
                  <div className="option-top">
                    <div>
                      <span>{o.name}</span>
                      <h3>{o.development}</h3>
                      <p>
                        {o.use_class} · {o.indicative_scale} · {o.route}
                      </p>
                    </div>
                    <div className="option-score">
                      <strong>{o.suitability}</strong>
                      <small>/100</small>
                    </div>
                  </div>
                  <div className="score-bars">
                    {[
                      ["Policy", o.score_breakdown.policy, 30],
                      ["Principle", o.score_breakdown.principle, 20],
                      ["Constraints", o.score_breakdown.constraints, 15],
                      ["Access", o.score_breakdown.access, 10],
                      ["Built form", o.score_breakdown.built_form, 10],
                      ["History", o.score_breakdown.history, 10],
                      ["Strategic case", o.score_breakdown.strategic_case, 5]
                    ].map(([label, value, max]) => (
                      <div className="bar-row" key={String(label)}>
                        <span>{label}</span>
                        <div>
                          <i
                            style={{
                              width: `${(Number(value) / Number(max)) * 100}%`
                            }}
                          />
                        </div>
                        <b>
                          {value}/{max}
                        </b>
                      </div>
                    ))}
                  </div>
                  <div className="factor-grid">
                    <div>
                      <span>Supporting factors</span>
                      <ul>
                        {o.supporting_factors.map((x: string, n: number) => (
                          <li key={n}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span>Key risks</span>
                      <ul>
                        {o.key_risks.map((x: string, n: number) => (
                          <li key={n}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </ReportSection>

          <ReportSection number="05" title="Consent-route test">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Eligibility</th>
                    <th>Score</th>
                    <th>Reason</th>
                    <th>Key risk</th>
                  </tr>
                </thead>
                <tbody>
                  {appraisal.routes.map((r: AnyObject, i: number) => (
                    <tr key={i}>
                      <td><strong>{r.route}</strong></td>
                      <td>{r.eligibility}</td>
                      <td>{r.score === null ? "—" : `${r.score}/100`}</td>
                      <td>{r.reason}</td>
                      <td>{r.key_risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <ReportSection number="06" title="Planning history & precedent">
            {appraisal.planning_history?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Proposal</th>
                      <th>Decision</th>
                      <th>Why it matters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appraisal.planning_history.map((h: AnyObject, i: number) => (
                      <tr key={i}>
                        <td>
                          <a href={h.source_url} target="_blank" rel="noreferrer">
                            {h.reference}
                          </a>
                          <small className="date">{h.date}</small>
                        </td>
                        <td>{h.proposal}</td>
                        <td>{h.decision}</td>
                        <td>{h.relevance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="body-copy">
                No sufficiently verified planning-history entries were returned.
              </p>
            )}
          </ReportSection>

          <ReportSection number="07" title="FOX planning strategies">
            <div className="strategy-grid">
              <article>
                <span>LOWEST EXPOSURE</span>
                <p>{appraisal.strategies.low_risk}</p>
              </article>
              <article>
                <span>BALANCED</span>
                <p>{appraisal.strategies.balanced}</p>
              </article>
              <article>
                <span>LAND UPLIFT</span>
                <p>{appraisal.strategies.uplift}</p>
              </article>
            </div>
            <div className="opportunity-statement">
              <span>FOX PLANNING OPPORTUNITY STATEMENT</span>
              <p>{appraisal.strategies.opportunity_statement}</p>
            </div>
          </ReportSection>

          <ReportSection number="08" title="Risk register & data gaps">
            <div className="risk-list">
              {appraisal.risks.map((r: AnyObject, i: number) => (
                <article key={i}>
                  <span className={`severity ${r.severity.toLowerCase()}`}>
                    {r.severity}
                  </span>
                  <strong>{r.risk}</strong>
                  <p>{r.response}</p>
                </article>
              ))}
            </div>
            <div className="data-gaps">
              <h3>Information still required</h3>
              <ul>
                {appraisal.data_gaps.map((g: string, i: number) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          </ReportSection>

          <ReportSection number="09" title="Evidence sources">
            <div className="sources">
              {appraisal.sources.map((s: AnyObject, i: number) => (
                <a href={s.url} target="_blank" rel="noreferrer" key={i}>
                  <strong>{s.title}</strong>
                  <span>{s.authority}</span>
                  <small>{s.used_for}</small>
                </a>
              ))}
            </div>
          </ReportSection>

          <footer className="report-footer">
            <strong>FOX Intelligence · Land IQ</strong>
            <p>{appraisal.professional_limitations}</p>
            <small>
              Generated {new Date(result.meta.generated_at).toLocaleString()} ·{" "}
              {result.meta.methodology} · {result.meta.model}
            </small>
          </footer>
        </section>
      )}
    </main>
  );
}

function ReportSection({
  number,
  title,
  children
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section">
      <div className="section-heading">
        <div>
          <span className="kicker">{number}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
