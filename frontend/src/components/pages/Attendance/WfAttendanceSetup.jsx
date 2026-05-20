import { useEffect, useState } from "react";
import {
  activateWfAttendanceProfile,
  fetchWfAttendanceProfile,
  fetchWfFeatureFlags,
  fetchWfSourcePlugins,
  patchWfFeatureFlag,
  seedWfPlatform,
} from "../../../Moduels/attendance/wfApi";

const PRESETS = {
  it: ["default_present", "mobile_checkin", "manual_hr", "excel_upload"],
  hospital: ["biometric", "shift_roster", "manual_hr"],
  factory: ["biometric", "excel_upload", "shift_roster"],
  retail: ["shift_roster", "excel_upload", "qr"],
  security: ["geo_fence", "client_site", "mobile_checkin"],
};

export default function WfAttendanceSetup() {
  const [profile, setProfile] = useState(null);
  const [plugins, setPlugins] = useState([]);
  const [selected, setSelected] = useState([]);
  const [flags, setFlags] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [p, pl, fl] = await Promise.all([
        fetchWfAttendanceProfile(),
        fetchWfSourcePlugins(),
        fetchWfFeatureFlags(),
      ]);
      setProfile(p);
      setSelected(p.enabled_modes || []);
      setPlugins(pl);
      setFlags(fl);
    } catch (e) {
      setErr(e.message || "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleMode = (code) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const applyPreset = (key) => {
    setSelected(PRESETS[key] || []);
  };

  const onActivate = async () => {
    if (selected.length === 0) {
      setErr("Select at least one attendance mode");
      return;
    }
    try {
      const p = await activateWfAttendanceProfile({
        enabled_modes: selected,
        engine_version: "v2",
        terminology_pack_code: "default_en",
      });
      setProfile(p);
      setMsg("Attendance ecosystem activated.");
    } catch (e) {
      setErr(e.message || "Activation failed");
    }
  };

  const onSeed = async () => {
    try {
      await seedWfPlatform();
      setMsg("Platform seed completed.");
      await load();
    } catch (e) {
      setErr(e.message || "Seed failed");
    }
  };

  const toggleFlag = async (code, enabled) => {
    try {
      await patchWfFeatureFlag(code, { enabled });
      await load();
    } catch (e) {
      setErr(e.message || "Flag update failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">Attendance Ecosystem</h1>
      <p className="text-sm text-gray-500 mb-6">
        Choose which attendance sources and modules are active for your organisation.
      </p>

      {msg && <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{msg}</div>}
      {err && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESETS).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => applyPreset(k)}
            className="px-3 py-1 text-sm border rounded-full hover:bg-gray-50 capitalize"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={onSeed}
          className="px-3 py-1 text-sm border rounded-full text-amber-800 border-amber-300"
        >
          Seed platform data
        </button>
      </div>

      {profile && (
        <p className="text-sm text-gray-600 mb-4">
          Engine: <strong>{profile.engine_version}</strong> · Modes:{" "}
          {(profile.enabled_modes || []).join(", ") || "none"}
        </p>
      )}

      <div className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {plugins.map((pl) => (
          <label key={pl.source_code} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(pl.source_code)}
              onChange={() => toggleMode(pl.source_code)}
            />
            {pl.display_name}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onActivate}
        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 mb-8"
      >
        Activate selected modes
      </button>

      <h2 className="text-lg font-medium mb-3">Feature flags</h2>
      <ul className="space-y-2">
        {flags.map((f) => (
          <li
            key={f.flag_code}
            className="flex items-center justify-between bg-white border rounded-lg px-4 py-2 text-sm"
          >
            <span>
              <strong>{f.flag_code}</strong>
              {f.description && (
                <span className="block text-gray-500 text-xs">{f.description}</span>
              )}
            </span>
            <input
              type="checkbox"
              checked={!!f.enabled}
              onChange={(e) => toggleFlag(f.flag_code, e.target.checked)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
