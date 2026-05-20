import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  completeWfSetup,
  fetchWfSetupOptions,
  fetchWfSetupStatus,
  saveWfSetupProgress,
} from "../../../Moduels/attendance/wfApi";

const STEPS = [
  { n: 1, title: "Attendance style", key: "sources" },
  { n: 2, title: "Industry", key: "industry" },
  { n: 3, title: "Attendance cycle", key: "cycle" },
  { n: 4, title: "Payroll behavior", key: "behaviors" },
  { n: 5, title: "Review & activate", key: "review" },
];

export default function WfAttendanceSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState(null);
  const [sources, setSources] = useState([]);
  const [industry, setIndustry] = useState("custom");
  const [cycle, setCycle] = useState("five_day");
  const [behaviors, setBehaviors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [status, opts] = await Promise.all([
          fetchWfSetupStatus(),
          fetchWfSetupOptions(),
        ]);
        setOptions(opts);
        if (!status.setup_required && status.setup_completed_at) {
          setDone(true);
        }
        setStep(status.current_step || 1);
      } catch (e) {
        setErr(e.message || "Failed to load setup");
      }
    })();
  }, []);

  const toggle = (list, code, setter) => {
    setter(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  };

  const persist = async (nextStep, payload) => {
    await saveWfSetupProgress(nextStep, payload);
  };

  const next = async () => {
    setErr("");
    setBusy(true);
    try {
      if (step === 1) {
        if (sources.length === 0) throw new Error("Select at least one attendance source");
        await persist(1, { sources });
      } else if (step === 2) {
        await persist(2, { industry });
      } else if (step === 3) {
        await persist(3, { cycle, config: {} });
      } else if (step === 4) {
        await persist(4, { behaviors });
      } else if (step === 5) {
        await completeWfSetup({
          sources,
          industry,
          cycle_type: cycle,
          cycle_config: {},
          behaviors,
        });
        setDone(true);
        navigate("/attendance");
        return;
      }
      setStep((s) => Math.min(5, s + 1));
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  if (!options) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-gray-500">
        Loading setup wizard…
      </div>
    );
  }

  if (done) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Setup complete</h1>
        <p className="text-sm text-gray-600 mb-4">
          Attendance operating model is configured. You can change sources later from this page.
        </p>
        <button
          type="button"
          onClick={() => navigate("/attendance")}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg"
        >
          Open Attendance Hub
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">
        Organisation attendance setup
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Required before attendance modules activate. Payroll still uses scalar flow only.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={`text-xs px-3 py-1 rounded-full border ${
              step === s.n ? "bg-teal-600 text-white border-teal-600" : "text-gray-600"
            }`}
          >
            {s.n}. {s.title}
          </span>
        ))}
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{err}</div>
      )}

      <div className="bg-white border rounded-xl p-5 mb-6 min-h-[200px]">
        {step === 1 && (
          <>
            <p className="text-sm text-gray-600 mb-3">What type of attendance setup do you want?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.sources.map((o) => (
                <label key={o.code} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sources.includes(o.code)}
                    onChange={() => toggle(sources, o.code, setSources)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-gray-600 mb-3">What type of organization are you?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.industries.map((o) => (
                <label key={o.code} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="industry"
                    checked={industry === o.code}
                    onChange={() => setIndustry(o.code)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-gray-600 mb-3">What attendance cycle do you want?</p>
            <div className="space-y-2">
              {options.cycles.map((o) => (
                <label key={o.code} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="cycle"
                    checked={cycle === o.code}
                    onChange={() => setCycle(o.code)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm text-gray-600 mb-3">Payroll attendance behaviors (scalars only)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.payroll_behaviors.map((o) => (
                <label key={o.code} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={behaviors.includes(o.code)}
                    onChange={() => toggle(behaviors, o.code, setBehaviors)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <dl className="text-sm space-y-2">
            <div>
              <dt className="font-medium text-gray-700">Sources</dt>
              <dd>{sources.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Industry</dt>
              <dd>{industry}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Cycle</dt>
              <dd>{cycle}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Behaviors</dt>
              <dd>{behaviors.join(", ") || "defaults from template"}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            disabled={busy}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={busy}
          className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {step === 5 ? (busy ? "Activating…" : "Complete setup") : busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
